# Functional QA Report

- **Task:** `DEH-SERVER-CACHE-20261008`
- **Result:** `blocked`
- **Report path:** `.ai-team/tasks/DEH-SERVER-CACHE-20261008/functional-qa-report.md`

## Environment

- **Build/version:** 测试环境 `https://test-pre-demo-seaoil.xdata.work/test2/`，2026-10-10 对 repair attempt 2 的新后端部署执行现场复测；部署包 SHA-256 按工程交接为 `e42e975ecd5c35e139605bda8ee84a87a660fe285be4d72793a10eab80b63961`，健康接口未返回独立后端版本号。远端仍加载 `index-DXAkqQzp.js`、`index-CXaQKSzy.css`。
- **Runtime, device, browser, or test account:** Windows 现场 QA 客户端；PowerShell/Node HTTP 客户端；Microsoft Edge + Playwright CDP。已使用产品负责人提供的 Nginx Basic Auth，并由产品负责人于 2026-10-10 扫码建立有效飞书 OAuth 业务会话；测试使用专用临时浏览器配置，不复用日常浏览器状态。测试结束后已清除 Cookie（复核为 0）、local/session storage 并关闭浏览器。
- **Permissions/configuration:** Nginx Basic Auth 与飞书 OAuth 双层认证均通过。当前授权账号可读取应用中心正式数据，但未确认其与固定逻辑身份 `CACHE_TEST_STANDARD` 的映射；仍缺少 `CACHE_TEST_ADMIN`、`CACHE_TEST_REVOKED`、测试 Base 锁定信息及服务器只读 shell 证据。
- **Evidence:** 2026-10-09 既有 QA 证据和 2026-10-10 repair attempt 2 现场记录；`.ai-team/tasks/DEH-SERVER-CACHE-20261008/prd.md`；`.ai-team/tasks/DEH-SERVER-CACHE-20261008/design/ux-handoff.md`；`.ai-team/tasks/DEH-SERVER-CACHE-20261008/engineering-handoff.md`。新部署 live/ready 均 HTTP 200；但正式验收仅 4/5 首页冷任务完成，10 次首页暖请求 0 次直接 HTTP 200，状态查询仍出现 HTTP 500，页面最终显示“当前页面使用受控代理数据。数据更新失败”。

## 2026-10-10 Repair Attempt 2 Post-deploy Retest

| Check | Expected | Actual | Result |
| --- | --- | --- | --- |
| 首页强制冷读 | 5/5 在 25 秒内得到含五段数据的 `completed.result` | 4/5 完成；第 1 次经过 37.849 秒后失败，状态查询期间出现 HTTP 500 `HOMEPAGE_AGGREGATE_ERROR`，任务错误为 `FEISHU_READ_BUDGET_EXCEEDED`（`COM-001`） | failed |
| 首页暖读 | 至少 27/30 首次响应在 5 秒内 HTTP 200 且完整 | 连续 10 次首次响应均为 HTTP 202，直接命中为 0/10；其中 3 次最终完成、7 次失败。达到 4 次失败后已数学上无法满足 27/30，本轮在第 10 次后停止，避免继续消耗共享服务器和飞书配额 | failed |
| 状态查询合同 | 已存在且有权任务始终 HTTP 200 | 大多数查询为 200，但冷读第 1 次仍出现一次 HTTP 500；不满足“始终 200” | failed |
| 页面自动恢复 | 无需手动刷新即可渲染完整正式数据 | 页面只请求一次 `/api/v1/homepage` 并查询原 `syncId`，但任务以 `FEISHU_READ_BUDGET_EXCEEDED` 失败；45 秒后仍显示“当前页面使用受控代理数据。数据更新失败” | failed |
| 代表 operation | `COM-005`、`APP-002`、`MAT-001`、`WB-003`、`ADM-003` 均能完整返回 | `COM-005` 3.687 秒直接 200；`APP-002`、`MAT-001`、`ADM-003` 经 202→completed；`WB-003` 31.208 秒后 `failed/READ_SYNC_DEADLINE_EXCEEDED` | failed |
| 暖缓存复用抽查 | 完成后相同输入应直接 HTTP 200 | `MAT-001` 2.560 秒 HTTP 200；`APP-002`、`ADM-003` 完成后立即同输入复读仍约 4.9 秒返回 HTTP 202 | failed |
| 未登录安全边界 | Basic Auth 不能绕过飞书登录 | `/api/v1/homepage` HTTP 401 `USER_AUTH_REQUIRED` | passed |

## Required End State

本轮修复不是只消除某个 500、504 或错误文案；最终必须让真实用户在测试环境获得以下完整效果：

1. **有可用缓存时直接返回。** 相同租户、用户、权限、数据范围、operation 和输入命中 fresh/stale 完整缓存后，首次响应必须在 5 秒内 HTTP 200 返回完整正式数据；后台刷新静默进行，不能再次把用户送入 202 任务。
2. **无缓存时自动完成。** 首次请求最多等待 5 秒；未读完则仅创建/复用一个有效运行任务并返回 HTTP 202。前端只查询该任务，所有状态查询均 HTTP 200，任务在 25 秒内进入 `completed` 并携带完整结果，页面自动渲染，无需用户刷新或重新点击。
3. **失败不能污染后续请求。** `failed`、`expired` 或超过预算的任务不得被新的普通请求当作“同步中”复用；有 last-known-good 快照时返回完整旧数据并静默刷新，无快照时新建受控重试任务。任何失败终态都不能长期阻塞同一隔离键。
4. **首页五段必须原子完整。** `COM-001`、`COM-002`、`COM-005`、`WB-001`、`WB-002` 必须全部成功后才写入首页缓存；不能以部分数据、受控代理占位或空白模块冒充成功。
5. **代表接口行为一致。** `COM-005`、`APP-002`、`MAT-001`、`WB-003`、`ADM-003` 完成后必须形成可复用缓存；除批准的强一致 operation 外，相同输入的下一次读取应直接 HTTP 200。
6. **前端用户体验。** 请求运行时保留 loading 气泡；完成后自动消失并显示正式数据。不得出现“正式飞书数据正在首次同步”“数据缺失”，也不能停在“数据更新失败”而要求手动刷新。
7. **安全与资源边界不退化。** 未登录保持 401、无权限/撤权保持 403，权限和数据范围实时校验；CPU、内存、磁盘和同步并发继续遵守已批准上限。

最终发布门槛：5 次强制冷首页读取必须 5/5 在 25 秒内完成；30 次暖首页读取至少 27/30 首次响应在 5 秒内 HTTP 200 返回完整五段数据；所有任务状态查询 0 次 500/504；五个代表 operation 全部取得完整结果并通过立即复读；真实首页无需手动刷新即可显示正式数据。

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-AC-01` | AC-01：TTL 与完整返回 | `executed` | 1. 扫码登录有效飞书账号；2. 先使代表读取任务完成；3. 立即用完全相同输入复读；4. 核对首次状态与完整 schema。 | 存在匹配隔离键的完整 fresh/stale 缓存时，HTTP 200 返回完整 success schema；同一输入不重新进入冷任务。 | repair attempt 2 现场复测中，`MAT-001` 命中缓存并在 2.560 秒 HTTP 200；但刚刚 completed 的 `APP-002` 和 `ADM-003` 以相同输入复读仍分别约 4.890/4.884 秒返回 HTTP 202 并创建新任务；`WB-003` 冷任务还以 `READ_SYNC_DEADLINE_EXCEEDED` 失败。缓存复用合同不稳定。 | `APP-002` trace `trace-ef3396ef-a731-4f30-bc48-cab71f0ad845`；`MAT-001` trace `trace-8c82865d-4c94-47a5-82e9-9e274609ae03`；`ADM-003` trace `trace-6af6f38e-3a34-4c68-bd58-297aa4d3b9ed`；`WB-003` sync `read-ac5134fc-0186-424d-8658-10273bba4c98`。 | high | failed | `DEH-FQA-009` |
| `FQA-AC-02` | AC-02：默认不缓存与强一致 | `executed` | 1. 运行服务器缓存合同测试；2. 运行 36 项正式写治理测试；3. 检查无飞书会话时业务读取。 | 11 项强一致、未列入白名单的读取及登录/权限/审批/写入/幂等/审计绕过业务缓存并实时校验。 | 自动化测试验证强一致和治理路径不走缓存；远端无飞书会话时代表请求均实时返回 401，未被缓存数据绕过。 | `npm run test:server-cache`、`npm run test:business-writes`；远端 trace 示例 `trace-21469587-11a4-4179-ba8a-1fe3dbaafe96`。 | none | passed | none |
| `FQA-AC-03` | AC-03：冷请求合并与查询隔离 | `executed` | 1. 运行缓存合同测试；2. 验证相同六维键 single-flight；3. 验证身份、租户、权限、范围或参数变化时隔离。 | 相同六维键复用同一任务；任一隔离维度不同均不得合并、复用或互查。 | 自动化测试通过，覆盖 single-flight、租户/身份/权限/数据范围隔离及任务查询归属校验。 | `npm run test:server-cache`；`engineering-handoff.md`。 | none | passed | none |
| `FQA-AC-04` | AC-04：任务尝试、退避与终态 | `executed` | 1. 运行同步任务合同测试；2. 核对尝试次数、退避序列和终态保留。 | 最多 3 次总尝试，退避 500ms/1000ms，终态至少保留 10 分钟。 | 自动化测试通过，断言退避 `[500, 1000]`、最多 3 次尝试及 10 分钟终态保留。 | `npm run test:server-cache`；`engineering-handoff.md`。 | none | passed | none |
| `FQA-AC-05` | AC-05：五秒任务接管 | `executed` | 1. 登录后触发 homepage、`APP-002`、`MAT-001`、`WB-003`、`ADM-003`；2. 记录首响应；3. 仅查询返回的任务编号；4. 观察页面与终态。 | 五秒内返回 200 或非 503 任务合同；后台继续并取得完整结果；客户端自动查询任务状态，loading 在终态结束，无需手动刷新。 | 首响应能在约五秒收口为 202，前端也只查询原 `syncId`；但首页用户流最终 `failed/FEISHU_READ_BUDGET_EXCEEDED`，`WB-003` 最终 `failed/READ_SYNC_DEADLINE_EXCEEDED`。页面无需手动刷新即可结束 loading，但无法取得完整正式数据，因此完整接管合同未达成。 | homepage sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；WB-003 sync `read-ac5134fc-0186-424d-8658-10273bba4c98`；页面 45 秒观察记录。 | high | failed | `DEH-FQA-005`, `DEH-FQA-006` |
| `FQA-AC-06` | AC-06：成功空集合与失败对照 | `not executed (blocked): FQA-AC-06` | 1. 使用授权范围确认为零记录的真实身份；2. 完成全部分页；3. 分别制造超时、部分分页和权限失败。 | 完整成功零记录返回 HTTP 200 success-schema 空集合；未完成、超时或权限失败绝不伪装为空集合。 | 自动化合同存在，也已取得普通业务会话，但缺少可控制且能证明完整分页成功的零记录权限范围，未执行现场空集合对照。 | PRD AC-06；`npm run test:server-cache` 仅作为实现级证据。 | none | blocked | none |
| `FQA-AC-07` | AC-07：权限撤销 | `not executed (blocked): FQA-AC-07` | 1. `CACHE_TEST_REVOKED` 预热缓存；2. 撤销权限/数据范围；3. 再读数据并查询旧任务。 | 实时拒绝或收窄，不返回旧授权数据，不允许查询旧隔离范围任务。 | 未提供可撤权测试用户及权限配置，不能安全执行真实撤权回归。 | PRD AC-07；测试账号前置条件缺失。 | none | blocked | none |
| `FQA-AC-08` | AC-08：固定性能矩阵 | `not executed (blocked): FQA-AC-08` | 1. 锁定同一 Base；2. 对 homepage、COM-005、APP-002、MAT-001、WB-003、ADM-003 在四场景各执行 30 次；3. 统计完整响应和 5 秒成功率。 | 共 720 个固定样本；有效快照或预热完成后的样本至少 90% 在 5 秒内 HTTP 200 返回完整结果；冷场景单独报告任务终态。 | 完整 720 样本矩阵仍受测试身份/Base 前置条件阻塞；但已执行工程交接要求的首页子集：冷读 4/5 完成，暖读连续 10 次首次响应全部 HTTP 202（0/10 直接 200），已不可能满足 27/30 门槛，故为保护共享服务器和飞书配额提前停止剩余 20 次。当前证据明确不支持“90% 首次五秒完整返回”。 | cold sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477` 等；warm sync `sync-bacb2667-d68d-49ed-a3aa-624d0cb3f371`、`sync-ae297194-54fc-4366-b520-8e0402b7437a` 等；2026-10-10 现场记录。 | high | blocked | `DEH-FQA-009` |
| `FQA-AC-09` | AC-09：测试 Base 锁定 | `not executed (blocked): FQA-AC-09` | 1. 读取测试 Base 标识；2. 记录每张相关表完整记录数和总计；3. 测试前后复核无变化。 | 六代表项和四场景共用同一 Base，记录数固定；变化则整轮作废重测。 | 未提供测试 Base 标识、表清单及只读计数权限，无法建立合法性能基线。 | PRD AC-09；测试环境前置条件缺失。 | none | blocked | none |
| `FQA-AC-10` | AC-10：容量降级保持完整合同 | `executed` | 1. 运行容量边界与 LRU 自动化测试；2. 核对 2.4GB/2.85GB/3GB 阈值；3. 核对代表项和 schema 保护。 | 按固定顺序清理和 LRU；2.85GB 停止新增快照；不超过 3GB；不删 schema 字段或代表 operation。 | 自动化测试通过，覆盖阈值、LRU 淘汰顺序、代表项保护和 schema 完整性。 | `npm run test:server-cache`；`engineering-handoff.md`。 | none | passed | none |
| `FQA-AC-11` | AC-11：专用运行身份与快照恢复 | `not executed (blocked): FQA-AC-11` | 1. 检查远端 systemd User/Group；2. 检查缓存目录/文件 owner、mode；3. 重启恢复快照；4. 演练原子写失败和回滚。 | `seaoil-deh:seaoil-deh`、目录 0700、文件 0600；重启可恢复；失败不破坏旧快照；回滚同身份。 | 部署交接声称已配置并 ready，但本 QA 无服务器只读 shell 证据，未独立检查权限、重启恢复或回滚。 | 用户提供的部署摘要；PRD AC-11；远端 ready HTTP 200。 | none | blocked | none |
| `FQA-AC-12` | AC-12：正式写与缓存一致性 | `not executed (blocked): FQA-AC-12` | 1. 用获准业务身份提交不含 `TEST_` 的正式写；2. 重放同一幂等请求；3. 核对飞书副作用、审计和相关/无关缓存。 | 不因缺少 `TEST_` 拒绝；远端副作用一次；成功精确更新/失效相关缓存；失败不污染缓存；测试入口仍隔离。 | 36 项自动化治理测试通过，但未获得可执行真实写入的飞书测试身份、审批数据和测试记录，未对真实业务表写入。 | `npm run test:business-writes`；PRD AC-12。 | none | blocked | none |
| `FQA-AC-13` | AC-13：资源、安全与交付 | `not executed (blocked): FQA-AC-13` | 1. 检查 systemd 限额和实时 CPU/RSS；2. 检查缓存磁盘和并发；3. 扫描包、缓存、日志、备份和回滚包；4. 核对交付与回滚。 | ≤1.5 CPU、≤2GB 内存、≤3GB 磁盘、同步并发≤3；不含敏感信息/附件/正式快照；交付和回滚材料完整。 | 本地配置和包安全自动化测试通过，包 SHA-256 已核对；远端 health 正常。但缺少服务器侧实时资源、缓存目录、日志/备份及回滚演练的独立只读证据。 | `npm run test:server-cache`；部署包 SHA-256；远端 health；PRD AC-13。 | none | blocked | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-VAL-01` | Nginx Basic Auth 边界 | `executed` | 1. 不带 Basic Auth 请求测试地址；2. 带产品负责人提供的凭据请求。 | 无凭据返回 401 和 Basic challenge；合法凭据可访问 SPA 与健康接口。 | 无凭据返回 401；合法凭据下 `/test2/`、live、ready 均 HTTP 200。 | 2026-10-09 HTTP 现场记录。 | none | passed | none |
| `FQA-VAL-02` | 飞书业务会话不可被 Basic Auth 绕过 | `executed` | 1. 仅带 Basic Auth；2. 请求 session、homepage 和五个代表 operation。 | 未建立飞书 OAuth 会话时拒绝业务数据，不返回缓存内容。 | session、homepage、COM-005、APP-002、MAT-001、WB-003、ADM-003 均返回 HTTP 401 `USER_AUTH_REQUIRED`。 | trace：`trace-21469587-11a4-4179-ba8a-1fe3dbaafe96`、`trace-155bea9a-c5ce-46d0-91b7-20bd3bfc7949`、`trace-e0d24ef6-0b6c-4dc3-97b7-229f548e2394`、`trace-2674c701-090e-4860-b972-562de861be7a`、`trace-491e4add-38df-404d-8842-8f08bfdad8fe`、`trace-77383df1-bcaf-48b4-9f6f-5011882635f0`。 | none | passed | none |
| `FQA-VAL-03` | 标准用户身份与数据范围 | `not executed (blocked): FQA-VAL-03` | 1. 登录 `CACHE_TEST_STANDARD`；2. 核对租户、用户、权限集合及数据范围；3. 请求普通代表项。 | 只返回当前授权范围内完整正式数据。 | 产品负责人扫码建立的真实会话已读取应用中心 88 条数据，`WB-003` 返回姓名“关胜”和部门“董事长办公室”；但未提供该账号与固定逻辑身份 `CACHE_TEST_STANDARD` 的映射、期望权限集合及期望数据范围，无法完成边界核对。 | `deh-retest-apps-resolved-20261009.png`；trace `trace-c642ac24-ca2c-48e1-9523-b9f94157e56f`；PRD 2.5。 | none | blocked | none |
| `FQA-VAL-04` | 管理员 operation 权限 | `not executed (blocked): FQA-VAL-04` | 1. 登录 `CACHE_TEST_ADMIN`；2. 请求 ADM-003；3. 对照非管理员。 | 管理员成功；非管理员得到权限拒绝且不泄露数据。 | 当前授权会话的 `ADM-003` 已完成并返回 1 条审计记录，暖读 3.679 秒 HTTP 200；但该账号未映射为固定 `CACHE_TEST_ADMIN`，也没有非管理员对照会话，因此权限边界仍不能验收。 | sync `read-ae45a186-447e-4dd9-9cec-5f7cff2334bf`；trace `trace-253f9e25-fa2f-4c40-9bc7-6a5eb27d38e1`；PRD 2.5、AC-08。 | none | blocked | none |
| `FQA-VAL-05` | 撤权身份和旧任务归属 | `not executed (blocked): FQA-VAL-05` | 1. 登录 `CACHE_TEST_REVOKED` 并预热；2. 撤权；3. 查询缓存和旧任务。 | 撤权后拒绝/收窄，旧任务不可查。 | 未提供可撤权身份和权限管理前置条件。 | PRD AC-07。 | none | blocked | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-STATE-01` | `normal` | `executed` | 1. 登录；2. 进入应用中心；3. 等待 batch 与卡片详情任务完成；4. 核对数据数量及提示文案。 | 完整渲染；无缓存来源、首次同步或额外成功气泡。 | `APP-002` 返回 88 条，页面显示“全部应用 88 个”；完成后无 loading，未显示“正式飞书数据正在首次同步”或“数据缺失”。 | `deh-retest-apps-resolved-20261009.png`；APP-002 HTTP 200、items=88。 | none | passed | none |
| `FQA-STATE-02` | `loading` | `executed` | 1. 进入应用中心触发 10 个强一致 `APP-004`；2. 观察首次 202、两轮同任务状态查询及最终页面；3. 对照首页失败终态。 | 运行期间只显示现有 loading；轮询不重复创建用户提示；任务终态后 loading 结束且不跨页面残留。 | 页面显示既有“正在处理 10 项请求”气泡；状态查询超时后自动复用同一任务编号继续查询，完成后气泡自行消失。首页失败终态也结束 loading。 | `deh-retest-apps-20261009.png`、`deh-retest-apps-resolved-20261009.png`；应用中心 24 条 task-status 资源记录。 | none | passed | none |
| `FQA-STATE-03` | `empty` | `not executed (blocked): FQA-STATE-03` | 使用确认零记录的数据范围完成全部分页。 | 显示真实空态，不显示同步中、数据缺失或错误。 | 缺少可验证零记录的授权身份和 Base。 | UX handoff 5 `empty`。 | none | blocked | none |
| `FQA-STATE-04` | `error` | `executed` | 1. 登录并加载首页；2. 等待任务进入 `failed`；3. 观察页面和 loading。 | 终态失败结束 loading，并显示现有结构化错误状态；不伪装空态或继续等待。 | 首页任务 `failed/READ_SYNC_DEADLINE_EXCEEDED` 后页面显示既有“当前页面使用受控代理数据。数据更新失败”，loading 已结束，未伪装为空态。 | `deh-retest-home-20261009.png`；sync `sync-5f4cc9ee-1f88-41c6-9221-6f77467437f1`。 | none | passed | none |
| `FQA-STATE-05` | `disabled` | `not executed (blocked): FQA-STATE-05` | 在登录后触发既有业务禁用条件并同时观察缓存刷新/轮询。 | 仅既有业务规则可禁用；缓存和轮询不新增 disabled；控件不可误触。 | 已登录普通业务页面，但没有可安全触发且已知预期的既有禁用业务条件。 | UX handoff 5 `disabled`。 | none | blocked | none |
| `FQA-STATE-06` | `permission-denied` | `not executed (blocked): FQA-STATE-06` | 已登录但无权限或撤权后读取并查询旧任务。 | HTTP 403；停止返回缓存/旧结果；不泄露任务；进入访问受限路径。 | 已取得普通业务会话，但没有已登录无权限/撤权对照身份，不能用未登录 401 或当前账号的 202 代替 403 验收。 | UX handoff 5 `permission-denied`。 | none | blocked | none |
| `FQA-STATE-07` | `authentication-required` | `executed` | 1. 仅通过 Basic Auth 进入站点；2. 请求 session 和业务 operation；3. 观察浏览器跳转。 | HTTP 401 走现有登录/重新授权路径，不渲染业务数据或空态。 | 业务请求返回 401 `USER_AUTH_REQUIRED`，浏览器进入飞书 OAuth 二维码登录页。 | `C:\Users\20266\AppData\Local\Temp\deh-live-login-qr.png`；远端 trace。 | none | passed | none |
| `FQA-STATE-08` | `recovery` | `executed` | 1. 执行 5 次首页强制冷读；2. 顺序执行首页暖读；3. 重新加载真实首页用户流；4. 全程不手动刷新并等待终态。 | 临时慢读取自动轮询到完整数据并恢复可用状态；后续读取命中缓存。 | repair attempt 2 下冷读仅 4/5 完成；暖读前 10 次均未命中、7 次终态失败；真实页面自动轮询原任务后以 `FEISHU_READ_BUDGET_EXCEEDED` 结束，45 秒后仍显示“当前页面使用受控代理数据。数据更新失败”。 | cold sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；UI sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；trace `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74`。 | high | failed | `DEH-FQA-005` |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-REG-01` | 服务存活与就绪接口 | `executed` | 1. 通过公网 Basic Auth 请求 live/ready；2. ready 连续请求 5 次。 | 均 HTTP 200；ready 为可用状态且无间歇失败。 | live/ready HTTP 200；ready 5/5 成功，耗时 364–1405ms，均 `ready=true`。 | trace `trace-c0a0f261-d4b0-47bf-bcc8-9c5618a29727` 至 `trace-625d96af-f1f8-4158-8b1d-660fdb4abdd0`。 | none | passed | none |
| `FQA-REG-02` | 当前前端部署产物一致性 | `executed` | 1. 从远端入口读取资产文件名；2. 在内存中下载 JS/CSS；3. 与本地当前 `dist` 比较字节数和 SHA-256。 | 远端运行当前已构建前端，确保 504/500 同任务重试与 loading 修复已部署。 | 远端 `index-DXAkqQzp.js` 1,022,236 bytes、`index-CXaQKSzy.css` 289,932 bytes，与本地当前 `dist` 字节数和 SHA-256 完全一致。 | JS SHA-256 `5237c5446586457f3c4ab1f7008af45e7abed4ef45654230d28a1b7f28000f9d`；CSS SHA-256 `43bb856bc440c43e29fac6027966d61cc2131f095a72bfa4b9d18f95261d9a48`。 | none | passed | none |
| `FQA-REG-03` | 飞书 OAuth 跳转 | `executed` | 1. 访问站点；2. 等待 session 401；3. 观察授权入口。 | 未登录用户进入现有飞书授权流程，不停留在接口错误页。 | 浏览器正常跳转飞书二维码授权页。 | `C:\Users\20266\AppData\Local\Temp\deh-live-login-qr.png`。 | none | passed | none |
| `FQA-REG-04` | 五秒超时后的自动轮询与完整结果 | `executed` | 1. 登录后重新加载首页；2. 记录 homepage 首次响应；3. 观察是否只查询原 `syncId`；4. 等待 45 秒并核对页面。 | 首次响应非 503 且含任务合同；前端只查任务状态并自动取得完整结果，无手动刷新。 | 前端行为正确：只发送一次 `POST /api/v1/homepage`，随后查询原 `syncId`；但服务端返回 202 时已复用失败任务，状态查询 HTTP 200 后得到 `failed/FEISHU_READ_BUDGET_EXCEEDED`，页面未得到正式数据。 | sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；task trace `trace-ef0f74b1-92d6-4b63-a2db-24b65e6643a0`。 | high | failed | `DEH-FQA-006` |
| `FQA-REG-05` | 页面离开/取消后的 loading 清理 | `executed` | 1. 等待首页失败终态；2. 导航到应用中心；3. 观察全局请求提示；4. 等待应用中心任务完成。 | 导航不阻塞；旧页面 loading 不残留；新页面仅展示自身请求活动并在终态清除。 | 首页终态已清除其 loading；应用中心只显示自身 10 项请求，完成后自动消失，无需整页重载。 | `deh-retest-home-20261009.png`、`deh-retest-apps-20261009.png`、`deh-retest-apps-resolved-20261009.png`。 | none | passed | none |
| `FQA-REG-06` | loading、错误、空态和权限状态的焦点/读屏 | `not executed (blocked): FQA-REG-06` | 用键盘及读屏依次触发 loading、normal/empty/error/permission-denied。 | loading 起始和终态各公告一次；轮询不重复；终态焦点符合既有 PageStateBoundary。 | 已取得普通会话并观察 normal/loading/error 视觉状态，但缺少可控 empty、disabled、permission-denied 场景及读屏运行环境，无法执行完整无障碍矩阵。 | UX handoff 7、10。 | none | blocked | none |
| `FQA-REG-07` | 已存在任务的状态查询合同 | `executed` | 1. 触发 homepage 202；2. 使用同一 `syncId` 查询状态；3. 记录每次 HTTP 状态和终态。 | 已授权任务状态查询始终 HTTP 200，body state 为 queued/running/completed/failed/expired；上游慢不得直接破坏状态合同。 | repair attempt 2 已消除本样本中的 504，但首个冷任务轮询仍出现一次 HTTP 500 `HOMEPAGE_AGGREGATE_ERROR`，之后才以 HTTP 200 返回 failed；“始终 200”仍未满足。 | sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；HTTP 500 trace `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb`；task trace `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74`。 | medium | failed | `DEH-FQA-008` |

## Defects

| ID | Failed Check Reference | Criterion or Scope | Environment | Preconditions and Steps | Expected | Actual | Evidence | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DEH-FQA-005` | `FQA-STATE-08` | 首页完整数据恢复 | 测试环境，repair attempt 2，已登录飞书用户，Edge | 1. 顺序执行 5 次 `forceRefresh=true`；2. 仅轮询每次返回的 `syncId`；3. 重新加载真实首页并等待 45 秒。 | 5/5 冷任务在 25 秒内 completed；真实页面无需刷新即可渲染完整首页数据。 | 仅 4/5 冷任务完成；第 1 次 37.849 秒后失败，错误为 `FEISHU_READ_BUDGET_EXCEEDED`（`COM-001`）。真实页面仍进入相同失败链路并显示“当前页面使用受控代理数据。数据更新失败”。 | cold sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；UI sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；task trace `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74`。 | high |
| `DEH-FQA-006` | `FQA-REG-04` | 首页自动轮询取得完整结果 | 测试环境，repair attempt 2，已登录飞书用户，Edge | 1. 重新加载首页；2. 记录一次 homepage POST；3. 确认后续只查询同一 `/sync-jobs/{syncId}`；4. 等待终态。 | 自动轮询在不重发原请求、不手动刷新的情况下取得完整结果。 | 前端没有重发原 POST，说明前端轮询行为正确；但后端 202 直接复用了一个失败任务，随后返回 `failed/FEISHU_READ_BUDGET_EXCEEDED`，无法渲染正式数据。 | sync `sync-ae297194-54fc-4366-b520-8e0402b7437a`；trace `trace-ef0f74b1-92d6-4b63-a2db-24b65e6643a0`。 | high |
| `DEH-FQA-008` | `FQA-REG-07` | 任务状态查询稳定合同 | 测试环境，repair attempt 2，已登录飞书用户，Edge | 1. 创建 homepage sync task；2. 连续查询同一 task；3. 记录每次 HTTP 状态和终态。 | 已存在且有权访问的 task status 始终 HTTP 200，并用 body state 表达运行或终态。 | repair attempt 2 中仍有一次状态请求返回 HTTP 500 `HOMEPAGE_AGGREGATE_ERROR`，之后才以 HTTP 200 返回 failed；旧 504 表现虽然未在该样本复现，合同仍未修复。 | sync `sync-9d28d97d-03ee-458e-8a13-cb71747de477`；HTTP 500 trace `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb`。 | medium |
| `DEH-FQA-009` | `FQA-AC-01`, `FQA-AC-08` | 暖缓存未形成或未被复用 | 测试环境，repair attempt 2，已登录飞书用户，Edge | 1. 先让首页/代表 operation 任务 completed；2. 立即用相同身份和输入复读；3. 统计首次 HTTP 状态。 | completed 后写入匹配隔离键的完整缓存；下一次相同读取在 5 秒内直接 HTTP 200。 | 首页连续 10 次暖读首次状态全部为 202（0/10 直接 200）；`APP-002` 和 `ADM-003` completed 后立即复读也再次 202，仅 `MAT-001` 直接 200。失败任务还会被后续请求重复复用，导致页面持续失败。 | homepage warm sync `sync-bacb2667-d68d-49ed-a3aa-624d0cb3f371`、`sync-ae297194-54fc-4366-b520-8e0402b7437a`；operation trace `trace-ef3396ef-a731-4f30-bc48-cab71f0ad845`、`trace-6af6f38e-3a34-4c68-bd58-297aa4d3b9ed`。 | high |

## Unresolved Blockers

- `FQA-AC-06`: 缺少可确认零记录的真实授权范围及失败对照环境。
- `FQA-AC-07`: 缺少 `CACHE_TEST_REVOKED` 身份及可撤权配置。
- `FQA-AC-08`: 缺少标准/管理员测试身份、锁定 Base 和四场景控制，无法执行 720 个固定性能样本。
- `FQA-AC-09`: 缺少测试 Base 标识、相关表清单、完整记录数及只读计数权限。
- `FQA-AC-11`: 缺少服务器只读 shell 证据，无法独立核验运行身份、文件权限、快照恢复和回滚。
- `FQA-AC-12`: 缺少获准的真实写入身份、审批/幂等测试数据和可清理测试记录。
- `FQA-AC-13`: 缺少服务器侧实时资源、缓存目录、日志/备份扫描和回滚演练证据。
- `FQA-VAL-03`: 未取得 `CACHE_TEST_STANDARD` 的飞书 OAuth 会话。
- `FQA-VAL-04`: 未取得 `CACHE_TEST_ADMIN` 及非管理员对照身份。
- `FQA-VAL-05`: 未取得 `CACHE_TEST_REVOKED` 及撤权操作条件。
- `FQA-STATE-03`: 无已确认零记录权限范围，不能验证真实空态。
- `FQA-STATE-05`: 无已登录业务页面和既有禁用条件，不能验证 disabled。
- `FQA-STATE-06`: 无已登录无权限/撤权身份，不能验证 HTTP 403 permission-denied。
- `FQA-REG-06`: 无可进入完整业务状态矩阵的身份和角色，不能执行焦点与读屏回归。

## QA Boundary

本报告是本轮 Functional QA 唯一写入。QA 未修改实现、测试、构建、交接、审批、`task.json`、任务状态或服务器；未执行发布、部署、合并、真实写入、撤权或高并发压测。Cross-platform QA 仍负责平台兼容性矩阵。
