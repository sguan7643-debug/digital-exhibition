# Product Scope Review

## Verdict

`approved`

修订后的 PRD 已关闭上一轮两项高风险 finding：8 项正式权限的长期保留、部分失败回滚和既有权限保护均有唯一语义；`COM-008`、`MAT-003` 改为只读复用现有合法文件 token，并明确禁止上传新媒体。结合只读诊断已在“素材中心”和“附件资料”各发现 5 行带可复用文件 token 的候选记录，方案具备可执行入口；候选 token 最终兼容性仍由实施期 fail-closed 验收门控制，不影响范围决策。本评审认为提案已具备用户范围决定条件，但不构成用户批准。

## Findings

### Finding: 正式权限与 TEST_ 临时数据的生命周期边界已关闭

- **Evidence:** `prd.md` 3.1 第 2 至 3 项、4.2、4.5 第 4 项、状态 `Permission rollback`、AC-03A 和 AC-03B 明确：8 个精确权限码是 AD `3d8egf55` 的长期最小业务权限；既有权限不修改、不删除；未能完整验证时仅按本次新建记录 ID 回滚；8 项完整验证后永久保留，后续读取失败、超时或取消不自动撤权，未来撤权需新的显式授权。可删除的 `TEST_` 多维表记录则在全部终态补偿清理。
- **Impact:** 正式权限写入与临时验证数据不再共享含糊的“清理”语义，既避免误删既有授权，也避免实施方自行决定长期权限是否撤销；部分失败状态具备可追溯、可恢复的明确结果。
- **Recommendation:** 实施时严格保存写入前快照和“既有/本次新建”记录 ID 两类清单；权限回滚只能消费本次新建清单，`TEST_` 清理只能消费临时表记录清单，禁止两类清单互相复用。

### Finding: 飞书媒体残留风险已通过“禁止创建、只读复用”关闭

- **Evidence:** `prd.md` 1.1、3.1 第 4 和第 6 项、3.2 第 10 项、4.3、4.5、状态 `File context unavailable`、AC-05 至 AC-08、AC-13 均禁止调用 `uploadMedia` 或新建媒体对象，只允许为 `COM-008`、`MAT-003` 只读发现并复用来源合法、当前有效且契约兼容的现有文件 token；找不到兼容 token 时任务必须保持未通过。AI Team Lead 提供的只读诊断显示，“素材中心”前 10 行有 5 行、“附件资料”前 10 行有 5 行携带可复用文件 token 候选，未为诊断创建或修改数据。
- **Impact:** 本任务不再产生无法精确删除的底层媒体对象，因此“仅删除多维表引用却遗留媒体”的原风险被从执行路径移除。现有候选记录使方案不是纯假设，同时 fail-closed 规则保证候选不兼容时不会通过上传或伪造结果绕过。
- **Recommendation:** 实施证据只记录候选来源表、脱敏记录标识、契约兼容结论和读取结果；不得记录完整 token 或文件内容，不得修改候选记录。若全部候选均不兼容，按 PRD 输出阻断，不扩大范围。

### Finding: 20 项/8 权限映射、5 项上下文和 65/65 验收保持完整

- **Evidence:** `../DEH-LIVE-101-20260914/evidence/reads-65-20260918.json` 含 65 个结果，统计为 40 passed、25 blocked、0 failed。20 个 HTTP 403 operation 的 `requiredPermission` 分组为 4、1、4、6、2、1、1、1，共 8 个权限码和 20 项；其余 5 项分别为 `COM-008:fileId`、`APP-010:applicationId`、`CER-003:certificationId`、`MAT-003:fileId`、`COM-010:exportId`。修订后的 AC-04、AC-05、AC-08、AC-09 保留了逐项覆盖、全量 65 项重跑和真实响应分类。
- **Impact:** 修订没有缩小验收分母、增加第 9 个权限码，或把文件 token 复用错误解释为跳过两个 operation；用户仍能以同一套可机械核对的结果判断是否真正闭环。
- **Recommendation:** 最终证据继续输出“权限码 → operation”分组计数，以及“operation → 上下文来源 → 资源 ID 摘要 → 结果/清理状态”映射；只有 `expected=65`、`executed=65`、`passed=65`、`blocked=0`、`failed=0` 才可判定成功。

### Finding: 剩余假设均已配置明确责任边界和失败效果

- **Evidence:** `prd.md` A-01 至 A-04、3.1、4.2 至 4.5、状态清单及 AC-03A、AC-05、AC-07、AC-12、AC-13 分别覆盖候选文件 token 兼容性、权限表结构和唯一性、临时表记录精确删除路径、原 40 项稳定性；任一前提不成立时均要求停止、清理、回滚本次新增或保持未通过，并禁止修改凭证、生产配置、非 `TEST_` 数据或增加权限。
- **Impact:** 这些事项仍需实施证据确认，但不会诱导越权猜测或把缺失证据记为成功，依赖失败的产品行为可测试、可复核。
- **Recommendation:** 设计与实施交接应把四项假设逐项转成前置检查，并保存失败证据；任何前置检查失败均不得继续执行后续正式写入或宣称 65/65。

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, or change task state.
