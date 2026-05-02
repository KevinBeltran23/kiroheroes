# SURP-2025 AI Accessibility Tracker

This is a React Native project that uses Firebase

## Cloud Build

first time

```
eas build --profile development --platform android
```
OR
```
eas build --profile development --platform ios
```

## Build locally

```
yarn expo run:android
```
OR
```
yarn expo run:ios
```

## General Dev

```
yarn start
```


## NOTE

# MustangStroker

A computer vision and motion analysis tool for evaluating marching drum technique from guided in-app video capture.

## Overview

On a competitive drumline, the smallest technical details matter. Consistency of approach affects both visual uniformity and sound quality, and subtle differences in how players move can create differences in timing, tone, and blend.

MustangStroker is a research prototype built to help students and instructors better understand how a player is approaching the drum. The application records a drumming rep directly in-app using a guided capture flow that standardizes camera framing and drum placement, then produces a data-enriched dashboard showing movement contribution trends over time.

For Prototype 1, the system focuses on estimating relative movement contribution from:

- fingers
- wrist
- arm

The goal is not to replace an instructor or provide physiological measurement. Instead, the app provides interpretable motion-based feedback that helps users identify technique trends, inefficiencies, and areas for improvement.

---

## Prototype 1 Scope

Prototype 1 focuses on:

- in-app video recording only
- guided capture with fixed framing
- controlled drum placement
- prerecorded rep analysis
- body and hand landmark analysis
- movement contribution scoring
- timeline-based dashboard updates
- simple approach trend labeling

### Out of Scope for Prototype 1

- stick tracking
- stick pathway analysis
- bead angle detection
- leading-with-the-bead analysis
- live real-time playing feedback
- arbitrary camera angles
- direct measurement of muscle activation or force production

---

## Problem Statement

Instructors often evaluate technique by eye and by sound, but subtle movement patterns can be difficult to quantify consistently. Students also struggle to visually understand how their motion changes over the course of a rep.

This project aims to make drumming approach analysis more measurable by converting guided in-app video capture into interpretable movement signals and presenting them in a visual dashboard.

---

## Core Idea

The application records a drumming video directly in-app using a guided capture flow that standardizes drum placement and player framing. It then processes the video using computer vision and estimates relative movement contribution using body and hand landmarks.

The system outputs:

- a dashboard with movement contribution metrics
- frame-aware technique data that updates as the user scrubs through the video
- overall approach trend labels
- summary feedback on likely inefficiencies or dominant movement patterns

---

## Guided Capture

A major part of Prototype 1 is controlled recording.

The app will guide the user to:

- place the drum in a predefined on-screen target area
- position their body inside the expected frame
- record from a consistent camera angle and distance
- perform a controlled exercise for analysis

This improves consistency across recordings and makes motion analysis more reliable.

---

## What the App Measures

Prototype 1 estimates **likely movement contribution** from visible motion patterns in recorded video. It does not measure true muscle activation, force production, or physiological recruitment.

When the app refers to:

- finger contribution
- wrist contribution
- arm contribution

it is referring to movement inferred from body and hand landmark positions over time.

These outputs should be interpreted as:

- estimated movement contribution from visible joint motion
- inferred motion pattern indicators
- approach trend estimates based on observed movement

not as direct measurement of muscle activity or biomechanical ground truth.

The system answers: **"Where does the stroke appear to be primarily driven from?"** — not "which exact muscles are firing."

---

## Key Outputs

### Core Metrics

- Finger involvement
- Wrist involvement
- Arm involvement

These may be displayed as normalized percentages or as scores on a 0–100 scale.

### Supporting Metrics

- symmetry
- consistency
- posture stability

### Example Approach Categories

- Arm-Heavy
- Fulcrum Lift
- Lead by the Bead
- Wrist Break

---

## Demo Flow

1. **Login** — user opens the app and logs in
2. **Home** — home screen shows the most recently analyzed project from history
3. **New Project** — user sets drum height and angle, app locks to landscape
4. **Record** — guided capture overlay, optional countdown, user records a controlled rep
5. **Save or Retry** — user chooses to keep the rep or re-record
6. **Processing** — video uploads, analysis pipeline runs with live status updates
7. **Results Dashboard**
   - name the project
   - scrub through the video preview
   - movement contribution graphs (finger / wrist / arm %) sync with scrub position
   - approach category: `Arm-Heavy`, `Fulcrum Lift`, `Lead by the Bead`, or `Wrist Break`
   - plain-language summary of what the detected approach means

---

### High-Level Flow

1. User opens the Analyze flow in the mobile app
2. The app shows guided capture instructions and an overlay for framing
3. User positions the drum and body inside the target regions
4. User records a controlled drumming rep in-app
5. A session and analysis job are created in Firebase
6. The analysis API downloads the recorded video from Firebase Storage
7. The video is processed frame-by-frame
8. Pose and hand landmarks are extracted
9. Movement contribution metrics are computed over time
10. Results are written back to Firestore
11. The mobile app receives live updates and displays the dashboard

---

## Current Tech Stack

## Mobile App

- React Native
- Expo
- TypeScript
- React Navigation
- TanStack React Query
- MMKV persistence
- Firebase Auth
- Firebase Firestore
- Firebase Storage

## Analysis API

- Python
- FastAPI
- Containerized microservice
- **MediaPipe Holistic** — pose + hand landmarks in a single pipeline (33 pose landmarks, 21 hand landmarks per hand)
- Motion-based scoring and post-processing

## Tooling

- Yarn 4 (Berry)
- ESLint
- Prettier
- Husky
- EAS (Expo Application Services)

---

## Current Architecture

### Mobile App

The mobile app is built with React Native and Expo.

#### App Entry

`App.tsx` wraps the application with:

- gesture handling
- safe area handling
- React Query
- MMKV persistence
- auth provider
- theme provider

It then mounts the root navigator.

#### Navigation

The app uses React Navigation with:

##### Unauthenticated Flow
- Login
- SignUp
- ForgotPassword

##### Terms Flow
- TermsAcceptance

##### Authenticated Main App
- Home
- Analyze
- History
- Settings

##### Additional Screens
- SessionStatus
- Results
- PrivacyPolicy
- TermsOfService
- About

---

## Data Model Overview

### Exercise Types

Supported exercise types currently include:

- `single_strokes`
- `double_strokes`
- `paradiddles`

### Session Status

A session progresses through:

- `draft`
- `recording`
- `uploading`
- `queued`
- `processing`
- `completed`
- `failed`

### Analysis Results

An `AnalysisResult` may include:

- finger involvement score
- wrist involvement score
- arm involvement score
- symmetry score
- consistency score
- posture stability score
- overall score
- detailed metrics
- flags
- timeline events
- feedback items
- chart series

### User Profile Settings

User profiles may include:

- dark mode
- color blind mode
- high contrast mode
- skill level
- handedness

---

## Analysis API Responsibilities

The analysis service is responsible for:

- downloading recorded video from Firebase Storage
- sampling frames
- extracting pose and hand landmarks
- computing motion metrics
- detecting timing and motion consistency where relevant
- evaluating symmetry
- evaluating consistency
- evaluating posture stability
- generating thumbnails
- saving analysis results to Firestore
- updating session and job state in real time

---

## Prototype 1 Analysis Model

Prototype 1 is based on motion analysis from video using pretrained landmark detection via **MediaPipe Holistic**.

MediaPipe Holistic runs pose, hand, and face landmark detection in a single pipeline pass, providing:
- 33 pose landmarks (shoulders, elbows, wrists, etc.)
- 21 hand landmarks per hand (all finger joints from MCP to fingertip)

The implementation lives in `services/analysis-api/app/landmarks.py` and outputs per-frame trajectories for all landmark keys.

### Landmark Targets

- shoulders
- elbows
- wrists
- hands
- fingers

### Proposed Motion Categories

Prototype 1 estimates relative contribution from:

- fingers
- wrist
- arm

### Scoring Approach

The scoring model derives numeric estimates from visible motion trajectories over time. These are inferred movement contribution signals, not direct measurements of muscle activity.

Examples:

- finger contribution estimated from finger joint movement relative to the palm
- wrist contribution estimated from observed wrist displacement and angle change
- arm contribution estimated from elbow angle change and upper-arm displacement

These estimates are normalized across the clip so they sum to 100%, representing relative visible motion contribution — not physiological percentages.

### Approach Classification

Overall approach labels are derived from movement thresholds and score combinations using a deterministic rule-based classifier. Labels represent inferred motion patterns, not direct physiological truths.

Supported labels:

- `Arm-Heavy` — visible motion suggests arm-driven initiation
- `Fulcrum Lift` — compact motion pattern, low visible wrist break
- `Lead by the Bead` — wrist-led motion with forearm accompaniment
- `Wrist Break` — wrist-dominant motion with minimal arm contribution

---

## Accessibility

This project includes accessibility-focused preferences and UI support, including:

- dark mode
- high contrast mode
- color blind support
- persistent user settings

Accessibility remains an important part of the app experience.

---

## Research Context

This project is part of **SURP-2025** and explores how AI-assisted motion analysis can support percussion education and technique feedback.

The emphasis is on:

- interpretability
- practical coaching support
- controlled input conditions
- interactive review workflows
- usable feedback for students and instructors

---

## Non-Goals

This project does **not** currently aim to:

- measure true muscle activation or force production
- replace a human instructor
- support all camera angles
- perfectly evaluate all dimensions of drumming technique
- provide medical or injury-prevention advice
- perform stick tracking in Prototype 1

---

## Future Directions

Potential future expansions include:

- stick detection and pathway tracking
- more detailed hand analysis
- side-by-side rep comparison
- coach annotations
- calibration tools for camera setup
- more exercise types
- per-hand deeper breakdowns
- real-time capture guidance

---

## Development Status

This is an active research and prototype project. The current architecture includes:

- a React Native / Expo mobile app
- guided in-app recording
- Firebase-backed session and result management
- a Python / FastAPI analysis service
- landmark-based motion scoring
- real-time results delivery back into the app

Some metrics and labels are still experimental and subject to iteration.

---

## Running the Project

### Mobile App

```bash
yarn install
yarn start
```

You will need the `google-services.json` and `GoogleService-Info.plist` files in the root directory as well as the `.env` file.

### Analysis API

#### Run in Docker (production)

```bash
cd services/analysis-api
docker build -t analysis-api .
docker run --rm -p 8080:8080 analysis-api
```

#### Run tests in Docker

```bash
cd services/analysis-api
docker build --target test -t analysis-api-test .
docker run --rm analysis-api-test
```

#### Run tests locally (no mediapipe install required)

```bash
cd services/analysis-api
python3 -m pytest tests/ -v
```