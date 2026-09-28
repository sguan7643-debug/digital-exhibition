# Design Review

## Verdict

`approved`

设计与已批准PRD一致，没有阻断项。该结论是独立设计评审意见，不代表用户已经批准设计。

## Findings

### Finding 1：用户流程保持不变，成功语义得到加强

- **PRD Evidence:** `prd.md` 4、AC-01、AC-07 要求现有页面提交后先完成审批实例和上架申请投影，失败不得伪报成功。
- **Aggregate Design Evidence:** `design-handoff.md` 的 UX/Interaction Evidence 与 Service Consistency Design 明确复用现有页面，并将成功响应放在投影成功之后。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 的“首次提交”“重试与恢复”覆盖成功、失败、重试和原实例复用。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 明确零视觉变更并复用现有加载、错误与禁用状态；比较已执行。
- **Impact:** 用户不需要学习新流程，同时不会再收到与飞书表实际写入不一致的成功反馈。
- **Recommendation:** 按设计实现，不新增页面控件或后台静默成功路径。

### Finding 2：重放修复范围有明确字段白名单

- **PRD Evidence:** `prd.md` 3.1、AC-03、AC-05 将修复限定为三个目标字段和当前状态，其他调用默认行为不变。
- **Aggregate Design Evidence:** `design-handoff.md` Service Consistency Design 规定 `reconcileFields` 默认关闭，并将“上架申请”白名单固定为审批实例ID、授权用户、授权部门、状态和当前审批节点。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 规定重试复用同一记录，不新增第二条记录。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 不涉及数据字段；比较已执行，且确认没有通过管理界面扩大更新范围。
- **Impact:** 可以补齐缺失数据，同时避免重写申请单号、提交时间或影响其他表的幂等行为。
- **Recommendation:** 测试需断言白名单外字段保持不变，并断言默认空白名单不触发更新。

### Finding 3：旧同步标记不会阻止修复

- **PRD Evidence:** `prd.md` AC-03、AC-07 要求同一审批记录重放时可恢复不完整投影。
- **Aggregate Design Evidence:** `design-handoff.md` Service Consistency Design 第6、7项引入投影合同版本，旧记录缺少当前版本时重新投影，成功后才更新版本。
- **UX Source Handoff Evidence:** `design/ux-handoff.md`“重试与恢复”明确旧合同记录在下一次请求链路中重新投影。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 不新增修复进度视觉；比较已执行，恢复过程仍使用现有提交状态。
- **Impact:** 即使审批注册表曾把旧的不完整写入标为同步完成，部署新代码后的下一次重放或查询仍能触发修复。
- **Recommendation:** 测试必须覆盖 `projectionStatus=SYNCED` 但投影版本缺失/旧版的记录。

### Finding 4：状态、响应式与无障碍覆盖符合零UI变更边界

- **PRD Evidence:** `prd.md` 明确页面交互和视觉为范围外，并列出输入缺失、写入失败和权限边界。
- **Aggregate Design Evidence:** `design-handoff.md` 保留六种状态并声明Web为唯一平台、uni-app未声明。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` Required States 完整覆盖 normal、loading、empty、error、disabled、permission-denied，并保留焦点、状态播报和恢复行为。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` Required States 与 Web Visual Rules 保留现有断点、focus-visible、禁用和错误样式；uni-app明确未声明。
- **Impact:** 服务端修复不会产生页面布局、响应式、键盘或辅助技术回归。
- **Recommendation:** Web回归验证现有申请页面仍可提交、错误时保留输入且无新增视觉变化。

### Finding 5：安全边界与失败恢复可验证

- **PRD Evidence:** `prd.md` AC-06 至 AC-08 要求缺失字段、非 `TEST_`、多行冲突及写入失败均安全失败。
- **Aggregate Design Evidence:** `design-handoff.md` 保留前缀、唯一键、精确记录ID与错误传播，并禁止批量历史修复。
- **UX Source Handoff Evidence:** `design/ux-handoff.md` 错误内容不暴露凭据、表ID或内部记录ID。
- **UI Source Handoff Evidence:** `design/ui-handoff.md` 错误态复用安全文案，不新增内部技术信息；比较已执行。
- **Impact:** 修复不会因方便补写而扩大到任意飞书记录或泄露内部标识。
- **Recommendation:** 实现保持现有冲突错误，不捕获并改写成成功结果。

## Review Boundary

This independent review does not edit `prd.md`; does not edit `design-handoff.md`; does not edit `design/ux-handoff.md`; does not edit `design/ui-handoff.md`; does not approve design or record design approval; does not alter `task.json`; and does not modify task state.
