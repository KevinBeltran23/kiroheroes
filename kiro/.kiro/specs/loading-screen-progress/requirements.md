# Requirements Document

## Introduction

The loading screen with progress feature replaces the current minimal `SessionStatusScreen` with a visually engaging, real-time progress experience for the StickSplit video analysis pipeline. As a user's clip moves through the `uploading → queued → processing → completed / failed` status flow, the screen reflects each stage with a step indicator, animated progress bar, contextual messaging, and clear terminal states. Status is driven by live Firestore subscriptions on the `AnalysisJob` document, consistent with the existing `useLiveAnalysisJob` hook.

---

## Glossary

- **Loading_Screen**: The `SessionStatusScreen` component located at `src/screens/main/SessionStatusScreen.tsx`, rendered after the user submits a new session.
- **Pipeline_Stage**: One of the four user-visible phases of the analysis pipeline: `uploading`, `queued`, `processing`, `completed` (or `failed`).
- **Stage_Indicator**: A horizontal row of labelled step nodes that visually marks which Pipeline_Stage is active, completed, or pending.
- **Progress_Bar**: An animated horizontal bar whose fill width reflects the current Pipeline_Stage's estimated progress.
- **Job_Document**: The Firestore document in the `analysisJobs` collection, subscribed to via `useLiveAnalysisJob`.
- **Session_Document**: The Firestore document in the `sessions` collection, subscribed to via `useSessionQuery`.
- **SessionStatus**: The `SessionStatus` type defined in `src/types/analysis.ts`: `'draft' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'`.

---

## Requirements

### Requirement 1: Stage Indicator

**User Story:** As a drummer waiting for analysis, I want to see which pipeline stage my clip is in, so that I understand where I am in the process and how much is left.

#### Acceptance Criteria

1. THE Loading_Screen SHALL display a Stage_Indicator containing four labelled nodes: "Uploading", "Queued", "Processing", and "Done".
2. WHEN the active SessionStatus is `uploading`, THE Stage_Indicator SHALL render the "Uploading" node as active and all subsequent nodes as pending.
3. WHEN the active SessionStatus is `queued`, THE Stage_Indicator SHALL render the "Uploading" node as completed, the "Queued" node as active, and subsequent nodes as pending.
4. WHEN the active SessionStatus is `processing`, THE Stage_Indicator SHALL render "Uploading" and "Queued" nodes as completed, the "Processing" node as active, and "Done" as pending.
5. WHEN the active SessionStatus is `completed`, THE Stage_Indicator SHALL render all four nodes as completed.
6. WHEN the active SessionStatus is `failed`, THE Stage_Indicator SHALL render the active node at the time of failure as an error state and all subsequent nodes as pending.
7. THE Stage_Indicator SHALL use `useColors()` for all color values and `useResponsiveStyles()` for all size and layout dimensions.

---

### Requirement 2: Animated Progress Bar

**User Story:** As a drummer waiting for analysis, I want to see a smooth animated progress bar, so that the screen feels alive and I can gauge how far along the pipeline has advanced.

#### Acceptance Criteria

1. THE Loading_Screen SHALL display a Progress_Bar below the Stage_Indicator.
2. WHEN the active SessionStatus transitions to a new Pipeline_Stage, THE Progress_Bar SHALL animate its fill width to the target percentage for that stage within 600 ms using React Native Reanimated.
3. THE Progress_Bar SHALL map Pipeline_Stages to the following target fill percentages: `uploading` → 25%, `queued` → 50%, `processing` → 75%, `completed` → 100%.
4. WHILE the active SessionStatus is `processing`, THE Progress_Bar SHALL animate a continuous shimmer or pulse effect to indicate active work.
5. WHEN the active SessionStatus is `failed`, THE Progress_Bar SHALL display in the error color from `useColors()` and stop all animation.
6. THE Progress_Bar SHALL use `useColors()` for all color values and `useResponsiveStyles()` for height and border-radius dimensions.

---

### Requirement 3: Contextual Status Messaging

**User Story:** As a drummer waiting for analysis, I want to read a short description of what is happening at each stage, so that I am not left wondering what the app is doing.

#### Acceptance Criteria

1. THE Loading_Screen SHALL display a title and a body message that correspond to the active SessionStatus.
2. WHEN the active SessionStatus is `uploading`, THE Loading_Screen SHALL display the title "Uploading clip" and a body message describing the video transfer to Firebase Storage.
3. WHEN the active SessionStatus is `queued`, THE Loading_Screen SHALL display the title "In the queue" and a body message indicating the clip is waiting for the analysis worker.
4. WHEN the active SessionStatus is `processing`, THE Loading_Screen SHALL display the title "Analyzing motion" and a body message describing the MediaPipe Pose landmark extraction and scoring pipeline.
5. WHEN the active SessionStatus is `completed`, THE Loading_Screen SHALL display the title "Analysis ready" and a body message inviting the user to view results.
6. WHEN the active SessionStatus is `failed`, THE Loading_Screen SHALL display the title "Analysis failed" and a body message showing the `errorMessage` field from the Job_Document or Session_Document, falling back to a generic error string when both are null.
7. THE Loading_Screen SHALL use `useColors()` for all text color values and `useResponsiveStyles()` for all font sizes.

---

### Requirement 4: Terminal State Actions

**User Story:** As a drummer whose analysis has finished or failed, I want clear action buttons, so that I can navigate to results or return home without confusion.

#### Acceptance Criteria

1. WHEN the active SessionStatus is `completed`, THE Loading_Screen SHALL display a primary "View Results" button that navigates to the `Results` screen with the current `sessionId`.
2. WHEN the active SessionStatus is `failed`, THE Loading_Screen SHALL display a primary "Try Again" button that navigates back to the `NewSession` screen.
3. THE Loading_Screen SHALL display a ghost "Back to Home" button at all times that navigates to the `Main` tab.
4. WHILE the active SessionStatus is `uploading`, `queued`, or `processing`, THE Loading_Screen SHALL NOT display the "View Results" or "Try Again" buttons.
5. THE Loading_Screen SHALL use the existing `Button` component from `src/components/common/Button.tsx` for all action buttons.

---

### Requirement 5: Real-Time Firestore Subscription

**User Story:** As a drummer waiting for analysis, I want the screen to update automatically when the job status changes in Firestore, so that I never need to manually refresh.

#### Acceptance Criteria

1. THE Loading_Screen SHALL subscribe to the Job_Document via `useLiveAnalysisJob` using the `jobId` route parameter or `session.latestJobId` as a fallback.
2. WHEN the Job_Document status field changes in Firestore, THE Loading_Screen SHALL update the Stage_Indicator, Progress_Bar, and status messaging within one render cycle.
3. WHEN the `useLiveAnalysisJob` hook returns a null job and the Session_Document status is available, THE Loading_Screen SHALL derive the active SessionStatus from the Session_Document.
4. IF the Firestore subscription emits an error, THEN THE Loading_Screen SHALL display the error state with the message "Could not reach the server. Check your connection."
5. THE Loading_Screen SHALL unsubscribe from the Firestore listener when the component unmounts.

---

### Requirement 6: Accessibility

**User Story:** As a drummer using accessibility features, I want the loading screen to be usable in high contrast and color blind modes, so that the progress information is always legible.

#### Acceptance Criteria

1. THE Loading_Screen SHALL use `useColors()` exclusively for all color values so that dark mode, high contrast mode, and color blind mode are applied automatically.
2. THE Stage_Indicator SHALL convey stage state (active, completed, pending, error) using both color and a distinct icon or shape, so that color alone is not the only differentiator.
3. THE Progress_Bar SHALL include an `accessibilityLabel` that describes the current Pipeline_Stage and estimated progress percentage as a string (e.g., "Processing, 75% complete").
4. THE Loading_Screen SHALL set `accessibilityLiveRegion="polite"` on the status title so that screen readers announce stage transitions.
