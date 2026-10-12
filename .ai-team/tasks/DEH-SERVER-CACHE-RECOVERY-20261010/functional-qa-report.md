# Functional QA Report

- **Task:** `DEH-SERVER-CACHE-RECOVERY-20261010`
- **Result:** `blocked`
- **Report path:** `.ai-team/tasks/DEH-SERVER-CACHE-RECOVERY-20261010/functional-qa-report.md`
- **Build:** deployment package SHA-256 `431e6db69808a86980fa4bf98e32682f7484b49f2b6a01f25006c3cceca65d1a`
- **Environment:** `https://test-pre-demo-seaoil.xdata.work/test2/`, Ubuntu 24.04.2, systemd service `digital-exhibition-test.service`
- **Evidence:** user-provided terminal captures `codex-clipboard-8e61f93f-bab2-4b84-81aa-a8823fdf5249.png`, `codex-clipboard-b57ff11d-6a87-40f6-a3d4-8ca3fce2ffa4.png`, and `codex-clipboard-de7b6c1a-3d44-4001-bfd7-106fa21b1675.png`.

## Environment

- The service starts and `/api/v1/health/live` returns `code=OK,state=live`.
- The deployed source contains `committedStagingKey`; the server command returned `NEW_PACKAGE_OK`, proving the running tree contains the reviewed recovery implementation.
- `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, and `FEISHU_BASE_TOKEN` are present (`SET`); values were not printed or retained.
- `/api/v1/health/ready` returns HTTP 503 immediately with `state=failed`, `errorCode=FEISHU_UPSTREAM_TIMEOUT`, `ready=false` after startup prewarm.
- Journal evidence shows multiple bounded `feishu-read-page`/`feishu-read-slot` events under a 25,000 ms budget, followed by startup failure. The current log lacks operation/table identity and a terminal failure event, so the exact upstream child remains unproven.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-AC-01 | AC-01 完整缓存首次命中 | not executed (blocked): FQA-AC-01 | 1. Start deployed build. 2. Wait for readiness. 3. Attempt warm read only after ready. | Warm/LKG request returns complete HTTP 200 within 5 seconds. | Readiness never became available, so a comparable warm sample could not be executed. | Ready capture listed above. | critical | blocked | none |
| FQA-AC-02 | AC-02 完全冷请求五秒交接 | not executed (blocked): FQA-AC-02 | 1. Start deployed build. 2. Require ready. 3. Clear only target key and issue cold request. | HTTP 200 or 202 within 5 seconds; detached task remains active. | Service remained not ready before the cold-read protocol could start. | Ready capture. | critical | blocked | none |
| FQA-AC-03 | AC-03 首页冷任务完成门槛 | not executed (blocked): FQA-AC-03 | Execute the approved five-run cold protocol after readiness. | 5/5 complete within 25 seconds with five complete sections. | Startup readiness failure prevented all five comparable runs. | Ready capture. | critical | blocked | none |
| FQA-AC-04 | AC-04 任务状态 HTTP 合同 | not executed (blocked): FQA-AC-04 | Create valid cold task, then poll both status routes. | Every authorized poll HTTP 200; no 500/504. | No valid post-ready task could be created. | Ready capture. | high | blocked | none |
| FQA-AC-05 | AC-05 状态轮询不重跑业务 | not executed (blocked): FQA-AC-05 | Capture browser network for a valid 202 flow. | One homepage POST and status-only polling. | Browser flow could not be started against a ready service. | Ready capture. | high | blocked | none |
| FQA-AC-06 | AC-06 失败任务退出复用索引 | not executed (blocked): FQA-AC-06 | Create terminal task, then repeat same request. | LKG HTTP 200 or a new active syncId; never old failed syncId. | No valid post-ready task lifecycle was available. | Ready capture. | high | blocked | none |
| FQA-AC-07 | AC-07 首页原子完整提交 | not executed (blocked): FQA-AC-07 | Exercise one failing child and one complete five-child run. | No partial aggregate; complete run publishes all five sections once. | Startup prewarm failed before homepage acceptance execution. | Ready capture. | critical | blocked | none |
| FQA-AC-08 | AC-08 缓存提交先于 completed | not executed (blocked): FQA-AC-08 | Observe completed task and immediate same-key reread. | Persistent/memory commit and readback precede completed. | No valid live completed task could be observed. | Ready capture. | high | blocked | none |
| FQA-AC-09 | AC-09 五个代表 operation 一致命中 | not executed (blocked): FQA-AC-09 | Run and reread COM-005, APP-002, MAT-001, WB-003, ADM-003. | Every eligible reread returns complete HTTP 200 within 5 seconds. | Readiness failure prevented representative live matrix. | Ready capture. | critical | blocked | none |
| FQA-AC-10 | AC-10 暖首页量化门槛 | not executed (blocked): FQA-AC-10 | Execute 30 warm requests after complete cache formation. | At least 27/30 first responses HTTP 200 within 5 seconds. | Complete cache formation/readiness was unavailable. | Ready capture. | critical | blocked | none |
| FQA-AC-11 | AC-11 真实页面自动恢复 | not executed (blocked): FQA-AC-11 | Reload authenticated page once and observe automatic completion. | No manual refresh; complete formal data appears. | Backend never reached ready, so this release's user flow could not be accepted. | Ready capture. | critical | blocked | none |
| FQA-AC-12 | AC-12 真实空结果与失败区分 | not executed (blocked): FQA-AC-12 | Read a known empty authorized result and a timeout result. | Real empty is success; timeout is never empty. | Required live read environment was not ready. | Ready capture. | high | blocked | none |
| FQA-AC-13 | AC-13 实时安全边界 | not executed (blocked): FQA-AC-13 | Exercise anonymous, revoked, wrong-owner and scope-change cases. | 401/403 and no cached data leak. | Mapped live identities and a ready service were unavailable for this build. | Ready capture and PRD dependency table. | critical | blocked | none |
| FQA-AC-14 | AC-14 重启恢复与 ready | executed | 1. Deploy reviewed ZIP. 2. Start service. 3. Confirm live. 4. Poll `/api/v1/health/ready`. 5. Confirm build marker. | Ready only after snapshot recovery and usable representative hits; bounded cold prewarm must recover service. | Build marker is correct and live succeeds, but ready remains HTTP 503 `state=failed`, `FEISHU_UPSTREAM_TIMEOUT`; failure is sticky. | All three terminal captures. | critical | failed | DEH-REC-001 |
| FQA-AC-15 | AC-15 资源与敏感数据限制 | not executed (blocked): FQA-AC-15 | Observe systemd limits, cache bytes/mode, concurrency and archive contents during accepted live load. | CPU 1.5, memory <=2GB, disk <=3GB, concurrency <=3, no secrets/binaries. | Screenshot shows bounded slot logging and configured environment, but complete live-load/resource evidence is unavailable because readiness failed. | Terminal captures and engineering handoff. | high | blocked | none |
| FQA-AC-16 | AC-16 根因与 trace 证据 | not executed (blocked): FQA-AC-16 | Correlate terminal timeout with operation, page, queue and deadline fields. | Exact failing child and code path are evidenced. | Journal events omit operationId/keyDigest/traceId for startup prewarm and no terminal error event was captured; exact child is still unknown. | Journal capture. | high | blocked | none |
| FQA-AC-17 | AC-17 交付物与变更边界 | executed | Verify deployed source marker, package digest/handoff and repository frontend status. | Pure backend package, digest, commands, and zero frontend diff. | Package identity marker is present; local package digest and frontend-clean evidence are recorded. | Engineering handoff plus `NEW_PACKAGE_OK`. | none | passed | none |
| FQA-AC-18 | AC-18 发布阻断条件 | executed | Apply release trigger to the observed readiness failure. | READY failure keeps release unavailable and triggers repair/rollback decision. | READY is HTTP 503; current build is correctly treated as not releasable. | Ready capture. | critical | failed | DEH-REC-001 |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-VAL-01 | Running package identity | executed | Grep deployed source for final reviewed implementation marker. | `NEW_PACKAGE_OK`. | `NEW_PACKAGE_OK`. | Latest terminal capture. | none | passed | none |
| FQA-VAL-02 | Required Feishu environment keys are non-empty without exposing values | executed | Print only SET/EMPTY for three required names. | All three `SET`. | All three `SET`. | Environment terminal capture. | none | passed | none |
| FQA-VAL-03 | Startup readiness must be recoverable and not permanently failed by one transient timeout | executed | Restart and poll readiness. | Bounded recovery reaches HTTP 200 ready or preserves/restores usable LKG. | HTTP 503 failed is returned immediately after the first prewarm timeout and does not retry. | Latest ready capture. | critical | failed | DEH-REC-001 |
| FQA-VAL-04 | Live 401/403 task authorization | not executed (blocked): FQA-VAL-04 | Use mapped anonymous/revoked/wrong-owner identities after ready. | Correct 401/403 without data release. | Ready service and mapped identities unavailable. | PRD dependency table and ready capture. | critical | blocked | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-STATE-WARM | Success / warm | not executed (blocked): FQA-STATE-WARM | Issue warm homepage request after ready. | Complete HTTP 200. | Not executable while not ready. | Ready capture. | critical | blocked | none |
| FQA-STATE-COLD | Loading / cold | not executed (blocked): FQA-STATE-COLD | Issue true cold request. | One bounded loading lifecycle. | Not executable while not ready. | Ready capture. | high | blocked | none |
| FQA-STATE-HANDOFF | Pending / handed-off | not executed (blocked): FQA-STATE-HANDOFF | Observe cold >4.5s response. | HTTP 202 with active syncId. | Not executable while not ready. | Ready capture. | high | blocked | none |
| FQA-STATE-RUNNING | Queued / running | not executed (blocked): FQA-STATE-RUNNING | Poll active task. | HTTP 200 queued/running. | No valid task available. | Ready capture. | high | blocked | none |
| FQA-STATE-COMPLETED | Completed | not executed (blocked): FQA-STATE-COMPLETED | Poll to completion. | HTTP 200 completed with complete result. | No valid task available. | Ready capture. | critical | blocked | none |
| FQA-STATE-LKG | Stale fallback | not executed (blocked): FQA-STATE-LKG | Fail refresh with valid LKG. | Complete HTTP 200 old data plus silent refresh. | Not executable while not ready. | Ready capture. | high | blocked | none |
| FQA-STATE-EMPTY | Empty | not executed (blocked): FQA-STATE-EMPTY | Read known complete zero-record scope. | Legitimate cached empty success. | Not executable while not ready. | Ready capture. | medium | blocked | none |
| FQA-STATE-FAILED | Failed | executed | Poll readiness after startup prewarm failure. | Operational failure is observable and release blocked; ordinary task failures use HTTP 200 state. | Readiness is HTTP 503 failed with structured `FEISHU_UPSTREAM_TIMEOUT`; task-state contract remains untested. | Latest ready capture. | critical | failed | DEH-REC-001 |
| FQA-STATE-EXPIRED | Expired | not executed (blocked): FQA-STATE-EXPIRED | Query retained expired task. | HTTP 200 expired. | No valid task available. | Ready capture. | high | blocked | none |
| FQA-STATE-AUTH | Authentication required | not executed (blocked): FQA-STATE-AUTH | Query without session. | HTTP 401. | Live acceptance deferred until ready. | Ready capture. | high | blocked | none |
| FQA-STATE-DENIED | Permission denied | not executed (blocked): FQA-STATE-DENIED | Query with revoked/wrong owner. | HTTP 403. | Live acceptance deferred until ready and mapped users available. | Ready capture. | critical | blocked | none |
| FQA-STATE-DISABLED | Disabled | not applicable: PRD section 5 states backend work must not alter existing disabled UI rules | No backend-induced disabled behavior to execute. | Existing behavior remains unchanged. | No frontend changes are in this task. | Engineering handoff. | none | not applicable | none |
| FQA-STATE-WARMING | Service warming | executed | Restart service and inspect readiness/prewarm. | Warming is bounded and transitions to ready after recovery/prewarm. | Prewarm emits read-page events then transitions to permanent failed readiness. | Journal and ready captures. | critical | failed | DEH-REC-001 |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-REG-LIVE | Service liveness independent of readiness | executed | Query `/health/live` after service start. | HTTP 200 live. | `code=OK,state=live`. | First deployment capture. | none | passed | none |
| FQA-REG-FRONTEND | Frontend change boundary | executed | Check engineering diff evidence. | No `src` or root `dist` task change. | Frontend status recorded clean. | Engineering handoff. | none | passed | none |
| FQA-REG-STATUS | Sync status endpoints | not executed (blocked): FQA-REG-STATUS | Create active task and poll both routes. | No 500/504 and no operation replay. | No ready runtime task could be created. | Ready capture. | high | blocked | none |
| FQA-REG-RESTART | Restart restored-cache hit | not executed (blocked): FQA-REG-RESTART | Restart with valid snapshot, then issue warm request. | Ready and immediate restored hit. | Startup did not become ready. | Ready capture. | critical | blocked | none |

## Defects

| ID | Failed Check Reference | Criterion or Scope | Environment | Preconditions and Steps | Expected | Actual | Evidence | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEH-REC-001 | FQA-AC-14 | Startup recovery/readiness; also affects FQA-AC-18, FQA-VAL-03, FQA-STATE-FAILED, FQA-STATE-WARMING | Test server, reviewed package SHA `431e6d...65d1a`, systemd service active | 1. Deploy reviewed ZIP and retain `.env`. 2. Start service. 3. Confirm `/health/live`. 4. Wait through startup prewarm. 5. Query `/api/v1/health/ready`. | Recovery/prewarm is bounded and reaches HTTP 200 ready; a transient upstream timeout must not permanently poison readiness when a controlled retry or valid restored cache can recover. | Live is healthy, but startup prewarm ends after about 14 seconds with `FEISHU_UPSTREAM_TIMEOUT`; readiness becomes a sticky HTTP 503 `state=failed`. The build marker and required env keys are correct. Logs do not identify the failing operation/table. | Three user terminal captures listed in Environment. | critical |

## Unresolved Blockers

- FQA-AC-01: Readiness failure prevents comparable warm cache execution.
- FQA-AC-02: Readiness failure prevents the approved cold handoff protocol.
- FQA-AC-03: Readiness failure prevents the five cold homepage samples.
- FQA-AC-04: No valid live task can be created for status-contract polling.
- FQA-AC-05: No ready browser flow exists for single-POST verification.
- FQA-AC-06: No valid terminal task exists for failed-task non-reuse verification.
- FQA-AC-07: Homepage atomicity cannot be live-tested before readiness.
- FQA-AC-08: No live completed task exists for commit/readback verification.
- FQA-AC-09: Representative operation live matrix cannot run before readiness.
- FQA-AC-10: Complete homepage cache cannot be formed for thirty warm samples.
- FQA-AC-11: Real-page automatic recovery cannot be accepted while the backend is not ready.
- FQA-AC-12: Real empty-result behavior cannot be executed while the backend is not ready.
- FQA-AC-13: Ready runtime and mapped security identities are required.
- FQA-AC-15: Full resource evidence under accepted live load is unavailable.
- FQA-AC-16: Startup events omit operation/table identity and terminal correlation, so the exact failing upstream child is unproven.
- FQA-VAL-04: Ready runtime and mapped anonymous/revoked/wrong-owner identities are required.
- FQA-STATE-WARM: Warm state cannot be executed while readiness is failed.
- FQA-STATE-COLD: Cold loading state cannot be executed while readiness is failed.
- FQA-STATE-HANDOFF: Handoff state cannot be executed while readiness is failed.
- FQA-STATE-RUNNING: No valid active task is available.
- FQA-STATE-COMPLETED: No valid completed task is available.
- FQA-STATE-LKG: LKG recovery cannot be executed while readiness is failed.
- FQA-STATE-EMPTY: Empty state cannot be executed while readiness is failed.
- FQA-STATE-EXPIRED: No retained expired task is available.
- FQA-STATE-AUTH: Authentication-required acceptance is deferred until the service is ready.
- FQA-STATE-DENIED: Permission-denied acceptance requires readiness and mapped identities.
- FQA-REG-STATUS: Status regression needs a valid active task.
- FQA-REG-RESTART: Restart-hit regression is blocked by startup readiness failure.

## QA Boundary

Functional QA recorded the deployed-build evidence and defect only. It did not modify implementation, tests, handoffs, task state, approvals, or governed QA fields.
