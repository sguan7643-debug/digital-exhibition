# Design Review

## Verdict

`approved`

独立评审未发现阻断设计批准的缺口。聚合设计与已批准 PRD、UX 交接和 UI 交接在权限生命周期、临时数据补偿清理、文件上下文只读复用、失败语义、状态覆盖、响应式 Web、可访问性及证据安全方面一致。本结论仅表示设计已具备提交 Product Owner 决策的条件，不构成设计批准。

## Findings

### Finding: 八项长期权限具备可回滚的原子补齐边界

- **PRD Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/prd.md` §3.1(1–3)、§4.2、AC-02、AC-03、AC-03A、AC-03B 规定写入前快照、按 `AD account + exact permission code` 幂等补齐、逐条记录本次创建 ID、完整验证前仅回滚本次新增行，以及完整验证后长期保留且不得因后续读取失败或取消自动撤权。
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design-handoff.md` “Design outcome”第 1–4 步及“Isolation model”将写入前快照、本次创建记录 ID、写后重读和不完整时精确回滚固定在独立 permission ledger 内，并禁止与临时记录清理输入混用。
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ux-handoff.md` Flow B、§6.1 和 §6.3 明确每次写入后立即登记正式记录 ID，最终状态只能是完整八项有效授权或恢复写入前基线；既有记录永不修改或删除，并为异常恢复保留 manifest。
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ui-handoff.md` §2、§4.3、§5 将权限账本与临时记录账本分区，明确显示“长期保留/未完整时精确回滚”，且 `permission-denied` 只允许已批准八项、出现第九项时停止。
- **Impact:** 权限写入的正常、loading、error、disabled、permission-denied、取消和回滚终态均有可观察结果；不会因视觉或交互合并而误删既有权限、自动撤销完整授权或引入通配/第九项权限。
- **Recommendation:** 设计可进入批准决策；实施时必须以持久化 permission ledger 和写后正式投影重读作为原子边界，不得以仅内存数组或批量成功响应替代逐记录追溯和基线复核。

### Finding: TEST_ 临时记录覆盖所有终态并与长期权限隔离

- **PRD Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/prd.md` §3.1(5–6)、§4.3–4.5、AC-05、AC-06、AC-07 要求只为 `APP-010`、`CER-003`、`COM-010` 创建可按 record ID 精确删除的 `TEST_` 表记录，并在成功、失败、超时和取消后独立查询确认无残留；权限行不在清理范围内。
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design-handoff.md` “Design outcome”第 6–8 步和“Isolation model”规定每条临时记录创建后立即登记、`finally` 中按精确 ID 删除并独立复核，cleanup ledger 不接受权限行或文件来源记录。
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ux-handoff.md` Flow D、Flow F、§5 附加终态及 §6 将 ledger 持久化失败、进程异常、取消、清理重试、`cleanup-pending` 与恢复入口完整定义；未清理债务会阻断新 run 和通过结论。
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ui-handoff.md` §4.3 和 §5 为临时记录账本提供独立“清理状态”，为 `cleanup-in-progress`、`cleanup-failed/cleanup-pending` 提供明确文字、进度、重试与唯一恢复动作，并持续显示权限账本“长期保留”。
- **Impact:** 清理不会依赖名称前缀模糊删除，也不会被取消或窗口关闭静默跳过；异常时页面/CLI 都能区分“读取失败”和“仍有清理债务”，避免把有残留的执行误判为完成。
- **Recommendation:** 设计无需修改；实施验收必须覆盖成功、读取失败、上游超时、操作者取消、清理瞬时失败和进程恢复六类路径，并对每条本次创建记录保存“删除响应 + 独立不存在复核”证据。

### Finding: COM-008 与 MAT-003 的文件上下文严格只读且失败关闭

- **PRD Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/prd.md` §1.1、§3.1(4)、§4.3、AC-05、AC-13 明确 `COM-008`、`MAT-003` 只能复用现有合法且契约兼容的 file token，禁止上传或新建媒体；无合法候选时任务必须保持未通过。
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design-handoff.md` “Design outcome”第 5 步和 file-context ledger 仅保存脱敏来源引用、不可逆指纹和兼容性结论，终态为只读且永不进入更新、删除或清理输入。
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ux-handoff.md` Flow C 规定先于任何 `TEST_` 创建执行候选发现并逐 operation 验证兼容性；任一 operation 无合法 token 时进入 `file-context-unavailable`，停止且不创建临时记录、不上传媒体、不运行 65 项读取。
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ui-handoff.md` §4.3、§5 将文件账本标记为“只读复用”，要求 `file-context-unavailable` 使用明确禁用/错误语义，不得伪装为普通空集合成功，也不得呈现上传或忽略入口。
- **Impact:** 文件候选为空、失效或契约不兼容时不会通过交互绕过、残留新媒体或泄露完整 token；对应阻断在 Web/CLI 中都可辨识并可审计。
- **Recommendation:** 设计可接受；实施时应分别记录 `COM-008` 和 `MAT-003` 的兼容性判断，即使两者复用同一 token，也不得以“发现任意 token”替代逐 operation 契约验证。

### Finding: 状态、响应式、可访问性与证据语义覆盖完整

- **PRD Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/prd.md` §5、AC-08–AC-12 覆盖 Loading、Success、Empty、Error、Disabled、Permission-dependent、Timeout/Cancelled、Cleanup pending、Permission rollback 和 File context unavailable，并要求真实 65/65、无全屏阻塞、逐 operation 可复核及证据无秘密信息。
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design-handoff.md` “State and recovery contract”“Security and evidence”“Visual and accessibility preservation”统一了状态名称、取消后清理、同 run 结果不可拼接、非阻塞 in-flow 状态、键盘操作、焦点环、减少动态效果和 320px 响应式重排。
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ux-handoff.md` §5、§7、§8、§9 提供 normal/loading/empty/error/disabled/permission-denied 及附加终态的内容、恢复动作和可观察性；规定 live status 不抢焦点、错误必须有文字和下一动作、Web 窄屏不等于移动端支持。
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design/ui-handoff.md` §3–§7 使用现有 token 定义对比度、焦点、强制色、文本标签、非全屏 loading、宽屏/中屏/≤760px/320px 重排、`prefers-reduced-motion` 和 Web/未声明 uni-app 边界。
- **Impact:** normal、loading、empty、error、disabled、permission-denied 及清理附加状态均有稳定文字、键盘恢复动作和响应式表达；颜色、图标、动画或 DevTools 均不是唯一信息来源。移动端未声明且未被错误计入验收。
- **Recommendation:** 无阻断设计修改；实现若最终仅提供 CLI，也必须保留相同稳定状态词、非零错误退出码和结构化证据。若复用内部 Web 入口，则需按 UI 交接验证 320px 重排、键盘顺序、可见焦点、forced-colors 和 reduced-motion。

## Review Boundary

本独立评审未编辑 `prd.md`、`design-handoff.md`、`design/ux-handoff.md`、`design/ui-handoff.md`，未记录设计批准，未修改 `task.json` 或任务状态，也未修改代码或正式飞书数据。
