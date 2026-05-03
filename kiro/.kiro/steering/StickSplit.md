# StickSplit — Project Steering Rules

## What This Project Is

StickSplit is a guided-capture mobile app for marching drummers. Users record a practice rep in-app, and a Python analysis API processes the video using MediaPipe Pose to estimate bicep, forearm, and wrist break contribution. Results are delivered back to the app in real time via Firestore.

This is a SURP-2025 research prototype. It is not a medical or biomechanics tool.

---

## Framing Rules

- Always describe scores as "estimated movement contribution" or "motion-based contribution indicators"
- Never describe them as "actual muscle usage", "physiological measurement", or "true biomechanics"
- The three contribution metrics (bicep, forearm, wrist break) are **independent** — they do not sum to 100

---

## What Is In Scope (Prototype 1)

- In-app video selection and upload
- Guided session setup (exercise type, drum height, camera angle)
- MediaPipe Pose landmark extraction (shoulders, elbows, wrists, index/pinky/thumb tips)
- Bicep, forearm, and wrist break contribution scoring
- Approach classification: Arm-Heavy, Wrist Break, Fulcrum Lift, Lead by the Bead
- Supporting scores: timing, symmetry, stroke consistency, posture stability
- Interactive results dashboard with video scrubbing and timeline chart
- Real-time job and result updates via Firestore subscriptions
- Firebase Auth (email/password + Google Sign-In)
- Dark mode, high contrast, color blind mode

## What Is Out of Scope (Do Not Implement)

- Stick tracking or bead angle detection
- True physiological muscle activation measurement
- Live real-time feedback during playing
- Arbitrary camera angles
- Side-by-side rep comparison
- Custom trained CV or ML models
- MediaPipe Hands (21-landmark model) — Pose only for Prototype 1

---

## Mobile App Conventions

- All source lives under `kiroheroes/src/` — never add source files outside this directory
- Screens go in `src/screens/<group>/`, named `<Name>Screen.tsx`
- Reusable UI components go in `src/components/<group>/` with a barrel `index.ts`
- Firebase data access is isolated in `src/services/firebase/` — one file per collection
- TanStack Query logic lives in `src/services/store/`
- All shared types are in `src/types/` — use `analysis.ts` for session/result types, `user.ts` for user profile
- Navigation param types are in `src/navigation/types.ts` — keep in sync with navigators
- Use `useColors()` for all color values — never hardcode hex values in components
- Use `useResponsiveStyles()` for all font sizes and layout dimensions
- Prefer named exports; avoid default exports for components and utilities
- Strict TypeScript — avoid `any` except at Firebase document boundaries
- Always use `yarn`, never `npm`

---

## Analysis API Conventions

- The pipeline order is fixed: download → sample frames → extract landmarks → compute metrics → shape result → write to Firestore
- Each pipeline stage has its own module — keep them single-responsibility
- Pydantic models for all request/response shapes live in `models.py`
- Firebase interactions are centralized in `firebase_client.py`
- Job and session status must be updated in Firestore at the start and end of every analysis run
- Any landmark with `visibility < 0.35` must be stored as `NaN` — never use low-confidence landmarks
- All metric functions must be NaN-safe

---

## Firestore Collections

- `sessions` — AnalysisSession documents
- `analysisJobs` — AnalysisJob documents, linked to a session
- `analysisResults` — AnalysisResult documents, linked to a session
- `users` — user profile documents

## Session Status Flow

`draft` → `uploading` → `queued` → `processing` → `completed` / `failed`

---

## Tech Stack Summary

- Mobile: React Native 0.81 + Expo SDK 54, TypeScript, React Navigation v7, TanStack React Query v5, MMKV, Skia, Reanimated
- Backend: Python 3, FastAPI, MediaPipe 0.10, OpenCV 4.10, NumPy, Pydantic v2, Firebase Admin SDK, Docker
- Package manager: Yarn 4 (Berry)
- Builds: EAS (Expo Application Services)
