# Product Scope Review

## Verdict

`changes_required`

当前任务有明确用户价值，且 Web 后端、前端不改、飞书仍为唯一业务数据源等边界基本清楚；但性能样本、联系人授权、接口响应、正式字典和失败原子性仍存在会改变实现与验收结论的未决事项。完成下列范围级决策并写入 PRD 后，才具备用户作出范围批准决定的条件。本评审不批准范围。

## Findings

### Finding: 性能目标没有可复现的样本与计时合同

- **Evidence:** `task.json.success_metric`、`task-brief.md` Success Metric 和 `prd.md` AC-F08 承诺“常用读取至少 90% 首次请求 5 秒内返回完整结果”，但没有固定 operation/路由集合、样本量、通过次数、冷缓存构造方法、测试 Base/身份/权限/输入、计时起止点或“完整结果”的 schema 判定；“热缓存近即时/明显更快”也没有数值上限。`prd.md` 1 和 7.2(1) 已将这些内容标为待确认。相比之下，依赖任务 `.ai-team/tasks/DEH-SERVER-CACHE-RECOVERY-20261010/prd.md` AC-03、AC-10 曾固定冷首页 5 次、暖首页 30 次及 5/5、27/30 门槛，但本任务没有声明继承、替换或排除该协议。
- **Impact:** QA 可以通过选择较快接口、较小数据量或不同缓存状态得到相反结论；首次响应为 202 同步任务时是否计入“5 秒内完整返回”也无法判定。“第二次刷新明显更快”即使只快几毫秒也可能被解释为通过，性能承诺不可验收。
- **Recommendation:** 范围批准前冻结一张性能验收表：逐项列出 operation/路由和场景（冷读、5 秒交接、同步完成后复读、热读），每组样本量及最低通过次数，固定测试环境/Base/授权身份/权限集合/数据范围/规范化输入，每次样本的缓存准备方式，服务端收到请求到完整 HTTP 响应的计时边界，完整性所对应的 schema，以及 202/失败/超时的计数规则；同时为热读给出毫秒级上限或相对冷读的明确比例。若沿用前序 5/30 协议，应逐项写明继承关系，而不是引用“经批准口径”。

### Finding: COM-004 的联系人隐私政策与既有业务流互相冲突

- **Evidence:** `task.json.in_scope[4]`、`prd.md` 5.6 和 AC-P01/P02 把原始联系方式限定为“查询当前授权用户”；但已交付业务流 `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/prd.md` AC-04 及 `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/handoffs/web.md` 30、58 行要求为用户明确选择的接入人回填电话和邮箱，当前 `src/pages/OnboardingApplyPage.vue` 344-357 行也以所选 `userId + includeContact=true` 查询其他联系人。本任务同时排除前端修改。现有 `server/feishu-read-only-service.mjs` 1511-1529 行仅要求请求已认证，并未校验目标用户等于会话用户；`tools/feishu-server-proxy.test.mjs` 372-375 行还验证了请求者可读取另一明确联系人原值。任务包也未规定原始电话/邮箱能否进入内存缓存、持久快照、日志或后台同步结果。
- **Impact:** 若按现有后端行为实施，任意已认证用户可能越权读取目标联系人的原始电话和邮箱；若按 PRD 的 self-only 文义收紧，现有上架申请接入人自动回填会在前端不改的条件下回归。两种互斥结果都可能被声称符合部分材料，隐私风险和用户价值均无法可靠决策。
- **Recommendation:** 用户须先选择唯一政策并写入范围：其一是 self-only，要求目标 `userId` 与服务端 canonical identity 相等，否则返回固定 403/404，并明确接受现有接入人自动回填降级及其后续前端任务；其二是 selected-contact，要求明确业务权限码、角色/数据范围、用途、目标字段白名单、审计事件和拒绝响应，不能仅以“已登录”授权。无论选择哪项，都应规定目录列表永不含原始联系方式，敏感响应不得进入共享/租户缓存、持久快照或日志，并固定按请求者与目标用户隔离的缓存/保留策略及自动化越权用例。

### Finding: 关键 operation 的精确请求、成功与失败响应合同尚未冻结

- **Evidence:** `prd.md` 对 COM-004、WB-003、FAV-002/003/004、APP-005、MAT-002/003 多以“沿用既有合同”“稳定标识和版本”“明确无文件状态”描述，未列 HTTP 状态、完整 envelope、必填/可空字段、枚举、错误码和重放语义。现有机器合同并不能自动填补该空白：`src/integration/operation-contract-schemas.js` 121-136 行的写成功响应只有通用 `businessKey`、`recordId`、`version` 等字段，没有 APP-005 所承诺的申请 `status`，也没有明确把 FAV-003/004 的稳定收藏标识映射为 `favoriteId`；783-791、839 行把 MAT-002 item 定义为开放对象，没有强制 `primaryFile/fileId`；1112-1119 行的 MAT-003 只定义成功下载数据，没有“无文件”响应。83-95 行的通用错误 schema 也没有为 401/403、同步失败、幂等冲突、无文件和资源级失败固定逐 operation 语义。
- **Impact:** 后端可以返回彼此不兼容但都符合 PRD 文字的字段；前端可能继续寻找 `favoriteId`、申请状态或文件句柄而失败；QA 无法区分合法空态、权限拒绝、同步任务、幂等重放和真实错误。该缺口直接影响前端兼容、安全处理和发布判定，不属于可推迟到工程阶段的内部设计。
- **Recommendation:** 范围批准前指定一个权威、可机器验证的合同基线，并为每个受影响 operation 固定：请求字段、HTTP 200/202/4xx/5xx、成功/同步/空/错误 envelope、必填与 nullable 字段、ID 的业务含义、版本与 `ifMatch` 规则、APP-005 状态枚举及幂等重放、FAV-003/004 收藏 ID 映射、MAT-002 `primaryFile/fileId` 结构、MAT-003 无文件与下载成功结构，以及 sync-job 的 queued/running/completed/failed/expired 字段和轮询状态。明确列出相对现有 `operation-contract-schemas.js` 与写 operation manifest 的每一处合同变更，并让 AC 直接引用这些 schema/version。

### Finding: 闫瑾负责的正式字典仍缺少可执行基线和失败路径

- **Evidence:** `task.json.deadline`、`task-brief.md` Dependencies、`prd.md` 7.1/7.2(2) 均声明 COM-005 正式业务域字段和选项依赖闫瑾提供或确认；当前任务目录没有该基线、确认记录、版本、适用表/字段/选项、启停状态口径或生效日期。AC-E03 只能验证过滤 `TEST_`、测试初始化和停用项，不能证明剩余内容就是获确认的正式字典。PRD 仍把“阻断开发、只做过滤、还是阻断发布”留作未选择的开放决定。
- **Impact:** 团队既不能合法补造正式选项，也不能依据当前材料判断 COM-005 的完整性；不同实现可能删除有效项、保留初始化项或返回空字典。若不先决定依赖缺失的效果，范围批准会把一个外部未定义交付物误表述为可验收承诺。
- **Recommendation:** 在批准前二选一并记录：A）由闫瑾先提供/确认带版本或哈希的正式基线，再把其作为本任务验收输入；B）把本任务限为确定性过滤和接入能力，正式内容映射保持明确 `blocked`，作为发布阻断项或独立后续任务。两种方案都须写明基线载体、表/字段/选项与启停值、owner、最迟提供阶段、确认方式、变更版本规则，以及基线缺失或不一致时 COM-005 的固定响应和不得 release 的效果。

### Finding: “资源级失败隔离”与首页原子完整性没有唯一语义

- **Evidence:** `prd.md` 主流程 7、AC-F07 和 AC-R01 要求一个资源失败时其他资源继续可用；依赖任务 `.ai-team/tasks/DEH-SERVER-CACHE-RECOVERY-20261010/prd.md` 3.1(7)、6(5)、AC-07 则要求首页 COM-001/002/005、WB-001/002 五段任一失败时不得写入部分首页缓存、快照或 `completed.result`。当前 PRD 没有说明“继续可用”是指独立 operation 仍可服务、同一聚合允许 partial 200，还是只允许返回此前完整的 last-known-good。依赖任务当前 `.ai-team/tasks/DEH-SERVER-CACHE-RECOVERY-20261010/reviews/code-review.md` 还记录一个未关闭 P1：并行 COM-005 子读取终止失败后，兄弟读取未被取消和 drain，任务已失败但仍占用飞书配额与同步槽位。
- **Impact:** 实现可能为了隔离失败而破坏已批准的首页原子完整性，也可能为了原子失败而取消所有无关请求；失败任务提前结算但遗留后台 I/O 会继续争抢有限并发和飞书配额。没有分层语义，部分成功、缓存提交、任务终态和资源清理都无法一致验收。
- **Recommendation:** 在 PRD 固定边界矩阵：独立 operation 之间的故障不得级联；同一首页聚合仍只允许五段全成功后原子提交，单段失败不得产生新的 partial 成功；若允许返回 last-known-good，必须是此前完整快照并带固定 stale 元数据；终止失败或截止时必须取消并等待同一 operation 的兄弟读取 drain 后再结算，且活动/排队计数归零。同步任务的失败 HTTP/envelope、可重试分类、后续新请求行为也应固定。将前序 P1 及相关回归测试明确列为本任务必须关闭的验收项，或明确排除并接受其发布阻断效果。

### Finding: 依赖和真实验收资源没有形成可执行责任矩阵

- **Evidence:** `prd.md` 2.2、7.1 仅把前序实现/未关闭审查项、飞书人员/部门/手机号/邮箱/附件权限、真实账号和测试环境列为假设或依赖；没有逐项 owner、最迟提供阶段、解除证据、受影响 AC 和缺失效果。前序 `.ai-team/tasks/DEH-SERVER-CACHE-RECOVERY-20261010/reviews/code-review.md` 的当前 verdict 为 `changes_required`，除 P1 外还有启动终态关联信息和固定重试/截止/并发/顺序测试不足两项 P2，而本 PRD 未枚举哪些 finding 必须继承关闭。当前任务目录也没有角色/数据范围测试矩阵或各业务合同问题的原始 QA/用户反馈证据。
- **Impact:** 团队可能在开发后才发现飞书权限或测试身份不可用，或只修复前序包的一部分问题却宣称依赖已关闭；401/403、跨用户隔离、审批、收藏和下载无法以相同角色与数据范围复测。由于业务合同问题缺少逐 operation 的现状证据，范围优先级和“已修复”结论也缺少可追溯基线。
- **Recommendation:** 在范围批准前增加依赖/证据矩阵：逐项列 owner、输入制品、最迟阶段、受影响 AC、缺失时 `blocked/not executed` 与 release 结果；列出至少两个隔离用户及所需角色/数据范围、联系方式权限、审批状态、收藏/申请记录和合法下载文件；逐条映射前序 P1/P2 finding 为“本任务关闭”或“明确排除并阻断发布”。同时为每个业务 operation 关联可复现的现状证据（问题单、脱敏响应、测试或日志），避免仅以 `task.json` 与 `task-brief.md` 互相引用来证明问题已经发生。

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, or change task state.
