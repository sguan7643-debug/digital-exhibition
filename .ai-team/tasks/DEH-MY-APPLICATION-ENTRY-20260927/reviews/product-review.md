# Product Scope Review

## Verdict

`approved`

该提案已具备用户作出范围批准决定所需的证据、边界和可验收标准。本评审不记录范围批准。

## Findings

### Finding: 用户问题与现有代码证据一致

- **Evidence:** `task-brief.md` 记录文字“我的申请”可跳转、快捷卡片不可跳转；`server/feishu-read-only-service.mjs:1540` 为快捷卡片提供 `/profile/todos`，而 `src/pages/ProfilePage.vue:73` 的文字入口使用 `/apps/onboarding/status`。
- **Impact:** 修复可消除同一功能两个入口行为不一致的问题，直接对应已授权申请人的进度查看需求。
- **Recommendation:** 按 PRD 将快捷卡片的目标和可用性规则与现有文字入口对齐；不扩展到其他快捷入口。

### Finding: 视觉修复和回归边界可独立验收

- **Evidence:** `task-brief.md` 记录审批时间线的线条与“提交申请”重叠；`src/pages/OnboardingPage.vue:75,90` 存在该时间线结构和连线样式。PRD 验收标准 5–7 覆盖空态、已有详情以及两阶段和更多阶段的可读性。
- **Impact:** 时间线修复有明确的页面、状态和视觉验收范围，且不会要求变动审批数据或审批规则。
- **Recommendation:** 设计与实现阶段按 PRD 的 Web 验收标准，在空列表、已有两阶段详情和多阶段布局下验证文字、时间、图标与连线互不遮挡。

### Finding: 授权按钮移除的安全边界明确

- **Evidence:** `task-brief.md` 和 PRD 明确仅移除 UI 展示；`src/pages/OnboardingApplyPage.vue:496` 是当前“飞书授权”链接的渲染位置，任务明确排除 OAuth 会话、回调、令牌与审批提交修改。
- **Impact:** 可满足用户不再展示按钮的要求，同时避免把页面展示调整扩大成授权机制改造。
- **Recommendation:** 仅移除该表单页按钮的可见渲染，并回归验证已授权用户的既有申请提交和进度查看链路；任何授权机制变更继续留在独立 OAuth 任务中。

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, or change task state.
