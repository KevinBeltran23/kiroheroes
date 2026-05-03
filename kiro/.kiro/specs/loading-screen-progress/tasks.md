# Implementation Plan: Loading Screen Progress

## Overview

Implement the real-time loading screen by building pure utility functions first, then the two presentational components (`StageIndicator`, `AnalysisProgressBar`), and finally wiring everything into the updated `SessionStatusScreen`. Property-based and unit tests are co-located with each implementation step.

## Tasks

- [ ] 1. Install fast-check dev dependency
  - Run `yarn add --dev fast-check` inside the `kiroheroes/` directory
  - Verify the package appears in `devDependencies` in `package.json`
  - _Requirements: Testing strategy (design.md)_

- [ ] 2. Create `statusUtils.ts` — pure mapping utilities
  - Create `kiroheroes/src/components/status/statusUtils.ts`
  - Export `PIPELINE_STAGES` constant and `PipelineStage` type
  - Export `NodeState` type and `StageNodeConfig` interface
  - Implement `getStageNodes(status: SessionStatus): StageNodeConfig[]` following the rules: nodes before active index → `'completed'`, node at active index → `'active'` (or `'error'` when `status === 'failed'`), nodes after → `'pending'`; treat `'draft'` as `'uploading'`; when `status === 'completed'` all four nodes are `'completed'`
  - Implement `getProgressPercentage(status, lastKnownPercentage?)` mapping `uploading→25`, `queued→50`, `processing→75`, `completed→100`, `failed→lastKnownPercentage ?? 0`, `draft→0`
  - Implement `getStatusMessage(status, errorMessage?)` returning `{ title, body }` for every `SessionStatus` value per the message map in the design
  - Implement `getProgressAccessibilityLabel(status, percentage)` returning a string in the format `"<Stage label>, <percentage>% complete"`
  - Implement `isTerminalStatus(status)` returning `true` for `'completed'` and `'failed'`
  - Implement `isActiveStatus(status)` returning `true` for `'uploading'`, `'queued'`, and `'processing'`
  - Export a `getNodeVisuals(nodeState: NodeState)` helper returning `{ iconName, colorKey }` for use in `StageIndicator` and Property 7
  - No React imports — this file must be pure TypeScript with no side effects
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3, 4.4, 6.3_

- [ ] 3. Write unit tests for `statusUtils.ts`
  - [ ] 3.1 Create `kiroheroes/src/components/status/__tests__/statusUtils.test.ts`
    - Test `getStageNodes` for each `SessionStatus`: verify exact node states for `uploading`, `queued`, `processing`, `completed`, and `failed`
    - Test `getProgressPercentage` returns exact values (25, 50, 75, 100) for each named stage and that `failed` returns `lastKnownPercentage` when provided
    - Test `getStatusMessage` returns the correct title string for each status (e.g., `'uploading'` → `"Uploading clip"`)
    - Test `getStatusMessage` for `'failed'` uses `errorMessage` when provided and falls back to the generic string when `null`
    - Test `isTerminalStatus` returns `true` for `'completed'` and `'failed'`, `false` for all others
    - Test `getProgressAccessibilityLabel` format for a concrete example (e.g., `'processing', 75` → `"Processing, 75% complete"`)
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3_

  - [ ]* 3.2 Write property-based tests for `statusUtils.ts`
    - Create `kiroheroes/src/components/status/__tests__/statusUtils.property.test.ts`
    - Define `ALL_STATUSES` and `NODE_STATES` constant arrays for use as `fc.constantFrom` arbitraries
    - **Property 1: Stage node states are mutually consistent with status** — for any `SessionStatus`, `getStageNodes` returns exactly 4 nodes; exactly one node is `'active'` or `'error'` for non-terminal non-completed statuses; all nodes before the active/error index are `'completed'`; all nodes after are `'pending'`; when `'completed'` all four are `'completed'`; when `'failed'` exactly one is `'error'` and none is `'active'` — **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**
    - **Property 2: Progress percentage is always in [0, 100]** — for any `SessionStatus` and any `lastKnownPercentage` in [0, 100], `getProgressPercentage` returns a finite number in [0, 100] — **Validates: Requirements 2.3**
    - **Property 3: Status message always has non-empty title and body** — for any `SessionStatus` and any nullable `errorMessage`, `getStatusMessage` returns an object with `title.length > 0` and `body.length > 0` — **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
    - **Property 4: Failed error fallback always produces a non-empty string** — for any combination of nullable `jobErrorMessage` and nullable `sessionErrorMessage`, `getStatusMessage('failed', jobErr ?? sessionErr)` returns `body.length > 0` — **Validates: Requirements 3.6**
    - **Property 5: Terminal actions only appear in terminal states** — for any `SessionStatus`, `isTerminalStatus(status) === (status === 'completed' || status === 'failed')` — **Validates: Requirements 4.3, 4.4**
    - **Property 6: Status derivation always produces a valid SessionStatus** — for any combination of nullable job status and nullable session status, `jobStatus ?? sessionStatus ?? 'queued'` is always a member of `ALL_STATUSES` — **Validates: Requirements 5.3**
    - **Property 7: Node visuals always include both a color key and an icon name** — for any `NodeState`, `getNodeVisuals(nodeState)` returns an object where both `iconName` and `colorKey` are non-null non-empty strings — **Validates: Requirements 6.2**
    - **Property 8: Accessibility label contains stage name and percentage** — for any `SessionStatus` and any `percentage` in [0, 100], `getProgressAccessibilityLabel` returns a non-empty string containing at least one digit — **Validates: Requirements 6.3**
    - Each `fc.assert` call uses `{ numRuns: 100 }`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.3, 4.4, 5.3, 6.2, 6.3_

- [ ] 4. Checkpoint — verify utilities before building components
  - Ensure all tests in `statusUtils.test.ts` and `statusUtils.property.test.ts` pass
  - Ensure `tsc --noEmit` reports no errors in `statusUtils.ts`
  - Ask the user if any questions arise before proceeding to component work

- [ ] 5. Implement `StageIndicator` component
  - Create `kiroheroes/src/components/status/StageIndicator.tsx`
  - Accept `{ status: SessionStatus }` as props (named export `StageIndicator`)
  - Call `getStageNodes(status)` to derive the four `StageNodeConfig` objects
  - Render a horizontal `View` containing four `StageNode` sub-elements connected by thin connector lines
  - Each `StageNode` renders a `MaterialCommunityIcons` icon and a label below it using the icon name and color key from `getNodeVisuals(node.state)` — resolving the color key against `useColors()`
  - Use `scaleFont(11)` for labels; active node label uses `colors.textPrimary`, others use `colors.textSecondary`
  - Connector line between adjacent nodes renders in `colors.success` when the left node is `'completed'`, otherwise `colors.gray600`
  - The `active` node plays a looping scale pulse using `useSharedValue(1)` with `withRepeat(withSequence(withTiming(1.15, { duration: 600 }), withTiming(1.0, { duration: 600 })), -1)` from `react-native-reanimated`
  - Use `useColors()` for all colors and `useResponsiveStyles()` for all sizes — no hardcoded values
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 6.1, 6.2_

- [ ] 6. Implement `AnalysisProgressBar` component
  - Create `kiroheroes/src/components/status/AnalysisProgressBar.tsx`
  - Accept `{ status: SessionStatus; lastKnownPercentage?: number }` as props (named export `AnalysisProgressBar`)
  - Render a full-width track view (`colors.gray700`, height `scaleHeight(8)`, border-radius `proportionalSize(4)`)
  - Drive fill width with `useSharedValue(0)` animated via `withTiming(target, { duration: 600, easing: Easing.out(Easing.cubic) })` in a `useEffect` that fires when `status` changes; target comes from `getProgressPercentage(status, lastKnownPercentage)`
  - Apply `useAnimatedStyle` to set `width: \`${fillPercent.value}%\``
  - When `status === 'processing'`, start a shimmer overlay: a second `useSharedValue` oscillates opacity with `withRepeat(withSequence(withTiming(0.4, { duration: 800 }), withTiming(1.0, { duration: 800 })), -1, true)` on a white overlay `View` on top of the fill; cancel via `cancelAnimation` when status changes away from `'processing'`
  - When `status === 'failed'`, switch fill color to `colors.error` and cancel all animations
  - Set `accessibilityRole="progressbar"`, `accessibilityLabel={getProgressAccessibilityLabel(status, fillPercent.value)}`, and `accessibilityValue={{ min: 0, max: 100, now: fillPercent.value }}` on the animated fill view
  - Use `useColors()` for all colors and `useResponsiveStyles()` for all dimensions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.3_

- [ ] 7. Create barrel export
  - Create `kiroheroes/src/components/status/index.ts`
  - Re-export `StageIndicator`, `AnalysisProgressBar`, and all named exports from `statusUtils.ts`
  - _Requirements: (project conventions)_

- [ ] 8. Update `SessionStatusScreen`
  - Replace the body of `kiroheroes/src/screens/main/SessionStatusScreen.tsx` with the new layout
  - Retain existing data-fetching: `useLiveAnalysisJob` (with `jobId` param or `session.latestJobId` fallback) and `useSessionQuery`
  - Derive `displayStatus` and `displayError`:
    ```ts
    const status = job?.status ?? session?.status ?? 'queued';
    const errorMessage = job?.errorMessage ?? session?.errorMessage ?? 'The backend could not process this clip.';
    const displayStatus: SessionStatus = firestoreError ? 'failed' : status;
    const displayError = firestoreError ? 'Could not reach the server. Check your connection.' : errorMessage;
    ```
  - Render `StageIndicator` and `AnalysisProgressBar` inside the panel, passing `displayStatus` (and `lastKnownPercentage` to the bar)
  - Render title and body from `getStatusMessage(displayStatus, displayError)`; set `accessibilityLiveRegion="polite"` on the title `Text` element
  - Conditionally render "View Results" primary `Button` when `displayStatus === 'completed'`, navigating to `Results` with `sessionId`
  - Conditionally render "Try Again" primary `Button` when `displayStatus === 'failed'`, navigating to `NewSession`
  - Always render "Back to Home" ghost `Button` navigating to `Main`
  - Remove the old `ActivityIndicator` and inline status `Text`
  - Use `useColors()` and `useResponsiveStyles()` for all styling; no hardcoded values
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.4_

- [ ] 9. Final checkpoint — ensure all tests pass
  - Run `yarn typecheck` (i.e., `tsc --noEmit`) from `kiroheroes/` and resolve any type errors
  - Run the test suite and confirm all unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Sub-tasks marked with `*` are optional and can be skipped for a faster MVP
- All tasks reference specific requirements for traceability
- `statusUtils.ts` must remain free of React imports — pure TypeScript only
- `getNodeVisuals` is a utility-layer helper needed by both `StageIndicator` and the Property 7 test; keep it in `statusUtils.ts`
- The `NewSession` route must exist in `RootStackParamList` before the "Try Again" button can be wired up; if it is absent, add it to `src/navigation/types.ts` as part of task 8
- Property tests use `fast-check` installed in task 1; do not run property tests before task 1 is complete
