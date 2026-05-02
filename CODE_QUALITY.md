Repo conventions inherited from old-proj:
Firebase calls live under src/services/firebase
TanStack Query wrappers live under src/services/store
domain types live under src/types
screens stay thin when logic grows
reusable UI lives under src/components
TanStack Query rules:
keep a central queryClient
preserve MMKV persistence unless it causes stale job-state issues
use stable query keys like ['sessions', userId] and ['analysisResult', sessionId]
use enabled for user/session-dependent queries
invalidate session/result queries after mutations
use Firestore subscriptions for live job status where polling would be awkward
Firebase rules:
isolate Firestore/Storage/Auth APIs behind typed service functions
use server timestamps for backend-owned state
never expose internal error messages directly to users
keep Storage paths scoped by user/session
State and architecture rules:
Auth remains context-based
server/cache state goes through TanStack Query or Firestore listeners
local UI-only state stays in component hooks
avoid global contexts unless the state is truly app-wide
Styling rules:
use useColors and useResponsiveStyles
avoid hard-coded colors except when extending the theme
keep cards/components at practical mobile sizes
Backend quality rules:
FastAPI endpoints should be small orchestration layers
metric computation should be testable pure Python modules
backend must write clear failed/completed job states
Verification:
TypeScript check
lint
basic upload/job creation test
backend unit tests for analysis helpers
one manual end-to-end sample video test
