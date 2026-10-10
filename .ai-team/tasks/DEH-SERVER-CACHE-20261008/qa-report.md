# Cross-platform / Compatibility QA Report

- **Task:** `DEH-SERVER-CACHE-20261008`
- **Role:** Cross-platform / Compatibility QA
- **Date:** 2026-10-10 (Asia/Shanghai)
- **Declared platforms:** Web / Vue only；未声明 mobile 或 uni-app target。
- **QA cycle:** QA repair attempt 2 现场失败闭环。
- **Governed outcome:** `failed`。
- **Blocking defect count:** `4`，按缺陷身份去重为 `DEH-FQA-005`、`DEH-FQA-006`、`DEH-FQA-008`、`DEH-FQA-009`。
- **Release decision:** 当前测试环境版本不可发布；未授予发布、合并、部署批准、出版或风险接受。
- **Repair limit:** `repair_attempts=2` 已用尽；本报告不创建、路由或暗示第三次 repair attempt。

## Input and Governance Validation

已完整消费以下治理输入：`task.json`、`task-brief.md`、已批准的 `prd.md`、聚合 `design-handoff.md`、`reviews/code-review.md`、最新 `functional-qa-report.md`、聚合 `engineering-handoff.md`。本轮未读取 `handoffs/web.md`，也未从 worker handoff 重建工程事实。

- 使用治理脚本真实参数运行 `validate-task.ps1 -TaskFile <task.json> -EnforceLocation`，结果为 `VALID`。
- `task.json.state=qa`，仅声明 Web/Vue；`mobile_framework=none`、`mobile_targets=[]`；scope/design 已批准，release 未批准。
- `task.json.repair_attempts=2`，两次历史均已记录，因此技能合同禁止第三次 repair。
- `reviews/code-review.md` 的 verdict 为 `approved`，但其边界明确不替代部署后 Functional QA 或 Compatibility QA。
- `engineering-handoff.md` 声明本地 repair attempt 2 自动化通过，并称包尚待部署；最新 `functional-qa-report.md` 则明确记录该包在 2026-10-10 已部署并完成现场复测。现场证据更新，且直接证明当前部署失败，因此不能用较早的“待部署”描述或本地通过覆盖现场结果。
- 最新 Functional QA 的结果字段为 `blocked`，但报告内包含四个已复现、未解决且具有明确身份的阻断缺陷。按 Cross-platform QA 技能合同，完整一致的阻断证据应记录治理结果 `failed`。

## Compatibility Matrix

| 平台 / 环境 | 视口或设备尺寸 | Build identifier | 场景 | 预期平台行为 | 实际行为 | 结果 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Web，Windows 上已认证 Microsoft Edge + Playwright CDP，测试环境 `https://test-pre-demo-seaoil.xdata.work/test2/` | Desktop；Functional QA 未记录精确 viewport | repair attempt 2 包 SHA-256 `e42e975ecd5c35e139605bda8ee84a87a660fe285be4d72793a10eab80b63961`；服务无独立版本号；远端 JS `5237c544...00f9d`、CSS `43bb856b...9a48` | 首页强制冷读与五秒任务接管 | 5/5 冷任务在 25 秒内 `completed`，返回原子完整五段 `result`，无需刷新 | 仅 4/5 完成；失败任务 37.849 秒后为 `FEISHU_READ_BUDGET_EXCEEDED`，失败 operation `COM-001` | **failed** | `functional-qa-report.md` Repair Attempt 2、`FQA-STATE-08`、`DEH-FQA-005`；sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；trace `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74` |
| 同一已认证 Web 环境 | Desktop；精确 viewport 未记录 | 同上 | 自动轮询、失败恢复、无手动刷新 | 浏览器只轮询原 `syncId`，任务自动完成并渲染正式首页；失败/过期任务不得被新请求复用 | 前端只提交一次 homepage POST 并正确轮询同一任务，但后端 202 复用了失败任务；45 秒后页面仍显示“当前页面使用受控代理数据。数据更新失败” | **failed** | `functional-qa-report.md` `FQA-REG-04`、`DEH-FQA-006`；sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；trace `trace-ef0f74b1-92d6-4b63-a2db-24b65e6643a0` |
| 同一已认证 Web 环境，协议级 task-status 检查 | Desktop / HTTP | 同上 | 已存在且有权任务的状态轮询 | `/sync-jobs/{syncId}` 状态查询始终 HTTP 200，并通过 `queued/running/completed/failed/expired` 表达状态 | 同一冷任务轮询中仍出现一次 HTTP 500 `HOMEPAGE_AGGREGATE_ERROR`，之后才以 HTTP 200 返回 failed | **failed** | `functional-qa-report.md` `FQA-REG-07`、`DEH-FQA-008`；sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；HTTP 500 trace `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb` |
| 同一已认证 Web 环境 | Desktop；精确 viewport 未记录 | 同上 | 首页及代表 operation 暖缓存复用 | 首页至少 27/30 在 5 秒内首次 HTTP 200；代表 operation completed 后相同输入立即命中 | 首页前 10 次均首次 HTTP 202，0/10 直接 200，3 次完成、7 次失败；`APP-002`、`ADM-003` completed 后复读仍约 4.9 秒返回 202；`WB-003` 31.208 秒后 deadline failed | **failed** | `functional-qa-report.md` `FQA-AC-01`、`FQA-AC-08`、`DEH-FQA-009`；warm sync `sync-bacb2667-d68d-49ed-a3aa-624d0cb3f371`、`sync-ae297194-54fc-4366-b520-8e0402b7437a`；trace `trace-ef3396ef-a731-4f30-bc48-cab71f0ad845`、`trace-6af6f38e-3a34-4c68-bd58-297aa4d3b9ed`；WB-003 sync `read-ac5134fc-0186-424d-8658-10273bba4c98` |
| Web authentication boundary，测试环境 | Protocol + desktop browser | 同上 | Basic Auth、飞书 OAuth、未登录业务读取、live/ready | Basic Auth 不绕过业务身份；未登录保持 401；OAuth 可进入；live/ready 健康 | 未登录业务请求返回 401 `USER_AUTH_REQUIRED`；OAuth 跳转正常；live/ready HTTP 200，ready 5/5 | passed for covered boundary | `functional-qa-report.md` `FQA-VAL-01`、`FQA-VAL-02`、`FQA-REG-01`、`FQA-REG-03` |
| Local Web，Microsoft Edge / Playwright，交接测试服务 | 320×900、760×900、1366×900、1920×900 | 当前 workspace，2026-10-10 | mocked homepage 202/status recovery、loading 生命周期、响应式保持 | 轮询消费原 `completed.result`，不重放 homepage，不新增恢复提示，四个宽度保持兼容 | 首次直接运行因本地 4173 服务未启动而 `ERR_CONNECTION_REFUSED`；启动 `npm run start:test-server` 后重跑通过四个宽度 | passed after required runtime precondition；不覆盖现场失败 | 本报告“Fresh Aggregate Engineering Verification”；`npm run test:homepage-aggregate:browser` |
| Web 可访问性与完整状态矩阵 | Desktop、narrow Web、H5；缺少完整设备/读屏环境 | 当前部署版本标识不完整 | keyboard、visible focus、semantic labels、pointer/touch、resize/navigation、live announcements，覆盖 normal/loading/empty/error/disabled/permission-denied | 既有行为不退化；轮询不移动焦点或重复公告 | 已观察 normal/loading/error，且本地四宽度自动化通过；empty、disabled、permission-denied、完整键盘/焦点/语义、pointer/touch 和 screen-reader 未执行 | blocked；不作通过声明，也不新增缺陷身份 | `functional-qa-report.md` `FQA-REG-06`；`design-handoff.md` sections 6、8 |
| Mobile / uni-app | not applicable | not applicable | 平台兼容性 | 未声明移动目标，因此不要求移动验证 | `mobile_framework=none`、`mobile_targets=[]` | not applicable | `task.json`、`design-handoff.md` |

## Fresh Aggregate Engineering Verification

按 `engineering-handoff.md` 声明的聚合命令在当前 workspace 复跑。它们只证明本地自动化状态，不关闭真实测试环境缺陷。

| Command | Result |
| --- | --- |
| `npm run check` | passed |
| `npm run test:server-cache` | passed |
| `npm run test:homepage-aggregate` | passed；mock warm p95 `0.13ms` |
| `npm run test:integration` | passed |
| `npm run test:feishu-latency` | passed |
| `npm run test:business-writes` | passed |
| `npm run test:test-deployment` | passed |
| `npm test` | passed |
| `npm run test:homepage-aggregate:browser` | 首次因本地测试服务未启动而 `ERR_CONNECTION_REFUSED`；启动 `npm run start:test-server` 后 passed，覆盖 320/760/1366/1920 |

未运行 `npm run package:test`：该命令会创建或覆盖部署产物，超出本角色“仅写 qa-report.md 与治理 QA mutation”的权限。聚合交接没有声明另一个独立 build 命令。

## Deduplicated Blocking Defects

本轮不新增 compatibility-only 缺陷身份；治理计数采用 Functional QA 的四个真实去重阻断项。

| ID | Platform | Environment / build | Reproduction | Expected | Actual | Evidence | Severity | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DEH-FQA-005` | Web | 已认证 Edge，2026-10-10 repair attempt 2 deployment | 顺序执行 5 次 `forceRefresh=true` 首页冷读，只轮询每次返回的 syncId | 5/5 在 25 秒内 completed，并返回完整五段数据 | 仅 4/5 完成；失败样本 37.849 秒后为 `FEISHU_READ_BUDGET_EXCEEDED`，失败 operation `COM-001` | sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；trace `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74` | high | Web backend engineer | open |
| `DEH-FQA-006` | Web | 同上 | 真实页面只发一次 homepage POST，随后仅查询原 syncId，等待 45 秒且不手动刷新 | 原任务自动完成并渲染正式数据；失败任务不被新普通请求复用 | 后端 202 复用了失败任务，最终 `failed/FEISHU_READ_BUDGET_EXCEEDED`，页面停在“数据更新失败” | sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；trace `trace-ef0f74b1-92d6-4b63-a2db-24b65e6643a0` | high | Web backend engineer | open |
| `DEH-FQA-008` | Web | 同上 | 创建 homepage task，连续查询同一已授权任务状态 | 每次状态查询 HTTP 200，状态仅由 body 表达 | 一次查询返回 HTTP 500 `HOMEPAGE_AGGREGATE_ERROR`，随后才返回 HTTP 200 failed | sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；trace `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb` | medium | Web backend engineer | open |
| `DEH-FQA-009` | Web | 同上 | completed 后以相同身份和输入立即复读首页、`APP-002`、`MAT-001`、`ADM-003`，并抽查 `WB-003` | fresh/stale 完整缓存首次在 5 秒内 HTTP 200；失败任务不污染后续请求 | 首页 0/10 首次 200、7/10 终态失败；`APP-002`/`ADM-003` 复读仍 202；仅 `MAT-001` 命中；`WB-003` deadline failed | warm sync 与 operation trace 见上；WB-003 sync `read-ac5134fc-0186-424d-8658-10273bba4c98` | high | Web backend engineer | open |

## Latest Trace and Sync Evidence

- 冷首页失败：`sync-9d28d97d-03ee-458e-8a13-cb71747de477`，task trace `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74`，37.849 秒，`FEISHU_READ_BUDGET_EXCEEDED`，operation `COM-001`。
- 状态接口 HTTP 500：同一 sync；trace `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb`，code `HOMEPAGE_AGGREGATE_ERROR`。
- 真实页面失败任务复用：`sync-ae297194-54fc-4366-b520-8e0402b7437a`；trace `trace-ef0f74b1-92d6-4b63-a2db-24b65e6643a0`。
- 暖首页异常样本：`sync-bacb2667-d68d-49ed-a3aa-624d0cb3f371`、`sync-ae297194-54fc-4366-b520-8e0402b7437a`。
- operation 缓存复读 trace：`trace-ef3396ef-a731-4f30-bc48-cab71f0ad845`（APP-002）、`trace-6af6f38e-3a34-4c68-bd58-297aa4d3b9ed`（ADM-003）；WB-003 sync `read-ac5134fc-0186-424d-8658-10273bba4c98`。
- 本角色没有服务器 journal/read-only shell 输入，因此不能声称已读取或解释这些 trace 对应的服务端日志。当前根因级结论仅限于现场可观察合同：任务预算/终态恢复失败、失败任务错误复用、状态查询 500 泄漏、completed 后缓存未稳定命中。日志归因仍需后端 owner 提供新工程证据。

## Preserved Evidence Gaps

以下缺口继续阻止任何 passing/release 声明，但不增加本轮四个去重实现缺陷的计数：

- 缺少可确认完整分页成功的真实零记录授权范围及失败对照。
- 缺少 `CACHE_TEST_REVOKED`、`CACHE_TEST_ADMIN`、非管理员对照，以及当前会话到 `CACHE_TEST_STANDARD` 的确认映射。
- 缺少锁定测试 Base 的标识、相关表完整记录数和前后计数；完整 720 样本固定性能矩阵未执行。
- 缺少独立服务器只读 shell 证据，无法独立核验运行身份、文件模式、快照恢复、实时 CPU/RSS、磁盘、敏感数据扫描和现场回滚。
- 缺少获准的真实写入身份、审批/幂等 fixture 和可清理测试记录。
- 缺少受控 empty、disabled、permission-denied 场景及完整 keyboard/focus/semantic/pointer/touch/screen-reader 环境。
- 服务未暴露可与部署包直接对应的运行时 build identifier；SHA-256 来源于部署交接和现场 QA 记录。

## Gate Decision

QA repair attempt 2 **failed**。当前版本触发已批准回滚/阻断条件：冷首页未达到 5/5、状态查询出现 HTTP 500、暖首页 0/10 首次 HTTP 200、失败任务被新请求复用、代表 operation 缓存复读不一致。当前测试环境版本不可作为可发布版本。

`repair_attempts=2` 已达到技能合同上限。本角色不会调用 `record-repair-attempt.ps1`，不会记录第三次 repair，也不会修改代码、测试、其他 handoff/report、审批或 task state。

## QA Boundary

本角色仅更新 `qa-report.md`，并在证据一致后通过治理脚本记录 `failed`、`BlockingDefects=4`、Evidence 指向本报告。未修改实现、测试、`functional-qa-report.md`、`reviews/code-review.md`、`engineering-handoff.md`、其他交接、审批或任务状态；未部署、发布、合并或接受风险。
