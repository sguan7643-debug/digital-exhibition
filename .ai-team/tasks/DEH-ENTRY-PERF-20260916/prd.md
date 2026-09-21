# PRD — Feishu entry authentication and first-screen request performance repair

## 1. Product goal and target user value

**Goal.** Let a Digital Exhibition Web user who opens either the local root path (`/`) or the deployed `/test2` base path enter Feishu OAuth before any protected page read begins.  Once authenticated, the workbench first screen must make the affected reads bounded, deduplicated, diagnosable, and recoverable rather than leaving the user waiting for the previous 30-second client fallback.

**Target user value.** Users get a clear, secure entry decision before data loads, prompt usable first-screen feedback, and a meaningful retry path when a read cannot complete.  They should not encounter a rendered page that silently fires protected requests and returns 401 errors.

## 2. Facts, open assumptions, and evidence

### Facts

| Fact | Evidence |
| --- | --- |
| This is a Web/Vue repair for local-root and deployed-`/test2` users. | `task.json`: `platforms=["web"]`, `web_framework="vue"`, target user; task brief delivery boundary. |
| The current problem permits unauthenticated root-path rendering before protected reads. | Task brief objective. |
| `COM-001`, `COM-002`, and `WB-001` returned HTTP 401 in roughly 4–7 ms on the workbench first screen. | Task brief observed evidence. |
| `WB-002` returned HTTP 502 after about 15.7 seconds; `COM-005` returned HTTP 200 after about 25.2 seconds. | Task brief observed evidence. |
| The existing 30-second value is a client fallback, not an accepted Feishu response target. | Task brief observed evidence. |
| Browser tokens must not be stored; HttpOnly session handling must remain in place. | Task brief delivery boundary. |
| The requested repair includes base-aware session guarding, safe OAuth return preservation, bounded/deduplicated/diagnosable workbench reads, affected first-screen states, and read-only verification. | `task.json` `in_scope`; task brief requested outcome. |
| Credentials, callback settings, permissions, Feishu data writes, deployment/release, unrelated redesign, and changes to `DEH-LIVE-101-20260914` history are excluded. | `task.json` `out_of_scope`; task brief delivery boundary; decision log. |

### Open assumptions — require confirmation during design/implementation evidence

| Assumption | Why it is not a fact yet | Required confirmation |
| --- | --- | --- |
| The same HttpOnly session probe can be used for both base paths once its base-path decision is made configuration-aware. | The packet requires both paths but does not identify the existing guard implementation or its configuration contract. | Code inspection and automated route-entry tests. |
| The observed long reads are reducible through request-plan deduplication, bounded retry/timeout behavior, and shared in-flight/cached reads. | The packet identifies the required behaviors, not the exact upstream call graph or bottleneck. | Instrumented request evidence and read-only verification. |
| A bounded failure can be surfaced without exposing credentials, session values, or Feishu record content. | The task requires actionable diagnosis but does not prescribe the error-envelope fields. | Security-conscious design review of the sanitized diagnostics contract. |
| The existing `/test2` deployment can receive the required non-secret base-path configuration without changing external callback configuration. | Deployment/configuration mechanism is not stated in the packet. | Implementation handoff and environment-safe verification. |

## 3. Scope boundaries

### In scope

- A base-path-aware entry-session decision for local `/` and deployed `/test2` URLs.
- OAuth redirection before protected business reads, while preserving the intended safe internal return path, query, and hash.
- Base-path-safe internal route resolution after callback/return.
- A bounded first-screen plan for `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002`, including deduplication, upstream timeout/retry budgeting, and safe diagnostics.
- First-screen states that communicate loading, recoverable failure, and retry without an opaque whole-page long wait.
- Automated verification plus read-only real-environment verification.

### Out of scope

- Feishu app credentials, OAuth callback registration, permissions, or tenant/business configuration changes.
- Browser storage of authentication tokens or any relaxation of HttpOnly-session handling.
- Writing, deleting, or altering Feishu records.
- Production deployment, release approval, or unrelated visual/page redesign.
- Altering the historical state or repair-attempt count of `DEH-LIVE-101-20260914`.

## 4. Primary user flow

1. **Entry:** User opens a URL under the active application base: local `/...` or deployed `/test2/...`.
2. **Session decision:** Before Vue/page data work starts, the application performs the existing same-origin HttpOnly session check for that base.
3. **Unauthenticated branch:** If the session response is unauthenticated, the browser starts the existing Feishu OAuth entry flow. The safe internal path, query, and hash are retained for the return target. No protected page operation is issued first.
4. **Session unavailable branch:** If the session decision cannot complete because of a transport/server fault, the user receives a recoverable entry-state with retry. Protected first-screen reads do not start from an unknown authentication state.
5. **Authenticated route resolution:** When authenticated, internal routing resolves the same logical page under either application base and renders the workbench.
6. **Bounded read plan:** The workbench requests only the required affected operations through a deduplicated, bounded plan. Shared/in-flight inputs are not repeatedly requested during the same first-screen load.
7. **Outcome:** Successful data renders normally. A bounded operational failure is shown in the affected region with a retry action and safe diagnostic context; it must not masquerade as a long silent wait.

## 5. State inventory

| State | Trigger | Required user-visible behavior | Protected reads permitted? |
| --- | --- | --- | --- |
| Entry checking | Application is deciding the HttpOnly session state. | Brief entry loading status; controls do not imply page data is ready. | No. |
| OAuth redirecting | Session is unauthenticated. | Redirect to existing Feishu OAuth flow; return target remains a safe internal route. | No. |
| Entry unavailable | Session check fails by network/server fault. | Recoverable entry error with retry; do not render an authenticated-looking data page. | No. |
| Authenticated first-screen loading | Session is confirmed and workbench reads begin. | Clear first-screen loading feedback with operation progress; no indefinite 30-second fallback wait. | Yes, within bounded plan. |
| First-screen success | Affected read returns valid data. | Render the corresponding workbench content. | N/A. |
| Empty result | Affected read completes with no records/content. | Render the existing appropriate empty state, distinct from error. | N/A. |
| Recoverable request error | Affected read reaches its bounded failure/timeout/retry outcome. | Keep the rest of the page usable; identify the affected region and offer retry. Show only safe, actionable diagnostics. | Retry only after confirmed session. |
| Disabled/unavailable action | A retry/load action is already in progress or entry state is unresolved. | Prevent duplicate invocation and state why the action is temporarily unavailable. | No additional duplicate read. |
| Permission-dependent failure | Confirmed session lacks permission for an affected read. | Show a permission-specific, recoverable/instructional state; do not classify it as an unauthenticated entry. | No repeated automatic protected retry. |

## 6. Explicit non-goals / things not to do

- Do not treat a 30-second client fallback as an acceptable first-screen experience.
- Do not bypass Feishu OAuth, use browser token storage, or expose session/token/credential values in diagnostics.
- Do not retry indefinitely, fan out duplicate reads, or turn a local upstream failure into a blocking full-page spinner.
- Do not change Feishu credentials, callbacks, permissions, records, deployment, release state, or unrelated pages.
- Do not claim a universal Feishu latency SLA; this task only establishes application-side bounded behavior and records actual read-only verification evidence.

## 7. Acceptance criteria

### Entry and routing

1. **Given** a user opens any local-root application route without a valid HttpOnly session, **when** entry initialization runs, **then** the user is directed to the existing Feishu OAuth flow before `COM-001`, `COM-002`, `COM-005`, `WB-001`, or `WB-002` begins.
2. **Given** a user opens any deployed `/test2` application route without a valid HttpOnly session, **when** entry initialization runs, **then** the same OAuth-before-protected-read behavior occurs without hard-coding a one-path-only guard.
3. **Given** an unauthenticated entry URL contains a safe internal path, query, and hash, **when** OAuth returns successfully, **then** the application returns to that logical route under the active base path.
4. **Given** an authenticated user opens a supported route under `/` or `/test2`, **when** application routing resolves the route, **then** it renders the intended page rather than a page-not-found state caused by the base prefix.
5. **Given** the entry session probe has a transport or server failure, **when** initialization completes, **then** the application displays a retryable entry failure and does not issue protected workbench reads from an unknown session state.

### First-screen reads and states

6. **Given** an authenticated workbench entry, **when** the first-screen request plan runs, **then** requests for `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002` use a bounded, deduplicated plan instead of duplicate equivalent reads during the same initial load.
7. **Given** an affected Feishu upstream request becomes slow or transiently unavailable, **when** its configured timeout/retry budget is exhausted, **then** the operation completes as a bounded failure before the previous 30-second client fallback and returns safe actionable diagnostic context.
8. **Given** one affected first-screen operation has a bounded failure, **when** the workbench is otherwise renderable, **then** unaffected regions remain usable and the affected region provides a retry control rather than blocking the full page indefinitely.
9. **Given** an affected first-screen operation returns no content, **when** it completes successfully, **then** the user sees an empty state distinct from authentication, permission, and transport failures.
10. **Given** a confirmed session lacks permission for an affected read, **when** the operation returns its permission outcome, **then** the user receives a permission-dependent state and the application does not automatically reissue duplicate protected reads.
11. **Given** a user selects retry for a bounded affected failure, **when** the retry is active, **then** duplicate retry invocation is disabled until that attempt reaches success, empty, permission, or bounded-error state.

### Evidence and safety

12. **Given** the implementation is ready for verification, **when** automated tests and the Web build are run, **then** they cover the entry branches, base paths, bounded request behavior, and affected first-screen states without requiring live writes.
13. **Given** a real-environment verification is run, **when** it exercises this task, **then** it uses read-only requests and records timing/outcome evidence without exposing credentials, session values, or Feishu business data.

## 8. Open questions and scope decisions needed for approval

1. **Decision required:** Approve the scope baseline above, including a dedicated configuration-aware application-base contract for `/` and `/test2`, rather than retaining a hard-coded `/test2` entry condition.
2. **Decision required:** Approve the defined security behavior for a session-probe network/server failure: show a retryable entry state and suppress protected reads until session state is known.
3. **Decision required:** Approve the user-facing bounded-failure policy: an affected workbench region may show an actionable retry while unaffected first-screen regions remain usable; it must not hold the whole page in an opaque long wait.

After the scope decision, the AI Team Lead must record it and route the task to UX/design; this PRD itself does not approve scope, alter task state, or authorize implementation.
