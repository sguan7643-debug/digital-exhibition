# Web Engineering Handoff — Homepage Aggregate Read

## Repository and Task Branch

- Repository: `web-task-merged`
- Base/working commit: `766b33b016f1c9d92b3c5f258094c29cbd41dfca`
- Task branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Framework: Vue 3 with a Node/Vite same-origin middleware runtime.
- Approved boundary: Web only. No deployment, publication, GitHub push, merge, persisted cache, mock business data, or non-homepage workflow change was performed.

## Approved Inputs

- Product: `../prd.md`, scope approval recorded in `../task.json`.
- Interaction and visual design: `../design-handoff.md`, sourced from `../design/ux-handoff.md` and `../design/ui-handoff.md`; design approval recorded in `../task.json`.
- Homepage operations: `COM-001`, `COM-002`, `COM-005`, `WB-001`, `WB-002`.
- Required response contract: one aggregate request, 25-second application collection budget, less than 30-second browser request boundary, `200 fresh/stale/partial` or `202 syncing`, two-second lightweight polling, one refetch after completion, and stale-snapshot retention.

## Changed Files

- `server/homepage-aggregate-service.mjs`: identity/permission/input/version-scoped single-flight tasks, aggregate snapshot response, status lookup, exact public homepage prewarm, readiness, stale/partial behavior, and bounded response wait.
- `server/homepage-aggregate-middleware.mjs`: same-origin aggregate, status, liveness, and readiness HTTP routes with validation and controlled errors.
- `server/feishu-read-only-service.mjs`: uncapped 35-second default read budget plus cache inspection and shared in-flight fresh execution APIs; failed refresh does not remove the prior success entry.
- `server/feishu-open-api-client.mjs`: uncapped 20-second default upstream timeout.
- `server/feishu-vite-plugin.mjs`: aggregate service/middleware wiring and tracked homepage prewarm.
- `src/integration/homepage-aggregate-client.js`: one tracked aggregate request and untracked lightweight status polling, both same-origin and bounded.
- `src/integration/page-data-source.js`: homepage aggregate adaptation, polling lifecycle, one post-completion refetch, forced manual retry, and cancellation.
- `src/integration/data-state.js`: aggregate refresh/sync state fields.
- `src/integration/runtime-config.js`: 30-second browser default without the old 12-second cap.
- `src/App.vue`: two-second status polling, 60-second stop, retry, route/unmount cleanup, stale-content preservation, and recoverable bubble behavior.
- `tools/homepage-aggregate.test.mjs`: aggregate, eight-request single-flight, zero-call polling, identity isolation, stale retention, exact prewarm/readiness, middleware, and client-flow tests.
- `tools/homepage-aggregate-browser.test.mjs`: real Edge/Chromium recovery, auto-close, manual dismissal, keyboard-labelled controls, reduced-motion, and 320/760/1366/1920px bubble checks.
- `tools/feishu-open-api-client.test.mjs`, `tools/feishu-read-latency-cache.test.mjs`, `tools/page-read-request-plan.test.mjs`, `tools/first-screen-request-budget.test.mjs`, `tools/test-deployment-server.test.mjs`, `tools/feishu-integration-foundation.test.mjs`: updated timeout, health, and current remote-contract expectations.
- `package.json`: focused aggregate test command.
- `README-DEPLOY.md`, `server/README.md`, `nginx-test.conf`: endpoint, readiness, timeout, and reverse-proxy guidance.

## Commands and Exact Results

- `node tools/feishu-open-api-client.test.mjs`: exit 0; 20-second upstream deadline and token single-flight passed.
- `node tools/feishu-read-latency-cache.test.mjs`: exit 0; 35-second read budget, warm cache, cold syncing, identity isolation, merge, and stale refresh passed.
- `node tools/page-read-request-plan.test.mjs`: exit 0; workbench request-plan deduplication and 30-second browser default passed.
- `npm run test:first-screen-budget`: exit 0; timeout cleanup and local recovery passed.
- `npm run test:test-deployment`: exit 0; `/test2/`, redirect, same-origin API mount, asset base, and traversal checks passed.
- `npm run test:no-mock-data`: exit 0; no mock business data passed.
- `npm run test:homepage-aggregate`: exit 0; single-flight, zero-call polling, stale fallback, refresh after a successful snapshot becomes stale, task expiry, exact prewarm, middleware, client flow, 29-second server cap, and 100-request warm benchmark passed; synthetic warm p95 was 0.01 ms.
- `npm run test:homepage-aggregate:browser`: exit 0 against the running `/test2/` application with intercepted authenticated aggregate contracts; recovery auto-close, one post-completion refetch, same-generation manual dismissal, accessible controls, reduced motion, and 320/760/1366/1920px geometry passed.
- `node tools/feishu-server-proxy.test.mjs`: exit 0; server-only credentials, identifier contract, pagination, and read-only gate passed.
- `node tools/feishu-public-read-batch.test.mjs`: exit 0; public read projections and input guards passed.
- `node tools/feishu-workbench-search.test.mjs`: exit 0; `WB-002` facets and pagination passed.
- `node tools/feishu-personal-read-batch.test.mjs`: exit 0; personal/workbench identity scoping passed.
- `node tools/feishu-current-user-operation.test.mjs`: exit 0; `COM-001/002` identity and permission scoping passed.
- `node tools/feishu-entry-auth-guard.test.mjs`: exit 0; authorization entry guard passed.
- `npm run check`: exit 0; source, deterministic, semantics, and asset audit passed.
- `npm run build`: exit 0; 1932 modules transformed; `dist/index.html`, CSS 271.77 kB, JS 860.51 kB generated.
- Local runtime after restart: `/api/v1/health/live` returned 200 immediately; `/api/v1/health/ready` returned 503 `warming`, then 200 `ready` after about 17 seconds.
- `git diff --check`: exit 0; only line-ending conversion warnings were emitted.

## Web Experience Evidence

- The existing non-modal `.integration-toast-stack` remains fixed outside document layout; no page card geometry is changed.
- The recovery bubble retains keyboard-operable retry and close buttons with labels and existing focus treatment.
- State changes use the existing polite live region; status polling itself is not registered as a global loading request and therefore does not repeatedly announce or flash the loading banner.
- Route change and component unmount clear timers and abort the active aggregate/status request.
- A successful fresh response leaves no retry/stale scope, so the bubble automatically disappears. Manual dismissal is keyed by route, affected scope, task trace and message, preventing the same failure generation from immediately reopening.
- Browser evidence confirms the fixed bubble remains within the viewport at 320, 760, 1366 and 1920px. Retry and close are discoverable buttons, polite status semantics remain present, reduced-motion removes animation, recovery auto-closes, and same-generation polling does not reopen a manually dismissed bubble.

## Unrun Checks, Constraints, and Risks

- `npm run test:integration` remains blocked by an unrelated historical exact-copy assertion in `tools/feishu-authenticated-page-entry.test.mjs`; the test expects text no longer present in the current remote-data UI. All task-relevant operation-contract tests listed above pass.
- `npm run test:ui-source-sync` remains blocked by a historical import of deleted `src/fixtures/mock-data.js`; restoring mock business data would violate the approved no-mock requirement.
- `npm test` remains blocked by a historical hard-coded greeting fixture (`上午好，张三丰`) that conflicts with the current remote-data implementation.
- No production Feishu account timing benchmark was run in this governed task. The HTTP boundary is covered by deterministic response-budget tests, real-browser state/geometry checks with controlled same-origin responses, and the live local readiness probe; real upstream latency remains externally variable.
- Cache remains process memory only. A full process restart without successful prewarm has no old snapshot and correctly reports syncing/not-ready instead of inventing data.

## Governed Platform Check

Evidence path for `record-platform-check.ps1 -Platform web`: this file. The governed result is recorded only after this handoff is complete.
