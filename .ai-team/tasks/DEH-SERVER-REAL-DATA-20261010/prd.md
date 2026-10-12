# DEH-SERVER-REAL-DATA-20261010 产品需求文档

> **治理状态（Fact）**：用户已在当前指令中明确批准本任务范围及本文列明的决策；任务记录仍处于 `scope_review` 且 `approvals.scope.approved=false`，等待 AI Team Lead 记录该明确批准。本文是供其记录并约束下游设计、开发、QA 与 release 的批准范围基线；Product Planner 不记录批准、不改变任务状态，也不授权部署或发布。

## 1. Product goal and target user value

- **Fact：产品目标。** 在飞书多维表格继续作为唯一业务数据源的前提下，修复 Vue Web 项目的 Node 后端读取生命周期、缓存/同步性能及业务数据合同，使数智展厅业务页面在首次进入、刷新和后续操作时自动获得正式、完整、具名且按权限隔离的数据。证据：`task.json.goal`、`task-brief.md` Goal、Mode 与 Platforms。
- **Fact：业务用户价值。** 已登录并获授权的 Web 用户无需人工刷新即可获得正式飞书数据；人员、负责人、开发者和部门展示正式名称而非内部编码；联系方式、收藏、申请和下载按当前用户权限与数据范围隔离。证据：`task.json.target_user`、`task.json.success_metric`、`task-brief.md` User 与 Success Metric。
- **Fact：测试/运维价值。** 测试与运维人员能够用固定样本验证无构建预热副作用、冷热读取、失败恢复、权限隔离、正式数据质量和可回滚的纯后端部署包；本任务不直接部署。证据：`task.json.in_scope`、`task.json.out_of_scope`、`task-brief.md` Scope 第 10 项。
- **Fact / Approved scope decision：可验收目标。** 继承前序首页 5 次冷读/30 次暖读协议，并新增固定 30 次常用读取套件、冷完成后的同键 1 秒复读、精确接口合同、self-only 联系人政策、版本化正式字典基线、首页原子性和失败 drain 门槛。具体口径见第 4、5 节；本批准基线替代原 PRD 中“近即时”“明显更快”和“经批准口径”等不可执行表述。

## 2. Facts, open assumptions, and evidence

### 2.1 Facts and evidence

| Classification | Statement | Evidence |
|---|---|---|
| Fact | 唯一声明平台是 Web；实施面是现有 Vue Web 的 Node 后端接口，未声明移动端。 | `task.json.platforms/web_framework/mobile_*`；`task-brief.md` Mode、Platforms。 |
| Fact | 飞书多维表格保持唯一业务数据源，不引入 Redis、外部数据库或替代数据源。 | `task.json.out_of_scope`；`task-brief.md` Goal、Out of Scope。 |
| Fact | 飞书预热只能在 Node 服务真实启动后执行；Vite build、配置加载和测试导入不得触发预热或飞书请求。 | `task.json.in_scope[0]`；`task-brief.md` Scope 1、Success Metric。 |
| Fact | 读取链路包括缓存命中、5 秒冷读交接、后台同步、同任务合并、状态轮询、热读复用和资源级故障隔离。 | `task.json.in_scope[1..2]`；`task-brief.md` Scope 2。 |
| Fact | APP-001/002/003 必须批量投影 owner、developer 与部门正式名称，禁止用 ID 填充 Name。 | `task.json.in_scope[3]`。 |
| Fact | 用户明确要求 COM-004 查询“当前授权用户”；原始联系方式是高敏数据。 | `task.json.in_scope[4]`；`task-brief.md` Scope 4；`reviews/product-review.md` Finding 2。 |
| Fact | COM-005 必须过滤 `TEST_`、测试初始化及停用项，并接入闫瑾批准的正式字典。 | `task.json.in_scope[5]`；`task-brief.md` Deadline、Dependencies。 |
| Fact | WB-003 即使统计或待办为空，也必须返回当前授权用户身份与空结构，并按用户隔离。 | `task.json.in_scope[6]`。 |
| Fact | FAV-002 仅返回当前用户 APP 收藏；FAV-003/004 返回稳定收藏标识和版本。 | `task.json.in_scope[7]`。 |
| Fact | APP-005 返回稳定申请标识、状态和版本，并保留权限、审批、幂等和审计。 | `task.json.in_scope[8]`。 |
| Fact | MAT-002 返回可下载素材的 `primaryFile/fileId`；MAT-003 执行同源安全下载并明确无文件状态。 | `task.json.in_scope[9]`。 |
| Fact | 当前机器合同采用 `{code,data,...metadata}` 成功 envelope、`{code,message,...}` 错误 envelope、`{operationId,input}` 请求外壳；写合同采用 `businessKey/idempotencyKey/ifMatch/fields/governance`。 | `src/integration/operation-contract-schemas.js`；`server/contracts/feishu-write-operation-manifest.mjs`；`server/business-write-governance.mjs`。 |
| Fact | 前序缓存任务当前代码评审为 `changes_required`，有 1 个 P1 和 2 个 P2 未关闭。 | `DEH-SERVER-CACHE-RECOVERY-20261010/reviews/code-review.md`。 |
| Fact | 交付包括自动化、构建副作用和权限隔离测试，以及纯后端部署包、SHA-256、部署/验证/回滚命令；不直接部署。 | `task.json.in_scope[10]`、`out_of_scope[5]`。 |

### 2.2 Open assumptions and resolution rules

- **Assumption：真实权限尚未证明。** 飞书应用可能具备人员、部门、手机号、邮箱和附件下载权限，但当前任务包没有实时授权证据。缺失不阻断本地实现和自动化，阻断对应 live QA 与 release。
- **Assumption：两名隔离测试用户尚未落实。** User A/User B 的真实账号、角色、数据范围和可用时段尚未提供。缺失不阻断本地实现，阻断 401/403、跨用户、联系人、收藏、申请与下载的 live QA 和 release。
- **Assumption：闫瑾的正式字典基线尚未提供。** 本任务按方案 B 实现过滤及版本化摄取能力；基线不是 development blocker，但缺失或不一致是 COM-005 live QA 与 release blocker。
- **Assumption：固定 Base 和可复现记录尚未冻结。** QA 必须在首次性能样本前记录 Base 指纹、完整记录数、规范化输入和测试记录 ID；缺失样本不得计入验收。
- **Fact / Approved scope decision：六维隔离键。** 沿用前序合同的 `tenant + canonical user + permission set + data scope + operation + normalized input`；任何一维变化均不得合并任务、命中缓存或释放旧结果。
- **Fact / Approved scope decision：禁用态。** 本任务不新增业务功能开关；“disabled”只指正式字典停用项被过滤、既有权限/业务规则拒绝和当前接口未获授权，不改变前端禁用逻辑。

## 3. In-scope and out-of-scope boundaries

### 3.1 In scope

- **Fact：启动边界。** 后端预热仅在 Node 服务真实启动后发生，并以自动化覆盖 Vite build、配置导入和测试导入。
- **Fact：读取边界。** 统一缓存命中、5 秒冷读交接、25 秒任务共同预算、后台同步、同任务合并、状态轮询、热读复用、资源级故障隔离和失败清理。
- **Fact：业务合同边界。** 修复 APP-001/002/003、COM-004/005、WB-003、FAV-002/003/004、APP-005、MAT-002/003 的后端合同。
- **Fact / Approved scope decision：联系人边界。** COM-004 为 self-only；所选其他联系人原始电话/邮箱自动回填不属于本后端合同，需后续独立前端/权限任务。
- **Fact / Approved scope decision：字典边界。** 本任务实现确定性过滤、版本化基线摄取、哈希校验和固定失败；闫瑾批准的内容本身是 release 输入，而非本地开发前置条件。
- **Fact：验证与交付边界。** 增补合同、性能、失败 drain、权限/跨用户和构建副作用自动化，生成纯后端部署包、SHA-256 及部署/验证/回滚命令。

### 3.2 Out of scope

- **Fact：前端排除。** 不修改前端源码、根 `dist`、组件、样式、路由或视觉资源。
- **Fact：数据架构排除。** 不引入 Redis、外部数据库或替代飞书多维表格。
- **Fact：伪数据排除。** 不用用户/部门 ID、`TEST_` 字典、假姓名、假联系方式或代理占位冒充正式数据。
- **Fact：安全降级排除。** 不削弱登录、权限、数据范围、审批、幂等、审计、同源下载或强一致性保护。
- **Fact：外部操作排除。** 不直接操作测试/生产服务器、飞书权限、正式业务数据清理或发布。
- **Fact：旧包排除。** 前序任务当前部署包不能直接作为本任务发布候选。
- **Fact / Approved scope decision：既有 selected-contact 流程排除。** 当前前端为所选其他接入人调用 COM-004 并自动回填电话/邮箱的行为，不受本任务后端支持；不得为兼容该流程放宽 self-only。其恢复需要后续前端/权限治理任务。

### 3.3 Boundary acceptance criteria

- **Fact（AC-B01）：** Given 执行 Vite build、仅加载配置或导入测试模块，When 进程未进入 Node 服务真实启动流程，Then 飞书预热和飞书网络请求次数均为 0。
- **Fact（AC-B02）：** Given 本任务产出部署制品，When 检查制品和交付说明，Then 仅包含后端所需内容，并提供 SHA-256 与部署、验证、回滚命令，且未直接部署。
- **Fact（AC-B03）：** Given 审查本任务 diff，When 检查前端范围，Then 前端源码与根 `dist` 零变更。
- **Fact（AC-B04）：** Given 审查运行依赖，When 验证数据架构，Then 飞书多维表格仍是唯一业务数据源，且未新增 Redis 或外部数据库。
- **Fact（AC-B05）：** Given 正式名称、联系方式或字典数据不可用，When 后端构造响应，Then 不以内部 ID、测试项、假数据或代理占位冒充正式数据。
- **Fact（AC-B06）：** Given 现有登录、权限、数据范围、审批、幂等、审计、同源下载和强一致性保护，When 完成本任务修复，Then 上述保护均未被削弱。

## 4. Primary user flow, including entry point, actions, decision points, outcome, and performance contract

### 4.1 Primary flow

1. **Fact：入口。** 已登录且获授权的用户首次进入或刷新 Web 页面，前端调用 Node 后端业务接口。
2. **Fact / Approved scope decision：规范化与隔离。** 后端先解析 canonical session identity、权限集合和数据范围，再以六维键规范化请求；浏览器提供的用户 ID 不能替代 session identity。
3. **Fact / Approved scope decision：热/LKG 决策。** fresh 完整缓存立即 HTTP 200；仅允许 schema 完整、此前已原子提交且仍在批准 max-stale 内的 LKG 以 HTTP 200 返回，并明确 `dataStale=true`、`cacheStatus="stale"`、`refreshing=true|false` 和 `sourceUpdatedAt`。
4. **Fact / Approved scope decision：冷读决策。** 服务端收到请求后 5 秒内，返回完整 HTTP 200 或 HTTP 202 有效同步任务；后台任务从服务端收到原请求起共用 25 秒总预算。
5. **Fact / Approved scope decision：同步决策。** 同六维键并发请求合并；轮询只读任务状态，不重跑 operation；完成后同键复读必须命中已提交结果。
6. **Fact：业务投影。** 后端执行正式名称投影、self-only 联系方式、字典过滤、当前用户隔离、稳定 ID/版本、审批幂等审计和同源下载。
7. **Fact / Approved scope decision：失败边界。** 独立 operation 故障不级联；首页五段仍为单一原子聚合，不允许 partial 新结果。
8. **Fact / Approved scope decision：结果。** 用户获得完整 200、有效 202 后自动轮询得到完整结果、或结构化终态错误；不需要人工刷新，也不把同步提示当业务数据。

### 4.2 固定性能验收协议

**Fact / Approved scope decision：共同测试条件。** 每组样本使用同一候选包 SHA-256、固定测试 Base、同一 canonical identity、权限集合、数据范围、规范化输入和测试数据快照。计时从 Node 服务收到请求的时刻开始，到完整 HTTP 响应最后一个字节写出为止；任务 25 秒从首次请求 received time 起算。HTTP 202 只满足“首响应 ≤5 秒”，不计作“完整 HTTP 200”。schema 不完整、状态不符、失败、超时和人工刷新均计失败。

| Suite | Cold/cache preparation | Samples | Pass contract |
|---|---|---:|---|
| Homepage cold（继承前序协议） | 每次仅失效目标六维键及首页聚合键，不清空共享缓存；输入 `{forceRefresh:true}`；只轮询首次响应的同一 `syncId` | 5 | 5/5 首响应在 ≤5 秒为完整 HTTP 200 或有效 HTTP 202；直接 200 以该完整响应作为 final completed，202 只轮询该首次响应的同一 `syncId`；5/5 从首次请求 received time 起 ≤25 秒取得 final completed，结果含 COM-001/002/005、WB-001/002 五段完整正式数据。 |
| Homepage warm（继承前序协议） | 首页完整缓存已形成；Base/身份/权限/范围/输入不变；输入 `{forceRefresh:false}` | 30 | ≥27/30 在 ≤5 秒以首次完整 HTTP 200 返回五段；该组所有有权状态查询 0 次 500/504。 |
| Common-read warm/LKG | 正常 warm 或合格 LKG；不得人为延长 TTL/max-stale；下表每项连续 3 次 | 30 | ≥27/30 在 ≤5 秒以完整 HTTP 200 返回对应获批 schema；202、4xx/5xx、schema 不完整均失败。 |
| Immediate same-key reread | 每个 cold operation/homepage 成功完成后立即以相同六维键和规范化输入复读 | 每个 cold completion 1 次 | 每次均在 ≤1 秒返回完整 HTTP 200，不得再次 202 或重跑上游 operation。 |

**Fact / Approved scope decision：Common-read 固定集合与规范化输入。** 占位符必须在首个样本前解析为真实记录并写入 QA evidence manifest；同一组内不得改变。

| # | Operation | Normalized input |
|---:|---|---|
| 1 | COM-005 | `{"dictTypes":["APPLICATION_TYPE","BUSINESS_DOMAIN","SCENE","MATERIAL_CATEGORY"],"includeDisabled":false}` |
| 2 | WB-002 | `{"keyword":"","scene":"","typeCode":"","page":1,"pageSize":20,"sort":"RELEVANCE"}` |
| 3 | APP-001 | `{"page":1,"pageSize":10}` |
| 4 | APP-002 | `{"query":"","filters":{},"page":1,"pageSize":20,"sort":"default"}` |
| 5 | APP-003 | `{"appId":"<APP_ID_A>"}` |
| 6 | COM-004 self | `{"userId":"<CANONICAL_USER_A>","includeContact":true,"page":1,"pageSize":10,"sort":"name,asc"}` |
| 7 | WB-003 | `{"recentMessageLimit":5,"todoLimit":5}` |
| 8 | FAV-002 APP | `{"resourceType":"APP","keyword":"","typeCode":"","domainId":"","tagCode":"","recentlyUsed":false,"page":1,"pageSize":20,"sort":"favoritedAt,desc"}` |
| 9 | MAT-002 | `{"relatedAppId":"<APP_ID_A>","page":1,"pageSize":20,"sort":"updatedAt,desc"}` |
| 10 | Homepage | `{"forceRefresh":false}` |

### 4.3 Performance acceptance criteria

- **Fact / Approved scope decision（AC-F01）：** Given 匹配六维键的 fresh 或合格 LKG 已存在，When 用户请求对应读取，Then 返回完整 HTTP 200，且不重跑原飞书 operation；LKG 必须携带明确 stale metadata。
- **Fact / Approved scope decision（AC-F02）：** Given 缓存未命中，When 完整冷读在服务端收到请求后 5 秒内完成，Then 首次响应在 ≤5 秒返回完整 HTTP 200，无需人工刷新。
- **Fact / Approved scope decision（AC-F03）：** Given 冷读在 5 秒内未完成，When 后端交接后台同步，Then 首次响应在 ≤5 秒返回符合第 5.1 节的 HTTP 202，不把同步文案当业务数据。
- **Fact / Approved scope decision（AC-F04）：** Given 同一六维键已有运行中任务，When 等价并发请求到达，Then 合并到同一 `syncId`，不重复执行原 operation。
- **Fact / Approved scope decision（AC-F05）：** Given 客户端持有有效 `syncId`，When 轮询状态，Then 只读取任务状态/结果，不重跑业务 operation。
- **Fact / Approved scope decision（AC-F06）：** Given 任一 cold 请求已经 completed，When 立即进行同键复读，Then 在 ≤1 秒以完整 HTTP 200 返回且不再次 202。
- **Fact / Approved scope decision（AC-F07）：** Given 某独立 operation 慢、排队或失败，When 其他独立 operation 被请求，Then 其他 operation 可独立服务；若失败发生在同一首页聚合内，则执行第 5.4 节首页原子规则。
- **Fact / Approved scope decision（AC-F08）：** Given 固定 common-read 套件在 usable cache/LKG 条件下执行，When 每项连续执行 3 次并保存原始结果，Then 30 次中至少 27 次在 ≤5 秒完整 HTTP 200。
- **Fact / Approved scope decision（AC-F09）：** Given 固定首页 cold/warm 套件执行，When 按本节缓存准备和计时口径统计，Then cold 5/5 满足 5 秒首响应与 25 秒 completed，warm 至少 27/30 在 5 秒内完整 HTTP 200。

## 5. State inventory for success, loading, empty, error, disabled, and permission-dependent behavior

### 5.1 Authoritative envelope, HTTP, and sync-job contract

**Fact / Approved scope decision：权威基线。** 按本批准范围，`src/integration/operation-contract-schemas.js` 与 `server/contracts/feishu-write-operation-manifest.mjs` 必须按本节形成机器可验证合同；PRD 与机器 schema 不一致时不得 release，不能以实现行为默认为合同。所有对象 `additionalProperties=false`，除非本节明确开放。

**请求外壳**

- Read/write：`POST /api/v1/operations/{operationId}`，JSON 必须为 `{"operationId":"<same path id>","input":{...}}`；路径/body 不一致固定 HTTP 400 `OPERATION_MISMATCH`。
- Sync poll：`GET /api/v1/operations/sync-jobs/{syncId}`；首页为 `GET /api/v1/sync-jobs/{syncId}`。
- 仅 COM-004、WB-003、FAV-002、MAT-002 及 homepage 可在冷读取 5 秒未完成时返回 HTTP 202；MAT-003、FAV-003/004、APP-005 与 sync poll 均不得返回 202。

**HTTP 200 success envelope（read/write）**

`code="OK"`、`data`、非空 `traceId`、本节固定的 `schemaVersion`、ISO-8601 `sourceUpdatedAt`、`isComplete=true`、`dataStale` 必填；缓存读取另需 `cacheStatus="fresh"|"stale"` 与 `refreshing:boolean`。新鲜成功必须 `dataStale=false`；LKG 必须 `dataStale=true`、`cacheStatus="stale"`。部分分页、部分聚合或缺字段不得标记 `isComplete=true`。

**HTTP 202 handoff envelope**

`{"code":"FEISHU_INITIAL_SYNCING"|"HOMEPAGE_SYNCING","message":"请求处理中","operationId":"<id>"|"HOMEPAGE","state":"queued"|"running","syncId":"<8..160 safe chars>","pollAfterMs":1..10000,"traceId":"<id>"}`。字段全部必填；无有效 `syncId` 的 202 计失败。

**Sync poll HTTP 200 envelope**

`code="OK"`、`syncId`、`operationId`、`state="queued"|"running"|"completed"|"failed"|"expired"`、`createdAt`、`updatedAt`、`traceId` 必填。queued/running 仅带 `pollAfterMs`；completed 仅带符合该 operation success schema 的 `result`；failed/expired 仅带 `error`。已存在且有权任务的状态查询恒为 HTTP 200；未登录 401，owner/权限/范围不匹配 403，任务不存在或保留期结束 404。

**4xx/5xx error envelope**

`{"code":"<stable enum>","message":"<safe message>","traceId":"<id>","retryable":true|false}` 必填；仅可选 `retryAfterSeconds`、`writeCommitted`。错误不得包含 token、Cookie、原始联系方式、文件 token、业务 payload 或飞书原始 descriptor。401=`USER_AUTH_REQUIRED`；跨用户/权限拒绝使用本节 operation-specific 403；schema/输入错误 400；幂等冲突 409；上游可重试失败 502/503/504 并正确设置 `retryable`。

**固定错误码与 HTTP 映射**

| Scope | HTTP and stable `code` enum |
|---|---|
| All affected operations | 400 `REQUEST_SCHEMA_INVALID` 或路径/body 不一致 `OPERATION_MISMATCH`；401 `USER_AUTH_REQUIRED`；502 `FEISHU_UPSTREAM_ERROR`；503 `FEISHU_UPSTREAM_UNAVAILABLE`；504 `FEISHU_UPSTREAM_TIMEOUT`。只有 502/503/504 可按实际情况 `retryable=true`。 |
| COM-004 | 403 `CONTACT_SELF_ONLY`、403 `CONTACT_PERMISSION_REQUIRED`。 |
| WB-003 | 403 `WORKBENCH_SCOPE_DENIED`。 |
| FAV-002/003/004 | 403 `FAVORITE_SCOPE_DENIED` 或 `RECORD_OWNER_DENIED`；409 `IDEMPOTENCY_CONFLICT`、`VERSION_CONFLICT`、`WRITE_OUTCOME_UNCONFIRMED`。 |
| APP-005 | 403 `APPLICATION_REQUEST_PERMISSION_DENIED`、`ACTOR_MISMATCH`、`APPROVAL_STATE_FORBIDDEN`；409 `IDEMPOTENCY_CONFLICT`、`WRITE_OUTCOME_UNCONFIRMED`。 |
| MAT-002/003 | 403 `MATERIAL_READ_FORBIDDEN`、`MATERIAL_DOWNLOAD_FORBIDDEN` 或 `SAME_ORIGIN_REQUIRED`；404 `MATERIAL_FILE_NOT_AVAILABLE`、`MATERIAL_FILE_MISMATCH`。 |
| COM-005 | 400 `DISABLED_DICTIONARY_ITEMS_FORBIDDEN`；503 `FORMAL_DICTIONARY_BASELINE_MISSING` 且 `retryable=false`。 |
| Sync jobs | 403 `SYNC_JOB_ACCESS_DENIED`；404 `SYNC_JOB_NOT_FOUND`；`failed.error.code` 保留原 operation 的固定终态码；`expired.error.code=SYNC_JOB_EXPIRED`。轮询本身不返回 202。 |

### 5.2 Exact operation contracts

| Operation | Exact request `input` | HTTP 200 `data` and `schemaVersion` | Empty/no-file and fixed errors |
|---|---|---|---|
| APP-001 | 当前 `page/pageSize` schema；无额外字段 | 当前 facets schema；`feishu-app-read.v2` | 无数据：完整 facet 空数组/计数 0；名称投影失败 `NAME_PROJECTION_INCOMPLETE`，不得以 ID 填 Name。 |
| APP-002 | 当前 `filters/page/pageSize/query/sort` schema | 当前 app list schema；每个 owner/developer/responsibleOrg/developerOrg 的 ID 可保留，但对应 Name 必须是正式名称或合法空值，绝不等于作为回退的 ID；`feishu-app-read.v2` | 零记录为 HTTP 200 完整空分页；投影不完整固定失败，不返回 partial item。 |
| APP-003 | 必填 `appId`；可选 `include` | 当前 detail schema并遵守同一名称规则；`feishu-app-read.v2` | 不存在/不可见 404 `RESOURCE_NOT_FOUND`。 |
| COM-004 | 必填 `userId`、`includeContact=true`；可选且固定默认 `page=1/pageSize=10/sort=name,asc`；不接受 keyword/employeeNo/orgId/departmentId 作为他人目录查询 | `items` 恰为 session canonical user 的 1 项；顶层必填 `items,total,page,pageSize,totalPages,hasPrevious,hasNext,hasMore,sort,filtersApplied,source`；item 必填 `userId,employeeNo,displayName,avatarUrl,orgId,orgName,departmentId,departmentName,officeId,officeName,title,mobile,email,mobileMasked,emailMasked,enabled`，其中原始 `mobile/email` 为 `string|null`；`feishu-contact-self.v2` | canonical target 不等于 session user：固定 403 `CONTACT_SELF_ONLY`；缺原始联系人权限：403 `CONTACT_PERMISSION_REQUIRED`；源字段合法为空时 mobile/email 为 null，不伪造。 |
| COM-005 | 必填非空 `dictTypes`；可选 `parentValues`；`includeDisabled` 只允许 false/省略 | `itemsByType`、`version`、`baselineHash`、`updatedAt` 必填；`feishu-dictionaries.v2` | 基线缺失/哈希、版本、字段或选项不一致：503 `FORMAL_DICTIONARY_BASELINE_MISSING`、`retryable=false`；`includeDisabled=true`：400 `DISABLED_DICTIONARY_ITEMS_FORBIDDEN`。 |
| WB-003 | 仅可选 `recentMessageLimit/todoLimit`，均为整数 1..20；不得传 userId | 必填 `user,stats,quickEntries,recentMessages,todos`；`user` 必须等于 session user；`stats` 必填 `pointBalance,favoriteCount,appVisitCount,appUseCount,pointMonthIncrease`；三个集合必填且可为空；`feishu-workbench-personal.v2` | 无统计/消息/待办仍 HTTP 200：身份完整、计数 0、数组空；任何跨 owner/权限/范围任务读取固定 403，不得返回另一用户数据。 |
| FAV-002 | `resourceType="APP"` 必填；可选 `keyword,typeCode,domainId,tagCode,recentlyUsed,page(1..100)`；`pageSize∈{10,20,50,100}`；`sort∈{favoritedAt,desc; favoritedAt,asc}` | 顶层必填 `items,total,page,pageSize,totalPages,hasPrevious,hasNext,hasMore,sort,filtersApplied`；每项必填 `favoriteId,favoriteVersion>=1,resourceType="APP",resourceId,favoritedAt,lastUsedAt,resource`，仅 `lastUsedAt` 可为 null；`feishu-personal-read.v2` | 无收藏 HTTP 200 完整空分页；只返回 session user 收藏；任何跨 owner/权限/范围任务读取固定 403。 |
| MAT-002 | 仅允许可选 `query,keyword,materialType,categoryId,appTypeCode,domainId,relatedAppId,status,page(1..100),sort`；`pageSize∈{10,20,50,100}` | 顶层必填 `items,total,page,pageSize,totalPages,hasPrevious,hasNext,hasMore,sort,filtersApplied`；typed item 至少必填 `materialId,primaryFile,permissions`，`permissions.canDownload` 必填；有文件时 `primaryFile={fileId,fileName,mimeType,sizeBytes}` 且四字段必填、fileId 非空；无文件时 `primaryFile=null` 且 canDownload=false；`feishu-first-batch-detail.v2` | 列表无记录 HTTP 200 空分页；无文件不是伪文件、不是列表错误。 |
| MAT-003 | `materialId/fileId/purpose/sourcePage/clientOccurredAt` 全部必填 | `downloadId/fileId/accessUrl/expiresAt/downloadCount/pointAward`；`accessUrl` 必须是同源 `/api/v1/files/content/...`，不得含原始飞书 token；`feishu-secure-resource.v2` | 素材存在但无文件：404 `MATERIAL_FILE_NOT_AVAILABLE`；fileId 不属该素材：404 `MATERIAL_FILE_MISMATCH`；同源/权限拒绝 403。文件 GET 成功为 binary HTTP 200，含安全 `Content-Type/Content-Disposition` 和 `no-store`。 |

**Fact / Approved scope decision：COM-004 敏感数据生命周期。** 原始 `mobile/email` 只可出现在完成实时权限校验后的当前用户直接响应，或仅该 canonical user 可读取的短生命周期同步结果；COM-004 按强一致、不可业务缓存处理。原始联系方式永不进入目录列表、tenant/shared cache、持久快照、结构化/文本日志、审计 payload 或任何跨用户任务结果；任务 owner、权限集合或数据范围不一致均固定 403 且不释放结果。

**写 operation 的精确共同请求与成功字段。** FAV-003/004、APP-005 必须含 `businessKey`、`idempotencyKey`、`fields` 和 `governance={confirmed:true,auditContractId:"business-write.v1",requestHash:"sha256:<64 lowercase hex>"}`；`businessKey/idempotencyKey` 各 1..128 字符。FAV-004 另需正整数 `ifMatch`；FAV-003 与 APP-005 首次 CREATE 不接受 `ifMatch`。actor/user 字段由服务端 canonical session 注入，客户端提供不同 actor 固定 403 `ACTOR_MISMATCH`。三者成功 `data` 均必填 `operationId,tableName,businessKey,recordId,version,replayed,deleted,alreadyAbsent` 及下表 operation-specific 字段；`recordId` 为字符串且不可为 null，`version>=1`，不适用布尔值仍须显式返回。

| Operation | Exact fields and semantics | HTTP 200 `data` and `schemaVersion` | Fixed error/replay |
|---|---|---|---|
| FAV-003 | `fields` 只允许 `应用ID`、`收藏时间`；`用户ID` 服务端注入 | 保留当前通用字段，并新增必填 `favoriteId=businessKey`、`version>=1`；`deleted=false`；`feishu-business-write.v2` | 同 actor/operation/idempotencyKey + 同规范化请求：200 原结果且 `replayed=true`；不同请求：409 `IDEMPOTENCY_CONFLICT`。 |
| FAV-004 | `businessKey` 必须等于 FAV-002/003 的 `favoriteId`；`fields={}`；`ifMatch=favoriteVersion` | 保留通用字段，并新增必填 `favoriteId=businessKey`、`version>=1`，`deleted=true` 或幂等已不存在 `alreadyAbsent=true`；`feishu-business-write.v2` | 版本冲突 409 `VERSION_CONFLICT`；非 owner 403 `RECORD_OWNER_DENIED`；重放规则同上。 |
| APP-005 | `fields` 只允许 `应用ID`、`申请理由`、`状态="PENDING"`、`申请时间`；`申请人ID` 服务端注入；服务端强制初始状态 PENDING | 保留通用字段，并新增必填 `applicationRequestId=businessKey`、`status`、`version>=1`；状态枚举 `{PENDING, APPROVED, REJECTED, CANCELLED}`，本 CREATE 成功必须 PENDING；`feishu-business-write.v2` | 无执行权限 403 `APPLICATION_REQUEST_PERMISSION_DENIED`；绕过审批状态 403 `APPROVAL_STATE_FORBIDDEN`；同键同请求 200 replay，不重复记录/审批/审计副作用；同键异请求 409 `IDEMPOTENCY_CONFLICT`。 |

**Fact / Approved scope decision：幂等与不确定写。** 幂等域固定为 `tenant + canonical actor + operationId + idempotencyKey`。上游结果不确定时固定 409 `WRITE_OUTCOME_UNCONFIRMED`、`writeCommitted` 按可证明事实设置；不得自动重放可能已提交的写入。

### 5.3 Formal dictionary baseline — option B

**Fact / Approved scope decision：开发与发布边界。** 本任务实现确定性过滤和版本化 baseline ingestion，闫瑾的批准 baseline/hash 是 mandatory release blocker，不是 development blocker。

baseline 是 UTF-8 canonical JSON，至少包含：`baselineVersion`、`effectiveAt`、`approvedBy="闫瑾"`、`approvedAt`、`sha256`、`dictTypes`；每个 dict type 包含 `tableName`、value/label 字段映射、正式 option 的 `value/label/enabled/parentValue/sortOrder`。`sha256` 是移除 `sha256` 字段后按键排序、无多余空白的 canonical JSON SHA-256；版本或内容变化必须产生新 version/hash，不允许原地覆盖。

摄取顺序固定为：读取候选 → 标准化 trim/Unicode 文本 → 排除任一业务 key/value/label 以 `TEST_`（大小写不敏感）开头的项 → 排除 baseline 明列的 initialization marker/option → 排除 `enabled=false` 或源状态为停用/禁用/disabled/offline 的项 → 与 baseline 的 dict type、value、label、父级和启停状态逐项一致性校验 → 按 `sortOrder,value` 稳定排序 → 返回 baseline version/hash。不得猜测、自动翻译、保留未知项或用剩余源数据替代 baseline。

- **Fact / Approved scope decision（AC-E03）：** Given 候选字典含 `TEST_`、baseline 标记的初始化项或停用项，When COM-005 摄取，Then 这些项均被确定性排除且顺序稳定。
- **Fact / Approved scope decision（AC-E04）：** Given baseline 不存在、hash/版本不匹配、字段映射缺失或源正式项与 baseline 不一致，When 调用 COM-005，Then 固定返回 HTTP 503 `FORMAL_DICTIONARY_BASELINE_MISSING`，不猜测、不返回部分/旧拼接字典且 release blocked。
- **Fact / Approved scope decision（AC-E05）：** Given baseline 尚未到位，When 本地开发和自动化使用受控 fixture 验证过滤/摄取代码，Then development 可继续，但对应 live QA 标记 `blocked/not executed`，不得 release。

### 5.4 Failure, atomicity, cancellation, and prior P1/P2 closure

| Boundary | Required semantics |
|---|---|
| Independent operations | 一个 operation 的失败不得使无依赖的另一个 operation 失败、清除其合格缓存或复用其错误任务。 |
| Homepage aggregate | COM-001/002/005、WB-001/002 五段全成功且 schema 完整后才一次性提交内存缓存、持久快照和 `completed.result`；任一失败不得产生新的 partial cache/result/HTTP 200。 |
| Homepage LKG | 只可返回此前五段全成功、schema 完整、同六维授权范围且仍在 max-stale 内的 LKG；响应必须 `aggregateState="stale"`、`dataStale=true`、`isComplete=true`、`sourceUpdatedAt` 非空，并逐段标记 stale。不得把本轮成功段混入旧聚合。 |
| Failure/deadline | 先 abort 同一 operation 的所有 sibling page/table reads 和排队工作，再 await drain；仅在 active/queued `tableReads=0`、`feishuSyncs=0`、queued syncs=0 后进入 failed/expired、离开 pending/merge index 或完成 prewarm settlement。 |
| Retry budget | 总尝试最多 3 次，固定退避 500ms/1000ms；排队、分页、重试、退避、cache/snapshot commit 共用 25 秒 deadline；全局 active upstream sync concurrency ≤3。 |
| Startup order | COM-005 与 WB-002 均完全 settlement（含 drain）后，WB-001 才可开始；终态 startup event 必须关联同一 traceId、syncId、keyDigest、final attempt、safe resource/path、elapsedMs。 |

**Fact / Approved scope decision：前序 findings 全部纳入 mandatory closure。** 下列三项均不得排除或延期：

1. **P1** terminal prewarm failure 后 sibling Feishu reads 仍活动：实现 abortable child scope、失败/截止 drain 和计数归零回归。
2. **P2** startup terminal events 缺少 operation timeline 关联：成功和终止失败事件都必须具备完整安全关联字段，并证明无 secrets、原始 descriptor 或业务 payload。
3. **P2** startup repair test 未固定 retry/deadline/concurrency/order：fake clock + controllable gates 精确断言 attempts `[1,2,3]`、backoffs `[500,1000]`、≤25 秒共同预算、peak concurrency ≤3、COM-005/WB-002 settlement 先于 WB-001，以及 success/failure/timeout 全路径计数归零。

- **Fact / Approved scope decision（AC-R01）：** Given 一个独立 operation 失败，When 请求另一无依赖 operation，Then 后者独立执行或返回自身合格缓存，不继承前者错误。
- **Fact / Approved scope decision（AC-R02）：** Given 首页任一子 operation 失败、不完整、超时或权限失败，When 首页任务结算，Then 不写新 partial cache/snapshot/result；仅可返回合格完整 LKG，否则结构化失败。
- **Fact / Approved scope decision（AC-R03）：** Given 同一 operation 的一个 sibling 终止失败或 25 秒 deadline 到达，When 任务进入终态，Then 所有 siblings 已 abort 并 drain，活动/排队计数均为 0，旧任务已退出 merge index。
- **Fact / Approved scope decision（AC-R04）：** Given startup success 或 terminal failure，When 检查结构化事件，Then 可用同一 traceId/syncId/keyDigest 关联完整时间线、最终 attempt、安全资源和 elapsedMs，且不含敏感数据。
- **Fact / Approved scope decision（AC-R05）：** Given 执行确定性启动测试，When 覆盖 success/failure/timeout，Then 精确满足重试、退避、deadline、并发、顺序和 drain 合同；三项前序 P1/P2 全部有回归证据。

### 5.5 State inventory

| State | Required behavior |
|---|---|
| Success | HTTP 200、完整 operation schema、正式名称、正确用户/范围、`isComplete=true`；写操作返回稳定业务 ID 与版本。 |
| Loading/sync | 5 秒内完成或返回第 5.1 节有效 202；轮询不重跑；25 秒内 completed 或结构化终态失败。 |
| Empty | 列表 HTTP 200 空数组和一致分页；WB-003 保留当前身份、零 stats 与空数组；COM-004 源联系字段可为 null；MAT-002 `primaryFile=null`。 |
| Error | 使用固定 error envelope；独立 operation 不级联；首页不产生新 partial；失败前 abort+drain。 |
| Disabled | COM-005 停用项永不返回；本任务不新增前端/业务功能开关。 |
| Permission-dependent | 未登录 401；无权限/撤权/owner 或数据范围不匹配 403；旧缓存、快照和任务结果不得越权释放。 |

### 5.6 Contract and state acceptance criteria

- **Fact / Approved scope decision（AC-S01）：** Given APP-001/002/003 响应含 owner、developer 或部门，When schema 校验，Then Name 是正式名称或合同允许的合法空值，绝不以对应 ID 回填；必需名称无法投影时结构化失败。
- **Fact / Approved scope decision（AC-S02）：** Given FAV-003/004 成功，When 校验响应，Then `favoriteId=businessKey` 且返回正整数 version；FAV-004 使用 FAV-002/003 的 ID/version。
- **Fact / Approved scope decision（AC-S03）：** Given APP-005 合法提交，When 成功，Then 返回 `applicationRequestId=businessKey`、`status=PENDING`、正整数 version，并保留审批、幂等和审计。
- **Fact / Approved scope decision（AC-L01）：** Given 冷读能在 5 秒内完成，When 返回，Then 是完整 HTTP 200 而非同步占位数据。
- **Fact / Approved scope decision（AC-L02）：** Given 冷读 5 秒内未完成，When 交接，Then 返回第 5.1 节有效 202，后续轮询同一任务且不重跑 operation。
- **Fact / Approved scope decision（AC-E01）：** Given WB-003 的统计、消息或待办为空，When 调用，Then 返回当前用户完整身份、零计数和合同空数组。
- **Fact / Approved scope decision（AC-E02）：** Given 素材无文件，When MAT-002 与 MAT-003 分别处理，Then MAT-002 返回 `primaryFile=null/canDownload=false`，MAT-003 返回 404 `MATERIAL_FILE_NOT_AVAILABLE`，均不伪造 fileId。
- **Fact / Approved scope decision（AC-D01）：** Given 字典项 disabled 或命中正式 initialization marker，When COM-005 返回，Then 该项不出现；本任务不改变其他既有 disabled 行为。
- **Fact / Approved scope decision（AC-P01）：** Given COM-004 的 target 等于 canonical session user、`includeContact=true` 且权限满足，When 调用，Then 只返回该用户一项身份/部门/联系方式。
- **Fact / Approved scope decision（AC-P02）：** Given COM-004 target 不是 canonical session user，When 调用，Then 固定 403 `CONTACT_SELF_ONLY`，无原始联系字段进入响应、缓存、快照、日志或他人任务结果。
- **Fact / Approved scope decision（AC-P03）：** Given User A 与 User B 有不同角色/数据范围，When A 调用 WB-003、FAV-002/003/004 或查询任务，Then A 只能读取/操作 A 的数据，不能获得或改变 B 的数据。
- **Fact / Approved scope decision（AC-P04）：** Given 当前用户缺少 APP-005 执行权限，When 提交，Then 固定 403 且不创建申请、审批或审计成功记录。
- **Fact / Approved scope decision（AC-P05）：** Given 相同幂等域重复提交相同 FAV-003/004 或 APP-005 请求，When 后端处理，Then HTTP 200 重放同一业务结果、`replayed=true` 且无重复副作用；payload 不同则 409。
- **Fact / Approved scope decision（AC-P06）：** Given MAT-002 素材有合法文件，When 返回，Then `primaryFile.fileId` 非空且与 MAT-003 请求绑定，不暴露飞书 token。
- **Fact / Approved scope decision（AC-P07）：** Given 当前用户有权下载且请求满足同源约束，When 调用 MAT-003 并访问 grant，Then JSON grant 和 binary 文件均来自同源安全路径；鉴权、owner 或同源失败不返回文件。
- **Fact / Approved scope decision（AC-C01）：** Given affected operation 的请求、200、202、empty/no-file 或 error 样本，When 对 `operation-contract-schemas.js` 和 write manifest 运行 contract tests，Then 所有合法样本通过、每个缺字段/额外字段/错误 enum 样本失败。

### 5.7 Changes relative to the current machine contract

| Area | Required change from current contract |
|---|---|
| Standard envelopes | 将 read/write 200 的 trace/schema/source/completeness 元数据按第 5.1 节设为必填；将 `retryable` 纳入错误 schema；把 202 从通用错误明确拆为 handoff schema。 |
| Sync jobs | 补齐 `operationId/createdAt/updatedAt` 和 `queued/running/completed/failed/expired` 判别联合；每个 state 禁止携带不适用字段。 |
| APP-001/002/003 | success 结构主体保留，schemaVersion 升至 `feishu-app-read.v2`；新增正式 Name 非 ID 回退的机器断言。 |
| COM-004 | 从通用联系人列表收紧为 self-only；请求不再支持 selected-other/directory 筛选；mobile/email 改为明确 nullable；固定两类 403；schemaVersion 升级。 |
| COM-005 | 新增 `baselineHash`、baseline 一致性和固定缺失错误；`includeDisabled=true` 被拒绝；schemaVersion 升级。 |
| WB-003 | 结构保留；新增 session user 一致性、合法空 stats/arrays 和跨用户断言；schemaVersion 升级。 |
| FAV-002 | 将已有但当前非 required 的 `favoriteVersion` 改为 required `>=1`；固定 APP-only/current-user；schemaVersion 升级。 |
| Write request schema | `governance` 从 schema 可选改为 FAV-003/004、APP-005 必填；按 operation 收紧 `fields`；FAV-004 要求 `ifMatch`，CREATE 禁止 `ifMatch`。 |
| FAV-003/004 | 当前通用 write data 新增 required `favoriteId`，明确映射 `businessKey`；保留 recordId 但不得让前端把物理 recordId 当 favoriteId。 |
| APP-005 | 当前通用 write data 新增 required `applicationRequestId/status`；固定状态枚举与 CREATE=PENDING。 |
| MAT-002 | 将 `items` 从开放对象改为 typed material；`primaryFile` 必填且为 file object 或 null，file object 强制 `fileId`。 |
| MAT-003 | 保留成功 grant 结构；新增 no-file/mismatch 固定 404、同源 URL 与 binary response contract。 |
| Homepage | 从可能表达 partial 的聚合实现收紧为五段原子提交；仅完整 LKG 可 200；schemaVersion 升至 `homepage-aggregate.v3`。 |
| Contract tests | 为上述每处变更添加 request/200/202/empty/error/enum/additionalProperties/idempotency/download/no-file schema tests；无机器合同与测试不得宣称完成。 |

## 6. Explicit non-goals / things not to do

- **Fact：不做前端工作。** 不为 COM-004 self-only 回归去修改当前接入人自动回填页面；该业务流进入后续前端/权限任务。
- **Fact：不改变数据架构。** 不引入 Redis、外部数据库或替代业务源。
- **Fact：不伪造正式数据。** 不以 ID 填 Name，不返回假姓名、假联系方式、测试字典、未知项或代理占位。
- **Fact：不猜字典。** baseline 缺失或不一致时固定失败，不从剩余数据推断“正式”内容。
- **Fact：不降低安全。** 不绕过认证、权限、数据范围、owner、审批、幂等、审计、同源下载或强一致性。
- **Fact / Approved scope decision：不允许 partial 首页。** 不把本轮部分成功段与旧数据拼成 200，不写 partial cache/snapshot/result。
- **Fact / Approved scope decision：不遗留后台 I/O。** 不在 failed/expired/prewarm failure 后留下 sibling reads、排队槽位或 merge index。
- **Fact：不把轮询变成业务重试。** poll 不得重新执行 operation。
- **Fact：不把错误伪装成 200。** 不把 500/504、无文件、字典基线缺失或权限拒绝转换为成功空数据。
- **Fact：不直接部署/发布。** 不操作服务器、飞书权限或正式数据，不记录 QA/release/scope approval。

## 7. Open questions and decisions needed for scope approval

**Fact：无剩余开放范围问题。** 第 2.2 节尚待取得的是执行证据与外部输入，不是待定 scope；缺失效果已由本节矩阵冻结。

### 7.1 Executable dependency and evidence matrix

**Fact / Approved scope decision：门禁原则。** 缺失 live credentials、真实账号、飞书权限或现场资源不得阻断本地实现与受控 fixture 自动化；只阻断受影响的 live QA（记为 `blocked/not executed`）及 release。任何缺失项不得以 mock 结果冒充 live 证据。

| Dependency/evidence | Owner | Required artifact | Latest required stage | Affected AC | Missing effect |
|---|---|---|---|---|---|
| 前序 P1：terminal failure 留存 sibling reads | Backend engineer；independent code reviewer | abortable child-scope 修复 diff；一个 COM-005 child 终止失败、另一个阻塞的 gated regression；拒绝时 abort 及 `tableReads/feishuSyncs/queued syncs=0` 原始证据；review closure | QA 前 | AC-R03/R05、F09 | local development 可继续；未关闭则 QA/release blocked。 |
| 前序 P2：startup terminal event 缺关联 | Backend engineer；independent code reviewer | success 与 terminal-failure 事件样本；同一 `traceId/syncId/keyDigest`、final attempt、safe resource/path、elapsedMs 断言；敏感字段负断言；review closure | QA 前 | AC-R04/R05 | local development 可继续；未关闭则 QA/release blocked。 |
| 前序 P2：固定 retry/deadline/concurrency/order 测试不足 | Backend engineer；independent code reviewer | fake clock + controllable gates；attempts `[1,2,3]`、backoffs `[500,1000]`、共同预算 ≤25s、peak concurrency ≤3、COM-005/WB-002 settlement 先于 WB-001、三终态计数归零；review closure | QA 前 | AC-R03/R05、F09 | local development 可继续；未关闭则 QA/release blocked。 |
| 正式字典 baseline | 闫瑾（business owner） | canonical JSON；version；SHA-256；批准人/时间；四类表/字段/option/启停/initialization markers；只读批准记录 | COM-005 live QA 前，最迟 release review | AC-E03/E04/E05、F08、C01 | development 不阻断；COM-005 固定失败；live QA `blocked/not executed`；release blocked。 |
| 飞书应用权限 | 飞书管理员 | 脱敏 permission snapshot：人员/部门/手机号/邮箱/附件下载及 operation 权限；采集时间、tenant、app 标识哈希 | 首个 live security/contract test 前 | AC-P01/P04/P06/P07、F08 | local tests 可用 fixture；对应 live QA 与 release blocked，不得降级 mock 结论。 |
| 两名隔离用户 | Business owner + 飞书管理员 | `identity-matrix.json`：User A/User B canonical ID 哈希、角色、org/department、data scope、permissions、预期可见记录；两者互不包含 | 首个 isolation/performance 样本前 | AC-P01/P02/P03/P04、F08/F09 | local implementation 不阻断；跨用户/live performance 不执行；release blocked。 |
| User A 测试数据 | QA data owner | 当前用户联系方式（脱敏期望）；可见 APP_ID_A；A 的 APP 收藏及 favoriteId/version；A 的 WB stats/todos 预期 | live QA 前 | AC-S01/S02、E01、P01/P03/P05、F08 | 对应 operation live QA blocked；release blocked。 |
| User B 隔离/审批数据 | QA data owner | B 的不同 org/data scope；B 自有收藏/WB 记录；APP-005 审批角色与期望拒绝/允许矩阵 | live QA 前 | AC-P02/P03/P04/P05 | 对应 isolation/approval live QA blocked；release blocked。 |
| 素材文件矩阵 | QA data owner + 飞书管理员 | 一个有合法附件的 MAT record、一个无文件 MAT record、一个错配 fileId；文件名/MIME/size 期望；不保存 token 到证据 | MAT live QA 前 | AC-E02、P06/P07、C01 | local tests 可用 fixture；MAT live QA/release blocked。 |
| 固定 Base/数据快照 | QA | `performance-manifest.json`：Base hash、候选包 SHA、记录总数/各表数、User A/B、权限/范围 hash、10 个 normalized inputs、cache preparation、测试前后数据不变证明 | 首个性能样本前 | AC-F01..F09 | 当轮样本无效；性能 QA/release blocked。 |
| 当前 operation 可复现证据 | QA + Backend engineer | 每个 APP-001/002/003、COM-004/005、WB-003、FAV-002/003/004、APP-005、MAT-002/003 的脱敏 before/after 请求、HTTP、schema validation、trace/sync timeline、build SHA、预期/实际；文件放 `evidence/current-operation/<operationId>.json` | 对应修复进入 QA 前 | AC-S01..C01 | 无证据的 operation 不得标“已修复”；对应 QA/release blocked。 |
| 冷/暖/复读原始结果 | QA | 5 cold + 30 warm homepage、30 common-read、每次 cold 后同键复读的逐次 JSONL/CSV：received/completed time、HTTP、state、schema、syncId hash、cache status | release review 前 | AC-F01..F09 | 性能结论 `blocked/not executed`；release blocked。 |
| 部署与回滚现场 | 产品负责人 + 运维 | 部署包 SHA 对应关系、Node/systemd/资源约束、只读日志、部署/验证/回滚执行记录；不得由 Codex 执行 | live QA/release review | AC-B02、R04、F09 | local implementation 不阻断；现场 QA/release blocked。 |

**Fact / Approved scope decision：两用户最小矩阵。** User A 是已授权普通业务用户，data scope 仅 Org A；User B 是不同 Org B/data scope 的已授权用户，并具备测试 APP-005 所需的明确审批角色或拒绝路径。两者都必须能登录，但 A 不得读取/修改 B 的 WB、收藏、联系人原值或 sync result，反之亦然。实际 ID、角色名和 permission code 不在 PRD 猜测，必须由 `identity-matrix.json` 冻结。

**Fact / Approved scope decision：证据最小字段。** 每份 current-operation evidence 必须包含 `operationId`、candidate SHA、schema version、sanitized request、HTTP status、sanitized response/error、traceId hash、started/finished timestamps、canonical user hash、permission/data-scope hash、source record IDs hash、expected、actual、pass/fail/blocked；不得包含 credential、Cookie、token、原始联系方式或附件二进制。

### 7.2 Approved scope decisions and Team Lead handoff

1. **Fact / Approved scope decision：批准固定性能协议。** 采用第 4.2 节 homepage 5 cold/30 warm、30 common-read、每个 cold completion 后 ≤1 秒同键复读及 server-received-to-full-response 计时。
2. **Fact / Approved scope decision：批准 COM-004 self-only。** canonical target 不等于 session user即固定 403；接受现有 selected-other-contact autofill 不受本后端支持，并另立后续前端/权限任务。
3. **Fact / Approved scope decision：批准 contract v2。** 采用第 5.1/5.2/5.7 节 exact request/200/202/empty/error、ID/version/idempotency/download/no-file schema 和逐项 contract tests。
4. **Fact / Approved scope decision：批准字典方案 B。** 本任务开发 deterministic filter + versioned ingestion；闫瑾 baseline/hash 是 release blocker 非 development blocker；缺失/不一致固定 `FORMAL_DICTIONARY_BASELINE_MISSING`。
5. **Fact / Approved scope decision：批准分层失败语义。** 独立 operation 不级联；首页五段原子；仅完整 LKG 可 stale 200；失败/截止先 abort+drain、计数归零；前序 1 P1 + 2 P2 mandatory closure。
6. **Fact / Approved scope decision：批准依赖门禁。** 采用第 7.1 节 owners/artifacts/stages/AC/missing effects；真实 credentials/permissions 缺失不阻断 local implementation，但阻断对应 live QA 与 release。
7. **Fact：scope 决策已明确，无剩余开放范围问题。** 用户已明确批准本节 1–6 项及全文范围；该决定交由 AI Team Lead 记录并选择后续治理路径。Product Planner 不记录批准、不改 task state、不启动设计或开发。
## 2026-10-10 approved amendment — baseline optional

产品负责人已批准取消 COM-005 的正式字典 baseline 强制门禁。缺少或未配置 baseline 时，后端直接读取飞书现有字典，确定性过滤 `TEST_`、测试初始化和停用项，并以实际返回集合计算 SHA-256；配置有效 baseline 时继续执行字段和选项一致性校验。本修订覆盖本文中“baseline 缺失固定失败/阻止部署”的旧要求，其余权限、缓存、正式数据和验收要求不变。

