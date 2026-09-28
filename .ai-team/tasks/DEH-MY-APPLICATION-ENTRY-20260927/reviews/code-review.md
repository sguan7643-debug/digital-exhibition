# Front-end Code Review

## Findings

### Finding: “我的申请”权限元数据与当前统一入口规则存在后续漂移风险

- **Severity:** P3
- **File/Line:** `server/feishu-read-only-service.mjs:1540-1541`; `tools/feishu-personal-read-batch.test.mjs:12-14,81-86`
- **Evidence:** “我的申请”条目仍携带 `applications.view` 元数据，但当前实现用 `code === 'todos'` 让快捷卡片与始终可导航的文字入口保持一致。独立执行 `node tools/feishu-personal-read-batch.test.mjs` 已验证：测试用户仅有 `apps.view`、没有 `applications.view` 时，服务仍返回 `/apps/onboarding/status` 且 `enabled: true`。页面的数据读取仍由已认证身份和本人数据范围控制；`OnboardingPage.vue:28-40,65-70` 保留 `401/403` 权限拒绝反馈，未发现越权读取。
- **Impact:** 当前行为符合批准设计中“两处入口一致、进入后沿用既有权限反馈”的要求，不构成本次阻断；但保留未参与可用性判定的权限码可能让后续维护者误以为它仍控制入口展示。
- **Recommendation:** 后续权限治理任务中明确 `applications.view` 是说明性元数据还是有效门禁；若所有已授权用户都可查看本人申请，应移除或重命名该无效展示门禁。不要在本任务中恢复两处入口不一致。

### Verification: 上一轮 P2 窄屏连接线阻断项已真实修复

- **Severity:** P3
- **File/Line:** `src/pages/OnboardingPage.vue:75,90,93`; `tools/my-application-entry.test.mjs:43-132`
- **Evidence:** 窄屏 `.timeline-track` 已由固定 `28px` 高度改为 `height:auto; min-height:28px; align-self:stretch`，连接段以 `top:28px; bottom:-18px` 随阶段行高度延伸。独立运行真实 Edge 几何测试得到：普通文本连接线终点与下一图标上缘均为 `87px`；长文本换行后两者均为 `125px`；连接线横向范围为 `40-42px`，文字列从 `65px` 开始。上一轮观察到的约 `14px` 断口已消失，长文本实际把阶段行增高到 `80px`，测试没有依赖固定高度蒙混通过。
- **Impact:** 窄屏连接线连续连接相邻图标且不进入文字列，满足批准设计和 PRD 验收标准 6-7；原 P2 阻断已关闭。
- **Recommendation:** 保留当前浏览器几何断言，避免后续把轨道重新固定为图标高度。

## Out-of-Scope Observations

### Observation: 当前工作树包含其他治理任务的同文件改动

- **File/Line:** `server/feishu-read-only-service.mjs`; `src/pages/OnboardingApplyPage.vue`; `src/pages/OnboardingPage.vue`
- **Evidence:** `git status` 与文件级 diff 显示这些文件同时承载其他未提交任务改动；`handoffs/web.md` 和 `engineering-handoff.md` 已把本任务归属限定为入口路由/可用性、授权按钮展示移除和时间线布局。
- **Recommendation:** 后续提交或交付仅提取本任务归属片段，避免混入其他任务；本观察不影响本次 verdict。

## Verdict

approved

当前没有阻断性代码审查问题。该批准仅表示本任务实现已通过独立前端代码复审，不代表合并、部署、发布、任务状态或 release approval。

## Review Boundary

本轮完整复核了 `task.json`、`task-brief.md`、`prd.md`、批准的 UX/UI 与聚合设计交接、`handoffs/web.md`、`engineering-handoff.md`、上一轮代码审查及任务归属实现/测试差异。独立只读验证结果：

- `node tools/my-application-entry.test.mjs`：通过；普通与换行窄屏场景的连接线端点分别精确贴合在 `87px` 与 `125px`。
- 独立真实 Edge 宽屏几何检查：通过；连接线为 `top 40px / bottom 42px`，文字行从 `55px` 开始，且连接段左右端分别贴合两个图标外缘。
- `node tools/feishu-personal-read-batch.test.mjs`：通过；快捷卡片返回 `/apps/onboarding/status` 且与文字入口同为可用。
- `node tools/mounted-profile-projection.test.mjs`：通过；安全本地导航和权限拒绝投影无数据泄露。
- `node tools/onboarding-apply-interaction.test.mjs`：通过；授权入口负向断言、会话读取、`submitOnboarding`、成功结果导航及返回入口契约均通过。
- `node tools/onboarding-responsive-accessibility.test.mjs`：通过；真实浏览器中“飞书授权”可聚焦链接数量为 `0`，返回按钮在 `320px` 与 `760px` 均为 `44px` 高。
- `node tools/onboarding-status-live.test.mjs`：通过；申请状态页继续由返回的真实审批实例状态驱动。
- `npm.cmd run check`：通过。
- `npm.cmd run build`：通过；Vite 转换 `1,932` 个模块。
- `git diff --check -- <task-attributed files>`：通过，仅有工作树换行符提示，无空白错误。

申请页当前仍从 `/api/v1/auth/feishu/session` 读取当前用户，并保留 `submitOnboarding`、不确定结果确认和按 `applicationId` 跳转状态页的链路；本任务归属改动未触及 OAuth 回调、令牌或服务端审批逻辑。本审查只覆盖并写入本报告，未修改业务代码、测试、交接、任务状态、QA、发布批准，也未部署、提交或合并。
