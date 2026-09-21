# DEH-LIVE-101-20260914 — Live integration code review

## Findings

### F-001 — Blocker: 010 逐 operation 真实证据缺失，无法完成 QA 结论

- Severity: Blocker
- File/line: `.ai-team/tasks/DEH-LIVE-101-20260914/handoffs/web.md` (entire file); no 010 evidence artifact is present under `.ai-team/tasks/DEH-LIVE-101-20260914/`.
- Evidence: `task.json` requires evidence for 65 reads + 36 writes with real request/result/table/cleanup/block records. The current handoff explicitly says it does not claim any live operation passed. The task package contains no per-operation 010 result/JSON, request IDs, upstream responses, cleanup attestations, or attachment/version/rollback evidence. `rg --files .ai-team/tasks/DEH-LIVE-101-20260914` lists only task documents and reviews.
- Impact: A static registry, build, contract test, or mock transport cannot establish that every operation issued a real Feishu request or that TEST_ data was removed. Release-readiness and operation-level pass/fail/block status are therefore unreviewable.
- Recommendation: 010 must publish a reproducible artifact path containing one record per registry operation, with request timestamp/endpoint, upstream result, schema/table result, cleanup result, and explicit blocked reason. Include independent attachment deletion, idempotency replay, version-conflict rejection, and rollback evidence before this review can be unblocked.

### F-002 — High: write verifier stops at first failure and omits remaining operations

- Severity: High
- File/line: `tools/verify-live-write-operations.mjs:192-200`
- Evidence: The catch block logs the failed result and executes `break`. The summary then reports `executed: results.length` and only compares `passedCount` with 36 (`:207-215`); operations after the first failure receive no result or blocked record.
- Impact: A batch can appear to have a deterministic summary while 35 or fewer operations were never sent. This directly violates the requirement that all 36 writes be individually classified and makes omissions indistinguishable from successful coverage.
- Recommendation: Continue through the manifest after failures, append an explicit `blocked`/`not-run` record for every operation that cannot execute, and fail the batch unless `results.length === 36` and each item has request, upstream, table, cleanup, and error evidence.

### F-003 — High: COMMAND operations are executed as generic UPDATEs

- Severity: High
- File/line: `server/feishu-write-operation-service.mjs:33-43`
- Evidence: Only CREATE, UPSERT, and DELETE have branches. Every other mode, including manifest COMMAND entries, falls through to `safeRecordService.update(...)`.
- Impact: A command such as approval, archive, or publish can be reported as passed after merely changing fields/version; its required state transition, validation, side effects, and idempotency semantics are never exercised against Feishu.
- Recommendation: Add explicit command handlers and per-operation contracts (pre-state, command request, post-state, replay result). Reject unsupported command modes instead of silently treating them as UPDATE.

### F-004 — High: version-conflict and rollback checks bypass the target operation

- Severity: High
- File/line: `tools/verify-live-write-operations.mjs:117-178`
- Evidence: Seed rows are created through `safeRecordService.createOnce` for non-CREATE operations (`:117-136`). For versioned non-delete operations, the wrong-version update for CREATE plans calls `safeRecordService.update`, and rollback always calls `safeRecordService.rollback` directly (`:152-178`), rather than invoking `writeService.execute(operationId, ...)`.
- Impact: The evidence can prove only the helper service's optimistic-lock implementation, not the mapped operation's conflict handling or rollback behavior. A miswired operation can still receive a “passed” result.
- Recommendation: Exercise conflict, successful update, and rollback through each operation's public service path; capture HTTP/request IDs and assert the remote record state before and after every step.

### F-005 — Medium: attachment test leaves uploaded media and is not tied to attachment operations

- Severity: Medium
- File/line: `tools/verify-live-test-attachment.mjs:14-37`
- Evidence: The script uploads media, binds its token to a TAL record, and deletes only the record. There is no media/file-token deletion or post-cleanup check. The manifest's COM-006/COM-007 “文件上传会话” operations are not invoked; the script uses direct client upload plus a TAL create.
- Impact: TEST_ rows may be removed while uploaded test files remain in Feishu, and attachment-specific write operations can remain untested while the standalone fixture is mistaken for coverage.
- Recommendation: Invoke COM-006/COM-007 through the operation service, record upload-session semantics, and perform supported file-token cleanup (or explicitly document and verify an approved retention cleanup job).

### F-006 — Medium: read verification is a set of partial probes, not 65-operation execution evidence

- Severity: Medium
- File/line: `tools/verify-live-public-reads.mjs:22-36`; related `tools/verify-live-*.mjs` scripts.
- Evidence: `verify-live-public-reads.mjs` executes only eight IDs and conditionally skips TRN-003 when the source list is empty (`:25-29`). Other scripts cover disjoint subsets; a static scan finds 65 ID strings, but there is no master runner that imports the registry, executes every ID, and fails on missing runtime results.
- Impact: Source-string presence or successful sub-batches can be misreported as 65 live reads. Conditional branches and early exceptions can leave operations uncalled with no blocked evidence.
- Recommendation: Build one registry-driven runner that records exactly one runtime result per ID, including explicit `blocked` for unavailable source data, and rejects duplicate/missing IDs before declaring a pass.

### F-007 — Medium: cleanup failures are swallowed in final write/admin cleanup

- Severity: Medium
- File/line: `tools/verify-live-write-operations.mjs:203-205`; `tools/verify-live-admin-reads.mjs` cleanup/finalization blocks.
- Evidence: Final cleanup uses `try { await removeIfPresent(...) } catch {}` and the admin-read verifier similarly catches cleanup errors without surfacing them; summary `cleanupComplete` is computed only from in-memory result flags (`:207-215`).
- Impact: Network or permission failures during deletion can leave TEST_ records while the process still emits a summary that does not expose the cleanup error, weakening the safety guarantee.
- Recommendation: Persist cleanup attempts and outcomes, fail the run on any unverified deletion, and perform a final remote search across every table/key created by the batch.

## Out-of-Scope Observations

- `feishu-integration-foundation.test.mjs` and `feishu-integration-review-remediation.test.mjs` pass, but they validate registry/contract behavior and a fake transport; they are not live Feishu evidence.
- `git diff --check` passes. No application code or tests were modified by this review.
- Android/iOS are not declared for this Web task; no mobile verdict is made.

## Verification evidence

- `pnpm exec node tools/feishu-integration-foundation.test.mjs` — exit 0.
- `pnpm exec node tools/feishu-integration-review-remediation.test.mjs` — exit 0.
- `git diff --check` — exit 0.
- Static registry inspection: 101 unique operations (65 read, 36 write); metadata remains `apiReady:false`, `remoteEnabled:false`.

## 首轮证据复核（e9447ee 修复后）

复核锚点：`e9447eefad5eebcfd32a4ea0b5caae73f4db407a`，提交时间为 `2026-09-15T00:42:12+08:00`；修复交接声明的最终修复提交为 `ed07a37c293aff9613b3a7b79a7db00e3d381639`。本轮没有运行会写入飞书的 live 命令，只复核受控日志、代码和静态合同测试。

代码修复状态：e944 已观察到 F-002 的首错 `break` 删除、F-003 的显式 `COMMAND` 拒绝/handler 分支、F-004 的公开 operation 冲突/更新/回滚调用和 F-007 的逐项清理结果；F-005 只新增了明确的媒资保留策略，F-006 虽新增 registry-driven runner，但其输入工厂和失败证据仍构成本节 findings。以下问题不把已删除的旧代码形态重复判为当前源码缺陷，重点是修复后 live 证据仍不能成立的部分。

### F-008 — Blocker：65-read runner 的输入构造使 43 项在服务层输入契约处失败

- Severity: Blocker
- File/line: `tools/verify-live-read-operations.mjs:12-23,25-32`; `server/feishu-read-only-service.mjs:1985-2006` 及各 `assertAllowedInput` 分支。
- Evidence: 两份 `reads-65.json` 完全相同（Length `24085`，SHA-256 `83E4DCE66DE1FBF290605A05507085CFA7A79E1869FBDC482F74E4249E52B9BD`）：`expected=65`、`executed=65`、`passedCount=0`，65 个 `operationId` 唯一且无遗漏。错误分组为 `INVALID_OPERATION_INPUT=43`、`PERMISSION_DENIED=20`、`FILE_ACCESS_SERVICE_UNAVAILABLE=2`。43 项的代表错误是 `COM-001` 的“当前用户接口不接受浏览器提供的身份字段”和其余多项的“请求包含未允许的输入字段”。runner 对所有 operation 复用 `{ page, pageSize, limit, timezone, period, environment }`；例如 `COM-001` 只接受空输入，`APP-001` 不接受这些额外字段。它们是本地 input contract 拒绝，不是 Feishu upstream 成功响应。`COM-003/COM-004` 的实现会先构造联系人投影，因此个别项是否已发出前置读取请求不能从此日志区分。
- Impact: 65 个 ID 被枚举并分类，但 43 项没有完成其目标 read operation；不能计入读取通过，也不能据此证明真实 HTTP 覆盖。
- Recommendation: 为每个 operation 提供符合其合同的 input factory，保留被实际发送的脱敏输入，并将本地校验失败明确标为 blocked/invalid-input；修正后重新跑完整 65 项。

### F-009 — Blocker：失败结果丢失输入、响应和上游请求证据，65 项真实 HTTP 无法独立核验

- Severity: Blocker
- File/line: `server/feishu-live-operation-runner.mjs:1-7,18-35`; `tools/verify-live-read-operations.mjs:36-46`.
- Evidence: runner 在异常分支固定写入 `request: { input: null }`，只保留本地 `errorCode/errorMessage/httpStatus/traceId`；两份 `reads-65.json` 的 65 条结果均 `request.input=null`、`traceId=""`，没有 `response`、Feishu `request_id`、请求方法/路径或上游状态。`server/feishu-open-api-client.mjs:223-231` 也没有把成功响应或上游 request id 写入运行证据。
- Impact: `executed=65` 只能证明循环产生 65 条结果，不能证明每项发出了目标 Feishu HTTP 请求；尤其 400 和 503 很可能在服务层/配置守卫处结束。
- Recommendation: 证据记录至少包含 operationId、脱敏 input、请求方法和脱敏路径、开始/结束时间、上游 request id/status、响应摘要和阻断层级；将证据与提交 SHA 绑定后再宣称真实覆盖。

### F-010 — Blocker：20 项权限阻断不是读取通过；与独立 20/20 admin 脚本结果属于不同身份上下文

- Severity: Blocker
- File/line: `tools/verify-live-read-operations.mjs:28-30`; `server/feishu-read-only-service.mjs:1121-1126,1380-1388`.
- Evidence: `reads-65.json` 中恰有 20 个 admin operation 返回 `PERMISSION_DENIED`/403：`INT-001, INT-003, INT-005, OPS-001, OAN-001, OAN-002, OAN-003, OAN-008, OAP-001, OAP-002, OAP-003, OAP-006, OAP-008, OAP-011, ADM-003, ADM-004, ADM-006, ADM-007, INT-004, ARC-002`。registry runner 硬编码身份 `LIVE_VERIFY_USER`，而 `executeAdminRead` 先按远程权限投影检查所需权限。相对地，目标证据 `evidence/admin-reads.log`（Length `1535`，SHA-256 `C84E26B55445B2629FF3EFF24C64C5AB53D4EAD70DC6790BE137183ED7499535`）报告 `passed=true`、`expected=20`、`verified=20`、`cleanupComplete=true`，且 ID 集合与 20 项 admin 清单完全一致；该脚本使用另一个带 TEST 权限行的临时身份。
- Impact: 可明确记为“admin 专项脚本 20/20 结果通过”，但不能把它改写成 all-read runner 的 20 项通过，也不能证明每项目标 admin read 的 HTTP request/response 链。
- Recommendation: 由 QA/业务提供带所需权限的受控身份，或让 registry runner 接受显式授权上下文；保存每项真实请求和上游结果。当前 20 项在 `reads-65` 中应保持 permission-blocked。

### F-011 — Blocker：COM-008/MAT-003 在文件访问服务配置守卫处阻断

- Severity: Blocker
- File/line: `tools/verify-live-read-operations.mjs:14`; `server/feishu-read-only-service.mjs:1921-1953`.
- Evidence: runner 创建 read service 时没有注入 `fileAccessService`；`executeSecureResourceRead` 在任何 `readAll` 前检查 `!fileAccessService?.createGrant` 并返回 `FILE_ACCESS_SERVICE_UNAVAILABLE`。`reads-65.json` 的两项正是 `COM-008`、`MAT-003`，均 503。
- Impact: 这两项没有进入文件/素材目标读取或下载授权流程，不能算真实接口通过；属于本仓库未提供文件授权服务与 QA 外部能力缺件的组合阻断。
- Recommendation: 后端/QA 提供受控的文件授权服务和测试文件，或生成明确的外部阻断证据；重新验证 grant、资源匹配和过期行为。

### F-012 — Blocker：36-write 日志早于 e9447ee，且 COMMAND 与当前代码矛盾；公开 operation 冲突/回滚仍无可信证据

- Severity: Blocker
- File/line: `server/feishu-write-operation-service.mjs:24-50`; `tools/verify-live-write-operations.mjs:41-42,144-166,192-214`; `server/contracts/feishu-write-operation-manifest.mjs:26,35-36,40,43`.
- Evidence: `e9447ee` 提交时间为 `2026-09-15 00:42:12 +08:00`，但 `evidence/write-operations.log`（Length `9166`，SHA-256 `485DA2707365A58136A5CFDCAA09540C5B02AD9C05D174F6AC870C22D97A18E2`）和其外部副本的 LastWrite 为 `2026-09-14 21:33:15 +08:00`，明确早于修复。该旧日志第 19、28、29、33、36 行把 `ADM-005`、`OAN-006`、`OAN-007`、`OAP-009`、`ARC-003` 五个 `COMMAND` 标为 passed；而修复后的 `createFeishuWriteOperationService({ safeRecordService })` 没有传入 `commandHandlers`，`server/feishu-write-operation-service.mjs:43-46` 对这五项应返回 `COMMAND_NOT_IMPLEMENTED`。e944 的源码确实把版本冲突、更新、回滚改为 `writeService.execute`（`tools/verify-live-write-operations.mjs:144-166`），但旧日志只有布尔字段，没有 operation 请求、`ifMatch`、版本前后快照、上游 request id 或远程状态，因此“公开 operation 路径”的冲突/回滚尚未被证实。
- Impact: 不能用这份 36/36 摘要证明修复后的 36 项真实写入、COMMAND 语义、幂等或公开路径版本控制；把旧日志当作修复后通过会掩盖五项实际阻断。
- Recommendation: 从固定的 `e9447ee`/`ed07a37` clean checkout 重新执行。五个 COMMAND 必须配置真实专用 handler，或逐项记录 `COMMAND_NOT_IMPLEMENTED`；每个 operation 保存真实请求/响应、幂等重放、错误版本拒绝、更新、回滚及 TEST_ 远程残留检查，并在日志中记录 commit SHA。

### F-013 — Blocker：附件日志同样早于修复，且只证明记录清理，不证明媒资清理

- Severity: Blocker
- File/line: `tools/verify-live-test-attachment.mjs:20-70`; `server/feishu-schema-admin-client.mjs:174-187`.
- Evidence: `evidence/test-attachment.log`（Length `306`，SHA-256 `59A56496ACA3485E59387CDF8448CD812FEF35D3088612B7F5C0019F0F005EA5`）的 LastWrite 为 `2026-09-14 21:33:30 +08:00`，早于 e944；内容只有 `uploaded/tokenPersisted/attachmentBound/recordCleaned/absentAfterCleanup`，没有 `COM-006`/`COM-007` operation id，也没有 file-token 删除或删除后查询。修复后的脚本虽调用 COM-006/COM-007，但明确将媒资标为 `FEISHU_MEDIA_RETENTION_UNTIL_APPROVED_GC` / `retained_by_explicit_policy`，并未声称已删除。
- Impact: `TEST_` 上传记录清理不等于 Feishu 媒资清理，存在测试文件残留风险；附件写入链和清理门禁仍未闭环。
- Recommendation: QA/后端提供获批的 file-token 删除或 GC 任务及可核验结果；重新执行当前附件 verifier，分别证明上传会话、绑定、记录清理和媒资最终状态。

### F-014 — High：修复交接未同步新证据，治理链无法确定证据对应的提交

- Severity: High
- File/line: `.ai-team/tasks/DEH-LIVE-101-20260914/handoffs/web-repair-live.md:142-160`.
- Evidence: handoff 仍写明“本轮没有运行会访问正式 Feishu 数据的 live verifier”、`F-001` 尚未重新生成，并要求 010 后续重跑；新生成的 `reads-65.json`、`admin-reads.log` 没有被写入该 handoff 的路径、SHA、身份和 commit 绑定。`admin-reads.log` 虽为 `20/20`，但只保存脚本摘要；`reads-65.json` 明确为 `0/65`。
- Impact: 评审可以复核文件存在和计数，但不能从正式交接确认哪些证据属于 e944 修复后、用什么身份、由哪个 clean checkout 产生；这阻塞 101 项 live gate 的可审计性。
- Recommendation: 010/007 更新 repair handoff，逐项引用受控 evidence 路径、Length/SHA-256、生成时间、commit SHA、授权身份类别、真实请求/响应摘要和外部阻断码；不要把旧日志或契约测试列为 live pass。

### 证据分类结论

- 真实请求已发出：`admin-reads.log` 的脚本源代码使用真实 Feishu clients，且 20/20 admin 脚本结果与清理摘要一致；但日志没有逐请求的 URL、上游 request id 或响应，故只能确认“专项脚本报告 20/20”，不能独立证明每项 HTTP。
- 脚本证据不足：`reads-65` 的 65 项虽逐 operation 且唯一，但 43 项输入契约失败、20 项身份权限阻断、2 项文件服务缺件，最终是 `0/65`；修复前的 `write-operations.log` 不能证明 e944 后的 36 写入或公开路径冲突/回滚。
- 外部缺件：COM-008/MAT-003 的 file grant、COMMAND 专用 handler/后端语义、媒资删除或 GC、以及可审计的 Feishu 请求/响应追踪仍需 QA/后端/业务补充。契约、mock、本地 remediation test 和 build 通过均不替代这些 live 证据。

## Verdict

blocked

unavailable: 010 post-repair per-operation live evidence; blocking reason: `reads-65` is `0/65` with input/permission/file blocks, the only 36-write and attachment logs predate `e9447ee` and lack request-level proof, and the `20/20` admin summary has no HTTP trace or repair-handoff linkage, so the required 65-read/36-write live coverage cannot be independently verified.
