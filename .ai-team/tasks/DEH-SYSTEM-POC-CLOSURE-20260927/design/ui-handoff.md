# UI Visual Handoff

Owner: UI Visual Designer

## Sources and Evidence

- Approved PRD: `.ai-team/tasks/DEH-SYSTEM-POC-CLOSURE-20260927/prd.md`
- UX source: `.ai-team/tasks/DEH-SYSTEM-POC-CLOSURE-20260927/design/ux-handoff.md`
- Design system: `src/style.css` 中 `--xlt-*` 企业主题变量和焦点规则；`src/h5.css` 中 ≤760px、≤430px、≤380px 响应式与 44px 触控规范。

## Visual Hierarchy and Direction

继续使用现有蓝白企业后台风格：深蓝导航、浅灰画布、白色卡片、细分隔线、低强度阴影。标题、状态、主要操作、数据内容依次构成四级层次。验收修复不得以重新设计页面为名改变导航、内容顺序或业务动作。

## Tokens

- 主色/链接：`--xlt-navy-900`、`--xlt-link` = `#0060a6`。
- 标题：`--xlt-ink` = `#102a4c`；正文：`--xlt-text` = `#3e5571`；次要文本：`--xlt-muted` = `#6b7d91`。
- 画布：`--xlt-canvas` = `#f5f7fa`；表面：`--xlt-surface` = `#fff`。
- 边线：`--xlt-line` = `#d9e2ec`；分隔：`--xlt-divider` = `#e7edf3`。
- 焦点：`--form-control-focus` = `#1f6fca`，焦点环 `rgba(0,96,166,.16)`。
- 圆角：`--xlt-radius` = `7px`；阴影：`0 1px 3px rgba(13,45,80,.05)`。
- 间距：4、8、12、16、20px 的 `--xlt-space-1` 至 `--xlt-space-5` 节奏。

## Typography and Contrast

- 桌面角色：caption 10px、meta 11px、body 12px、card title 15px、section 16px、page title 23px，沿用现有变量。
- 360px Web：正文/控件按现有 H5 规则提升至 14–16px；一级标题使用 `clamp(23px, 6.3vw, 28px)`。
- 正文与背景沿用现有高对比深色文本；交互蓝在白色表面使用，错误状态使用文字和边框共同表达。
- 200% 缩放不锁定文本高度，不用省略号隐藏验收必需信息。

## Color, Spacing, Icons, Elevation, and Motion

- 主要按钮使用 `#0060a6` 白字；次要按钮白底蓝字蓝边；禁用降低对比但必须保留可读标签。
- 成功、进行中、警告、错误均同时使用图标/文字，不仅依赖绿、蓝、黄、红。
- 卡片间距使用 12–20px，卡片内距 12–20px；窄屏统一 12px 外边距。
- 状态浮层只用于暂态反馈，不遮挡主操作；持久错误位于对应内容区内。
- 动效仅用于短过渡；`prefers-reduced-motion` 下关闭非必要动画。

## Component Appearance and Variants

- 按钮：primary、secondary、danger、disabled、loading；最小高度桌面 36px、窄屏 44px。
- 输入/选择：白底、1px 边框、4px 圆角；focus 使用明确蓝色边框和焦点环；错误增加错误边框和邻近文案。
- 状态面板：白色或浅色表面、7px 圆角；错误面板不得用裸 JSON。
- 列表/卡片：数据标题、元信息、状态和操作分层；空态操作置于说明下方。
- 时间线/进度条：连接线置于节点中心的独立层，文字块有实色背景或足够垂直间距，任何缩放下不得穿过文字。
- 上传项：文件名、类型/大小、状态和重试操作保持独立行；失败项使用浅红表面和错误文字。
- 局部横向滚动表格：有可见边界和键盘焦点轮廓。

## Web Visual Rules

- >1200px：使用现有桌面密度和多列布局。
- 761–1200px：筛选和表单两列；详情主区收缩，辅助操作换行。
- ≤760px：单列、12px 沟槽、44px 控件；卡片和操作不超出视口。
- ≤430px：统计卡片单列；≤380px：高密度双列指标降为单列。
- 200% 缩放：允许自然换行和纵向增长；仅数据表使用局部横向滚动；页面整体不出现横向滚动。
- Hover 只做颜色/边框轻微变化；键盘 focus-visible 至少 2–3px 明确轮廓，不被 hover 覆盖。

## uni-app Platform Adaptations

不适用。任务只覆盖响应式 Web，没有声明 uni-app 目标、原生安全区或平台组件适配。

## Required States

### normal

白色内容表面、标准蓝色操作、正常文本层级；保留现有页面结构。

### loading

局部区域显示等待条/占位和文字；旧内容可见时降低强调但不清空；主按钮显示进行中并禁用。

### empty

居中或卡片内空态，使用标题、说明和单一恢复操作；无数据与无匹配文案不同。

### error

浅红区域、错误标题、说明、请求标识和重试按钮；错误不能仅通过红边表达。

### disabled

使用灰色表面/边框和较低强调文字，保留足够对比；邻近原因说明不置灰到不可读。

### permission-denied

使用独立状态页或区域，显示权限/授权图标、标题、解释和明确恢复/返回按钮；不展示原始响应体。

## Open Questions and Conflicts

- 无视觉或 UX 冲突。
- 本设计仅定义现有系统验收和修复的视觉边界，不授权全面换肤。
