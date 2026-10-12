# UI Visual Handoff — 真实数据读取与业务接口完整性

## 1. 文档定位与视觉结论

- 任务：`DEH-SERVER-REAL-DATA-20261010`。
- 唯一声明平台：Web / Vue。Mobile、uni-app 与其他移动目标未声明，均不适用。
- 视觉结论：本任务是纯后端任务，不产生任何新的视觉方向。现有信息层级、布局、token、字体、颜色、间距、组件、断点、hover、focus、contrast、motion、图标、图片及文案全部原样保留。
- 实施边界：不得修改前端源码、根 `dist`、路由、组件、样式、视觉资源或响应式规则；不得为适配后端响应而新增页面、卡片、弹窗、toast、进度条、状态标签、同步任务页或缓存提示。
- 交付结论：不需要新视觉资产，不需要 Figma 新建、编辑或交付，不需要设计稿标注；工程实现只需让批准的后端响应继续进入现有组件及状态边界。
- 本文件不记录设计批准，不授权前端改动、开发路由、QA 通过、部署或发布。

## 2. 批准来源与现状证据

### 2.1 批准来源

- [task.json](../task.json)：任务处于 `design`，scope 已批准；仅声明 Web，`mobile_framework="none"`，`mobile_targets=[]`。
- [task-brief.md](../task-brief.md)：现有 Vue Web 的 Node 后端修复；前端代码不在范围内。
- scope-approved [prd.md](../prd.md)：冻结后端 contract v2、六态语义、前端零变更、Web-only 与不新增视觉的边界。
- [decision-log.md](../decision-log.md)：记录 scope approval；design 与 release 尚未批准。
- [ux-handoff.md](ux-handoff.md)：冻结一次 loading 生命周期、单一 `syncId` 自动轮询、LKG 静默刷新、首页原子结果、六态内容与焦点/公告行为。

### 2.2 当前 Web 视觉系统证据

- [ExhibitionShell.vue](../../../../src/components/ExhibitionShell.vue)：现有顶栏、主导航、侧栏、`#main-content`、页脚、跳转主内容、窄 Web 抽屉、safe-area 与键盘焦点样式。
- [style.css](../../../../src/style.css)：现有全局颜色、排版、间距、圆角、阴影、表单、页面/卡片表面、hover/focus、forced-colors、响应式与 reduced-motion 规则。
- [h5.css](../../../../src/h5.css)：现有窄 Web 适配层；主断点 `760px`，含 `44px` 控件高度、局部横向滚动、`430px`/`380px` 收敛、横屏规则和 safe-area 相关承载。
- [PageStateBoundary.vue](../../../../src/components/PageStateBoundary.vue)：现有 `normal/loading/empty/error/disabled/permission-denied` 页面边界、`aria-busy`、live region、结果区隐藏、`inert`、焦点恢复和状态表面。
- [FavoritesPage.vue](../../../../src/pages/FavoritesPage.vue)、[ProfilePage.vue](../../../../src/pages/ProfilePage.vue)、[MaterialsPage.vue](../../../../src/pages/MaterialsPage.vue)、[ApplicationUseApplyPage.vue](../../../../src/pages/ApplicationUseApplyPage.vue)：现有收藏、个人中心、素材、申请页面的卡片/列表/表单、空态、错误、禁用、成功及公告样式。
- [App.vue](../../../../src/App.vue)：现有鉴权入口、前景请求状态、页面状态边界及各业务页面挂载关系。
- [IntegrationAuthBanner.vue](../../../../src/components/IntegrationAuthBanner.vue)：现有 401/重新授权承载。

## 3. 不可变视觉合同

本任务的实现与验收必须满足以下零变化合同：

1. DOM 信息架构与视觉层级不变：顶栏 → 主/侧导航 → 页面标题/面包屑 → 筛选与工具栏 → 卡片、列表、详情或表单 → 分页/页脚。
2. 页面顺序、入口、CTA 数量与位置不变；收藏、取消收藏、申请、下载、返回详情、前往个人中心等继续使用既有控件。
3. 不新增 token，也不把页面 scoped 颜色、圆角或间距重构为新 token；现有 CSS cascade 是权威视觉来源。
4. 不新增组件、variant、图标、插画、图片、徽标、骨架屏、遮罩、弹窗或任务进度视觉。
5. 不改变现有断点、列数、密度、内容重排、滚动方式、窄 Web 抽屉、safe-area、触控尺寸或桌面 hover。
6. 不改变现有颜色对、边框、圆角、阴影、透明度、focus indicator、forced-colors 或 reduced-motion 行为。
7. 不把 `syncId`、trace、cache status、stale、TTL、baseline hash、重试次数、队列或分页进度显示给用户。
8. 后端 fresh/LKG/202/poll/completed/error 的变化只能驱动既有状态；不得成为视觉改版理由。

## 4. 现有层级与组件外观

### 4.1 Shell 与页面层级

- Shell：保留 `ExhibitionShell` 的蓝色顶栏、品牌、主导航、快捷入口、账户菜单、左侧应用导航、主内容区和平台页脚。
- 页面：保留页面标题和说明作为第一层；筛选/工具栏为第二层；业务卡片、列表、详情面板、统计或表单为主要内容层；分页与页脚为末层。
- 详情：保留面包屑、hero、指标、信息面板、相关内容与既有动作区，不因正式名称或后端 metadata 增加信息层。
- 业务内容：正式人员名、部门名、联系方式、字典 label、收藏版本、申请状态和文件状态只替换既有字段内容，不新增 badge、列、卡片、辅助说明或技术标记。

### 4.2 既有组件与 variant

| 体验区域 | 必须复用的现有组件/样式 | 允许的后端驱动变化 | 禁止的视觉变化 |
|---|---|---|---|
| 全局状态 | `PageStateBoundary`、`IntegrationAuthBanner`、`request-loading-toast` | 在批准状态间切换；保持一次连续 busy 生命周期 | 新 loading、同步进度、缓存/stale 提示 |
| 应用列表/详情 | 既有应用卡片、详情 hero/panel、按钮与 tag | 将 ID 回退替换为正式名称；完整结果一次呈现 | 名称后补闪烁、新人员 badge、新布局 |
| 收藏 | `favorite-filters`、`favorite-tools`、`favorite-grid`、`favorite-empty`、既有 footer actions | 正式 APP 收藏、稳定 ID/version 驱动既有按钮 | 新收藏状态组件、冲突弹窗、额外版本文案 |
| 个人中心 | `identity`、`profile-stats`、`quick-panel`、`profile-bottom`、`profile-state` | 当前用户身份、零统计及空集合填入原区域 | 空集合时隐藏身份、新入口或申请跟踪 UI |
| 素材 | `materials-filter`、`materials-tools`、`materials-grid`、`materials-empty`、既有下载按钮 | `primaryFile` 有/无控制既有动作可用性 | 伪文件、外链样式、新下载面板或无文件插画 |
| 使用申请 | `use-apply-summary`、`use-apply-form`、`use-apply-success`、`use-apply-state` | APP-005 成功进入既有成功结果；失败留在表单 | 新审批时间线、弹窗、202 任务态 |
| 鉴权/权限 | 现有登录 banner、页面/局部 alert 与访问受限表面 | 401 进入鉴权承载；403 进入访问受限承载 | 把拒绝显示为空态或 disabled |

## 5. 现有 token、字体、颜色与间距

### 5.1 全局 token（只引用，不新增）

以 [style.css](../../../../src/style.css) 当前 cascade 为准：

| 类别 | 现有值/引用 |
|---|---|
| 品牌与链接 | `--xlt-navy-950:#052b57`；`--xlt-navy-900/--xlt-navy-800/--xlt-link:#0060a6` |
| 正文 | `--xlt-ink:#102a4c`；`--xlt-text:#3e5571`；`--xlt-muted:#6b7d91` |
| 表面 | `--xlt-canvas:#f5f7fa`；`--xlt-surface:#fff`；`--xlt-soft:#eaf1f8` |
| 分隔 | `--xlt-line:#d9e2ec`；`--xlt-divider:#e7edf3` |
| 形状与层级 | `--xlt-radius:7px`；`--xlt-shadow:0 1px 3px rgba(13,45,80,.05)` |
| 表单 | `--form-control-border:#ccd8e5`；hover `#8da9c4`；focus `#1f6fca`；ring `rgba(0,96,166,.16)` |
| 排版 | caption `clamp(13px, calc(12px + .125vw), 15px)`；meta `clamp(14px, calc(13px + .125vw), 16px)`；body `clamp(15px, calc(14px + .125vw), 17px)`；card title `clamp(17px, calc(16px + .125vw), 20px)`；section `clamp(19px, calc(18px + .125vw), 22px)`；page title `clamp(26px, calc(23.5px + .28vw), 32px)` |
| 间距 | `--xlt-space-1..5:4/8/12/16/20px`；当前 `--xlt-section-gap:14px` |

后出现的 `:root` 声明按现有 CSS cascade 生效；不得复制一套“本任务专用”值。页面 scoped 样式继续覆盖其自身区域，不在本任务中统一化。

### 5.2 字体、密度、图标、影像与 elevation

- 字体 family、字重、行高和当前 clamp 缩放保持现状；后端正式名称允许按现有截断、换行和 overflow 规则呈现。
- 桌面密度与窄 Web 密度保持现状；不得因真实数据字段变长压缩字号或缩小控件。
- 图标继续使用现有 `TypeLineIcon`、`AppIcon` 和仓库视觉资源；无新增 icon、插画、头像占位或品牌资产。
- elevation 继续使用现有白色 surface、`--xlt-line` 边框和 `--xlt-shadow`；状态切换不提高或降低层级。
- 现有前景请求 spinner、抽屉与鉴权 banner 动画保持现状；`prefers-reduced-motion: reduce` 下继续取消相应动画/过渡。不为后台静默刷新增加 motion。

## 6. Contrast、hover 与 focus 保持

### 6.1 Contrast

- 文字/表面颜色对原样保留：ink `#102a4c`、body `#3e5571`、muted `#6b7d91`、link/primary `#0060a6` 与白色/浅灰现有表面；状态组件继续使用各自 scoped 的现有颜色对。
- 主按钮继续使用白字/`#0060a6`，次按钮继续使用蓝字/白底与现有边框；error、disabled、warning 与 permission 表面继续使用当前 scoped 颜色。
- 非文字对比原样保留：`--xlt-line/#d9e2ec`、`--xlt-divider/#e7edf3`、表单 focus border/ring、状态边框、选中条及卡片边界均不变。
- 本任务不引入任何新颜色组合，也不声称重新完成全站 WCAG 认证。验收标准是颜色与状态样式不发生回归；若现有对比度另有缺陷，应记录为独立前端缺陷，不得在本后端任务中暗改。

### 6.2 Hover、keyboard focus 与 forced colors

- 保留现有桌面 hover：导航、筛选、卡片动作、链接和可用按钮的颜色/背景/边框反馈不变；disabled 控件不得获得可操作 hover。
- 表单继续使用 `:focus-visible` 的 `--form-control-focus:#1f6fca` 与 `0 0 0 2px` ring。
- 链接/按钮继续使用组件现有的 `3px` focus outline 与既有 offset：主要为 `#ff9f1a`，部分页面为 `#1b77d2`，Shell 为 `#ffb648`；不得统一或替换。
- `forced-colors: active` 下继续使用 `Highlight` outline；窄 Web 横向滚动区继续保留可见 focus outline。
- 后端必须避免重复 202、切换 `syncId` 或抖动状态，从而避免重复 focus、重复 live-region 公告和反复重绘；一次请求只产生一次终态视觉更新。

## 7. 六种必备状态的视觉保持合同

| 状态 | 后端触发 | 继续使用的现有视觉 | 内容与动作保持 | 明确禁止 |
|---|---|---|---|---|
| `normal` | fresh/cold HTTP 200、poll `completed`、非空完整 LKG 200、写成功 | 原页面标题、筛选、工具栏、卡片/列表/详情/表单与动作；不加状态装饰 | 一次性显示完整正式数据；LKG 与 fresh 视觉相同；后台刷新不阻塞 | stale/cache badge、名称闪烁、partial 卡片、技术公告 |
| `loading` | 初始读取、5 秒内等待、有效 202 后 `queued/running`、既有写提交 | `PageStateBoundary .state-surface`、页面已有 loading/status、当前前景请求承载 | 初始请求到 completed/failed 是同一个 busy 生命周期；写按钮保持既有 submitting/disabled | 新骨架屏、百分比、倒计时、任务页、每次 poll 重播动画或公告 |
| `empty` | 完整且已授权的零结果；WB-003 子集合为空；COM-004 合法 null；MAT-002 `primaryFile=null` | `favorite-empty`、`materials-empty`、既有 page/profile empty 及各页原有空态 | 收藏零项显示既有空态；WB-003 保留身份和零统计；无文件素材仍显示卡片并禁用既有下载动作 | 把 401/403/5xx、baseline/投影失败或无文件下载错误显示为空列表 |
| `error` | 无合格 LKG 的 failed/expired、schema/baseline/投影/上游错误、409 写冲突 | 现有 `.state-surface`、页面 scoped error、`role="alert"` 与既有重试/返回承载 | 结束 loading；写失败保留表单和页面上下文；首页不显示本轮 partial | 新错误弹窗、内部 trace/sync 文案、用旧失败任务维持 loading |
| `disabled` | 仅既有业务条件；COM-005 停用项被后端过滤；素材无文件；缺版本/写通道等既有条件 | 原生/语义化 `disabled`、现有 opacity/灰色、`PageStateBoundary` 既有 disabled variant（仅原流程已使用时） | `primaryFile=null/canDownload=false` 继续禁用现有打开/下载控件；Tab 顺序与 title 保持 | 新页面级 disabled、停用字典项展示、视觉禁用但仍发请求、把 403 伪装 disabled |
| `permission-denied` | 已登录但 operation、owner、scope、self-only、审批角色或同源下载校验失败 | `PageStateBoundary` 访问受限表面或页面既有 permission alert；401 仍用现有鉴权 banner/入口 | loading 结束；不显示受限内容；保留既有返回路径和标题焦点行为 | 空集合、partial 数据、缓存内容、联系方式/文件泄漏、自动重试 |

### 7.1 后端状态到现有视觉的确定映射

- fresh 200：直接进入现有 `normal` 或真实 `empty`；无额外 loading 或公告。
- 合格 LKG 200：保持当前 `normal`/`empty` 外观，后台刷新完全静默；`dataStale/cacheStatus/refreshing` 不显示。
- 冷读在 5 秒内完成：同一 loading 自动结束，进入现有终态。
- 有效 202 与 `queued/running`：持续同一个 loading；只轮询首次返回的同一 `syncId`，不新增视觉阶段。
- poll `completed`：只进行一次现有终态内容更新；不显示“同步完成”。
- poll `failed/expired` 或无 LKG 的 4xx/5xx：结束 loading，进入现有 error 或 permission 承载。
- HTTP 401：保持现有 authentication-required/登录承载，不归并为 permission、empty 或普通 error。
- HTTP 403：保持现有 permission-denied/访问受限承载，不归并为 empty 或 disabled。
- HTTP 409：保留当前写操作上下文并使用既有动作错误承载；不打开新弹窗。

### 7.2 业务内容对现有组件的约束

- APP-001/002/003：正式 owner/developer/department 名称填入现有文本位置；Name 不得以 ID 代填；不做逐项后补或视觉闪烁。
- COM-004：仅当前用户数据进入现有身份/联系字段；合法 null 沿用当前空值表现；selected-other 403 进入既有错误承载，不新增解释 UI。
- COM-005：测试、初始化和停用项不进入现有 select/filter；baseline 缺失是 error，不显示成功空下拉。
- WB-003：即使 stats/messages/todos 为空，也保留完整个人中心层级、身份区、零值与空集合。
- FAV-002/003/004：零收藏使用既有 `favorite-empty`；成功/重放继续更新既有收藏动作；版本冲突使用既有错误承载。
- APP-005：提交中保持现有按钮 disabled 和表单 `aria-busy`；成功使用既有 `use-apply-success`；失败不清空理由。
- MAT-002/003：无文件素材仍使用正常素材卡片，现有打开/下载按钮 disabled 并保留“暂无可下载文件”语义；成功使用既有同源下载流程，不导航离页。

## 8. Web 响应式、触控与 safe-area 保持

### 8.1 现有 Web 断点

断点不得增删或移动。继续按当前 CSS 使用：

- `>1600px`：现有宽桌面布局自然扩展。
- `1420px`、`1350/1360px`、`1280px`、`1200/1180px`、`1100px`、`1000px`、`940/941px`：按 Shell 与各页面当前规则收缩品牌/导航、侧栏宽度、筛选列、卡片列和详情布局。
- `761px–1100px`：保持平板宽 Web 的双列筛选、局部表格横向滚动和现有侧栏宽度规则。
- `<=760px`：保持窄 Web 单列内容、56px 顶栏、抽屉导航、44px 控件基线、页面 12px gutter、既有按钮/表单堆叠和局部横向滚动。
- `<=700px`：保持详情页进一步单列。
- `<=430px`、`<=380px`：保持统计/指标进一步单列。
- `<=760px` 横屏：保持批准卡片网格的现有双列规则。

这些是响应式 Web 规则，不代表声明 Mobile 或 uni-app 平台。

### 8.2 Resizing、密度、触控与 safe areas

- 窗口 resizing 继续由现有 CSS grid/flex、`minmax(0,1fr)`、clamp typography、overflow 与页面 scoped media query 处理；后端数据不得触发布局模式切换。
- 窄 Web 继续使用 `--h5-gutter:12px`、`--h5-gap:12px`、`--h5-control:44px`；Shell 的菜单、快捷操作、关闭按钮和导航项继续使用现有 44–48px 尺寸。
- 现有 `env(safe-area-inset-top/right/bottom/left)` 只用于窄 Web 顶栏、抽屉和页脚；不新增原生安全区适配。
- 表格和宽内容继续使用现有局部 horizontal scroll；不得通过压缩字号、裁剪列或新增移动卡片模板适配真实数据。
- 桌面指针 hover 与键盘导航、窄 Web 触控目标、返回、滚动和焦点顺序全部保持现状。

## 9. Web 与 uni-app 的明确差异

| 项目 | Web | Mobile / uni-app |
|---|---|---|
| 声明状态 | 唯一声明平台 | 未声明，不适用 |
| 实现来源 | 现有 Vue 页面、Shell、CSS、同源 session、自动轮询和浏览器下载 | 无页面、无组件、无断点、无设备宽度、无 native convention |
| 响应式 | 现有桌面与窄 Web media query | 不得把窄 Web 规则解释为 uni-app 适配 |
| Touch/safe-area | 仅保留现有浏览器窄 Web 44px 控件与 CSS `env()` | 不设计原生 touch target、刘海屏、系统栏或手势规则 |
| 验收 | Web QA 验证现有外观、焦点、公告与状态映射无回归 | 不执行、不宣称支持、不记录通过 |

## 10. 视觉验收清单

- [ ] 本任务 diff 中前端源码、根 `dist`、路由、组件、样式、文案与视觉资源为零变化。
- [ ] Shell、页面层级、标题、筛选、工具栏、卡片/列表/详情/表单、分页和页脚结构不变。
- [ ] 全局 token、scoped 样式、字体、颜色、间距、圆角、阴影、图标和图片不变。
- [ ] 所有现有断点、列数、抽屉、局部横向滚动、44px 窄 Web 控件与 safe-area 规则不变。
- [ ] hover、`:focus-visible`、forced-colors、reduced-motion、Tab 顺序和焦点恢复不变。
- [ ] fresh 与 LKG 无视觉差异；后台 refresh 不显示 loading、toast 或 badge。
- [ ] 有效 202 和 queued/running 只延续同一次既有 loading；poll 不产生新视觉阶段。
- [ ] completed 只更新一次；failed/expired 进入既有 error；401 与 403 进入各自既有承载。
- [ ] 六态均由现有组件及文案承载，无新状态组件或视觉 variant。
- [ ] 正式人员/部门名称一次出现且不闪烁；不显示 ID 回退、测试字典或代理占位。
- [ ] WB-003 子集合为空时个人中心身份和层级仍保留；收藏零项使用既有空态。
- [ ] MAT 无文件继续显示正常素材卡片并禁用既有动作；APP-005 使用既有提交中、成功和错误表现。
- [ ] 不展示 syncId、trace、cache/stale、TTL、hash、重试、队列或分页进度。
- [ ] 无新视觉资产、无 Figma 操作、无 Mobile/uni-app 设计或支持声明。

## 11. 冲突、风险与设计门禁

- 来源冲突：无。批准 PRD、任务包与 UX handoff 都要求后端-only、Web-only 和前端零变化。
- 已知兼容边界：COM-004 self-only 会使既有 selected-other-contact 调用进入 403；视觉上只能沿用现有错误承载，不得放宽隐私合同或修改前端补偿。
- 视觉风险：真实名称和业务内容长度可能不同，但必须沿用当前 wrap/ellipsis/overflow 和响应式规则；不得在本任务中缩字、改列宽或重排。
- Contrast 风险：本任务只保证现有颜色对与 focus 样式不回归，不重新认证全站对比度；发现现有问题时登记独立前端缺陷。
- 证据门禁：真实 Web QA 必须验证六态、401/403、写冲突、无文件、键盘焦点、公告和窄 Web 无视觉回归；mock/fixture 不替代 live 证据。
- 未解决视觉决策：无。任何需要新 token、组件、布局、文案、资产或 Figma 的提议都超出批准 scope，必须停止并另立前端任务。

