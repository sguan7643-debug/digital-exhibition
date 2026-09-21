# Design Review

## Verdict

`approved`

设计汇总、UX 与 UI 来源均存在且相互可追溯；未发现阻断设计批准的冲突。本 verdict 仅表示设计材料可供用户批准，不构成设计批准、开发放行或任务状态变更。

## Findings

### Finding: 性能目标、数据源与缓存边界一致

- **PRD Evidence:** [`prd.md`](../prd.md) §1、§3.1、§3.4–§3.5 要求保持正式飞书数据源，P0 热态 p95≤2 秒，真实冷启动两秒内进入 `miss_syncing`，且快照只在进程内存。
- **Aggregate Design Evidence:** [`design-handoff.md`](../design-handoff.md) §1–§2 明确 P0 五项、65 operation 分级、进程内缓存、身份/权限隔离、single-flight、精确失效和强一致例外。
- **UX Source Handoff Evidence:** [`design/ux-handoff.md`](../design/ux-handoff.md) §3–§7 将 fresh/stale/miss-syncing/strong 和 2 秒反馈转换为用户可见合同。
- **UI Source Handoff Evidence:** [`design/ui-handoff.md`](../design/ui-handoff.md) §1、§4 明确不使用长时间转圈、全页遮罩或本地演示数据替代正式结果。
- **Impact:** 目标、技术限制和用户反馈未发生替换或弱化；不会以延长超时伪造性能完成。
- **Recommendation:** 按设计实施共享原始表读取、分策略缓存、预热、SWR 和精确失效；以真实环境证据验证五个 P0 的 30 个热态样本。

### Finding: 六类基础状态及性能状态变体完整

- **PRD Evidence:** [`prd.md`](../prd.md) §3.4、§3.5 要求冷启动同步、陈旧快照、强一致绕过、失败降级和 fail-closed。
- **Aggregate Design Evidence:** [`design-handoff.md`](../design-handoff.md) §3 规定区域级 fresh、stale、miss-syncing、强一致、写后失效失败和权限拒绝呈现。
- **UX Source Handoff Evidence:** [`design/ux-handoff.md`](../design/ux-handoff.md) §6 明确 normal、loading、empty、error、disabled、permission-denied 及 stale/strong/invalidation 变体的触发、动作和可访问性合同。
- **UI Source Handoff Evidence:** [`design/ui-handoff.md`](../design/ui-handoff.md) §4 为上述六种基础状态及 stale-refreshing、stale-not-refreshing、miss-syncing、strong loading、invalidation 定义了外观与文本。
- **Impact:** 不会将“首次同步”“陈旧”“空结果”“权限不足”“失效失败”混为一个无说明 loading 或普通成功提示。
- **Recommendation:** 实施和 QA 逐项覆盖该状态矩阵；强一致查询与失效失败必须禁用重复业务提交且不回退陈旧数据。

### Finding: 局部恢复、键盘和无障碍语义一致

- **PRD Evidence:** [`prd.md`](../prd.md) §3.1 要求数据状态元信息和身份隔离；§3.4 对冷启动 fail-closed 提出限制。
- **Aggregate Design Evidence:** [`design-handoff.md`](../design-handoff.md) §3 要求区域所有权、一次页面汇总播报、脱敏 trace 和 local recovery。
- **UX Source Handoff Evidence:** [`design/ux-handoff.md`](../design/ux-handoff.md) §8 规定区域级 `aria-busy`、polite/alert 选择、重试焦点留存/转移、403 清除私有内容、reduced-motion。
- **UI Source Handoff Evidence:** [`design/ui-handoff.md`](../design/ui-handoff.md) §3–§4 引用现有 focus/error token，规定状态不可只用颜色、重复入口同步 disabled、reduced-motion 下保留文字。
- **Impact:** 慢请求不会锁住全页；键盘和屏幕阅读器用户能理解并恢复受影响区域，私有旧内容不会在拒绝后遗留。
- **Recommendation:** 将状态容器、按钮和 live region 做成共享组件；自动刷新不移动焦点，不播报内部 cache 术语或敏感数据。

### Finding: 响应式 Web 与平台边界清晰

- **PRD Evidence:** [`prd.md`](../prd.md) 与 [`task.json`](../task.json) 声明 Vue Web，未声明 uni-app/原生端。
- **Aggregate Design Evidence:** [`design-handoff.md`](../design-handoff.md) §4 列明 ≥1361px、761–1360px、≤760px 的布局、36/44px 目标和未声明平台边界。
- **UX Source Handoff Evidence:** [`design/ux-handoff.md`](../design/ux-handoff.md) §9 要求窄屏状态贴近所属标题、无 hover-only 信息、焦点不被固定提示遮挡。
- **UI Source Handoff Evidence:** [`design/ui-handoff.md`](../design/ui-handoff.md) §6 将三档 Web 规则、键盘可见焦点、44px 窄屏操作和“非 uni-app”声明落为视觉规范。
- **Impact:** 宽屏密度与窄屏可操作性均可验收，且不会把浏览器适配误报为移动端交付。
- **Recommendation:** Web QA 在三个断点执行键盘、焦点、重试和状态换行验证；移动端不纳入本任务验收。

### Finding: 视觉系统可追溯且无未决设计冲突

- **PRD Evidence:** [`prd.md`](../prd.md) §3.1、§3.2 要求安全状态元信息，不得输出凭据或用假数据掩盖失败。
- **Aggregate Design Evidence:** [`design-handoff.md`](../design-handoff.md) §3 要求复用既有 `--xlt-*`、`--form-control-*` 与请求状态条体系，不新增无依据令牌。
- **UX Source Handoff Evidence:** [`design/ux-handoff.md`](../design/ux-handoff.md) §10、§12 规定诊断脱敏，并将 `refreshing`、`miss_syncing`、`retryAfterSeconds` 的具体服务端字段留作实现证据。
- **UI Source Handoff Evidence:** [`design/ui-handoff.md`](../design/ui-handoff.md) §3、§8 给出令牌值、对比度、间距、状态条、按钮、视觉证据与同一实现期开放项。
- **Impact:** 视觉与行为一致，且服务端字段尚未落地不会被错误包装成设计签字或产品能力。
- **Recommendation:** 设计批准后，先以自动化合同测试确认状态字段和脱敏，再开始页面实现；字段载体若不同，必须证明语义等价并更新实施证据。

## Review Boundary

本评审未修改 PRD、设计汇总、UX/UI 源交接、`task.json` 或任务状态；未执行发布、部署或批准动作。
