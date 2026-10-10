# UI / Visual Handoff — 缓存、同步任务与失败恢复链路

## 1. 文档定位

- 任务：`DEH-SERVER-CACHE-RECOVERY-20261010`
- 平台：Web / Vue；mobile、uni-app 未声明，不在本任务范围内。
- 输入依据：已批准的 [`prd.md`](../prd.md)、[`design/ux-handoff.md`](./ux-handoff.md)、[`task.json`](../task.json) 与 [`task-brief.md`](../task-brief.md)。
- 视觉结论：本任务没有视觉改版。完整继承现有 Vue 设计系统及现有 `normal`、`loading`、`empty`、`error`、`disabled`、`permission-denied` 外观；不得新增或修改 token、组件、文案、布局、图标、动效、视觉资源、前端源码或根 `dist`。
- 后端状态变化只能改变现有状态承载中的数据与生命周期，不能形成新的视觉状态。fresh、stale、last-known-good、后台刷新、`queued`、`running`、内部重试、分页和缓存恢复均不得被视觉化。
- 本文件只定义现有视觉证据的保留规则，不构成设计批准、实现授权或发布批准。

## 2. 视觉方向与层级

保持现有数智产品展厅的蓝白企业后台视觉：蓝色顶栏、白色侧栏、浅灰页面画布、白色内容面板、深蓝标题与蓝色主操作。缓存与同步链路修复后，页面视觉层级不变：

1. 现有全局顶栏、主导航、侧栏与场景搜索保持最高层级。
2. 现有页面标题、统计区、内容卡片、列表和首页五段保持原顺序、尺寸与密度。
3. 首页 `COM-001`、`COM-002`、`COM-005`、`WB-001`、`WB-002` 只在五段全部成功后一次性呈现；不得逐段出现、跳变、闪烁或以空模块占位。
4. 初始请求和同一 `syncId` 轮询共享现有一个 loading 生命周期；不得叠加第二层遮罩、任务进度条、同步徽标或缓存标记。
5. warm、fresh、stale、合格 last-known-good 和 cold 完成后的成功结果均使用同一个既有成功界面，用户视觉上不区分数据来源。

## 3. 现有设计系统证据与保留规则

### 3.1 色彩与表面

以下值仅转录现有代码，不新增 token：

| 用途 | 现有值或引用 | 保留规则 |
| --- | --- | --- |
| 品牌/主操作 | `--xlt-navy-900: #0060a6`、`--xlt-link: #0060a6` | 顶栏、主按钮、链接和选中状态继续使用现有实现 |
| 强标题 | `--xlt-ink: #102a4c` | 页面和卡片标题保持现有层级 |
| 正文 | `--xlt-text: #3e5571` | 页面正文和状态正文保持现有实现 |
| 次要文字 | `--xlt-muted: #6b7d91` | 仅沿用现有元信息和说明文字，不新增低对比内容 |
| 页面画布 | `--xlt-canvas: #f5f7fa` | 页面和状态表面保持浅灰底 |
| 内容表面 | `--xlt-surface: #fff` | 卡片、面板与 inline state 保持白底 |
| 边框/分隔 | `--xlt-line: #d9e2ec`、`--xlt-divider: #e7edf3` | 不改变边框层级和密度 |
| 柔和选中面 | `--xlt-soft: #eaf1f8` | 只沿用既有选中/辅助表面 |
| 错误输入 | `--form-control-error: #c62828` | 不新增错误色或新的错误组件 |
| 禁用输入 | `#f2f4f7` / `#929dab` | 继续沿用既有禁用样式和语义 |
| 状态警示条 | 文字 `#7b5b16`、背景 `#fff7dc`、边框 `#f1d680` | 只用于既有 disabled notice，不挪用于缓存或后台刷新 |

表面圆角与阴影继续使用 `--xlt-radius: 7px` 和 `--xlt-shadow: 0 1px 3px rgba(13,45,80,.05)`；状态操作保持现有 `4px` 圆角。不得因后端缓存命中、stale 或重试改变卡片背景、透明度、阴影或边框。

### 3.2 字体与字号

- 字体栈保持：`"Microsoft YaHei", "PingFang SC", Arial, sans-serif`。
- 现有字号 token 原样继承：caption `10px`、meta/control `11px`、body `12px`、card title `15px`、section `16px`、page title `23px`。
- 页面正文行高保持 `1.55`；现有段落、定义和列表继续使用 `1.65`，表格语义区继续使用 `1.5`。
- 状态面标题继续使用既有 `20px`，正文、按钮和链接沿用组件现有继承值；不得新增“同步中”“缓存数据”“正在重试”等视觉文本层级。

### 3.3 间距、尺寸与密度

- 保持现有 `4/8/12/16/20px` 间距节奏及 `12px` section gap。
- 桌面顶栏继续为 `63px`；桌面侧栏继续以 `220px` 为主，紧凑区间按现有断点收缩。
- 现有状态操作保持 `min-width: 104px`、`min-height: 38px`、水平内边距 `18px`。
- 窄 Web 继续使用 `--h5-gutter: 12px`、`--h5-gap: 12px`、`--h5-control: 44px`；现有导航与主要触控项保持 `44px` 或既有更大尺寸。
- 本任务不统一、放大或缩小已有控件；后端状态切换不得造成布局位移或内容区密度变化。

### 3.4 图标、图片、层级与动效

- 继续使用现有导航图片、`TypeLineIcon`、业务图标及其当前尺寸、滤镜和语义；不增加缓存、同步、成功或失败图标。
- 继续使用现有轻阴影和边框形成层级，不新增 modal、toast、banner、badge 或浮层。
- 仅保留现有颜色/背景/边框短过渡、侧栏抽屉过渡和页面既有行为；后台静默刷新不触发动效、骨架屏或内容闪烁。
- `prefers-reduced-motion: reduce` 下继续关闭既有滚动/侧栏相关动画；不得为轮询或任务状态新增循环动画。

## 4. 六种必备状态的视觉继承

| 状态 | 现有视觉承载 | 本任务必须保持的效果 | 禁止变化 |
| --- | --- | --- | --- |
| `normal` | 现有首页、卡片、列表、统计和详情内容 | HTTP 200、`completed.result`、fresh/stale/last-known-good 均直接进入相同完整正式数据界面 | 不显示缓存来源、stale 标记、同步成功提示；不逐段补内容 |
| `loading` | 现有 loading 气泡/状态区及“请求处理中”语义；状态容器维持 `aria-busy` | 初次请求、HTTP 202、`queued/running` 和内部重试保持同一次 loading；完成后自动消失 | 不新增进度条、倒计时、任务号、重试次数、第二层 loading 或重复公告 |
| `empty` | 现有真实空态和原有动作 | 仅在正式数据完整分页、schema 与授权校验后确认为零记录时显示 | 不把超时、部分数据、权限失败、同步未完成或五段缺失表现为空态 |
| `error` | 现有 `.state-surface`：居中标题、说明和既有错误动作；画布背景、深色正文、蓝色操作保持原样 | 仅在无可服务 last-known-good 的最终 `failed/expired` 等既有错误条件下进入；只出现一次 | 不新增错误样式、代理数据占位、部分首页或“请手动刷新”视觉提示 |
| `disabled` | 现有内容降至 `.72` opacity，顶部既有黄色 disabled notice；控件沿用 disabled 样式 | 只由原业务规则触发；缓存、轮询和后台刷新不得新增页面级 disabled | 不用 disabled 表达 warming、排队、缓存失效或后台刷新 |
| `permission-denied` | 现有 `.state-surface`、标题“访问受限”、既有说明和返回工作台动作 | HTTP 403、owner/权限/数据范围不匹配或撤权继续使用既有访问受限外观 | 不显示旧缓存、快照、任务结果、空态或普通错误；不泄露技术信息 |

补充边界：

- HTTP 401 继续进入现有登录/重新授权外观，不并入一般 `error` 或 `permission-denied`。
- `/health/ready` 的 `warming` 是运维状态，不新增用户界面。
- last-known-good 刷新失败时继续显示完整 `normal`/真实 `empty`；后台失败不得切换到 `error`、清空内容或改变透明度。
- `queued` 与 `running` 只映射至既有 `loading`；`completed` 映射至 `normal` 或真实 `empty`；`failed`/`expired` 只映射至既有 `error`。不得新增与服务端枚举同名的视觉变体。

## 5. 响应式 Web 保留规则

此处均为现有 Web CSS 证据，不代表新增 mobile 产品范围：

- `>1600px`：沿用当前宽桌面布局。
- `941–1600px`：侧栏维持现有 `220px`；顶部和内容按既有规则缩放。
- `1001–1280px`：沿用现有紧凑顶栏、导航和用户区规则。
- `761–1000px`：沿用现有紧凑导航；`761–940px` 侧栏使用现有 `150px`。
- `761–1100px`：表单/人才类页面沿用现有两列及局部横向滚动规则。
- `≤1200px`：现有统计、筛选和详情区域按当前规则减少列数。
- `≤760px`：仅作为窄 Web 响应式适配；使用现有 `56px + safe-area-inset-top` 顶栏、抽屉侧栏、单列内容、局部横向表格和 `44px` 主要触控尺寸。
- `≤430px`、`≤380px` 及 `≤760px landscape`：继续使用 `h5.css` 中现有列数和横屏规则。

所有宽度下，后端返回 200/202、任务轮询和静默刷新不得改变现有断点、导航结构、卡片列数、模块高度或安全区处理。首页五段成功后按当前断点一次性呈现。

## 6. Hover、焦点、键盘与辅助技术外观

- 桌面 hover 继续沿用现有链接、导航、按钮和表格背景变化；缓存或同步状态不增加 hover affordance。
- 全局 shell 的链接、按钮和 main 焦点继续使用现有 `3px #ffb648`、`2px` offset；状态面继续使用现有 `3px #ff9f1a`、`3px` offset；窄 Web 横向滚动区继续使用现有 `3px #1b77d2`、`2px` offset。不同作用域的既有值不在本任务中合并或替换。
- loading 不抢焦点、不形成焦点陷阱；轮询、内部重试、静默刷新及 fresh/stale 切换不移动焦点。
- `permission-denied` 继续按现有行为聚焦状态标题；其他终态只允许现有边界的一次性焦点行为，不因状态轮询重放。
- 不新增可聚焦元素，不改变 Tab 顺序、skip link、抽屉焦点管理、浏览器返回或页面离开行为。
- `aria-live="polite"`、`aria-busy`、`role="status"`、`role="alert"` 和 `inert` 继续由现有组件承担；同一任务轮询不得重复产生视觉或读屏公告。

## 7. 对比度保留与验证边界

- 本任务不新增颜色组合，也不修改已有颜色。主视觉组合继续使用白色与 `#0060a6`、`#102a4c`、`#3e5571` 及浅灰表面。
- 现有 focus-visible 均使用 3px 实线轮廓；forced-colors 模式继续使用系统 `Highlight`。
- disabled 控件继续使用现有禁用色和语义，不作为普通正文使用。
- 当前任务证据未包含完整的 WCAG 自动/人工对比度审计报告，也未覆盖所有图片、图标、hover、disabled 和窄 Web 组合。因此不得在本交接中虚构“全部达到某一对比度等级”的结论。QA 应按现有页面逐态复核文字至少 4.5:1、大文本至少 3:1、必要非文本边界和焦点指示至少 3:1；发现既有问题应登记为独立前端视觉/无障碍缺陷，不得在本后端任务中暗改。

## 8. Web 与 uni-app 差异

- **Web：** 唯一声明平台。继承 `src/style.css`、`src/h5.css`、`ExhibitionShell.vue` 和现有状态组件的桌面/窄 Web 视觉与键盘行为。
- **uni-app / 原生移动端：** 未声明、不适用。本交接不定义设备宽度、原生导航、触控手势或安全区适配，也不声称移动端支持。
- `h5.css` 是当前 Web 项目的窄视口适配证据，不应被解释为新增 uni-app 或移动端交付范围。

## 9. 可追踪视觉证据

| 证据 | 用途 |
| --- | --- |
| `src/style.css` | 全局字体、颜色 token、字号、间距、表面、状态覆盖、桌面与 `≤1200/≤760` 响应规则 |
| `src/h5.css` | `≤760/≤430/≤380`、横屏、`761–1100` 的窄 Web 密度、44px 控件和局部滚动规则 |
| `src/components/ExhibitionShell.vue` | 顶栏、侧栏、导航、safe area、hover、focus-visible、抽屉和响应式结构 |
| `src/components/PageStateBoundary.vue` | `loading/empty/error/disabled/permission-denied` 的现有表面、按钮、焦点、公告、`aria-busy` 与 `inert` |
| `src/App.vue` | 页面状态映射、现有入口授权承载和 Vue 页面组合 |
| `src/integration/data-state.js` | 现有状态枚举及状态公告语义 |
| `src/integration/homepage-aggregate-client.js` | 首页 200/202 与 `queued/running/completed/failed/expired` 合同 |
| `src/integration/persistent-homepage-client.js` | 现有同一 `syncId` 轮询、浏览器缓存和静默刷新行为证据 |
| 前置任务 `functional-qa-report.md`、`qa-report.md` | 真实页面仅发一次首页 POST、复用同一任务轮询及既有 visual/loading 现场证据 |

## 10. 实现和 QA 保留清单

- [ ] 前端源码、根 `dist`、组件、样式、路由、文案和视觉资源变更均为零。
- [ ] warm、stale 和 last-known-good 首次成功不进入新的 loading/202 视觉流程。
- [ ] cold 202 后始终保持同一现有 loading；轮询不产生第二个 loading、重复公告或焦点移动。
- [ ] `completed.result` 自动进入现有完整首页，五段一次性呈现，无模块跳变。
- [ ] 后台静默刷新不显示 toast、banner、badge、错误、loading 或缓存来源。
- [ ] `failed/expired` 不被新请求复用；后续恢复不新增手动刷新视觉要求。
- [ ] normal/loading/empty/error/disabled/permission-denied 六态沿用现有外观并完成真实 Web 验证。
- [ ] 401 保持登录路径；403 保持现有 permission-denied，且不闪现旧内容。
- [ ] 桌面、紧凑 Web 和 `≤760px` 窄 Web 不因后端状态变化发生布局差异。
- [ ] 键盘焦点、单次公告、reduced motion、forced colors 与对比度按现有行为复核；未执行项不得记录通过。

## 11. 冲突、保留项与下游边界

### 11.1 文档时序差异

`prd.md` 的事实表仍保留生成时的 `scope_review / scope 尚未批准` 描述；当前 `task.json` 已记录 scope approved 且任务进入 `design`。这是可追踪的文档时序差异，不改变本视觉范围。

### 11.2 无视觉或 UX 冲突

- 已批准 PRD、UX handoff 与现有 Vue 设计系统均支持“前端和视觉零变化、仅修复后端可观察结果”。
- 没有需要新增 token、组件、文案、布局或视觉资产的需求。
- `queued` 和 `expired` 必须由现有 loading/error 承载；若现有客户端实际不兼容，应作为实现阻断记录，不能通过新增视觉状态、修改前端或删减后端合同绕过。

### 11.3 证据保留

- 现有代码提供了视觉值和状态实现证据，但真实 `empty`、`disabled`、`permission-denied`、撤权、完整读屏和完整对比度矩阵仍缺少现场证据。
- 这些项目必须在后续 QA 中标记为 `passed`、`failed` 或 `blocked/not executed`；不得在本文件中凭推断认定通过。
- 本任务禁止前端修改；若复核发现既有视觉或无障碍缺陷，应建立独立前端任务，不得混入本后端恢复任务。

## 12. 供设计批准的视觉结论

1. 视觉系统、页面层级、六态外观、断点、hover、键盘焦点、对比度行为和窄 Web 适配全部原样继承。
2. 后端 fresh/stale/last-known-good、202 交接、任务状态、内部重试和后台刷新不产生任何新视觉差异。
3. 首页只以完整五段一次性进入现有成功界面；部分、代理、技术状态和缓存来源均不可见。
4. 本任务不产生任何前端源码或根 `dist` 变更。
