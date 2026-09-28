# DEH-ONBOARDING-POC-20260926 工程交接汇总

Owner: AI Team Lead

## Task and Approval Baseline

- Task: `DEH-ONBOARDING-POC-20260926`
- Mode: existing Vue Web project
- Declared platforms: `web`; mobile/uni-app `not declared`，依据 [task.json](./task.json)。
- Approved scope: [prd.md](./prd.md)，scope approval 已由当前任务用户于 2026-09-26 明确记录。
- Approved design: [design-handoff.md](./design-handoff.md)、[design/ux-handoff.md](./design/ux-handoff.md)、[design/ui-handoff.md](./design/ui-handoff.md)，design approval 已由当前任务用户于 2026-09-26 明确记录。
- Aggregated at: 2026-09-26 Asia/Shanghai。
- 本汇总不授权部署、发布、GitHub 推送、主分支合并或生产数据写入。

## Web Evidence

Source: [handoffs/web.md](./handoffs/web.md)

- Repository: `C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged`
- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`（非主分支）。
- Framework: Vue 3 / Vite。
- Governed Web platform check: `passed`；证据路径 `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/handoffs/web.md`。

### Delivered Web behavior

1. 应用中心与个人中心入口统一进入申请表单或“我的上线申请”。
2. T005 表单使用真实目录/字典；图标和附件按批准类型、数量、大小上传并持久关联。
3. 同一 attempt 使用稳定业务键与幂等键；提交成功返回稳定 `applicationId` 并进入详情；模糊失败只确认原 attempt。
4. `/apps/onboarding/status` 无 query 展示当前用户 `APP_ONBOARDING` 列表，有 `applicationId` 展示本人详情。
5. 详情进入自动同步既有实例一次，手动刷新一次，无轮询；同步失败保留最后成功数据；缺 `instanceId` 只禁用同步。
6. 附件访问重新校验当前用户、申请与文件关系，签发短期同源授权，浏览器不接收原始 file token。
7. 服务端持久化申请、attempt、实例和附件关系；专项测试证明可控时钟推进 8 天及服务重建后仍可恢复。
8. 独立 POC manifest/orchestrator 实现 Base 指纹、真实审批人、schema dry-run、runId 台账四项门禁；结构/记录白名单和精确清理均有自动化。
9. 清理归属必须同时精确匹配 ledger `runId` 与 `businessKey`，不因任意字段包含 runId 而删除记录。
10. 状态投影遵循：`PENDING` 只申请/附件；仅 `APPROVED` 发布；`REJECTED/CANCELLED` 不发布。

### Changed files

完整清单由 Web Engineer handoff 保存。任务核心包括：

- Web/client: `src/App.vue`、`src/pages/AppsPage.vue`、`src/pages/ProfilePage.vue`、`src/pages/OnboardingApplyPage.vue`、`src/pages/OnboardingPage.vue`、`src/integration/onboarding-approval.js`、`package.json`。
- Server: `server/feishu-vite-plugin.mjs`、`server/feishu-onboarding-service.mjs`、`server/feishu-onboarding-middleware.mjs`、`server/feishu-onboarding-file-service.mjs`、`server/feishu-onboarding-poc-orchestrator.mjs`、`server/contracts/feishu-onboarding-poc-schema-manifest.mjs`、`server/contracts/feishu-onboarding-poc-evidence.mjs`。
- Tools/tests: `tools/feishu-onboarding-poc.mjs`、`tools/verify-live-onboarding-poc.mjs` 及 onboarding 专项合同、服务、中间件、路由、状态、投影与部署测试。

### Commands and exact results

| Command | Result |
| --- | --- |
| `npm run test:onboarding-poc` | exit `0`；8 个专项阶段通过。 |
| `node tools/onboarding-apply-interaction.test.mjs` | exit `0`。 |
| `node tools/test-deployment-server.test.mjs` | exit `0`；静态路径、API 挂载和路径穿越保护通过。 |
| `npm run check` | exit `0`。 |
| `npm run test:ui-source-sync` | exit `0`；当前有效 6 个 UI 合同通过。 |
| `npm run build` | exit `0`；1932 modules，Vite build completed in 3.07s。 |
| `npm run test:integration` | exit `1`；前 10 个阶段通过，随后在历史收藏页文案断言失败；未声称完整集成通过。 |

### Test-first evidence

- POC cleanup ownership 曾因未拒绝不属于当前 runId/businessKey 的记录而失败；修复为双精确匹配后通过。
- 列表/详情 query 复用回归测试先失败，改为按 active URL 重建页面后通过。
- 表单错误摘要测试先失败，补齐摘要、首错聚焦与非静默附件移除后通过。

### Responsive, keyboard and accessibility evidence

- 宽屏语义表格，900px 前转有字段名的卡片；760px 以下表单、详情、时间线和附件单列；320–639px 按钮满宽，长 ID/hash/file name 可换行。
- 新路由标题可聚焦；详情返回恢复来源焦点；错误摘要跳转首个无效字段；刷新与上传不抢焦点。
- 提供表格 caption/header scope、有序状态时间线、`role=alert/status`、`aria-live/busy`、禁用原因关联、forced-colors 和 reduced-motion。
- 上述为静态合同与生产编译证据；尚不是带真实飞书会话的浏览器截图证据。

## Mobile Evidence

`not declared`。`task.json.platforms=["web"]`、`mobile_framework="none"`、`mobile_targets=[]`；无需 `handoffs/mobile.md`，也不将响应式 Web 误报为 uni-app 实现。

## Shared API and Data Contract

### Authentication and ownership

- 所有 onboarding API 使用 same-origin credentials 与真实飞书 OAuth session。
- 列表的 applicant 身份只由服务端 session 决定，不接受客户端传入其他用户 ID。
- 详情、同步与附件访问在返回数据或授权前校验 current user + `applicationId` + resource/file ownership。
- 401 表示需授权；403 表示权限受限且不泄露业务数据；不存在与非本人统一安全结果。

### Endpoints

- 上传/移除图标和附件：`/api/v1/onboarding/uploads` 及其资源动作。
- 稳定 attempt 提交/确认：`/api/v1/onboarding/attempts` 及确认动作。
- 当前用户列表：`/api/v1/onboarding/applications`。
- 详情：`/api/v1/onboarding/applications/:applicationId`。
- 单实例同步：详情资源的 sync 动作，每次请求只查既有实例一次。
- 附件授权：详情下的 file access grant，返回短期同源路径，不返回原始 token。

### Error and state behavior

- 业务错误不伪装为空数据；模糊提交失败保留 attempt 并可继续确认。
- 同步失败保留最后成功数据和同步时间；未知状态不映射为 `APPROVED`。
- 申请、列表、详情均覆盖 normal/loading/empty/error/disabled/permission-denied。
- 正常业务审批标题不需要 `TEST_` 前缀；仅受控 POC 验证数据的业务键/记录按 manifest 使用 `TEST_`。

## Evidence Integrity Check

- Product: [prd.md](./prd.md)，scope approved。
- Design sources: [design/ux-handoff.md](./design/ux-handoff.md)、[design/ui-handoff.md](./design/ui-handoff.md)。
- Design aggregate: [design-handoff.md](./design-handoff.md)，design approved。
- Design review: [reviews/design-review.md](./reviews/design-review.md)，verdict `approved`。
- Web engineer source: [handoffs/web.md](./handoffs/web.md)。
- Governed platform check: `task.json.checks.web_passed=true`，evidence path matches Web handoff。
- Mobile: not declared; no missing platform evidence。
- Known evidence conflict: no onboarding-specific conflict。完整 `test:integration` 有一个与当前任务无关的历史收藏页文案失败，已保留为风险；不能据此声称全仓集成通过。
- Real POC evidence is still pending and must be supplied in QA; automated/stubbed tests do not replace it。

### Post-review remediation

首次独立代码审查的 `changes_required` 已由 Web Engineer 在 development 阶段修复，并更新 [handoffs/web.md](./handoffs/web.md)：

- 申请人由已验证 session 派生，客户端不一致时在审批或记录写入前拒绝；页面锁定当前身份。
- POC ledger 记录 `keyField`，cleanup 使用精确 table/record/key，按表能力附加 runId 校验；字典 TEST_ 记录和审批实例 retained 均纳入台账证据。
- schema execute 前执行真实只读身份与审批能力预检；伪 token、不存在、权限不足或审批人不可用时远端写调用为零。
- live verifier 强制核验图标与普通附件、列表/详情同一申请与实例、附件 grant、外部重启后恢复、Base/manifest/远端记录、cleanup/retained 和结构化跨 8 天产物；缺任一项不能输出 passed。
- UI 聚合脚本恢复适用的现存页面/壳层回归断言，仅明确退役已删除 fixture/component 的无效断言。
- 修复后 `npm run test:onboarding-poc`、`npm run check`、`npm run test:ui-source-sync` 与 `npm run build` 均通过；Web platform check 已重新记录为 passed。完整 integration 未在该限定修复批次重跑，保留先前历史收藏页失败事实。

第二次代码复核发现的 4 个边界缺口也已修复并由 Web Engineer 更新源交接：live verifier 现在发送严格同源 Origin 且有本地 HTTP 正/负向中间件测试；审批实例 ledger 回调可在重启/稳定重试时补偿且远端实例仍只创建一次；字典 cleanup 在删除前和远端读取后双重核对完整当前 runId 主键；Certification、TalentPeople、TalentProjects、Operations、Materials 的仍适用 UI 断言已迁入可执行套件并带逐项迁移/退役映射。修复后四项声明命令再次通过，完整 integration 未在该限定批次重跑。

第三次复核指出的剩余 UI 覆盖缺口也已关闭：响应式 caption 字号令牌、通知筛选与日期图标、应用筛选标签布局、积分动态不换行与响应式单列规则均已加入可执行源回归并逐项登记迁移映射；独立测试、`test:ui-source-sync`、`check` 与 `build` 再次通过，且未修改产品源码。

## Combined Risks

| Risk | Owner | Status | Mitigation / next evidence |
| --- | --- | --- | --- |
| 未完成真实飞书 OAuth、审批、附件与 Base 闭环 | Functional QA + Compatibility QA | open | 配置正确 Base 指纹，四门禁通过后执行不拦截真实请求的 POC。 |
| 未现场执行服务重启恢复 | Functional QA | open | 提交后重启本地测试服务，使用同一用户和 `applicationId` 再查详情。 |
| 完整 integration 的历史收藏文案断言失败 | Existing owner of authenticated favorites flow | open, non-onboarding | 保留失败；代码审查确认与本任务解耦，必要时另立任务。 |
| 三个旧 UI source 测试目标已删除 | Repository test-maintenance owner | open, non-onboarding | 当前有效 UI 合同已运行；不要恢复 mock 数据或已删除组件来伪造通过。 |
| 未执行真实 320/760/宽屏截图 | Functional/Compatibility QA | open | 真实会话 POC 时补充浏览器尺寸与键盘证据。 |
| POC 媒体/审批实例可能无法物理删除 | POC operator | known | 精确解除业务关联，记录 retained/GC 状态，不宣称零残留。 |

以上风险均未被本汇总接受；是否满足发布条件由后续独立审查和用户 release gate 决定。

## Rollback Readiness

- Procedure: 在任何部署动作前保留当前已运行测试包/静态目录的版本化归档与校验和；若 onboarding 健康检查、授权、申请读取、提交幂等、附件访问或安全归属检查失败，停止新请求入口，恢复上一份已验证静态包与服务文件，然后重启测试服务。对本任务产生的 POC 记录只使用 runId ledger 的精确 cleanup；不批量删除、不处理非 ledger 记录。源代码工作区存在任务前未提交改动，禁止用 `git reset --hard` 或整文件 checkout 回滚。
- Owner: Web release operator（包/服务回退）与 POC operator（精确数据清理）；AI Team Lead 只提供证据，不执行发布。
- Trigger: 新接口 5xx/权限泄漏、重复审批实例、错误发布负向终态、附件越权、构建/健康检查失败，或真实 POC 任一四门禁失败。
- Verification evidence: [handoffs/web.md](./handoffs/web.md) 中 `npm run build`、onboarding 专项和 test-deployment-server 均通过；`server/feishu-onboarding-poc-orchestrator.mjs` 与 `tools/onboarding-poc-contract.test.mjs` 证明 fingerprint、allowlist、ledger 和双精确清理；实际发布前仍须生成目标包归档与 checksum。
- Status: `ready`（源代码/数据回退步骤与验证合同已确定；不表示已经或获准部署）。

## QA Entry Conditions

- Code Review 先核对实现与本汇总，不修代码。
- Functional QA 必须补真实会话业务闭环，包含 upload → submit → list/detail → sync → attachment access → restart recovery → exact cleanup。
- Compatibility QA 在消费 Code Review、Functional QA 和本汇总后记录最终 QA；仅当真实证据完整、Web platform check 通过且 blocking defects=0 时才能记录 passed。

## QA Repair Attempt 1 Aggregate — QA-DEF-01

- Responsible platform: Web. Governed repair attempt `1` was recorded before implementation; task remains `qa`.
- Defect: the live verifier previously derived both SPA routes and root API routes from one URL. With the declared `/test2/` public base, root API requests either lost the SPA prefix or inherited it and returned the SPA document.
- Resolution: the verifier now resolves an API base and an application base separately while requiring identical origins. Legacy `FEISHU_VERIFY_BASE_URL` remains supported; optional explicit inputs are `FEISHU_VERIFY_API_BASE_URL`, `FEISHU_VERIFY_APP_BASE_URL`, and `FEISHU_VERIFY_APP_PUBLIC_BASE`.
- Security boundary: cross-origin target combinations fail immediately. OAuth, real approver, Base fingerprint, manifest, restart, structured cross-eight-day evidence, remote-record verification, and exact cleanup gates are unchanged.
- Changed files: `tools/onboarding-verifier-api.mjs`, `tools/verify-live-onboarding-poc.mjs`, `tools/onboarding-verifier-origin-http.test.mjs`, and the Web-owned handoff.
- Fresh evidence: red test exit `1` before implementation; focused HTTP regression exit `0`; `npm run test:onboarding-poc` passed all 11 stages; `npm run check` passed; `npm run build` passed with 1932 modules; `npm run test:test-deployment` passed and confirmed `/test2/` SPA plus root `/api/v1/` coexistence.
- Platform evidence: Web check was re-recorded as passed against the updated Web handoff. Mobile remains not declared.
- Remaining QA dependency: independent code review and fresh Functional/Compatibility QA must re-run. Real Feishu POC evidence is still absent and may not be inferred from these local checks.

### Repair-attempt code-review remediation

- The first repair review raised two verifier-edge findings. Both were resolved within repair attempt `1` without widening scope.
- Base/public-base inputs containing any raw `?` or `#`, including empty trailing separators, are now rejected before URL target derivation so `/test2` cannot be silently lost.
- Caller headers are normalized case-insensitively; all caller-provided `origin` spellings are removed and exactly one verifier-computed `Origin` remains authoritative.
- Test-first evidence: the P2 regression initially failed with `Missing expected exception`; the P3 regression initially returned `403 !== 200`; both now pass.
- Fresh aggregate evidence after remediation: focused HTTP regression passed; all 11 onboarding POC stages passed; static check passed; production build passed with 1932 modules; deployment-server regression passed; Web platform check was re-recorded as passed.
- No product UI, Feishu business service, approval contract, Base mutation logic, or live POC safety gate changed in this remediation.

## QA Repair Attempt 2 Aggregate — QA-DEF-02 / QA-DEF-03

- Responsible platform: Web. Governed repair attempt `2` was recorded before implementation and is the final permitted repair attempt; task remains `qa`.
- `QA-DEF-02`: the icon metadata content track now uses `minmax(0, 1fr)` and the SHA-256 remains ordinary selectable text with block sizing plus forced wrapping. At 320px the hash box and parent are both 130px wide, its right edge is 269px, and document/viewport width both remain 320px.
- `QA-DEF-03`: the header action uses centered flex alignment and has a 44px minimum height at widths up to 760px. Browser geometry measured 44px at both 320px and 760px.
- Changed files: `src/pages/OnboardingPage.vue`, `src/pages/OnboardingApplyPage.vue`, `tools/onboarding-responsive-accessibility.test.mjs`, `tools/onboarding-poc-web-contract.test.mjs`, and the Web-owned handoff.
- Test-first evidence: before the fix, browser geometry reported a 263.953px hash overflowing a 130px parent and a 42.391px authorization target; the focused test failed. The same test now passes with the measurements above.
- Fresh aggregate evidence: all 11 onboarding POC stages passed; all 10 UI source-sync stages passed; static check passed; production build passed with 1932 modules; deployment-server regression passed; Web platform check was re-recorded as passed.
- Scope boundary: this repair changes only responsive/accessibility presentation and its tests. Approval, submit, sync, attachment authorization, Base writes, and all live POC gates are unchanged.
- Remaining QA dependency: independent code review and fresh Functional/Compatibility QA must pass the implementation. Real Feishu closure remains blocked until the external prerequisites are supplied and exercised.
