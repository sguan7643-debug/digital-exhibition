# UI Visual Handoff

Owner: UI Visual Designer

## Sources and Evidence

- Approved PRD: `../prd.md`
- UX source: `design/ux-handoff.md`
- Design system: 现有 `/apps/onboarding/apply` 页面组件和样式；本任务不改视觉。

## Visual Hierarchy and Direction

保持现有申请页面的层级、布局、字段顺序、按钮和反馈组件。该任务没有新增视觉方向或页面元素。

## Tokens

继续使用现有项目令牌；不新增或修改颜色、字号、间距、圆角、阴影、动效令牌。

## Typography and Contrast

现有排版和对比度保持不变。本任务没有新的文本层级或图形内容。

## Color, Spacing, Icons, Elevation, and Motion

全部保持现状；不新增图标、气泡、弹窗、动画或布局间距。

## Component Appearance and Variants

不新增组件变体。现有输入框、下拉框、提交按钮、加载状态和错误提示原样复用。

## Web Visual Rules

- 所有现有响应式断点、宽度、密度和重排规则保持不变。
- hover、focus、focus-visible、禁用和提交中外观保持不变。
- 不因本次服务端写入修复产生新的页面高度、遮挡或溢出。

## uni-app Platform Adaptations

未声明；`task.json.platforms` 仅包含 Web，因此触摸目标、安全区和设备宽度不适用。

## Required States

| 状态 | 视觉处理 |
| --- | --- |
| normal | 保持现有表单正常态。 |
| loading | 保持现有提交中和按钮禁用视觉。 |
| empty | 不新增空态视觉。 |
| error | 保持现有错误提示样式，不新增内部技术信息。 |
| disabled | 保持现有禁用样式与非颜色提示。 |
| permission-denied | 保持现有飞书授权提示页面/组件。 |

## Open Questions and Conflicts

无。UX与批准PRD均要求零视觉变更。
