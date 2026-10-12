# Front-end Code Review

## Findings

### Finding: A terminal prewarm failure can leave sibling Feishu reads active

- **Severity:** P1
- **File/Line:** `server/feishu-read-only-service.mjs:4128`, `server/feishu-read-only-service.mjs:4205`, `server/feishu-read-only-service.mjs:4651`, `tools/server-cache-contract-repair.test.mjs:64`
- **Evidence:** The approved design requires bounded startup work and no orphaned work. `COM-005` starts several dictionary reads in parallel. When one child exhausts the operation retry budget, `executeRefreshWithRetry()` rethrows without cancelling or draining sibling reads; `startOperationRefresh()` then clears its root deadline timer and removes the operation from `operationPending` as soon as the raced operation promise rejects. An independent adversarial probe made `应用类型配置` fail three times with `FEISHU_UPSTREAM_TIMEOUT` while `素材分类` remained slow. `prewarm()` rejected with `FEISHU_UPSTREAM_TIMEOUT`, yet immediately afterward the service still reported `tableReads: 1` and `feishuSyncs: 1`, and the slow request had not been aborted. The new regression test covers only a single transient failure followed by success and never asserts zero in-flight/queued work after terminal failure.
- **Impact:** Readiness can become terminally failed while detached startup I/O continues consuming a global synchronization slot and Feishu quota. Because onboarding prewarm starts after homepage prewarm settles, that leftover work can contend with the next startup phase despite the failed operation no longer being tracked as active. This violates the bounded-operation/no-orphan requirement and weakens the concurrency and recovery guarantees that this repair is intended to restore.
- **Recommendation:** Give every retry attempt an abortable child scope. On an attempt failure, abort and await all sibling page reads before applying backoff or starting the next attempt; on terminal failure, abort the root operation and drain all page/slot work before `prewarm()` settles or the operation leaves `operationPending`. Add a regression in which one parallel `COM-005` child exhausts retries while another blocks, then assert immediate abort plus zero `tableReads`, `feishuSyncs`, and queued syncs at rejection.

### Finding: Startup terminal events are not correlated with their operation timeline

- **Severity:** P2
- **File/Line:** `server/feishu-read-only-service.mjs:304`, `server/feishu-read-only-service.mjs:4628`, `tools/server-cache-contract-repair.test.mjs:92`
- **Evidence:** `prewarmOperation()` emits `startup-prewarm` start/completed/failed events outside the bounded operation's async task context and supplies only `operationId` plus partial failure fields. `emitCacheEvent()` therefore serializes these terminal events with `traceId: null`, `syncId: null`, `keyDigest: null`, `attempt: 0`, and `elapsedMs: 0`; `error.prewarmResource` is also not populated by the new page-read path. Independent execution reproduced these null correlation fields. The added test checks correlation only on `feishu-read-page` events, not on the startup lifecycle or terminal failure event.
- **Impact:** Operators can see correlated page events but cannot reliably join the readiness-level failure/completion to the exact trace, sync task, key, final attempt, resource, or elapsed time. That leaves the AC-16/design observability gap partially open and makes another startup timeout harder to diagnose safely.
- **Recommendation:** Allocate the startup operation's trace/sync identifiers and start time before dispatch, pass them into `executeBackground()`, and emit the same identifiers, digest, final attempt, safe resource/path, and elapsed time on every `startup-prewarm` transition. Add success and terminal-failure assertions for complete correlation and for exclusion of tokens, cookies, secrets, raw descriptors, and business payloads.

### Finding: The startup repair test does not enforce the fixed retry, deadline, concurrency, or ordering contracts

- **Severity:** P2
- **File/Line:** `tools/server-cache-contract-repair.test.mjs:64`
- **Evidence:** The new scenario replaces `readSleep` with a no-op, checks only that total calls are greater than one, and checks only that page-event operation IDs belong to an allowed set. It does not prove the required 500/1000 ms backoff sequence, maximum three attempts, one 25-second budget including queueing and persistence, maximum active concurrency of three, cancellation at deadline, zero work after terminal settlement, or that `WB-001` begins only after both `COM-005` and `WB-002` have fully settled. The focused test and `npm run test:server-cache` pass, but the P1 probe above demonstrates why the missing failure-path assertion matters.
- **Impact:** Regressions in the exact controls introduced by this repair can pass the named contract suite and be packaged for deployment, including the terminal cleanup defect already present.
- **Recommendation:** Add deterministic tests with a fake clock and controllable client gates that assert attempts `[1,2,3]`, backoffs `[500,1000]`, a hard deadline at or before 25 seconds across queue/read/commit work, peak upstream concurrency `<= 3`, explicit `COM-005`/`WB-002` completion before the first `WB-001` request, and fully drained counters on every success, failure, and timeout exit.

## Out-of-Scope Observations

### Observation: Current dirty front-end state prevents reproducing the handoff's clean integration claim

- **File/Line:** `src/integration/page-read-request-plan.js:1`
- **Evidence:** The required handoff attributes the existing `src/**` changes to other work, but the current workspace has multiple tracked/untracked front-end changes and `git diff --name-only -- src dist` is not empty. An independent `npm run test:integration` run failed at `tools/feishu-page-read-request-plan.test.mjs:21` because the current plan contains `APP-003` while that test expects four operations. The scoped startup/cache suites passed, and this mismatch is outside the requested backend repair/package review.
- **Recommendation:** Reconcile or isolate the unrelated front-end work before relying on a clean full-integration result for QA; do not fold those changes into this backend repair package without separate governed scope.

## Verdict

changes_required

## Review Boundary

- Required inputs were complete for state `qa`: task record/brief, approved PRD and design sources, diffs, relevant tests, aggregate engineering handoff, and the declared Web handoff. Mobile is not declared and its handoff correctly records that fact.
- Reviewed the current startup-prewarm implementation, its focused regression test, relevant retry/deadline/concurrency/persistence/security paths, the staged package source, and deployment artifact identity.
- Independent passes: `node tools/server-cache-contract-repair.test.mjs`, `npm run test:server-cache`, `node tools/homepage-aggregate.test.mjs`, `node tools/feishu-cache-authorization.test.mjs`, `node tools/server-cache-code-review-findings.test.mjs`, and `npm run test:test-deployment`.
- Package verification: ZIP SHA-256 and sidecar both equal `02126806aa3012e85c94af860484fa6391c8513779a4bd0ae428f0f79cf46611`; workspace, staged, and ZIP-embedded `server/feishu-read-only-service.mjs` share SHA-256 `1a6902baf94035497c913860f20b3e66a365cdab8c0068a330223299d973e1e6`; the ZIP has 372 entries and the reviewed forbidden-entry scan found none.
- No deployment, publication, merge approval, task-state change, implementation edit, test edit, handoff edit, or release decision was performed. This review writes only this file.
