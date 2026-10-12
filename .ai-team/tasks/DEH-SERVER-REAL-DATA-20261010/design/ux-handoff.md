# UX / Interaction Handoff — 真实数据读取与业务接口完整性

## 1. 文档定位与治理边界

- 任务：`DEH-SERVER-REAL-DATA-20261010`。
- 平台：Web / Vue；Mobile、uni-app 与其他移动目标未声明。
- 批准基线：[task.json](../task.json)、[task-brief.md](../task-brief.md)、scope-approved [prd.md](../prd.md) 与 [decision-log.md](../decision-log.md)。
- 设计目的：定义现有 Web 界面可观察到的 API 驱动交互合同，使首次进入、缓存命中、5 秒任务交接、自动轮询、LKG 静默刷新、业务空态、安全拒绝及写操作形成一致且可验收的结果。
- 实施边界：本任务只改变 Node 后端、机器合同、测试与纯后端部署制品；不得新增或修改页面、路由、组件、控件、文案、视觉、响应式规则、焦点逻辑、前端源码或根 `dist`。
- 本文件描述后端必须提供给既有前端的可观察行为，不授权用前端改动兼容后端偏差，也不构成设计批准、视觉签署、开发路由、QA 通过或发布批准。

## 2. 行为证据与设计依据

### 2.1 已批准产品决策

1. 缓存和任务身份固定为 `tenant + canonical user + permission set + data scope + operation + normalized input`；任一维变化都不得命中旧缓存、合并旧任务或释放旧结果。
2. fresh 完整缓存立即返回 HTTP 200；只有同六维键、schema 完整、此前已原子提交且仍在批准 `max-stale` 内的 LKG 可以 stale HTTP 200 服务。
3. 冷读取从服务端收到请求起 5 秒内返回完整 HTTP 200，或仅对批准可交接的读取返回有效 HTTP 202；后台任务从原请求 received time 起共用 25 秒预算。
4. 等价并发请求合并到同一个 active `syncId`；状态查询只读任务状态，不重跑 operation；`completed.result` 直接就是原 operation 的完整成功 envelope。
5. 独立 operation 的失败不级联；首页 `COM-001/002/005 + WB-001/002` 仍是五段原子聚合，不发布本轮 partial 结果。
6. APP-001/002/003 返回正式人员和部门名称；COM-004 为 self-only；COM-005 使用正式版本化字典；WB-003、收藏、应用申请与素材下载都按当前授权用户及数据范围隔离。
7. 所有请求、成功、handoff、轮询、空、无文件和错误形态以 PRD 5.1、5.2、5.7 的 contract v2 为权威基线；当前机器 schema 不是可放宽该基线的理由。

### 2.2 既有 Web 行为

- [App.vue](../../../../src/App.vue) 已承载请求活动状态、页面数据源装载、自动状态轮询、登录入口、现有六态边界及后台缓存更新；本任务不改变这些流程。
- [safe-proxy-client.js](../../../../src/integration/safe-proxy-client.js) 已在 operation 首次响应带有效 `syncId` 时轮询 `/operations/sync-jobs/{syncId}`，并在 `completed` 时直接消费 `result`；后端必须维持此单任务连续性。
- [homepage-aggregate-client.js](../../../../src/integration/homepage-aggregate-client.js) 与 [persistent-homepage-client.js](../../../../src/integration/persistent-homepage-client.js) 已提供首页一次 POST、同一任务轮询及 stale 静默刷新承载；后端不得返回新的 partial 首页，即使当前客户端仍能识别旧 `partial` 值。
- [page-integration-matrix.js](../../../../src/integration/page-integration-matrix.js) 将应用中心、应用详情、收藏、个人中心、素材中心、上线申请与使用申请映射到对应 operation；信息架构与入口保持不变。
- [PageStateBoundary.vue](../../../../src/components/PageStateBoundary.vue)、[FavoritesPage.vue](../../../../src/pages/FavoritesPage.vue)、[ProfilePage.vue](../../../../src/pages/ProfilePage.vue)、[MaterialsPage.vue](../../../../src/pages/MaterialsPage.vue) 与 [ApplicationUseApplyPage.vue](../../../../src/pages/ApplicationUseApplyPage.vue) 已有状态区、`aria-live`、错误/访问受限承载及动作后公告；本任务只保证 API 结果能正确进入这些既有边界。
- [secure-download.js](../../../../src/integration/secure-download.js) 只启动同源下载；MAT-003 必须返回可被该流程消费的同源路径。

### 2.3 前序任务证据

- 前序 [UX handoff](../../DEH-SERVER-CACHE-RECOVERY-20261010/design/ux-handoff.md) 已冻结“一次原请求、同一 `syncId` 自动轮询、终态自动结束 loading、LKG 静默刷新、首页原子展示”的交互方式，本任务继承而不重设计。
- 前序 [Functional QA](../../DEH-SERVER-CACHE-RECOVERY-20261010/functional-qa-report.md) 证明服务未 ready 时真实 warm/cold、状态、空态、安全与恢复验收无法完成；本任务不得用本地 fixture 结果冒充 live 用户证据。
- 前序 [code review](../../DEH-SERVER-CACHE-RECOVERY-20261010/reviews/code-review.md) 当前为 `changes_required`：终止失败可能遗留 sibling reads，startup 终态缺完整关联，固定 retry/deadline/concurrency/order 测试不足。三项均是本任务 mandatory closure，不能用可显示 error 的前端状态代替修复。
- 前序 [engineering handoff](../../DEH-SERVER-CACHE-RECOVERY-20261010/engineering-handoff.md) 记录了六维隔离、状态端点、LKG、原子首页和部署包行为，但 live 性能、撤权、真实空态与重启恢复仍未获得最终接受证据。

## 3. 信息架构与 API 责任映射

现有页面、导航及页面内操作位置全部保留。缓存类型、任务合并、分页读取、重试、退避、持久快照、`syncId`、trace 和字典 hash 都是服务端或诊断信息，不新增面向用户的任务页、进度页或缓存提示。

| 既有体验区域 | 权威 operation | 后端提供的可观察内容 |
|---|---|---|
| 工作台首次进入 | Homepage；COM-001/002/005、WB-001/002 | 五段原子完整首页、正式字典、一次 loading 生命周期 |
| 应用中心与应用详情 | APP-001/002/003 | 正式应用、负责人、开发者及部门名称；不以 ID 冒充名称 |
| 当前用户身份/联系方式 | COM-004 | 仅当前 canonical session user 的身份、部门和获授权原始联系方式 |
| 个人中心 | WB-003 | 当前用户身份、统计、快捷入口、最近消息、待办；允许零统计与空集合 |
| 我的收藏与详情收藏动作 | FAV-002/003/004 | 当前用户 APP 收藏、稳定 `favoriteId`、版本和幂等写结果 |
| 应用使用申请 | APP-003 + APP-005 | 正式应用标识；稳定申请标识、`PENDING` 状态、版本和重放结果 |
| 素材中心与详情关联素材 | MAT-002/003 | `primaryFile/fileId`、下载权限、无文件语义和同源下载 grant |
| 正式筛选字典 | COM-005 | 过滤测试、初始化和停用项后的批准 baseline 内容与版本/hash |

## 4. 统一读取生命周期

### 4.1 首次进入或刷新

1. 既有页面发起原有业务请求；服务端先从 session 解析 canonical identity、tenant、权限集合与数据范围，再规范化 operation/input。浏览器提供的用户 ID 不能替代 session identity。
2. 服务端只在完整结果可发布时返回成功。未完成分页、名称投影失败、schema 缺字段、权限未决或首页缺任一段，都不是空态或成功。
3. 若同六维键存在 fresh 完整缓存，按 4.2 返回；若存在合格 LKG，按 4.6 返回；否则进入冷读取。
4. 冷读取在 5 秒内完成时直接返回完整 HTTP 200。现有 loading 自动结束，页面进入 `normal` 或经完整读取确认的 `empty`，不需要人工刷新。
5. 冷读取到 5 秒仍未完成时，仅批准可 handoff 的读取按 4.3 返回 HTTP 202；其他 operation 必须返回其合同允许的完整成功或结构化错误，不能伪造同步占位数据。

### 4.2 Fresh cache hit

- 匹配六维键的 schema-complete fresh 缓存直接 HTTP 200，`code="OK"`、`isComplete=true`、`dataStale=false`、`cacheStatus="fresh"`，并带非空 `traceId/schemaVersion/sourceUpdatedAt` 和该 operation 的完整 `data`。
- 缓存命中不得重跑飞书 operation，不得先返回空集合再替换，不得进入 202，不得更改页面焦点或触发第二段 loading。
- 当前用户权限、owner 和数据范围必须在释放缓存前实时确认；权限或隔离维变化时旧缓存视为不匹配，而不是“先显示后撤回”。
- 冷任务完成后的相同六维键复读必须在 1 秒内直接完整 HTTP 200，且不得再次创建任务。

### 4.3 五秒 handoff

只有 COM-004、WB-003、FAV-002、MAT-002 与 homepage 可以在冷读取 5 秒未完成时返回 HTTP 202。APP-001/002/003、COM-005、FAV-003/004、APP-005、MAT-003 和任一 sync poll 不得返回 202。

有效 handoff 的必填字段为：

`code="FEISHU_INITIAL_SYNCING"|"HOMEPAGE_SYNCING"`、安全 message、`operationId`、`state="queued"|"running"`、有效 `syncId`、`pollAfterMs` 和 `traceId`。

交互规则：

- HTTP 202 是 transport handoff，不是业务数据，不得携带 partial 列表、空集合、旧失败结果或“首次同步”业务占位。
- 首次 202 继续同一个既有 loading 生命周期；不新增进度页、倒计时、任务按钮或手动刷新要求。
- 同一六维键已有 active task 时，等价请求得到同一个 `syncId`；不同用户、权限、范围、operation 或规范化 input 绝不合并。
- 一个 operation 请求只跟随其首次 202 返回的一个 `syncId`。页面同时包含多个独立 operation 时，每个 operation 可以有自己的任务，但任何单个 operation 都不得在轮询中切换任务；首页始终只有一个聚合 `syncId`。

### 4.4 同一 `syncId` 轮询

1. 客户端只调用 `GET /api/v1/operations/sync-jobs/{syncId}`；首页只调用 `GET /api/v1/sync-jobs/{syncId}`，不重复 POST 原 operation/homepage。
2. 已存在且有权任务的 poll 恒为 HTTP 200，必填 `code="OK"`、`syncId`、`operationId`、`state`、`createdAt`、`updatedAt`、`traceId`。
3. `queued/running` 只带 `pollAfterMs`；保持原 loading，不清空已有内容、不产生错误、不重复公告。
4. `completed` 只带符合原 operation success schema 的 `result`。poll 不再触发 read、分页、写入或审批副作用。
5. `failed/expired` 只带结构化 `error`；loading 结束并进入既有 error。旧任务退出 active merge index，后续普通请求不能复用其 `syncId`。
6. 未登录 poll 返回 401；任务 owner、权限集合或数据范围不匹配返回 403；任务不存在或保留期结束返回 404。不得为了维持“poll HTTP 200”而吞掉这些安全边界。

### 4.5 自动完成

- 后台任务从服务端收到原请求起共享 25 秒总预算；排队、分页、退避、重试、提交、readback 都计入该预算。
- `completed` 只能发生在完整 schema 校验、持久提交、内存发布及同键 readback 均成功之后。现有前端直接消费 `completed.result`，结束 busy/loading 并自动展示结果。
- 完成后不要求页面刷新、重新点击、第二次业务 POST 或以任务状态再换取结果。
- `completed.result` 不再包裹一层业务数据，也不得省略成功 envelope 的 metadata。
- 首页只在五段全成功后一次完成；不得把本轮成功段与旧段拼接为新成功，也不得返回 partial 200。

### 4.6 LKG 静默刷新

- 仅同六维键、schema 完整、此前原子提交且在批准 `max-stale` 内的 LKG 可以 HTTP 200 返回。
- stale 200 必填 `isComplete=true`、`dataStale=true`、`cacheStatus="stale"`、`refreshing:boolean` 和非空 `sourceUpdatedAt`；首页另需 `aggregateState="stale"` 且五段分别标记 stale。
- 用户继续看到完整 `normal` 或真实 `empty` 内容；服务端刷新在后台静默进行，不新增 loading、toast、任务页、焦点移动或技术公告。
- stale 成功 envelope 不附加要求浏览器轮询的 `syncId`。后台刷新失败不得清空、替换或降级已展示的合格 LKG。
- COM-004 原始联系方式按强一致、不可业务缓存处理，不使用共享缓存、持久快照或 LKG；只允许实时校验后的直接响应或 owner-only 短生命周期同步结果。

### 4.7 失败隔离与恢复

- 一个独立 operation 的失败不清除其他 operation 的合格缓存，也不让其他请求继承其错误任务。
- 首页任一段失败、不完整、超时或权限失败时，不产生新 partial cache/snapshot/result。存在合格完整首页 LKG 时可以 stale 200；否则返回结构化终态错误。
- 失败或 deadline 到达时，先 abort 同一 operation 的 sibling page/table reads 与排队工作，再 await drain；只有活动/排队计数归零后才进入 `failed/expired` 并退出 merge index。
- 后续请求有 LKG 时直接 200 并静默刷新；无 LKG 时创建新受控任务和新 `syncId`，绝不复用旧失败任务。

## 5. 业务域交互合同

### 5.1 正式人员与部门名称

- APP-001/002/003 一次返回可直接展示的正式 `ownerName/developerName/responsibleOrgName/developerOrgName`；对应 ID 可以保留为机器标识，但 Name 绝不能用 ID 回填。
- 合同允许为空的名称可以是合法空值。承载业务记录及名称查找所需的飞书读取均已成功，但必需的 owner、developer 或 department 正式名称仍无法解析时，直接响应固定为 HTTP 422 `NAME_PROJECTION_INCOMPLETE`、`retryable=false`；若该失败发生在已交接的同步任务中，poll transport 仍按既有合同返回 HTTP 200 `state="failed"`，其 `failed.error` 保留同一终态 HTTP/status 422 映射、`code="NAME_PROJECTION_INCOMPLETE"` 与 `retryable=false`。
- 若正式名称查找因临时飞书 transport、rate-limit、timeout 或其他 upstream 故障而失败，直接错误及同步任务 `failed.error` 必须保留批准合同中具体的 502 `FEISHU_UPSTREAM_ERROR`、503 `FEISHU_UPSTREAM_UNAVAILABLE` 或 504 `FEISHU_UPSTREAM_TIMEOUT` 映射及其实际 `retryable` 值，不得折叠为 `NAME_PROJECTION_INCOMPLETE`。
- 上述两类失败都不得降级为 ID-as-name、partial APP 成功、成功空列表或其他 empty 结果。
- 名称投影不引入页面内逐项二次查人、名称闪烁、后补替换或额外 loading；列表/详情以一次完整结果呈现。

### 5.2 COM-004 当前用户联系方式与隐私

- 请求必须以当前 session canonical user 为 target，`includeContact=true`；目标与 session user 不同固定 HTTP 403 `CONTACT_SELF_ONLY`。
- 有原始联系人权限时 HTTP 200 只返回当前用户一项，含正式身份、组织/部门和 `mobile/email`；源字段合法为空时为 `null`，不伪造。
- 缺原始联系人权限固定 403 `CONTACT_PERMISSION_REQUIRED`；未登录 401。拒绝响应不得含原始联系方式。
- 原始 `mobile/email` 永不进入目录列表、tenant/shared cache、持久快照、日志、审计 payload 或跨用户任务结果；owner/权限/范围变化后不得释放旧同步结果。
- 既有上线申请页会为所选其他接入人调用 COM-004 并尝试自动回填联系方式。scope 已明确该 selected-other-contact 流程不受本后端合同支持：请求必须 403，不得为保持自动回填而放宽 self-only。现有手工填写及错误承载保持原样；完整恢复需后续独立前端/权限治理任务。

### 5.3 COM-005 正式字典与 disabled

- 返回的字典按批准 baseline 做确定性过滤、一致性校验与稳定排序，并带 `version/baselineHash/updatedAt`。
- `TEST_`、baseline 标记的初始化项、`enabled=false` 及源状态为停用/禁用/disabled/offline 的项永不进入成功响应。
- `includeDisabled=true` 固定 HTTP 400 `DISABLED_DICTIONARY_ITEMS_FORBIDDEN`；这不是一个由用户切换的页面模式。
- baseline 缺失、hash/版本/字段/option 不一致固定 HTTP 503 `FORMAL_DICTIONARY_BASELINE_MISSING`、`retryable=false`；不得返回旧拼接字典、未知项或成功空数组。
- 本任务不新增或改变其他前端 disabled 规则，不新增业务功能开关。

### 5.4 WB-003 个人中心

- 请求不接受浏览器提供的 `userId`；服务端以 canonical session identity 绑定结果。
- HTTP 200 必须始终包含 `user/stats/quickEntries/recentMessages/todos`。统计或待办为空时，仍返回完整当前用户身份、数值 0 与空数组，不将个人中心误判为空用户。
- 不得通过 WB-003 返回另一用户的身份、统计、消息或待办；跨 owner/权限/范围固定 403 `WORKBENCH_SCOPE_DENIED`。
- 页面首次进入、缓存命中与任务完成都只更新现有个人中心区域；不增加新入口、通知或跳转。APP-005 成功后的后续申请状态仍由现有个人中心/申请读取入口承载，本任务不新增跟踪 UI。

### 5.5 FAV-002/003/004 收藏

- FAV-002 只返回 session user 的 `resourceType="APP"` 收藏；每项必有稳定 `favoriteId`、`favoriteVersion>=1`、`resourceId`、收藏时间及完整 app resource。无收藏是 HTTP 200 完整空分页。
- 其他用户收藏、旧 owner 缓存或跨范围任务结果不得出现；拒绝使用 403 `FAVORITE_SCOPE_DENIED` 或 `RECORD_OWNER_DENIED`。
- FAV-003 成功返回 `favoriteId=businessKey`、正整数 `version`、`deleted=false`；同幂等域同请求重放返回原结果且 `replayed=true`，不得重复收藏、审计或副作用。
- FAV-004 使用 FAV-002/003 返回的 `favoriteId` 与 `favoriteVersion` 作为 `businessKey/ifMatch`；成功返回相同 `favoriteId`、新版本及 `deleted=true`，或幂等已不存在 `alreadyAbsent=true`。
- 版本冲突为 409 `VERSION_CONFLICT`；同 key 不同 payload 为 409 `IDEMPOTENCY_CONFLICT`；不确定写为 409 `WRITE_OUTCOME_UNCONFIRMED`，不得自动重放可能已提交的写。
- 收藏/取消收藏继续使用现有按钮与公告；请求进行中、成功、失败和版本冲突不新增弹窗。成功后后续 FAV-002 读取必须与写结果一致。

### 5.6 APP-005 应用使用申请

1. 用户从既有应用中心或详情入口进入使用申请页；APP-003 提供正式应用标识与名称。
2. 用户按既有表单填写理由并提交一次。APP-005 不返回 202，前端按钮的现有 submitting/disabled 生命周期保持不变。
3. 服务端以 session 注入申请人，拒绝客户端不同 actor；强制初始状态 `PENDING`，保留权限、审批、幂等和审计。
4. HTTP 200 必须返回 `applicationRequestId=businessKey`、`status="PENDING"`、正整数 `version` 及通用写结果字段。前端据此进入既有“申请已提交”结果，并保留前往个人中心/返回详情的既有路径。
5. 同 actor/operation/idempotencyKey 的同请求重放返回同一申请且 `replayed=true`，不得重复创建申请、审批或审计；不同 payload 固定 409。
6. 无执行权限为 403 `APPLICATION_REQUEST_PERMISSION_DENIED`；actor 不匹配为 403 `ACTOR_MISMATCH`；试图绕过初始审批状态为 403 `APPROVAL_STATE_FORBIDDEN`。失败时保持表单内容和现有错误承载，不显示成功。

### 5.7 MAT-002/003 素材与下载

- MAT-002 每项必含 `materialId/primaryFile/permissions`，且 `permissions.canDownload` 必填。
- 有可下载文件时，`primaryFile={fileId,fileName,mimeType,sizeBytes}` 四项完整且 `fileId` 非空；现有下载动作可以调用 MAT-003。
- 无文件时 `primaryFile=null` 且 `canDownload=false`。这是列表项的合法内容状态，不是整个列表 error，也不得伪造 fileId；既有按钮保持不可用/“暂无可下载文件”语义。
- MAT-003 必须绑定 `materialId + fileId`，且不返回 202。成功 HTTP 200 返回 `downloadId/fileId/accessUrl/expiresAt/downloadCount/pointAward`；`accessUrl` 必须是同源 `/api/v1/files/content/...`，不得含飞书 token。
- 用户激活下载后，现有状态区先公告准备；grant 成功后由既有同源下载流程启动 binary GET。binary HTTP 200 使用安全 `Content-Type/Content-Disposition` 与 `Cache-Control: no-store`，不导航离开当前页面。
- 素材无文件为 404 `MATERIAL_FILE_NOT_AVAILABLE`；fileId 不属于素材为 404 `MATERIAL_FILE_MISMATCH`；读/下载/同源拒绝为对应 403。拒绝或失败不得返回文件内容或外部飞书 URL。

## 6. 标准响应与内容规则

### 6.1 成功、handoff 与错误

| 结果 | HTTP / envelope | 用户可观察结果 |
|---|---|---|
| fresh 完整命中 | 200 success，`dataStale=false/cacheStatus=fresh/isComplete=true` | 直接显示正式数据；无额外 loading 或公告 |
| cold 5 秒内完成 | 200 success | 同一次 loading 自动结束并显示 normal/empty |
| 合格 LKG | 200 success，`dataStale=true/cacheStatus=stale` | 完整旧数据继续可用；刷新静默 |
| 5 秒 handoff | 202 handoff，单个有效 `syncId` | 保持同一 loading，只轮询该任务 |
| queued/running | poll 200，仅状态与 `pollAfterMs` | 继续等待，不重发、不重复公告 |
| completed | poll 200，完整 `result` | 自动展示并结束 loading |
| failed/expired | poll 200，结构化 `error` | 结束 loading，进入既有 error |
| 未登录 | 401 `USER_AUTH_REQUIRED` | 进入既有登录/重新授权路径；不释放数据 |
| 无权限/owner/范围不匹配 | operation-specific 403 | 进入既有访问受限承载；不显示空数据 |
| 输入/schema 错误 | 400 | 结构化 error；不转换为空或成功 |
| 幂等/版本/不确定写 | 409 | 保留当前上下文，显示既有动作错误 |
| 飞书读取成功后的必需名称解析不完整 | 直接 HTTP 422；同步任务 `failed.error` 使用同一 422 映射、`code="NAME_PROJECTION_INCOMPLETE"`、`retryable=false` | 终态 error；不得显示 ID-as-name、partial APP 或 empty |
| 上游失败（含名称查找的临时 transport/rate-limit/timeout/upstream 故障） | 保留具体 502/503/504 code/status 与实际 `retryable` | 有合格 LKG 则由读链路先服务；否则终态 error；不得折叠为 `NAME_PROJECTION_INCOMPLETE` |

所有 4xx/5xx 错误必含 `code/message/traceId/retryable`，只允许合同声明的可选字段；不得含 token、Cookie、原始联系方式、文件 token、业务 payload、飞书原始 descriptor 或内部堆栈。

### 6.2 内容行为

- 只把经完整 schema、分页和权限校验的零结果称为空；超时、部分结果、字典基线缺失、名称投影失败、权限拒绝和无文件下载错误都不是空列表。
- 不向用户展示 `syncId`、trace、cache key、TTL、快照路径、baseline hash、分页进度、重试次数或内部队列。
- 不把“正式飞书数据正在首次同步”“数据缺失”“受控代理数据”或要求手动刷新当作业务结果。
- stale/fresh 是响应 metadata，不新增页面标签或提示；本任务不改变现有文案。
- 成功响应只含正式业务数据；不得以 ID、测试项、假姓名、假联系方式或代理占位冒充可显示内容。

## 7. 六种必备状态

| 状态 | API 触发 | 内容行为 | 允许动作与恢复 | 保留的焦点/公告行为 |
|---|---|---|---|---|
| `normal` | fresh/cold HTTP 200、poll `completed`，或非空 LKG 200 | 一次性呈现完整正式数据；写成功呈现稳定 ID/版本支持的既有结果 | 保留现有浏览、筛选、收藏、申请、下载；后台刷新不阻塞 | 缓存命中、轮询及静默刷新不移动焦点；终态内容只更新一次，不公告技术状态 |
| `loading` | 首次读取、5 秒等待、有效 202 后 `queued/running`、写请求提交中 | 保持同一既有 busy/loading 生命周期；不显示 partial/empty/error | 用户可等待或按现有导航离开；无需刷新或重复点击 | polite 状态区在开始时按既有行为公告；每次 poll、重试、退避不重复公告；不抢焦点、不形成焦点陷阱 |
| `empty` | 完整获授权读取后列表为零；WB-003 子集合为空；COM-004 联系字段为 null；MAT-002 `primaryFile=null` | 列表返回完整空分页；WB-003 仍显示用户与零统计；无文件项仍是可识别素材 | 保留现有清筛选/导航；无文件下载动作保持不可用 | 只公告一次真实空结果；后台刷新不跳焦；不得把 401/403/5xx 映射为空 |
| `error` | 无合格 LKG 的终态 `failed/expired`、schema、baseline、名称投影、上游或写冲突错误 | 结束 loading，使用结构化安全错误；首页不显示新 partial | 后续独立读取按 LKG 或新任务恢复；写失败保留现有表单/上下文；旧任务不复用 | 错误按现有 alert/status 公告一次；内部重试不提前公告；不自动跳转或循环聚焦 |
| `disabled` | COM-005 停用项被过滤；既有控件因无文件、无版本、写通道或原业务条件不可操作 | 不新增页面级 disabled；不返回停用字典项；无文件素材明确 `canDownload=false` | 仅保留既有启用条件；后端权限拒绝仍用 403，不伪装 disabled | 维持现有 Tab 顺序及原生/语义化 disabled；不可视觉禁用但仍触发请求 |
| `permission-denied` | 已登录但 operation 权限、owner、data scope、联系人 self-only、审批角色或同源下载校验失败 | 不释放缓存、LKG、快照、任务结果、联系方式或文件；不显示空集合 | 不自动重试；沿用现有访问受限/返回路径 | loading 结束；现有访问受限区公告一次并按现有逻辑聚焦其标题；拒绝内容不进入后续 Tab 顺序 |

HTTP 401 继续进入既有 authentication-required 流程，不归并为 `empty`、一般 `error` 或已登录的 `permission-denied`。服务 `warming/not ready` 是流量与运维状态，不新增用户页面状态。

## 8. 无障碍与焦点保持要求

这些要求只约束后端结果不要破坏既有前端行为，不授权实现新 UI：

- 初始请求、202、`queued/running` 和自动完成构成一个连续 busy 生命周期；后端不得通过反复切换 200/202、`syncId` 或错误码造成重复 live-region 公告。
- fresh/LKG 命中和后台静默刷新不移动焦点、不触发新 busy 公告、不清空当前可访问树。
- `completed` 只引发一次既有终态内容更新；不追加“缓存命中”“同步完成”或任务编号公告。
- `empty`、`error`、403 与写动作成功/失败继续由现有页面的 `role="status"`、`role="alert"`、`aria-live` 与状态边界承载；后端 message 必须安全、稳定、可理解，不输出内部诊断。
- 收藏、申请和下载动作完成后，焦点保留在现有触发控件或遵循既有页面的结果焦点恢复；API 响应不得要求打开新对话框或新任务页面。
- 页面离开时，前端可取消本页等待；服务端任务可以受控完成，但不得主动拉回用户、泄漏到下一身份/范围或让旧 loading 跨页面残留。
- 现有实现是否在真实 empty、disabled、403、写冲突和读屏矩阵中满足上述行为，必须由 Web QA 验证；不满足时记录独立前端缺陷，不得在本后端任务中暗改。

## 9. Web 与移动端差异

- Web 是唯一声明平台。继续使用现有 Vue 路由、页面数据源、同源 session、自动轮询、状态边界、键盘顺序和浏览器下载行为。
- 桌面与窄 Web 的布局、指针、键盘、返回、滚动及响应式行为保持现状；本交接不定义视觉或断点变化。
- Mobile / uni-app 未声明，全部为不适用；不得据此宣称移动端支持这些接口、轮询、焦点、公告或下载行为。

## 10. 可验收交互清单

- [ ] 首次冷读 5 秒内得到完整 200，或仅批准 operation 得到包含有效单一 `syncId` 的 202；无手动刷新。
- [ ] 等价并发请求合并到同一任务；任何一个 operation 的 poll 始终使用首次 202 的同一 `syncId`，且不重跑业务请求。
- [ ] 任务从原请求 received time 起 25 秒内完成或结构化终止；`completed.result` 可被既有前端直接消费。
- [ ] 每个 cold completion 后同六维键复读在 1 秒内完整 200，不再次 202。
- [ ] fresh hit 与合格 LKG 都是完整 200；LKG 带固定 stale metadata，刷新失败不清空当前结果。
- [ ] 首页只发布五段完整原子结果；当前客户端可识别旧 partial 不代表后端允许返回 partial。
- [ ] APP-001/002/003 所有人员/部门 Name 为正式名称或合同允许的合法空值，绝不等于回退 ID。
- [ ] 直接响应验收证据覆盖两条投影失败分支：飞书读取成功但必需正式名称仍不可解析时，脱敏响应及 contract assertion 证明 HTTP 422、`NAME_PROJECTION_INCOMPLETE`、`retryable=false`；临时名称查找故障则证明保留具体批准 upstream code/status 与 retryability。两者均断言无 ID-as-name、partial APP success 或 empty success。
- [ ] 同步终态验收证据覆盖同两条分支：脱敏 poll 样本及 contract assertion 证明 HTTP 200 `state="failed"` 且无 `completed.result`；`failed.error` 分别保留 422/`NAME_PROJECTION_INCOMPLETE`/`retryable=false` 或具体批准 upstream code/status/retryability，并断言不产生 ID-as-name、partial APP success 或 empty success。
- [ ] COM-004 只返回当前用户；selected-other 固定 403；原始联系方式不进入共享/持久缓存、日志或他人任务。
- [ ] COM-005 不返回测试、初始化或停用项；baseline 缺失固定 503，而不是空字典。
- [ ] WB-003 空统计/消息/待办仍返回当前身份、零值与空数组，且 User A/B 结果隔离。
- [ ] FAV-002 只返回当前用户 APP 收藏；FAV-003/004 返回稳定 `favoriteId/version`，重放和冲突语义固定。
- [ ] APP-005 成功返回稳定申请 ID、`PENDING` 与版本；权限、审批、幂等和审计不被削弱。
- [ ] MAT-002 明确 file/null；MAT-003 只发同源 grant；无文件、错配、权限和同源失败不释放内容。
- [ ] 401、403、400、409、502/503/504 分别进入正确既有承载，不被转换为空、disabled 或成功。
- [ ] normal/loading/empty/error/disabled/permission-denied 在真实 Web 环境完成公告与焦点验证；未执行项不得记录通过。
- [ ] 前序 P1/P2 的 abort+drain、终态关联及确定性 retry/deadline/concurrency/order 证据全部关闭。
- [ ] 前端源码、根 `dist`、路由、组件、样式、文案和视觉资源在本任务 diff 中为零变化。

## 11. 开放问题、已知兼容边界与证据门禁

### 11.1 范围问题

无剩余开放产品或交互问题。性能协议、COM-004 self-only、contract v2、字典方案 B、首页原子/LKG/abort+drain 及依赖缺失效果均已由 scope approval 冻结；下游不得静默重新解释。

### 11.2 已知兼容边界

- 现有 [OnboardingApplyPage.vue](../../../../src/pages/OnboardingApplyPage.vue) 会查询所选其他接入人的 COM-004 联系方式；批准范围要求该调用被 403 拒绝。此已知回归不在本任务内通过放宽隐私或修改前端解决。
- 现有 page request plan 仍包含目录式 COM-004 用法，且部分调用带当前 v2 不接受的筛选字段。工程和 QA 必须按批准 schema 将其识别为固定合同拒绝；不得扩展 self-only schema 来让目录读取“继续工作”。
- 当前 homepage client 仍能识别旧 `aggregateState="partial"`；服务端 v3 必须永不发出该值。前端的宽容解析不构成产品授权。
- 当前机器合同对 metadata、错误字段、favorite version、MAT-002 typed item 和写 operation-specific 字段仍不够严格；开发必须升级 schema 与测试，而不是让 UX handoff追认现状。

### 11.3 证据门禁

- 闫瑾批准的正式字典 canonical JSON/version/SHA-256 未到位时，COM-005 live QA 为 `blocked/not executed`，release blocked；本地 fixture 只证明摄取能力。
- 人员、部门、手机号、邮箱和附件权限 snapshot 未到位时，对应 live 联系人、名称与下载验收 blocked；不得以 mock 通过代替。
- User A/User B 身份、角色、Org、data scope 与预期记录矩阵未冻结时，跨用户、收藏、WB、任务 owner、APP-005 与性能 live QA blocked。
- 固定 Base、数据快照、候选包 SHA、10 个 normalized inputs、5 cold/30 warm/30 common-read 和同键复读原始结果未形成前，不得声称性能成功。
- 前序 code review 三项 finding 未由 fresh independent review 关闭前，QA/release blocked。

## 12. 供设计批准的关键交互决策

1. 现有 Web 页面与操作不变；后端以完整 200、一次 202 handoff、同一 `syncId` poll 和自动 `completed.result` 适配既有流程。
2. fresh 与合格 LKG 都直接服务完整数据；LKG 明确 stale metadata，但对用户静默刷新，不新增提示或 loading。
3. 首页五段保持原子；独立 operation 失败隔离；终态前必须 abort+drain，旧失败任务不得复用。
4. 正式名称不得由 ID 回填；COM-004 坚持 self-only，即使既有 selected-contact 自动回填因此被拒绝。
5. empty、disabled、permission-denied、无文件和 error 保持互斥，不能用成功空数据掩盖权限、baseline、投影或上游失败。
6. 收藏、申请、个人中心与下载继续使用既有入口、状态区和焦点/公告行为；后端提供稳定 ID、版本、幂等、安全隔离与同源文件合同。

