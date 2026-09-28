# Design Review

## Verdict

`approved`

任务状态已再次核对为 `design_review`，全部必需输入及最新 `design-handoff.md` 均存在且已完整比较。原非阻塞 finding 已关闭，未发现新的阻塞或非阻塞设计问题；申请、列表、详情闭环以及状态、安全、响应式和可访问性合同可追溯到已批准 PRD 与两个来源交接。

本结论仅表示独立评审未发现阻塞项，不批准设计，不代表用户已批准设计；`task.json.approvals.design.approved` 仍为 `false`。

## Findings

### Resolved Finding: 七日可查与真实 POC 的来源映射

- **Status:** `resolved`
- **PRD Evidence:** `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/prd.md` §1.3(9–10)、§3.1.F–G、§4.4、AC-25–AC-27、AC-31–AC-32 继续明确真实浏览器即时闭环、服务重启后的持久化恢复、可控时钟跨 7 天自动化，以及真实审批、附件、多维表和清理证据；仅自动化绿灯不能替代真实 POC。
- **Aggregate Design Evidence:** 最新 `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/design-handoff.md` §9“预写门禁、七日可查、真实 POC”行已将直接来源改为 `UX 13；PRD 1.3、3.1.F–G、AC-25–AC-27、AC-31–AC-32`，并将 UI 明确标为“不适用（已比较 UI 13、14；视觉稿只覆盖安全内容护栏与视觉验收）”；§3.3、§8 和 §10(6) 继续保留不少于 7 天恢复及真实证据要求。
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/design/ux-handoff.md` §5.5(8)、§13.3–13.4 和 §14 完整规定持久化恢复、跨 7 天自动化、真实浏览器请求、同一组业务/审批/附件标识、结构与清理证据，与最新汇总映射一致。
- **UI Source Handoff Evidence:** `not applicable: 七日持久化与真实 POC 证据属于业务持久性和 QA 证据合同，不是视觉规格；comparison performed against .ai-team/tasks/DEH-ONBOARDING-POC-20260926/design/ui-handoff.md §13–14`。这两节负责安全内容护栏和视觉实现验收，最新汇总已准确表达该职责边界。
- **Impact:** 原追踪歧义已消除；实现和 QA 可直接从 PRD、UX 与汇总正文定位七日和真实 POC 证据合同。没有剩余的状态覆盖、Web 响应式、键盘/焦点/读屏、对比度或跨平台一致性影响。
- **Recommendation:** 关闭该 finding；保持最新来源映射。后续若七日或真实 POC 合同变化，应继续以 PRD/UX 为直接来源，并对 UI 保持“不适用、已比较”的明确标注。

## Cross-Source Coverage Verification

| Review item | PRD evidence | Aggregate design evidence | UX source evidence | UI source evidence | Result |
| --- | --- | --- | --- | --- | --- |
| 申请—列表—详情闭环 | §3.1.A、§3.1.F、§4.2–4.3、AC-01–AC-02、AC-20–AC-24 | §2–§4、§9–§10 | §4–§6、§14 | §4–§7、§14 | 完整；`applicationId` 为详情主键，成功后进入同一申请，列表仅含当前用户 `APP_ONBOARDING`。 |
| 六态 | §5、AC-21–AC-23 | §5 | §7–§8 | §8、§11 | 申请、列表、详情均覆盖 `normal/loading/empty/error/disabled/permission-denied`；错误不冒充空态，权限态不泄露旧数据。 |
| Web 响应式 | F-01、§3.4、AC-01–AC-02（Web-only 范围） | §6.2–§7、§10(6) | §11、§14 | §9、§14 | 覆盖 320px、760px、900px、1180px、1400px、宽屏和 200% 缩放；表格转卡片、触控目标、安全区与抽屉焦点规则明确。 |
| 键盘、焦点与读屏 | PRD 未规定视觉细节；与 Web 范围及安全验收无冲突 | §4–§7 | §7、§10–§11、§14 | §8、§10–§11、§14 | 原生控件、标题聚焦、返回焦点恢复、错误聚焦、live region、语义表格/有序列表和不抢焦点规则完整。 |
| 对比度与状态非纯色表达 | PRD 未规定色值；要求未知状态不得误报通过 | §4、§6–§7 | §6.3、§10.3 | §3、§7.3–§7.4、§10.2–§10.3 | 文本 4.5:1、必要非文本 3:1、蓝色内圈加橙色外圈以及文字+图形+颜色三重状态表达均可验收。 |
| 图标与附件 | §3.1.E、AC-10–AC-12、AC-22、AC-26 | §3.1、§3.4、§8–§10 | §5.2、§5.6、§8–§10、§13.4 | §5.3、§7.5、§8、§11、§13–§14 | 数量、大小、类型、MIME/魔数/SHA-256、真实持久化、短期同源授权、逐文件恢复和 token 隔离一致。 |
| 权限与本人隔离 | §3.1.B、§3.1.F、AC-20、AC-23、AC-34 | §2.2、§5、§8 | §4.2、§7、§9 | §8、§13 | 会话定人、非本人/不存在统一安全结果、权限撤销先清内容、附件每次重新校验归属。 |
| 稳定 attempt 与防重复 | §3.1.G、§4.2、AC-13、AC-16–AC-19 | §3.1、§8–§10 | §5.3、§8、§13.2 | §1.2(6)、§5.4–§5.5、§13 | 模糊失败只确认原 attempt；重复点击、超时、投影失败和重启恢复不得创建第二实例、申请或附件关联。 |
| 状态刷新与发布边界 | §3.1.F–G、§4.3、AC-17–AC-24 | §3.3–§4、§8–§10 | §5.5、§6.3、§13.2 | §7.2–§7.4、§8.3、§13–§14 | 进入详情自动同步一次、手动一次、无轮询；同步失败保留旧值；缺编号只禁用刷新；仅 `APPROVED` 发布。 |
| 七日可查与真实 POC | §1.3、§3.1.F–G、§4.4、AC-25–AC-27、AC-31–AC-32 | §3.3、§8、§9、§10 | §13.3–§13.4 | 不适用于视觉规格；已比较 §13–§14 | 业务与 QA 合同完整；最新 §9 已准确标注 PRD/UX 直接来源与 UI 不适用边界，原 finding 已关闭。 |
| Web / uni-app 范围 | F-01、§3.4、§6 | 引言、§9 | §1、§12、§14 | §1、§12、§14 | 已明确比较：Web 在范围内；uni-app 和原生移动端不适用且未被隐式扩张。 |

## Review Boundary

本独立评审未编辑 `prd.md`、`design-handoff.md`、`design/ux-handoff.md`、`design/ui-handoff.md` 或任何设计制品；未批准设计、未记录设计批准、未修改 `task.json`、未改变任务状态，也未路由开发。
