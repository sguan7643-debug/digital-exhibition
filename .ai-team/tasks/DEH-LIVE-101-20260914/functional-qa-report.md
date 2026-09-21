# Functional QA Report

- **Task:** `DEH-LIVE-101-20260914`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-LIVE-101-20260914/functional-qa-report.md`

## Environment

- **Build/version:** branch `task/digital-exhibition-ui-0817-dev-r3-web`, baseline `91a8ba1ad452bc348cb3615f1700b55c9e1af9a5`, cumulative governed dirty worktree.
- **Runtime, device, browser, or test account:** Windows Web, Chrome/Playwright, local same-origin service `http://127.0.0.1:4173`, real Feishu QA tenant, authorized user `3d8egf55`.
- **Permissions/configuration:** OAuth session established; secrets redacted; writes restricted to `TEST_`; management/admin permission absence preserved as an expected blocked result.
- **Evidence:** `evidence/reads-65-20260918.json`, `evidence/write-operations-91a8ba1.log`, `evidence/live-approval-closure.json`, aggregate `engineering-handoff.md`.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PRD-AC-101-RESULTS | 每个 operation ID 必须标记为 passed、failed 或 blocked，并附真实请求、上游结果、表中结果及清理结果；仓库可解决的失败修复，外部缺件明确到系统、权限、账号、回调或字段。 | executed | 1. 以真实账号运行 65 项读取；2. 运行 36 项 TEST_ 受控写入；3. 运行真实 OAuth 审批提交、查询、批准、再查询和落表；4. 复核阻断类型。 | 101 项都有真实、可解释结果；仓库内失败为 0；TEST_ 写入可清理；审批与状态闭环通过。 | 65/65 读取已执行：40 passed、25 blocked、0 failed；36/36 TEST_ 写入通过并清理；真实审批 PENDING→APPROVED、状态页通过、索引及详情投影 SYNCED。 | `evidence/reads-65-20260918.json`; `evidence/write-operations-91a8ba1.log`; `evidence/live-approval-closure.json`; `.local/feishu-approval-registry.json` instance `511FE923-2AAE-4CE1-9512-5698CC2BB685` | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VAL-READ-CLASSIFICATION | 真实读取必须区分通过、权限阻断、上下文缺失和代码失败。 | executed | 运行 `pnpm feishu:reads:verify-all` 并复核每项分类。 | 不把 403 或缺少资源 ID 误报为通过；代码失败为 0。 | 40 passed；20 项因明确权限编码 blocked；5 项因 file/application/certification/export ID 缺失 blocked；0 failed。 | `evidence/reads-65-20260918.json` | none | passed | none |
| VAL-WRITE-SAFETY | 写入只能使用 TEST_ 业务键并保留幂等、冲突、回滚与清理证据。 | executed | 复核受控写入验证产物和清理标志。 | 36/36 通过且清理完成。 | 36/36 passed，cleanup complete。 | `evidence/write-operations-91a8ba1.log` | none | passed | none |
| VAL-APPROVAL-CLOSURE | 海能 Work 审批必须使用真实 OAuth、真实审批接口和真实状态查询，不得拦截模拟。 | executed | 1. 建立 HttpOnly OAuth 会话；2. 续跑已创建 PENDING 实例；3. GET 状态；4. POST 测试批准；5. GET 状态；6. 打开状态页；7. 复核投影。 | 首查 PENDING，批准和终查 APPROVED，页面显示通过，应用索引及详情落表同步。 | 全部符合；`requestInterception=false`；projectionStatus=SYNCED。 | `evidence/live-approval-closure.json`; `.local/feishu-approval-registry.json` | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STATE-NORMAL | normal | executed | 执行真实公共、个人、目录及应用读取。 | 成功请求返回真实投影。 | 40 项真实读取通过，含个人身份、组织、人员和应用数据。 | `evidence/reads-65-20260918.json` | none | passed | none |
| STATE-LOADING | loading | executed | 运行全局请求遮罩回归。 | 请求期间全屏可见、阻止重复操作，结束后关闭。 | 集成测试通过。 | `tools/global-request-loading-remediation.test.mjs`; `engineering-handoff.md` | none | passed | none |
| STATE-EMPTY | empty | executed | 读取无记录的认证/运营列表。 | 返回结构化空集合，不使用 fixture 伪造。 | 空集合响应通过契约与页面投影回归。 | `evidence/reads-65-20260918.json`; `pnpm test:deh-req-gap` | none | passed | none |
| STATE-ERROR | error | executed | 运行超时、HTTP 错误、畸形响应和取消优先级回归。 | 保留真实错误码并可恢复。 | Round 3/4 集成回归通过。 | `pnpm test:integration`; `engineering-handoff.md` | none | passed | none |
| STATE-DISABLED | disabled | executed | 检查未配置正式写入入口。 | 明确禁用且不发送请求。 | 受控写入可见性和远程写阻断回归通过。 | `pnpm test:deh-req-gap`; `tools/controlled-write-panel-visibility.test.mjs` | none | passed | none |
| STATE-PERMISSION | permission-denied | executed | 使用当前账号访问需要管理权限的真实读取。 | 服务返回明确 403 和所需权限，不展示伪数据。 | 20 项按实际权限编码 blocked；分类符合预期。 | `evidence/reads-65-20260918.json` | none | passed | none |
| STATE-RECOVERY | recovery | executed | 续跑已有 PENDING 审批并在授权后恢复查询。 | 不重复创建；能够继续批准、回读与落表。 | 续跑成功，最终 APPROVED/SYNCED。 | `evidence/live-approval-closure.json` | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REG-INTEGRATION | 飞书代理、认证、分页、页面投影、审批和请求状态。 | executed | 运行 `pnpm test:integration`。 | 全部通过。 | exit 0。 | `engineering-handoff.md` | none | passed | none |
| REG-BUSINESS-PAGES | 应用、公告、积分、素材、培训、认证、人才、后台及个人中心。 | executed | 运行 `pnpm test:deh-req-gap`。 | 全部通过。 | exit 0。 | `engineering-handoff.md` | none | passed | none |
| REG-UI | 30 路由、交互、响应式和可访问状态。 | executed | 运行 `pnpm test`。 | 全部通过。 | exit 0。 | `engineering-handoff.md` | none | passed | none |
| REG-BUILD-AUDIT | 生产构建、源码审计和差异空白检查。 | executed | 运行 `pnpm build`、`pnpm check`、`git diff --check`。 | 全部通过。 | 构建 1951 modules；源码审计和 diff check 通过。 | `engineering-handoff.md` | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

本报告只记录功能验收结果。25 项 operation 的 `blocked` 是 PRD 要求保留的真实外部权限/上下文结果，不是未执行的 QA 检查，也没有被计为通过；最终平台兼容与治理结果仍由兼容性 QA 记录。
