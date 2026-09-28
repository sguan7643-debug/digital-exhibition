# UX/Interaction Handoff

Owner: UX/Interaction Designer

## Sources and Evidence

- Approved PRD: `.ai-team/tasks/DEH-SYSTEM-POC-CLOSURE-20260927/prd.md`
- Scope approval: `.ai-team/tasks/DEH-SYSTEM-POC-CLOSURE-20260927/task.json`
- Established behavior: existing Vue routes, `src/h5.css` responsive interaction contract, current authenticated Feishu workflow, prior successful TEST_ onboarding evidence.

## Information Architecture

本任务不新增业务信息架构。验收围绕四层展开：全局壳层与导航、30 条声明路由、应用上线申请主流程、审批通过后的数据投影核验。任何路由失败都回到对应页面或授权恢复入口，不建立与现有导航并行的新入口。

## User Flows

### 系统级自动化流

启动服务 → 健康检查 → 静态/契约测试 → 集成测试 → 生产构建 → 浏览器回归 → 真实 TEST_ 业务闭环 → QA 汇总。失败时停在当前层，保留命令、页面、请求和数据证据；修复后从受影响层及其下游重新执行。

### 已授权浏览器流

打开系统 → 检查会话 → 有效则进入目标路由；失效则进入正常飞书授权 → 回到原目标地址 → 继续路由验收。禁止无限跳转、裸 JSON 错误页或静默冒充授权成功。

### 上线申请流

进入申请页 → 填写申请人、应用、接入、权限信息 → 上传图标和附件 → 提交 → 进入我的申请/详情 → 刷新审批状态 → 飞书审批完成 → 同步最终状态 → 校验上架申请、附件资料、应用索引和海能work应用详情。

## Interaction Rules

- 每个主操作一次点击只产生一个业务任务；请求进行中禁用重复提交。
- 查询使用当前筛选条件并回到第 1 页；重置和清空筛选恢复默认条件后自动刷新结果。
- 路由入口、卡片入口和文字入口指向同一目标时必须行为一致。
- 上传失败保留已选文件及可重试操作；重试只重传失败项。
- 审批状态刷新只拉取/同步当前申请，不创建新申请或重复投影。
- 读取失败时如有旧缓存继续显示旧数据并标注状态；没有旧数据时显示错误和重试。
- 自动化测试只可创建唯一 TEST_ 数据；不得操作非 TEST_ 数据。
- 浏览器回归中任何意外授权循环、白屏、资源 500、主操作不可达均为阻断。

## Content Behavior

- 错误提示采用“发生了什么 + 当前保留了什么 + 用户可执行动作 + 请求标识（如有）”。
- 授权失效使用可理解页面提示和恢复入口，不向普通页面直接输出 JSON。
- POC 结果必须显示检查项、通过/失败、证据位置、限制和时间，不使用模糊的“看起来正常”。
- 空态区分“无数据”和“筛选无结果”，后者提供清空筛选。
- 审批详情显示申请标识、审批实例、申请人、授权用户、授权部门、文件和时间线。

## Web Behavior

- 桌面：完整侧栏和顶部导航可见，页面主区域保持现有层级；键盘 Tab 顺序按导航、标题操作、表单/筛选、内容、分页排列。
- 761–1200px：多列表单和筛选重排为两列，表格使用局部横向滚动，不扩大页面视口。
- ≤760px（代表宽度 360px）：内容单列；表单控件和主操作宽度占满；控制项最小高度 44px；表格放入可聚焦的局部横向滚动区域。
- 200% 缩放：主内容不被固定宽度裁切；导航和核心操作仍可通过键盘到达；不允许进度线与文字、浮窗与主操作产生阻断重叠。
- 本任务不包含 uni-app；移动宽度仅验证响应式 Web。

## uni-app Behavior

不适用。任务平台仅声明 Web，未声明 uni-app 或移动端原生目标。

## Required States

### normal

- Trigger：数据和授权可用。
- Content：真实数据、当前筛选、当前申请和审批状态。
- Actions：所有授权范围内操作可用。
- Focus/order：保持 DOM 语义顺序；状态更新后焦点不无故跳到页面顶部。
- Announcement：提交、上传、同步完成使用可感知状态文本或 live region。

### loading

- Trigger：初始读取、查询、上传、提交、审批同步。
- Content：保留已有可用内容，显示局部等待状态。
- Actions：允许离开和取消非破坏操作；禁用同一主操作重复触发。
- Recovery：超时转错误态并提供重试。
- Accessibility：`aria-busy` 或等效状态，状态文字可被辅助技术读取。

### empty

- Trigger：真实数据集为空或筛选无匹配。
- Content：说明是无数据还是无匹配。
- Actions：无匹配时提供清空筛选；无数据时只显示范围内可用入口。
- Focus/order：空态操作位于说明之后。
- Accessibility：不依赖图形表达原因。

### error

- Trigger：网络、飞书读取、上传、审批或投影失败。
- Content：失败原因、旧数据保留情况、请求标识和重试入口。
- Actions：只重试受影响任务；不重复提交已成功步骤。
- Recovery：成功后自动清除对应错误；其他错误保持独立。
- Accessibility：错误与字段或区域建立关联，首次阻断错误可获得焦点。

### disabled

- Trigger：必填缺失、提交中、无适用操作或流程已终态。
- Content：通过邻近说明解释原因。
- Actions：禁用项不触发网络请求。
- Focus/order：原生禁用控件不进入 Tab；自定义控件使用正确 aria 状态。

### permission-denied

- Trigger：授权不存在、过期或服务端权限拒绝。
- Content：明确需要正常飞书授权或当前账号无权限。
- Actions：会话失效提供授权恢复；确实无权限只提供返回安全页面。
- Recovery：授权成功回到原目标路由；失败可重试但不循环。
- Accessibility：页面标题和状态说明首先可读，恢复按钮标签明确。

## Accessibility Behavior

- 所有按钮、链接、表单控件和局部滚动区域可通过键盘到达并有可见焦点。
- 状态不能只依赖颜色；图标配文字或可访问名称。
- 360px 下控件最小 44px；复选框和单选框至少 20px 且标签可点击。
- 200% 缩放保持文本可读、操作可达、页面不产生双向整体滚动。
- 遵守 reduced-motion 偏好；等待动画不是唯一状态信息。

## Open Questions and Conflicts

- 无设计阻断冲突。
- OAuth 长期跨重启持久化不在本任务范围；本任务仅验证正常授权恢复路径。
