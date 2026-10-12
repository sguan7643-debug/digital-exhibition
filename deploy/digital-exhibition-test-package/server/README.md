# 数智展厅飞书只读代理

该目录是浏览器与飞书开放平台之间的服务端安全边界。浏览器只调用同源
`POST /api/v1/operations/{operationId}`；首页使用 `POST /api/v1/homepage` 聚合读取并通过
`GET /api/v1/sync-jobs/{syncId}` 查询后台同步状态。浏览器不得直接持有飞书应用密钥、租户令牌、
Base token、tableId、viewId 或 fieldId。

## 服务端环境变量

- `FEISHU_APP_ID`：飞书企业自建应用的 App ID。
- `FEISHU_APP_SECRET`：对应 App Secret，仅允许存在于服务端环境变量或密钥管理系统。
- `FEISHU_BASE_TOKEN`：目标多维表格的 app token，仅允许存在于服务端。
- `FEISHU_UPSTREAM_TIMEOUT_MS`：单次飞书上游请求超时，默认 20000 毫秒。
- `FEISHU_READ_BUDGET_MS`：整表读取预算，默认 35000 毫秒。
- `HOMEPAGE_RESPONSE_BUDGET_MS`：首页聚合请求主动收口时间，固定最高 5000 毫秒。
- `FEISHU_RUNTIME_CACHE_ENABLED`：设置为 `1` 启用持久快照；Linux 测试服务默认启用。
- `FEISHU_RUNTIME_CACHE_DIR`：持久快照目录，测试服务器固定为 `/home/seaoil/pre-demo/runtime-cache/`。
- `FEISHU_RUNTIME_CACHE_OWNER`：运行缓存目录要求的专用账号，服务器固定为 `seaoil-deh`。
- `FEISHU_RUNTIME_CACHE_MAX_BYTES`：持久快照磁盘上限，最大 3221225472 字节（3GB）。
- `FEISHU_MEMORY_CACHE_MAX_BYTES`：业务读取内存缓存总预算，最大 268435456 字节（256MB），由 operation 与短期表投影各使用一半。
- `FEISHU_SYNC_MAX_CONCURRENCY`：飞书同步并发上限，最大为 3。
- `FEISHU_SYNC_TASK_TIMEOUT_MS`：同步任务从创建起的硬截止时间，固定最高 25000 毫秒（包含排队、分页与重试退避）。
- `FEISHU_APP_LAUNCH_ALLOWED_HOSTS`：允许应用启动的 HTTPS 主机名，多个值用逗号分隔。未配置时默认拒绝外部启动，禁止自动信任多维表格中的任意 URL。
- `EXHIBITION_PUBLIC_ORIGIN`：展厅对外访问来源，例如 `https://test-pre-demo-seaoil.xdata.work`。用于多层反向代理未传递原始 Host 时的写请求同源校验；未配置时会使用 `FEISHU_OAUTH_REDIRECT_URI` 的来源作为兜底。
- `FEISHU_BROWSER_TEST_WRITE_ENABLED=1`：仅在本地联调时允许浏览器进入 TEST_ 写代理；默认关闭。
- `FEISHU_OAUTH_EVIDENCE_PATH`：可选的本地验收文件路径。真实 OAuth 回调成功时只记录身份存在性、权限数量和写权限布尔值，不记录姓名、用户 ID、Cookie、授权码或令牌。
- `FEISHU_OAUTH_TEST_WRITE_ACCEPTANCE=1`：仅限本地联调。真实 OAuth 回调后临时创建 `TEST_` 权限，通过正常复合接口执行 `FAV-003`，随后清理收藏记录和临时权限；结果仅以脱敏布尔值写入上述证据文件。

客户端还必须同时设置 `VITE_EXHIBITION_TEST_WRITES_ENABLED=true` 才会显示受控写入面板。两个开关必须同时开启，任一未开启时页面不显示测试写入口，服务端也拒绝写请求。

缺少任意一项时，代理明确返回 HTTP 503 和 `SERVICE_CREDENTIALS_MISSING`，
不会回退到伪造成功或浏览器直连。

## 当前受控范围

65 个读取接口均已建立服务端字段投影与 schema 合同。文件下载使用绑定当前登录用户、
短时有效的同源访问 URL，飞书文件令牌不返回浏览器：

- `COM-004` 用户/负责人选择器 → 用户字典
- `ANN-001` 公告统计/筛选字典、`ANN-002` 公告列表 → 公告通知
- `APP-001` 应用筛选字典、`APP-002` 应用列表 → 应用索引及五张字典表
- `TAL-002` 人才项目列表 → 人才项目
- `TAL-003` 项目进度列表 → 项目进度
- `MAT-002` 素材列表 → 素材中心

分页默认每页 10 条，可选 10、20、50、100。飞书 `page_token` 只在服务端使用；
页面按页码请求，代理不会把上游令牌下发给浏览器。

首页聚合覆盖 `COM-001`、`COM-002`、`COM-005`、`WB-001`、`WB-002`。同一缓存隔离键、operation 和规范化参数只创建一个后台任务；状态查询会实时读取权限但不重跑业务 operation。54 个普通读取 operation 可使用内存或持久快照：经批准的公共投影按租户隔离，用户和管理员数据继续按租户、身份、权限、数据范围、operation 和规范化参数六维隔离；11 个强一致 operation（包括当前用户权限与导航）始终绕过各层缓存。所有缓存返回前都实时复核身份、权限和数据范围。完全无缓存时最多等待飞书 5 秒；超时返回 HTTP 202、`FEISHU_INITIAL_SYNCING`、`syncId` 和 `pollAfterMs`，后台继续同步；只有剩余截止时间足够执行一次完整读取时才会重试，任务从创建起最迟 25 秒进入终态，完成/失败终态至少保留 10 分钟。普通读取不返回“正式飞书数据正在首次同步”等提示文字。

持久快照包含 SHA-256 完整性校验。预计占用达到磁盘额度 80%（3GB 配额下为 2.4GB）时先清理临时文件并按 LRU 淘汰非代表性 operation；达到 95%（2.85GB）或代表性完整结果无法容纳时停止新增快照并保留上一份有效文件，不删减 success schema 字段。

公告通知表当前没有用户已读状态字段，因此只返回公告总数、分类、发布状态、置顶、
发布时间和正文摘要；浏览器中的“全部标为已读”保持禁用，不用发布状态伪造已读状态。

## 仍需外部闭合的边界

- 12 个当前用户接口需要飞书应用登记 OAuth 回调并完成真实用户登录证据；没有用户会话时统一返回 401。
- operation registry 当前共 101 项：65 个只读接口与 36 个正式业务写接口。
- Vite 中间件只服务本地开发与 preview；生产环境必须由后端或网关挂载同一分发器。

## 正式业务写入治理

36 个正式写接口允许非 `TEST_` 业务键，但每次浏览器写入必须同时满足：

- 请求来自同源页面，并通过服务端 Origin/Host 校验；
- 已完成飞书 OAuth，服务端能够取得当前用户身份；
- 实时读取 `COM-001`，确认当前用户具备 `operation:{operationId}:execute` 或通配执行权限；
- 页面提供明确确认、唯一幂等键、审计合同与请求哈希；更新、删除和命令类操作提供当前版本；
- 需要审批的操作必须绑定实时审批通过且资源、operation 匹配的实例；
- 服务端字段白名单和写操作服务再次校验，写成功后只失效依赖目标飞书表的读取缓存。

专用联调和验收工具仍使用 `TEST_` 前缀、双开关和独立测试记录服务，不得借正式业务通道绕过隔离。

真实浏览器 OAuth 当前仍需在飞书开发者后台登记回调白名单：
`http://127.0.0.1:4173/api/v1/auth/feishu/callback`。未登记时飞书返回错误码 20029，无法完成真实账号登录与授权写入验收。

本地服务启动后可运行 `pnpm feishu:oauth:preflight` 自动检查授权入口、官方授权地址和回调白名单。该命令不会输出一次性 state 或访问令牌；`passed=false` 且 `error20029=true` 表示仍需在飞书开发者后台登记上述回调地址。

运行 `pnpm test:integration:server` 可验证 64 表/1229 字段标识契约、服务端令牌缓存、
默认分页、同源路由、错误脱敏和只读门禁。
