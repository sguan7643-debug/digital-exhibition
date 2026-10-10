# Design Review

## Verdict

`approved`

第二轮独立复审确认两个原阻断项均已闭环，未发现新的阻断性设计问题。该 verdict 仅表示更新后的聚合设计与两个源交接具备设计就绪度，不构成新的设计批准，也不修改当前审批、任务状态或开发路由。

## Findings

### Finding: 25,000ms 任务硬上限与客户端、Nginx 超时关系已闭环

- **PRD Evidence:** `prd.md` 第 1.1、4.2 节及 AC-05 要求五秒任务接管后由现有客户端自动轮询至 `completed` 或 `failed`；第 2.7 节要求设计阶段冻结同步任务总执行超时，且前端保持零改动。
- **Aggregate Design Evidence:** `design-handoff.md` 第 7.4、9 节已冻结：普通 Web 请求超时 30,000ms、首页聚合客户端单次请求上限 29,500ms、部署包 Nginx API `proxy_send_timeout`/`proxy_read_timeout` 为 35s；服务端任务自创建起硬上限为 25,000ms，包含初始五秒、排队、重试、退避、飞书分页和归并，到期进入结构化 `failed`，错误码为 `READ_SYNC_DEADLINE_EXCEEDED`，不得保持 `running` 或返回 503。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 第 4.4、9、11.2 节采用相同数值和计时起点，明确初始五秒包含在 25,000ms 内，并要求终态至少保留十分钟；同一 loading 生命周期持续至自动轮询取得终态。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 第 5.1、6、11、12.2 节采用同一 25,000/29,500/30,000/35s 合同，禁止用 503、手动刷新、新提示或前端改动规避服务端截止。
- **Impact:** 25,000ms 分别早于首页单次请求上限 4,500ms、普通请求上限 5,000ms及 Nginx API 超时 10,000ms；因初始五秒已包含在 25,000ms 中，不存在被误算为 30,000ms 的叠加。补充只读源码核验显示普通 operation 与首页任务当前均返回 `pollAfterMs: 2_000`，因此截止后下一次名义轮询最迟约在 27,000ms，可在两个客户端边界之前取得结构化终态。首页持久客户端另有 60,000ms 的整体轮询保护，29,500ms 是其底层单次 HTTP 请求上限，不削弱上述保守关系。
- **Recommendation:** 维持 25,000ms 硬上限和当前不高于 2,000ms 的轮询建议值；后端合同测试应锁定“计时从任务创建开始”“25,000ms 到期转 `failed`”“最慢轮询在客户端截止前观察到终态”，并验证 Nginx 35s 配置。若未来提高 `pollAfterMs`，必须重新核算 4,500ms 的最小客户端余量。

### Finding: 现有 PageStateBoundary 终态聚焦与新增焦点限制已统一

- **PRD Evidence:** `prd.md` 第 3.2、6 节冻结前端源文件、构建产物、页面样式和轮询实现，要求沿用现有 loading 与前端行为，不授权本后端任务重做焦点管理。
- **Aggregate Design Evidence:** `design-handoff.md` 第 2.8、5、6 节现在明确区分两类行为：缓存命中、静默刷新和轮询迭代不得新增焦点或滚动；状态终结时继续保留 `PageStateBoundary` 的结果标题聚焦，以及权限拒绝时对“访问受限”标题的既有聚焦。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 第 5、7.1、10 节逐态保留现有结果标题/权限标题终态聚焦，同时明确 loading 气泡不捕获焦点，缓存、后台刷新与每次轮询迭代不产生额外焦点移动或重复公告。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 第 5.3、6、7.3、11 节保持现有状态组件、focus-visible 和 alert/status 行为；视觉验收项明确后台刷新与轮询迭代不新增焦点移动，而终态保留现有结果标题/权限标题聚焦。
- **Impact:** 更新后的合同与现有 `PageStateBoundary.vue` 的 `focusResult()` 及 `permission-denied` 标题聚焦行为一致，不再同时要求“保留现状”和“禁止既有终态聚焦”。后台静默刷新及运行中的轮询也不会引入焦点陷阱、重复跳转或滚动干扰。
- **Recommendation:** 保持现有组件零改动；浏览器回归分别验证正常/空结果/错误终态的既有结果标题聚焦、403 的“访问受限”标题聚焦，以及多次 `running` 轮询和 stale 后台刷新期间焦点不变。

### Finding: 前端零改动、单一 loading 与六态保持一致

- **PRD Evidence:** `prd.md` 第 1.1、3.2、5、6 节及 AC-05 至 AC-07 要求前端零改动，保留 loading 和自动轮询，并严格区分完整成功、真实空集合、运行中、错误、禁用与权限拒绝。
- **Aggregate Design Evidence:** `design-handoff.md` 第 1、4、5、8 节要求前端源码、`dist`、CSS、组件、路由及资产变更清单为空，并逐项定义 `normal`、`loading`、`empty`、`error`、`disabled`、`permission-denied`。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 第 3 至 6、9、10 节覆盖 fresh、stale、五秒内完成、五秒后任务接管、批量请求、取消和六态恢复路径；禁止首次同步、数据缺失及手动刷新文案。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 第 5、6、11、12 节冻结现有 loading 气泡与六态外观，禁止第二个气泡、进度条、任务编号、缓存徽标、空白占位及新增恢复操作。
- **Impact:** 完整零记录不会与超时、部分分页、同步运行、错误或权限拒绝混淆；现有客户端可以在不增加界面的情况下持续 loading 并自动取得终态。
- **Recommendation:** 后续 QA 保留 HTTP 200、202/`running`、`completed`、`failed`、401、403、批量子任务和完整零记录的合同覆盖，并提交前端源码与构建产物零变更审计。

### Finding: Web-only、响应式与可访问性边界保持完整

- **PRD Evidence:** `prd.md` 第 2.1 F-04、3.2、6 节限定现有 Vue Web 且禁止页面样式和布局变更；未声明 uni-app 或原生移动端目标。
- **Aggregate Design Evidence:** `design-handoff.md` 第 1、4、6 节将 Web/Vue 作为唯一平台，保留桌面、窄屏 Web、`max-width:760px` H5、安全区和现有触控目标；mobile/uni-app 为 `not declared`。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 第 7、8 节覆盖键盘、读屏、取消和 Web 行为，并明确不得把 Web 合同推断为 uni-app 已支持。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 第 7 至 10 节记录现有对比度、focus-visible、reduced-motion、响应式断点、44px H5 基线、安全区及窄屏 loading 适配；uni-app、微信小程序与 App 端为 `not applicable`。
- **Impact:** 本设计不会新增断点、触控目标、视觉资产或跨平台承诺；现有 38px 恢复按钮及部分对比度观察仍被正确识别为既有基线，不会被误报为本任务已修复。
- **Recommendation:** Web 回归在现有代表宽度、键盘、读屏、reduced-motion 与 safe-area 场景验证无新增回归；uni-app 不进入本任务验收，既有无障碍基线问题继续单独立项。

## Review Boundary

本第二轮独立复审只覆盖 `.ai-team/tasks/DEH-SERVER-CACHE-20261008/reviews/design-review.md`。未编辑 `prd.md`、`design-handoff.md`、`design/ux-handoff.md`、`design/ui-handoff.md`、任何产品/设计源或代码；未记录、撤销或修改设计批准，未修改 `task.json`，也未改变当前任务状态或开发路由。
