
---

# `PRODUCT_SPEC.md`

```markdown
# MustangStroker Product Spec
Prototype 1

## Project Goal

Build a guided-capture mobile application that records a controlled marching drumming rep, analyzes body and hand movement from the captured video, and displays a results dashboard with estimated finger, wrist, and arm movement contribution.

Prototype 1 is a motion-analysis product, not a full stick-path or biomechanics system.

---

## Prototype 1 Summary

Prototype 1 must:

- record video directly inside the app
- guide the user into a consistent recording setup
- standardize drum placement and framing
- analyze prerecorded footage after recording
- estimate relative contribution from fingers, wrist, and arm
- return a frame-aware dashboard and summary trend label

Prototype 1 must not:

- track sticks
- detect bead angle
- estimate true muscle activation
- claim medical or biomechanical accuracy
- support arbitrary camera setups

---

## User Story

As a drummer or instructor, I want to record a rep under consistent conditions and receive a breakdown of how much the player appears to be using fingers, wrist, and arm so I can better understand their approach and identify trends or inefficiencies.

---

## Primary Value Proposition

The value of Prototype 1 is **standardized capture + interpretable movement analysis**.

The product is strongest when it controls recording conditions and produces feedback that is:

- simple
- visual
- consistent
- easy to compare between reps

---

## Capture Flow Requirements

The app must include an in-app guided recording flow.

### Guided Capture Requirements

The recording screen should:

- show the device camera
- display an overlay indicating where the drum should be placed
- display guidance for where the player’s torso and arms should appear
- include setup instructions before recording
- allow start/stop recording
- save the recorded video locally
- upload the recorded video to Firebase Storage after capture

### Capture Assumptions

Prototype 1 assumes:

- one supported camera angle
- one supported distance range
- consistent lighting
- a controlled exercise
- the drum is placed in a predictable location inside the frame

---

## Supported Exercises

Prototype 1 should support one or more controlled exercises, but the preferred demo path is:

- `single_strokes`

Optional future support:
- `double_strokes`
- `paradiddles`

If multiple exercise types exist in the UI, the analysis logic may still be optimized primarily for single strokes during the prototype.

---

## Core Metrics

Prototype 1 should produce three primary metrics:

1. Finger involvement
2. Wrist involvement
3. Arm involvement

These should be displayed either as:
- normalized percentages summing to approximately 100
or
- comparable 0–100 contribution scores

Preferred prototype approach:
- normalize raw motion totals so the three values sum to 100

---

## Supporting Metrics

Prototype 1 may also compute:

- symmetry
- consistency
- posture stability

These are supporting metrics, not the main product claim.

---

## Metric Definitions

### Finger Involvement

Finger involvement should represent movement of the fingers relative to the palm/hand over time.

Possible signal sources:
- fingertip motion relative to palm center
- MCP/PIP/DIP joint movement
- per-frame finger curl or extension changes

This should be treated as a relative movement signal, not true finger force.

### Wrist Involvement

Wrist involvement should represent motion at the wrist joint.

Recommended approach:
- compute forearm vector from elbow to wrist
- compute hand vector from wrist to hand knuckle center
- measure angle change between those vectors over time

This signal should represent wrist break or wrist-driven motion.

### Arm Involvement

Arm involvement should represent larger-scale arm motion.

Recommended approach:
- compute elbow angle changes
- compute upper-arm movement from shoulder to elbow
- optionally include shoulder movement as part of arm involvement for Prototype 1

This should represent arm-dominant motion relative to wrist and fingers.

---

## Scoring Logic

### Raw Motion Signals

For each captured clip, compute:

- `finger_raw`
- `wrist_raw`
- `arm_raw`

These are cumulative or aggregated motion values over the clip.

### Normalization

Preferred normalization:

- `total = finger_raw + wrist_raw + arm_raw`
- `finger_pct = 100 * finger_raw / total`
- `wrist_pct = 100 * wrist_raw / total`
- `arm_pct = 100 * arm_raw / total`

Return rounded values for UI display.

### Important Constraint

The application must describe these scores as:

- estimated movement contribution
- motion-based contribution
- approach trend indicators

The application must not describe them as:

- actual muscle usage
- physiological measurement
- true biomechanics

---

## Trend Labels

Prototype 1 should return one overall trend label.

Initial supported labels:

- `finger-driven`
- `wrist-led`
- `arm-heavy`
- `balanced`
- `inconsistent`

### Initial Rule-Based Classifier

Use threshold-based logic, not a trained classifier.

Example rules:
- highest contribution clearly finger-dominant → `finger-driven`
- highest contribution clearly wrist-dominant → `wrist-led`
- highest contribution clearly arm-dominant → `arm-heavy`
- contributions relatively close together → `balanced`
- high motion variance or unstable signal patterns → `inconsistent`

These thresholds should be easy to tune.

---

## Dashboard Requirements

The results screen must display:

- recorded video preview
- three primary movement contribution metrics
- one overall trend label
- optional supporting metrics
- chart or timeline view of metric changes over time
- the ability to scrub through the recorded video and update dashboard context

### Results UI Requirements

The results view should include:

- clear score cards for finger, wrist, and arm
- a visual label for overall approach trend
- a timeline chart placeholder or implementation
- supporting feedback text
- accessibility support for dark mode and high contrast

---

## Session Flow

### Session States

Recommended session state flow:

- `draft`
- `recording`
- `uploading`
- `queued`
- `processing`
- `completed`
- `failed`

### Job Lifecycle

1. User starts a session
2. User records video in-app
3. Video is uploaded to Firebase Storage
4. Firestore session/job documents are created or updated
5. Analysis API processes the video
6. Results are written back to Firestore
7. App subscribes to live updates and displays progress/results

---

## Analysis API Requirements

The FastAPI service must:

- download video from Firebase Storage
- sample or iterate through frames
- run pose + hand landmark extraction
- smooth noisy landmark data
- compute raw motion signals
- normalize results
- generate trend labels
- write outputs back to Firestore
- update job status

### Recommended Internal Modules

- `video_loader.py`
- `frame_sampler.py`
- `landmark_detector.py`
- `landmark_smoothing.py`
- `feature_extraction.py`
- `scoring.py`
- `trend_classifier.py`
- `feedback_generator.py`

---

## Recommended Landmark Model

Preferred model:
- **MediaPipe Holistic**

Reason:
- pose + hand landmarks in one pipeline
- good fit for shoulder, elbow, wrist, and finger-based measurements
- avoids custom model training for Prototype 1

Prototype 1 should avoid training a custom vision model unless absolutely necessary.

---

## Model / ML Scope

Prototype 1 should use:

- pretrained landmark detection
- deterministic feature extraction
- rule-based scoring
- threshold-based classification

Prototype 1 should not require:

- custom dataset collection
- training a new CV model
- training a neural classifier
- EMG or sensor hardware

---

## Accessibility Requirements

The app should preserve and support:

- dark mode
- high contrast mode
- color blind support where already present
- readable charts and metric cards

All new UI added for capture and results should respect existing accessibility settings.

---

## Suggested Project Structure

```text
MustangStroker/
├── README.md
├── docs/
│   ├── PRODUCT_SPEC.md
│   ├── SCORING_RUBRIC.md
│   ├── API_CONTRACT.md
│   ├── FIREBASE_SCHEMA.md
│   ├── DEMO_SCRIPT.md
│   └── KIRO_PROMPTS.md
├── src/
│   ├── screens/
│   │   ├── main/
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── AnalyzeSetupScreen.tsx
│   │   │   ├── RecordingScreen.tsx
│   │   │   ├── HistoryScreen.tsx
│   │   │   └── SettingsScreen.tsx
│   │   ├── results/
│   │   │   ├── SessionStatusScreen.tsx
│   │   │   └── ResultsScreen.tsx
│   ├── components/
│   │   ├── capture/
│   │   │   ├── CameraSetupGuide.tsx
│   │   │   ├── DrumPlacementOverlay.tsx
│   │   │   ├── CaptureInstructions.tsx
│   │   │   └── RecordingControls.tsx
│   │   ├── results/
│   │   │   ├── ScoreCard.tsx
│   │   │   ├── ContributionBars.tsx
│   │   │   ├── TimelineChart.tsx
│   │   │   ├── TrendLabel.tsx
│   │   │   ├── FeedbackList.tsx
│   │   │   └── VideoScrubber.tsx
│   ├── services/
│   │   ├── firebase/
│   │   ├── api/
│   │   └── subscriptions/
│   ├── types/
│   └── hooks/
├── services/
│   └── analysis-api/
│       ├── app/
│       │   ├── analysis/
│       │   │   ├── pipeline.py
│       │   │   ├── landmark_detector.py
│       │   │   ├── landmark_smoothing.py
│       │   │   ├── feature_extraction.py
│       │   │   ├── scoring.py
│       │   │   ├── trend_classifier.py
│       │   │   └── feedback_generator.py
│       │   ├── routes/
│       │   ├── models/
│       │   └── services/