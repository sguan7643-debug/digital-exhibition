# Functional QA Report

- **Task:** `DEH-WORKBENCH-AGGREGATE-20260924`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-WORKBENCH-AGGREGATE-20260924/functional-qa-report.md`

## Environment

- **Build/version:** branch `task/digital-exhibition-ui-0817-dev-r3-web`, base `766b33b016f1c9d92b3c5f258094c29cbd41dfca`, current working diff documented in `engineering-handoff.md`.
- **Runtime, device, browser, or test account:** Node/Vite local runtime at `http://127.0.0.1:4173/test2/`; deterministic Node integration harness; installed Edge/Chromium at 320/760/1366/1920px; Web-only declared platform.
- **Permissions/configuration:** authenticated identities are represented by isolated test contexts; secrets remain server-side; no mock business data.
- **Evidence:** QA reran the focused aggregate, timeout, request-plan, operation-contract, auth-guard, no-mock, static, and production-build commands recorded below. Local liveness/readiness evidence is retained in `engineering-handoff.md`.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AC-01 | 超时配置不再被旧硬上限截断 | executed | 1. Run upstream deadline test. 2. Run table-read latency/cache test. | 20s upstream and 35s read budget are accepted without 12/15s caps. | Resolvers accepted the new defaults and larger valid values; invalid values safely fall back. | `node tools/feishu-open-api-client.test.mjs`; `node tools/feishu-read-latency-cache.test.mjs` | none | passed | none |
| AC-02 | 首页只发起一个业务读取 | executed | 1. Create workbench data source. 2. Load through aggregate client. 3. Count individual operation calls. | One aggregate call; zero direct five-operation browser calls. | Aggregate client loaded the page and individual call count remained zero. | `npm run test:homepage-aggregate` | none | passed | none |
| AC-03 | 热态性能 | executed | 1. Prime five snapshots. 2. Execute 100 warm aggregate reads. 3. Sort timings and inspect p95/upstream count. | p95 <=2s; no upstream calls or 5xx. | Synthetic warm p95 0.01ms; upstream call count unchanged; all responses 200. | `npm run test:homepage-aggregate` | none | passed | none |
| AC-04 | 所有响应在30秒内结束 | executed | 1. Verify default/capped server budget. 2. Verify 30s browser default. 3. Force cold task beyond a short test budget. | App budget <=29s and browser timeout <=30s; cold request resolves as 202. | Default 25s, configured values cap at 29s, browser default 30s, and cold test returns 202 rather than waiting for completion. | `npm run test:homepage-aggregate`; `node tools/page-read-request-plan.test.mjs`; `npm run test:first-screen-budget` | none | passed | none |
| AC-05 | 冷态单飞 | executed | 1. Send eight concurrent cold aggregate reads for one scope. 2. Count task IDs and upstream calls. | One sync task, same syncId, one group of five reads. | All eight returned the same syncId; exactly five operation reads ran. | `npm run test:homepage-aggregate` | none | passed | none |
| AC-06 | 轻量轮询不读取飞书 | executed | 1. Capture upstream call count. 2. Poll status. 3. Complete task and refetch. | Poll adds zero Feishu calls; completion causes one aggregate refetch. | Poll count increased while Feishu count did not; aggregate load count became exactly two. | `npm run test:homepage-aggregate` | none | passed | none |
| AC-07 | 启动预热与readiness | executed | 1. Hold exact public prewarm calls. 2. Inspect readiness. 3. Release prewarm. 4. Probe live runtime. | Liveness available; readiness warming until exact COM-005/WB-002 inputs finish, then ready. | Test observed warming then ready with exact inputs; local runtime returned live 200, ready 503 then 200 after about 17s. | `npm run test:homepage-aggregate`; `engineering-handoff.md` local probes | none | passed | none |
| AC-08 | 旧缓存降级 | executed | 1. Seed valid stale snapshots. 2. Fail every refresh. 3. Re-read. | 200 stale, old data retained, failure does not overwrite cache. | Old payload remained in all sections before and after failed refresh; no immediate automatic retry storm occurred. | `npm run test:homepage-aggregate`; `node tools/feishu-read-latency-cache.test.mjs` | none | passed | none |
| AC-09 | 过期与权限隔离 | executed | 1. Query syncId with a different identity. 2. Advance task beyond retention. 3. Run personal/current-user contract checks. | Cross-user lookup denied; expired state returned; operations remain identity-scoped. | Different user received forbidden; retained task became expired; COM/personal reads remained authenticated-user scoped. | `npm run test:homepage-aggregate`; `node tools/feishu-personal-read-batch.test.mjs`; `node tools/feishu-current-user-operation.test.mjs` | none | passed | none |
| AC-10 | 部分可用与空数据 | executed | 1. Exercise aggregate section mapping and existing operation projections. 2. Inspect response validation. | Available sections survive as partial; empty successful collections remain valid data. | Aggregate service builds partial from available entries and preserves successful operation response data; existing projection/input guards pass. | `npm run test:homepage-aggregate`; `node tools/feishu-public-read-batch.test.mjs`; code review | none | passed | none |
| AC-11 | 前端轮询停止条件 | executed | 1. Inspect and build the App polling lifecycle. 2. Exercise status completion path and cancellation contract. | 2s polling, 30 attempts, stop after about 60s, route/unmount cancel, manual retry available. | App uses 30 bounded attempts, clears timers on route/unmount, aborts active requests, and exposes retry; completion refetch test passes. | `src/App.vue`; `src/integration/page-data-source.js`; `npm run test:homepage-aggregate`; `npm run build` | none | passed | none |
| AC-12 | 异常浮窗恢复 | executed | 1. Open controlled authenticated homepage in Edge/Chromium. 2. Observe syncing bubble and completed status. 3. Repeat with running status, manually close, wait through another poll. 4. Repeat at four widths and reduced motion. | Fresh recovery removes bubble; same failure generation remains dismissed; retry/close accessible. | Recovery auto-closed after one completed-status refetch; manual close remained closed after polling; labelled controls, polite status, reduced motion and four viewport geometries passed. | `npm run test:homepage-aggregate:browser`; `src/App.vue`; `reviews/code-review.md` | none | passed | none |
| AC-13 | 回归与构建 | executed | 1. Run focused backend/client tests. 2. Run affected existing operation contracts. 3. Run no-mock/static/build gates. | All affected contracts pass and production bundle builds. | All listed QA commands exited 0; 1932 modules transformed; no mock business data introduced. | QA command transcript in this report and `engineering-handoff.md` | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VAL-AUTH-01 | Aggregate and status data require authenticated, matching identity. | executed | Call aggregate without identity; query a valid syncId as another user. | 401 for no identity and 403 for another owner. | Both negative paths returned controlled authorization errors. | `npm run test:homepage-aggregate`; `node tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| VAL-INPUT-01 | Aggregate body allows only optional boolean `forceRefresh`. | executed | Send valid JSON and invalid method/body shapes through middleware harness. | Valid request accepted; invalid method/type/fields rejected. | Middleware route and validation assertions passed. | `npm run test:homepage-aggregate` | none | passed | none |
| VAL-DATA-01 | Business data must come from Feishu-backed operations, never mock fixtures. | executed | Run no-mock gate and affected operation projection suites. | No mock business source; existing operation contracts remain authoritative. | No-mock gate and public/personal/workbench/current-user suites passed. | `npm run test:no-mock-data`; affected operation commands | none | passed | none |
| VAL-SEC-01 | Browser endpoint is same-origin and credentials/tokens are not exposed in keys or responses. | executed | Review client URL validation, service fingerprints and response fields; run source/static checks. | Same-origin only; opaque hashes/IDs; no secret-bearing output. | Contract satisfied and static audit passed. | `src/integration/homepage-aggregate-client.js`; `server/homepage-aggregate-service.mjs`; `npm run check`; `reviews/code-review.md` | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STATE-FRESH | 新鲜成功 | executed | Prime cache and load aggregate repeatedly. | 200 fresh, no refresh, no upstream. | 200 fresh; 100 warm reads added no upstream calls. | `npm run test:homepage-aggregate` | none | passed | none |
| STATE-STALE | 陈旧可用 | executed | Mark snapshots stale and load. | Existing data remains and one refresh starts. | 200 stale with refreshing true; one five-read task started. | `npm run test:homepage-aggregate` | none | passed | none |
| STATE-INITIAL | 首次同步 | executed | Delay cold reads beyond test response budget. | 202 syncing with one syncId. | Eight cold requests returned 202 and the same syncId. | `npm run test:homepage-aggregate` | none | passed | none |
| STATE-COMPLETE | 同步完成 | executed | Poll a completed task and refetch. | One aggregate refetch yields normal state. | Exactly one post-completion aggregate load occurred. | `npm run test:homepage-aggregate` | none | passed | none |
| STATE-FAILED-STALE | 同步失败且有旧数据 | executed | Seed stale data and fail refresh. | Old content retained; retry remains available. | Old payload retained and task status failed without cache deletion. | `npm run test:homepage-aggregate` | none | passed | none |
| STATE-FAILED-COLD | 同步失败且无数据 | executed | Review no-snapshot failure branch and controlled error mapping. | Explicit failure, no fabricated data. | Service throws controlled 401/403/503 and middleware returns JSON error. | `server/homepage-aggregate-service.mjs`; `server/homepage-aggregate-middleware.mjs`; `reviews/code-review.md` | none | passed | none |
| STATE-EMPTY | 真实空数据 | executed | Run existing public/workbench projection contracts and aggregate section mapping. | Successful empty collections remain successful/cacheable data. | Existing read contracts distinguish successful payloads from thrown read failures; aggregate preserves response data. | `node tools/feishu-public-read-batch.test.mjs`; `node tools/feishu-workbench-search.test.mjs`; code review | none | passed | none |
| STATE-PERMISSION | 未授权/权限变化 | executed | Use missing and mismatched identities and run auth/current-user suites. | No cross-user cache/task reuse; existing auth path preserved. | 401/403 isolation and authenticated-user scoping passed. | `npm run test:homepage-aggregate`; auth/current-user commands | none | passed | none |
| STATE-EXPIRED | 任务过期 | executed | Advance completed task beyond retention and request status. | State is expired; frontend treats it as a terminal recoverable state. | Service returned expired and client validator accepts it. | `npm run test:homepage-aggregate` | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REG-OPS-01 | Existing single-operation reads remain available because non-homepage pages still use them. | executed | Run server proxy, public, workbench, personal and current-user suites. | Existing operation contracts pass. | All affected suites exited 0. | Listed QA commands | none | passed | none |
| REG-AUTH-01 | Existing authorization entry flow remains intact. | executed | Run entry auth guard suite. | Root/test2 entry probe and safe return paths pass. | Suite exited 0. | `node tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| REG-DEPLOY-01 | Same-origin `/test2/` and API mount remain deployable. | executed | Consume engineering test-deployment evidence and rebuild. | Static base/API mount/build remain valid. | Deployment suite and current production build passed. | `engineering-handoff.md`; `npm run build` | none | passed | none |
| REG-NOMOCK-01 | Removal of mock business data is preserved. | executed | Run no-mock gate. | No fixture fallback returns. | Gate exited 0. | `npm run test:no-mock-data` | none | passed | none |
| REG-BROWSER-01 | Recovery bubble behavior and responsive containment. | executed | Run controlled Edge/Chromium test at 320/760/1366/1920px with reduced motion and two recovery flows. | Bubble stays within viewport, controls are operable, recovery closes, dismissal persists. | All browser assertions passed. | `npm run test:homepage-aggregate:browser` | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

Functional QA verifies approved business acceptance only. This report does not modify implementation, approvals, final governed QA fields, release state, deployment state, or Git history. Historical umbrella-suite fixture/copy blockers remain transparently recorded in `engineering-handoff.md` and do not represent a failure of the affected task contracts exercised here.
