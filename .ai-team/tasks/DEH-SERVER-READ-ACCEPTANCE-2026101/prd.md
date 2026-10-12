# Product Requirements — DEH-SERVER-READ-ACCEPTANCE-2026101

## 1. Product goal and target user value

**Fact.** 已授权用户进入或刷新数智产品展厅时，应自动取得完整正式数据；缓存存在时近即时返回，完全冷读超过五秒时只交接一个后台任务并自动完成，不要求人工刷新。

**Fact.** 本任务只修改现有 Vue Web 项目的 Node 后端、机器合同、后端测试和纯后端部署包，不修改前端源码或 dist。

## 2. Facts, assumptions, and evidence

### Facts

- 2026-10-10 测试环境中，首页同一用户连续两次请求分别约 5.389 秒、4.874 秒返回 202。
- COM-003、COM-005、APP-002、MAT-002、FAV-002 在已经执行过同步后仍返回 202；APP-001、MAT-001 可快速返回 200。
- COM-001 同步任务最终返回 `READ_SYNC_DEADLINE_EXCEEDED`，个人中心持续 loading。
- COM-004 页面初始化使用目录分页参数；当前后端只允许 `userId + includeContact=true`，并拒绝分页参数，合同互相冲突。
- COM-005 最终结果已有九种 enabled 应用类型，但申请页在 30 秒内未获得应用类型和业务域。
- APP0076 详情在 35 秒内未取得 APP-003 正式数据。
- 前端已能复用同一个 syncId 自动轮询；本任务不通过修改前端规避后端缺陷。

### Assumptions requiring live confirmation

- 测试账号具备读取其授权人员、部门、字典、应用和素材元数据的飞书权限；缺失权限必须返回明确权限错误，不能伪造数据。
- APP0076 在飞书正式数据中存在且当前账号有权读取；若源记录不存在，真实 QA 应提供脱敏源数据证据。
- 测试服务器上的 runtime-cache 目录持续可写，且 systemd 仍使用既有 `seaoil-deh` 用户和资源限制。

## 3. Scope boundaries

### In scope

1. 统一六维缓存键：tenant、canonical user、权限集合、数据范围、operation、规范化输入。
2. success schema 校验后，原子写入内存缓存和持久快照，再把任务标记 completed。
3. fresh/stale/LKG 命中直接 HTTP 200；stale/LKG 后台静默刷新，刷新失败继续服务最近合法缓存。
4. 真冷读最多同步等待约 4.5 秒；未完成返回 202 和唯一运行 syncId，后台在 25 秒内进入终态。
5. failed/expired 任务退出合并索引；新请求不得复用失败任务。状态查询不重新执行业务 operation。
6. 修复首页、COM-001、COM-003、COM-005、APP-002/003、MAT-002、FAV-002 的缓存形成、恢复与最终结果。
7. COM-004 双模式兼容：
   - 目录模式：`includeContact` 未提供或为 false，支持现有分页/排序输入，只返回当前授权范围内的 userId、employeeNo、displayName、departmentId、departmentName；不得返回手机号或邮箱。
   - 本人联系方式模式：`userId + includeContact=true`，目标必须等于当前授权用户；允许页面附带分页/排序兼容字段但不扩大查询范围，返回本人 mobile/email。
   - 非本人联系方式继续 403。
8. COM-005 返回正式启用字典；申请页所需应用类型和业务域数据在同步 completed.result 和热缓存中保持同一成功结构。
9. APP-003 从与 APP-001/002 同一正式投影缓存取得 APP0076 详情，并批量解析负责人、开发者及部门名称。
10. 自动化覆盖冷热缓存、持久恢复、任务终态、COM-004 双模式、COM-001、COM-005 和 APP-003；生成纯后端 ZIP 与 SHA-256。

### Out of scope

- 前端源码、dist、页面、交互、样式、路由和提示文案变更。
- 普通目录返回手机号、邮箱或未授权人员。
- ID 充当姓名/部门名、测试字典、代理占位、部分首页或成功空数据冒充正式结果。
- 绕过认证、实时权限、数据范围、审批、幂等、审计、同源下载和资源限制。
- Redis、外部数据库、替换飞书数据源、直接部署服务器或修改正式飞书数据。

## 4. Primary user flow

1. 用户进入页面，后端先完成实时认证、权限和数据范围校验。
2. 后端用六维规范化键查询 fresh、stale 或 LKG。
3. 命中时立即返回 HTTP 200 完整结果；若需要刷新，仅在后台静默刷新。
4. 未命中时启动或合并唯一后台任务，并同步等待最多约 4.5 秒。
5. 任务在预算内完成则直接 HTTP 200；否则返回 HTTP 202、syncId、operationId、正整数 pollAfterMs。
6. 前端只查询该任务。状态接口始终用 HTTP 200 表达 running/completed/failed/expired；completed.result 是完整业务结果。
7. completed 前结果已通过 success schema、内存提交和持久快照 read-back；同键下一请求直接命中 200。
8. failed/expired 不得继续污染合并索引；有 LKG 时后续请求立即服务 LKG，无 LKG 时创建受控新任务。

## 5. State inventory and acceptance criteria

### Success and cache states

- **AC-01** — Given 同一身份、权限、范围、operation 和规范化输入已有 fresh/stale/LKG，When 再次请求，Then 首次响应为 HTTP 200 完整结果，且不返回新的 syncId。
- **AC-02** — Given 冷读以 202 交接，When 后台任务完成，Then 任务在 25 秒内返回 HTTP 200 `state=completed` 与完整 `result`，随后同键请求约 1 秒内 HTTP 200。
- **AC-03** — Given 服务重启前存在合法快照，When readiness 完成，Then 相同请求可实际命中恢复缓存，不重新让全部普通读取冷启动。
- **AC-04** — Given 后台静默刷新失败，When 用户请求仍有未过期 LKG，Then 返回 HTTP 200 LKG，且不让用户重新进入 202。

### Loading and task states

- **AC-05** — Given 完全无缓存且读取超过 4.5 秒，When 初始请求交接，Then 五秒内返回一次 202，包含有效运行 syncId、operationId 和正整数 pollAfterMs。
- **AC-06** — Given 多个同键并发请求，When 后台任务处于 queued/running，Then 所有请求复用同一 syncId，轮询不重新执行原业务 operation。
- **AC-07** — Given 任务已存在且用户有权查询，When 查询状态，Then HTTP 始终为 200，body.state 仅为 queued/running/completed/failed/expired；failed 不得被解析为 completed。
- **AC-08** — Given 任务 failed/expired，When 同键发起新普通请求，Then 不返回旧失败 syncId；有 LKG 返回 200，无 LKG 创建新运行任务。

### Business data states

- **AC-09** — Given 已授权用户加载个人中心，When COM-001/WB-003 完成，Then 30 秒内展示正式姓名、组织和部门；统计为空不影响身份数据成功。
- **AC-10** — Given 页面调用 COM-004 目录模式，When 提供现有 page/pageSize/sort，Then 返回授权范围内可选人员及部门名称，且 mobile/email 不存在或为 null。
- **AC-11** — Given 当前用户调用 COM-004 本人联系方式模式，When 提供自己的 userId、includeContact=true 及兼容分页参数，Then 返回本人联系方式；目标为其他用户时返回 403。
- **AC-12** — Given 申请页加载 COM-005，When 冷任务完成或缓存命中，Then 30 秒内获得九种正式启用应用类型和非空正式业务域，不含 TEST_、初始化或停用项。
- **AC-13** — Given 当前账号有权读取 APP0076，When 请求 APP-003，Then 30 秒内获得完整详情，owner/developer/department 的 Name 均为正式名称且不等于 ID。
- **AC-14** — Given COM-003、COM-005、APP-002、MAT-002、FAV-002 已完成一次，When 立即相同输入复读，Then 返回 HTTP 200 缓存结果，不再返回 202。

### Error, empty, disabled, and permission states

- **AC-15** — Given 飞书源确实无数据，When读取完成，Then 只返回合同允许的真实 empty 结构，不以 loading、代理数据或测试项替代。
- **AC-16** — Given未登录或权限/范围不足，When请求业务数据、目录或任务状态，Then分别保留 401/403，缓存和快照不得绕过实时校验。
- **AC-17** — Given源记录的姓名或部门无法正式解析，When构造 APP 结果，Then隔离该脏记录或返回明确投影错误，不得以编码充当 Name。
- **AC-18** — Given资源限制和磁盘上限，When执行同步、刷新和持久提交，Then继续遵守既有并发、CPU、内存和 runtime-cache 上限。

### Quantitative acceptance

- **AC-19** — 首页冷请求允许首次 202 并自动 completed；完成后连续请求首次响应约 1 秒 HTTP 200。
- **AC-20** — 普通读取样本中至少 90% 首次响应在五秒内返回完整 HTTP 200；完全冷读的 202 不计作完整业务成功。
- **AC-21** — 所有任务状态查询 0 次 HTTP 500/504；COM-001 0 次 `READ_SYNC_DEADLINE_EXCEEDED`。

## 6. Explicit non-goals

- 不修改前端以重复提交业务请求或人工刷新规避缓存缺陷。
- 不把 failed 状态包装为 success，不把部分结果写入首页或 operation 缓存。
- 不因目录需求开放其他用户手机号、邮箱或绕过权限范围。
- 不清理或修改飞书正式数据来让测试通过。
- 不把本地 fixture 结果冒充真实测试环境性能证据。

## 7. Scope approval decisions

需要产品负责人确认：

1. 批准 COM-004 在同一 operation 内按 `includeContact` 区分“授权人员目录”和“本人联系方式”两种模式。
2. 批准本人联系方式模式兼容并忽略页面附带的 page/pageSize/sort，不再把这些字段作为冲突错误。
3. 批准热缓存目标采用“约 1 秒 HTTP 200”，总体普通读取采用“至少 90% 五秒内完整 HTTP 200”。
4. 批准只改后端，前端保持零变更；服务器部署仍由用户执行。
