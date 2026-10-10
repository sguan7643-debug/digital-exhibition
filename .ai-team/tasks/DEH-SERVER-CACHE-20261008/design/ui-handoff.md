# UI / Visual Handoff — 服务器本地快照缓存与五秒完整读取

## 1. 文档定位与视觉结论

- 任务：`DEH-SERVER-CACHE-20261008`
- 阶段：`design`
- 已批准范围：仅后端、后端测试和完整服务器部署包；前端源文件与前端构建产物零变更。
- 声明平台：Web（Vue）。
- 视觉结论：**完全复用当前 UI、设计 token、页面状态组件、响应式断点与现有请求 loading 气泡。**
- 本任务不新增、删除、替换、重绘或重新排版任何前端组件；不新增视觉稿、图标、插图、动效、页面、弹窗、气泡、进度条、按钮或文案。
- “正式飞书数据正在首次同步”“数据缺失”及同义提示不得出现在验收路径中；这通过后端返回兼容同步任务合同并让现有客户端持续 loading/自动轮询实现，不通过修改前端视觉实现。
- 本交接是现状冻结说明，不构成设计批准，也不授权修改前端。

## 2. 输入与权威顺序

### 2.1 已完整读取的批准输入

1. [task.json](../task.json)：`scope.approved=true`、`state=design`、平台仅为 `web`。
2. [task-brief.md](../task-brief.md)：冻结后端缓存、五秒接管、前端零变更与服务器资源边界。
3. [prd.md](../prd.md)：冻结完整返回、自动轮询、六态语义及验收标准。
4. [UX handoff](./ux-handoff.md)：冻结现有 loading 连续生命周期、禁止首次同步/数据缺失提示、键盘与读屏行为。

### 2.2 只读视觉证据

- [App.vue](../../../../src/App.vue)：现有全局请求 loading 气泡的 DOM、文案、角色与 live region。
- [request-status.js](../../../../src/integration/request-status.js)：现有 active request 计数与 loading 生命周期。
- [style.css](../../../../src/style.css)：全局色彩、字体、间距、表单、状态面、断点和 loading 气泡样式。
- [PageStateBoundary.vue](../../../../src/components/PageStateBoundary.vue)：页面级 loading、empty、error、disabled、permission-denied 外观。
- [AppDetailStateBoundary.vue](../../../../src/components/AppDetailStateBoundary.vue)：应用详情现有内联状态面。
- [h5.css](../../../../src/h5.css)：Web 窄屏适配、44px 控件基线与既有布局规则。
- [ExhibitionShell.vue](../../../../src/components/ExhibitionShell.vue)：顶栏、侧栏、Web 断点和安全区处理。

### 2.3 状态说明

`prd.md` 第 2.2 节保留了范围批准前撰写时的历史句子；当前批准状态以用户明确批准及 `task.json` 中 `scope.approved=true` 为准。该历史文字不产生视觉歧义，也不需要本角色改写 PRD。

## 3. 视觉方向与信息层级

### 3.1 视觉方向

- 延续当前克制的企业级蓝白视觉：深蓝文字、白色信息面、浅灰蓝画布、细分隔线和低强度阴影。
- 缓存命中、快照恢复、stale 返回、后台刷新、同步任务、重试和飞书分页均保持视觉透明。
- 页面只呈现当前已有的业务内容与六种状态；不得增加缓存来源、同步编号、TTL、重试次数或快照状态的视觉标识。

### 3.2 视觉层级

现有层级原样保留：

1. 展厅顶栏与主导航。
2. 侧栏与场景化搜索。
3. 当前页面标题、筛选区、卡片/表格/详情等业务内容。
4. 页面已有状态承载区。
5. 前景请求期间位于右上方的全局 loading 气泡。

后台静默刷新不进入第 4 或第 5 层，不遮挡已展示的完整数据。

## 4. 现有设计 token 冻结

以下均为当前代码中的有效值或直接样式证据；本任务不新增 token，也不调整现有值。

### 4.1 字体与字号

| 用途 | 当前值 |
| --- | --- |
| 字体族 | `"Microsoft YaHei", "PingFang SC", Arial, sans-serif` |
| Caption | `clamp(13px, calc(12px + .125vw), 15px)` |
| Meta | `clamp(14px, calc(13px + .125vw), 16px)` |
| Body | `clamp(15px, calc(14px + .125vw), 17px)` |
| Card title | `clamp(17px, calc(16px + .125vw), 20px)` |
| Section title | `clamp(19px, calc(18px + .125vw), 22px)` |
| Page title | `clamp(26px, calc(23.5px + .28vw), 32px)` |

字重、行高、截断和换行继续由各现有页面样式控制；本任务不统一或覆盖页面差异。

### 4.2 色彩、边框与表面

| Token/用途 | 当前值 |
| --- | --- |
| `--xlt-navy-950` | `#052b57` |
| `--xlt-navy-900` / 主操作蓝 | `#0060a6` |
| `--xlt-link` | `#0060a6` |
| `--xlt-ink` | `#102a4c` |
| `--xlt-text` | `#3e5571` |
| `--xlt-muted` | `#6b7d91` |
| `--xlt-canvas` | `#f5f7fa` |
| `--xlt-surface` | `#ffffff` |
| `--xlt-line` | `#d9e2ec` |
| `--xlt-divider` | `#e7edf3` |
| `--xlt-soft` | `#eaf1f8` |
| `--xlt-radius` | `7px` |
| `--xlt-shadow` | `0 1px 3px rgba(13,45,80,.05)` |
| 表单 focus | `#1f6fca` + `0 0 0 2px rgba(0,96,166,.16)` |
| 表单 disabled | 背景 `#f2f4f7`，文字 `#929dab` |
| 表单 error | `#c62828` |

### 4.3 间距节奏

- 基础间距：`4 / 8 / 12 / 16 / 20px`。
- 当前统一 section gap 的有效值：`14px`。
- 各页面已有紧凑/宽松密度、卡片 padding、表格行高和栅格 gap 全部原样保留。
- 不因后端等待时间或轮询次数改变页面密度、留白或内容占位。

## 5. 组件外观冻结

### 5.1 全局请求 loading 气泡

唯一允许持续展示的同步相关前景视觉是当前 `.request-loading-toast`：

- DOM 与内容保持当前值：旋转指示器；主文案“正在处理 N 项请求”；辅助文案“页面其他区域仍可继续使用”。
- 固定位置：`top:84px; right:24px; z-index:2000`。
- 最大宽度：`calc(100vw - 32px)`。
- 布局：水平 flex、居中、`gap:14px`。
- 内边距：`18px 22px`。
- 表面：背景 `#eff6ff`，边框 `1px solid #bed6f2`，圆角 `14px`，阴影 `0 8px 24px #18365518`。
- 主文字：`#153d65`；辅助文字 `14px / #466685`。
- 指示器：`26px × 26px`，`3px` 边框，基础色 `#bad3ed`，强调色 `#0060a6`，线性旋转周期 `.8s`。
- `pointer-events:none`；不新增点击、关闭、重试或聚焦能力。
- `prefers-reduced-motion: reduce` 时保持现有静止指示器，不新增替代动画。
- 初始请求、五秒等待和自动轮询共用同一个连续 loading 生命周期；轮询不得生成第二个气泡或闪烁重建。
- stale 数据已完整返回后的后台静默刷新不得触发该气泡。

### 5.2 明确禁止的气泡和占位

- 不显示“正式飞书数据正在首次同步，请稍后重试”。
- 不显示“正式飞书数据正在首次同步”“数据缺失”“数据准备中”或要求手动刷新的同义提示。
- 不显示同步完成、后台刷新成功/失败、缓存命中或快照恢复提示。
- 不新增 skeleton、进度条、任务编号、倒计时或空白占位。
- 现有源码中兼容历史错误分支的文字不得被本任务正常链路触发；QA 以页面 DOM 和可访问文本中不存在上述禁用内容为准。

### 5.3 页面状态组件

- `PageStateBoundary`、`AppDetailStateBoundary` 及各页面既有状态承载区保持现状。
- 不把页面级状态统一成新组件，不改变颜色、尺寸、圆角、按钮、焦点或布局。
- 不因服务端缓存模式替换页面已有 normal/empty/error/disabled/permission-denied 表面。

### 5.4 既有组件变体

- 按钮、链接、表单、卡片、表格、详情面板、筛选条、分页、导航、徽标与内联状态仅使用各页面当前已经存在的 default、hover、active/current、focus-visible、disabled、error/invalid 等变体；不得为缓存、快照、stale、预热、轮询或任务终态新增变体。
- 鼠标 hover 继续使用当前页面和设计系统已有的颜色、背景与边框变化；任何关键信息或恢复动作不得只在 hover 时出现。
- 表单 focus、invalid 与 disabled 外观继续由 `style.css` 的现有 `--form-control-*` 值和页面 scoped 样式共同决定；本任务不覆盖、不归一化历史页面差异。
- 状态按钮和链接继续沿用当前主操作蓝、现有圆角、尺寸与文案；不增加“查看任务”“刷新缓存”“重新同步”等操作。
- 图标、图片、阴影、层级和动效只保留现有资产与样式，不新增资源文件或视觉资产。

## 6. 六种必备视觉状态

| 状态 | 必须保持的当前视觉 | 本任务禁止事项 |
| --- | --- | --- |
| `normal` | 按当前页面组件、卡片、表格、详情和导航完整渲染；焦点与滚动位置保持现状 | 不增加“来自缓存”“数据已同步”“后台刷新中”等徽标、气泡或占位；不因 stale 数据降低透明度或禁用页面 |
| `loading` | 保留当前全局请求 loading 气泡；若页面原本存在页面级 loading 面，也按原逻辑显示；初始请求与轮询之间视觉连续 | 不删除或重绘 loading；不叠加首次同步、数据缺失、手动刷新、任务进度或第二层 loading 气泡 |
| `empty` | 只有飞书全部分页成功并确认零记录时，使用该页面当前真实空态、当前文字、按钮和布局 | 不把超时、同步未完成、部分分页、权限失败或 schema 错误画成空态；不使用“数据缺失”占位 |
| `error` | loading 结束后使用页面当前终态错误承载区、颜色、按钮与恢复入口 | 不显示首次同步文案，不要求浏览器手动刷新，不把错误替换为空态或新增弹窗 |
| `disabled` | 仅在页面既有业务条件触发时，保留当前 disabled 控件、`disabled-notice`、透明度和不可交互语义 | 缓存刷新、同步排队或轮询本身不得让页面或操作新增 disabled 外观 |
| `permission-denied` | 使用现有权限拒绝状态面/内联 alert；停止 loading 后保持当前无权限路径与焦点处理 | 不显示旧缓存内容、空集合、任务存在性或同步状态；不新增绕过权限的刷新入口 |

HTTP 401 继续沿用现有 authentication-required/重新授权视觉，不作为本任务新增的第七种视觉方案。

## 7. 对比度、焦点与可访问视觉

### 7.1 与本任务直接相关的现有对比度

按当前 sRGB 值计算：

| 元素 | 前景/背景 | 对比度 |
| --- | --- | ---: |
| loading 主文字 | `#153d65 / #eff6ff` | `10.22:1` |
| loading 辅助文字 | `#466685 / #eff6ff` | `5.51:1` |
| loading 指示器强调色 | `#0060a6 / #eff6ff` | `5.99:1` |
| 主按钮文字 | `#ffffff / #0060a6` | `6.51:1` |
| 状态正文 | `#30465c / #ffffff` | `9.74:1` |
| 状态 alert | `#963229 / #ffffff` | `7.54:1` |
| disabled notice | `#7b5b16 / #fff7dc` | `5.85:1` |

loading 边框 `#bed6f2 / #eff6ff` 为装饰性边界，不承担唯一状态识别；loading 同时具有文字和指示器。

### 7.2 现有基线观察（本任务不修改）

- `#8794a1 / #ffffff` 约 `3.10:1`，`--xlt-muted #6b7d91 / #ffffff` 约 `4.23:1`；是否满足要求取决于具体字号、字重和用途。
- 部分现有组件使用 `3px #ff9f1a` focus outline；其对白色约 `2.05:1`，同时 forced-colors 模式使用系统 `Highlight`。
- 上述是既有 UI 观察，不是本任务引入的回归。由于范围明确前端零变更，若 QA 判定不符合目标标准，应登记独立前端无障碍任务，不得在本后端任务中暗改样式。

### 7.3 焦点、读屏与 motion

- loading 气泡保持 `role="status"`、`aria-live="polite"`，且不可聚焦。
- 同一请求生命周期只公告一次开始；轮询不重复播报内部同步状态。
- 页面状态的现有 focus-visible、焦点移动和 alert/status 角色保持不变。
- 不新增闪烁、骨架屏或自动滚动；保留当前 reduced-motion 规则。

## 8. Web 响应式规则

### 8.1 原则

- 不新增、删除、合并或移动任何断点。
- 不通过本任务改变桌面、窄桌面、平板或手机下的密度和布局。
- 各页面自己的 scoped breakpoint 继续优先处理该页面；本交接不尝试统一历史差异。

### 8.2 现有断点证据

- 核心手机/H5 切换：`max-width:760px`。
- 产品详情已有额外区间：`761–1000px`、`max-width:760px`、`max-width:700px`。
- Shell 已有区间与阈值：`max-width:1420px`、`max-width:1100px`、`761–940px`、`941–1600px`、`761–1000px`、`1001–1280px`。
- 全局与页面样式还保留 `1350/1360/1200/1180px` 等当前阈值；不得因本任务重构。

### 8.3 窄屏、触控与安全区

- 在 `max-width:760px` 时继续使用 `--h5-gutter:12px`、`--h5-gap:12px`、`--h5-control:44px` 的现有 H5 适配。
- 现有 H5 覆盖到的交互控件继续保持 `44px` 触控基线；本任务不新增触控目标。
- `PageStateBoundary` 现有恢复/重试操作为 `min-height:38px`，本任务保持现状；如需统一到 44px，应另立前端任务。
- Shell 顶部、侧栏和页脚继续使用 `env(safe-area-inset-*)` 的现有处理。
- loading 气泡当前没有独立窄屏重排；继续通过 `max-width:calc(100vw - 32px)` 适配，不新增手机专用形态。

## 9. 图标、图像、阴影与动效

- 图标：not applicable（本任务不新增或替换图标；继续使用现有 `AppIcon` 和页面资产）。
- 图像/插图：not applicable（缓存与同步状态不得新增插图、占位图或骨架图）。
- 新 elevation：not applicable；仅保留当前表面阴影和 loading 气泡阴影。
- 新 motion：not applicable；仅保留当前 `.8s` spinner 与已有页面过渡，并遵循现有 reduced-motion。
- Figma：not applicable；本任务没有新视觉产物、组件或布局需要写入 Figma。

## 10. Web 与 uni-app 差异

### 10.1 Web

- Web 是唯一声明平台。
- 继续使用现有 Vue DOM、CSS、H5 适配、鼠标/键盘行为、浏览器导航和全局请求状态。
- 本任务的验收对象是后端合同能否让现有 Web 界面保持上述视觉与状态行为。

### 10.2 uni-app

- uni-app、微信小程序、App 端及其他移动客户端均未声明，**not applicable**。
- 因平台不在范围内，本交接不定义 uni-app 的组件映射、设备宽度、touch target、安全区或原生 loading 适配，也不推断 Web 合同已自动适用于 uni-app。

## 11. 视觉验收清单

- [ ] 前端源文件和前端构建产物的变更清单为空。
- [ ] fresh 命中：现有 loading 后直接进入 normal；无缓存/同步提示。
- [ ] stale 可服务：立即展示 normal；后台刷新不出现 loading 或提示。
- [ ] 无缓存且五秒内完成：现有 loading 连续显示，之后进入 normal 或确认 empty。
- [ ] 无缓存超过五秒：同一个 loading 气泡持续至自动轮询终态，无 503 页面、无手动刷新要求。
- [ ] 页面不存在第二个同步气泡、任务进度、倒计时、skeleton 或空白占位。
- [ ] 页面可见文本、DOM 与 live region 中不出现“正式飞书数据正在首次同步”“数据缺失”或同义提示。
- [ ] completed：直接按原页面渲染完整 `successSchema` 结果，不增加“同步完成”视觉。
- [ ] failed：进入现有 error；不进入 empty，不显示首次同步提示。
- [ ] 权限撤销：进入现有 permission-denied，不泄露旧缓存或任务信息。
- [ ] 后台刷新和轮询迭代不新增焦点移动、不滚动页面、不禁用已可用控件；状态终结时原样保留现有 `PageStateBoundary` 的结果标题/权限标题聚焦。
- [ ] spinner 在 reduced-motion 下停止动画；不出现替代闪烁。
- [ ] 桌面及当前断点行为与基线一致；`<=760px` 保留现有 H5 布局与安全区处理。

## 12. 未决冲突与下游约束

### 12.1 范围内视觉冲突

无。PRD、任务简报与 UX handoff 对“前端零变更、保留 loading、禁止首次同步/数据缺失提示、Web 唯一平台”的要求一致。

### 12.2 后端必须满足的视觉兼容条件

- 五秒时仍运行的响应必须是现有客户端可识别的非 503 合同，携带有效 `syncId` 和正整数 `pollAfterMs`。
- 服务端同步任务从创建起的总执行硬上限为 25,000ms（包含初始五秒、排队、重试、退避、分页与归并），严格短于现有首页客户端 29,500ms、普通请求 30,000ms 与部署 Nginx API 35s 超时；到期进入结构化 `failed`，不得无限 `running`。
- `completed.result` 必须直接符合原 operation 的 `successSchema`；不得增加需要前端展示的新包装层。
- `failed.error` 必须是结构化终态错误；不得用用户可见的首次同步 message 代替任务状态。
- 前端当前仍保留历史 `initial-syncing` 兼容文字；后端验收路径必须保证该可见分支不可达。
- 如果后端无法满足以上条件，应阻断本任务设计/开发交接并修复后端合同，不得通过新增前端视觉规避。

### 12.3 交付边界

本视觉交接不要求任何 UI 实现。后续开发和发布证据必须显示：前端源码、`dist` 及视觉资产均未因本任务发生变化。
