# 数智产品展厅代码差距审计

## 审计结论

当前仓库不是需求规格说明书所描述的完整可投产系统，而是“高完整度前端演示页面 + 一套真实飞书读取与受控测试写入技术底座 + 少量页面级真实接入”的混合状态。

最重要的判断如下：

- **没有一个跨前端、服务端、外部系统和生产部署的业务域达到完整生产闭环。** 生产写入被明确限制为 `TEST_` 隔离记录，Vite 中间件也只覆盖本地开发和预览。
- **真实读取已经具备较强基础。** 飞书标识合同包含 64 张表、1311 个字段；服务端登记了 65 个读取接口，身份、分页、字段投影、文件访问和部分权限检查均有代码实现。
- **页面接入不均衡。** 应用中心、消息、培训、积分有真实读取代码；素材、认证、公告前台、运营看板和后台管理仍主要是静态数据或本地状态。多个服务端接口已经存在，但页面没有消费。
- **审批只达到联调级。** 海能Work审批使用真实飞书 Approval v4 客户端，但仅允许 `TEST_` 审批和测试资源；RPA审批转发给外部地址；EAD审批没有实现。
- **机器人通知和运行监控没有形成闭环。** 仓库中没有海能Work机器人发送实现；日志/健康读取接口和表结构存在，但页面仍显示夹具，且未发现业务操作自动产生日志、告警和通知的运行链路。
- **生产网络存在硬阻塞。** `src/main.js:4,8` 无条件安装本地网络守卫；`src/runtime/network-guard.js:1-8,12-39` 只允许 `127.0.0.1`、`localhost` 和 `::1`，因此部署到真实域名后同源 API 请求也会被拦截。

## 判定口径

| 状态 | 含义 |
| --- | --- |
| 真正完成 | 在本仓库责任范围内有真实数据/接口、页面消费、错误处理和可运行闭环；若依赖外部系统，会单独注明待联调。 |
| 部分完成 | 有真实代码路径，但混有夹具、仅覆盖部分类型/动作，或缺少生产部署闭环。 |
| 接口存在但页面未接入 | 服务端、operation 合同或多维表结构已经存在，但当前页面没有接收或消费返回数据。 |
| 仅静态 UI/夹具 | 页面显示固定数组、生成数据或本地内存状态；刷新不构成业务持久化。 |
| 外部依赖/未实现 | 本仓库没有可闭合能力，必须由飞书、EAD、RPA后端、机器人或监控平台提供正式输入。 |

## 需求完成度矩阵

| 需求域 | 判定 | 实际实现 | 关键证据 | 未闭合项 |
| --- | --- | --- | --- | --- |
| 应用分类浏览 | 部分完成 | `/apps` 会读取 `APP-001/002/004`，但真实列表只保留 `TEST_` 且处于上架/通过状态的记录，并始终与本地 `APP_FIXTURES` 合并。 | `src/integration/page-integration-matrix.js:52`；`src/pages/AppsPage.vue:4,25-37,46-58` | 生产应用记录被 `TEST_` 过滤；真实模式仍展示夹具，无法证明目录来自权威数据。 |
| 应用详情展示 | 部分完成 | 9类详情路由和类型化静态布局齐全；附加组件可读取真实评论、素材和附件。 | `src/fixtures/pages.js:22-30`；`src/App.vue:296-308,329-335`；`src/components/AppDetailLiveSections.vue:13-39` | 主标题、指标、说明、流程等核心详情仍硬编码；真实数据只是附加区块，未替换静态主体。 |
| 应用使用 | 部分完成，外部依赖 | 应用中心可调用 `APP-004` 由服务端校验允许状态和安全启动地址后打开应用。 | `src/integration/application-actions.js:29-37`；`src/pages/AppsPage.vue:91-101`；`src/integration/remote-operation-capabilities.js:6` | 目标系统权限、SSO和允许主机依赖外部配置；详情页原有“立即使用”按钮多为无事件静态按钮，例如 `src/pages/EadDetailPage.vue:43-47`。 |
| 应用上架表单 | 部分完成 | 有上架申请页、字段和附件选择；草稿仅保存在本地会话。页面列出9种应用类型。 | `src/pages/OnboardingApplyPage.vue:5-30,50-60,76-87` | 不是按类型独立数据结构/表单；提交代码只支持 RPA `T003` 和海能Work `T005`。其他类型选择后会失败。 |
| 上架审批分流 | 部分完成，联调级 | `T003` 转发 RPA接口，`T005` 调飞书审批；状态页可按实例号查询。 | `src/integration/onboarding-approval.js:4-7,16-85`；`src/pages/OnboardingPage.vue:6-35` | EAD `T002`、可视化、报表、AI和其他类型没有审批路由。RPA地址是外部后端；飞书审批仅为测试审批。 |
| 海能Work审批后自动展示 | 仅测试闭环 | 审批服务可把审批状态投影到“应用索引”和“海能work应用详情”。 | `server/feishu-approval-service.mjs:115-135,175-220`；`server/feishu-approved-app-projection.mjs:44-145` | 投影强制资源以 `TEST_` 开头，见 `server/feishu-approved-app-projection.mjs:47-51`；不是正式业务上架。 |
| 更新、下架、版本追溯 | 接口存在但业务页未接入 | operation 矩阵登记应用运营读写和归档相关操作。 | `src/integration/page-integration-matrix.js:69-71`；`src/integration/operation-registry.js:30-42` | 应用管理列表和编辑页是固定数组/静态表单，`src/pages/AppAdminPage.vue:3-5`、`src/pages/AppEditorPage.vue:3-4`；生产写入关闭。 |
| 素材中心展示 | 接口存在但页面未接入 | 服务端已实现 `MAT-001/002/003`，包括素材列表和安全下载。 | `server/feishu-read-only-service.mjs:67-69,798`；`server/README.md:24-35` | `/materials` 未登记在页面接入矩阵，`src/App.vue:327` 也未传入数据；页面自行生成128条素材，见 `src/pages/MaterialsPage.vue:8-36`。 |
| 素材下载/关联/下架 | 仅局部接口 | 应用详情附加区可通过 `MAT-003` 获取短时同源下载地址。 | `src/components/AppDetailLiveSections.vue:20-31` | 素材中心下载明确提示“不提供真实文件下载”，见 `src/pages/MaterialsPage.vue:66`；上传、应用关联、发布和下架没有正式页面闭环。 |
| 培训课堂 | 部分完成，外部依赖 | 页面可消费 `TRN-002` 真实课程；`TRN-006` 可校验后打开课程；无真实数据时回退固定课程。 | `src/pages/TrainingPage.vue:6-12,14-75,84-102,120-135`；`src/integration/page-integration-matrix.js:65` | 报名 `TRN-004` 只通过 `TEST_` 写入口，见 `src/pages/TrainingPage.vue:107-118`；正式甲方培训表和身份联调仍是外部依赖。 |
| 人才数据 | 仅静态 UI/夹具 | 三个人才页面都有完整交互界面。 | `src/pages/TalentPeoplePage.vue:4-8`；`src/pages/TalentProjectsPage.vue:4-8`；`src/pages/TalentProgressPage.vue:5-8` | `App.vue:321-326` 仅把数据传给人才库，但人才库没有定义 props，项目/进度也未接收数据；页面实际继续使用本地 fixtures。 |
| 数字化认证 | 接口存在但页面未接入 | 服务端登记 `CER-001/002/003`，矩阵也登记认证读取和预约操作。 | `src/integration/remote-operation-capabilities.js:10-11`；`src/integration/page-integration-matrix.js:72` | `App.vue:320` 未传入集成数据；页面没有 props，认证预约仅宣布“本地预约演示”，见 `src/pages/CertificationPage.vue:35-63`。 |
| 积分余额和明细 | 部分完成，外部依赖 | 积分首页消费 `PTS-001/003`，明细页消费 `PTS-002`；无数据时回退固定数值。 | `src/pages/PointsPage.vue:4-60`；`src/pages/PointsDetailsPage.vue:5-44`；`src/integration/page-integration-matrix.js:63-64` | `PTS-004` 规则数据虽被加载，积分页没有消费，规则说明仍静态；积分生成自动化未实现。 |
| 积分只累计不扣分 | 未满足/规则冲突 | 服务端读取模型明确支持 `EXPENSE` 和负积分，验收脚本也创建 `-10` 的支出记录。 | `server/feishu-read-only-service.mjs:1648-1656,1727-1757`；`tools/verify-live-personal-reads.mjs:71-74` | 需按最终签字规则决定是否移除扣减能力或明确例外；当前代码没有“只累计”约束。 |
| 公告前台 | 接口存在但页面未接入 | `ANN-001/002/003/005` 已有真实读取服务和页面合同。 | `src/integration/page-integration-matrix.js:50-51`；`server/feishu-read-only-service.mjs:38,41-43,604-609,868-896` | `AnnouncementsPage` 只定义 `state` prop并使用 `ANNOUNCEMENT_FIXTURES`，见 `src/pages/AnnouncementsPage.vue:10-23`；`App.vue:284-287` 传入的集成 props 不会被消费。详情页同样是静态内容。 |
| 公告发布/编辑 | 仅静态 UI，测试接口存在 | 运营端列表、编辑表单和操作入口存在；矩阵登记 OAN 读写。 | `src/integration/page-integration-matrix.js:67-68`；`src/pages/AnnouncementAdminPage.vue:3-5`；`src/pages/AnnouncementEditorPage.vue:3-11` | 表单没有保存/发布处理函数；通用写面板只在测试开关下出现，不能视为公告业务页面完成。 |
| 消息中心读取 | 部分完成，外部依赖 | 页面可消费 `MSG-001/002` 的统计和消息列表并支持本地筛选。 | `src/pages/MessagesPage.vue:6-32`；`src/integration/page-integration-matrix.js:47` | 依赖飞书OAuth用户会话；真实目标路径受安全限制。 |
| 消息已读状态 | 接口存在但页面未接入 | 合同登记 `MSG-003/004/005` 写操作。 | `src/integration/page-integration-matrix.js:10,47` | 页面在真实模式禁用“全部标为已读”，单条真实消息也不调用写接口，见 `src/pages/MessagesPage.vue:35-37,51`。 |
| 运营看板 | 仅静态 UI/夹具 | 可切换时间周期并刷新图表外观。 | `src/pages/OperationsPage.vue:3-10`；`src/state/operations-controller.js:3-22` | 所有指标、趋势、应用排行和公告均来自固定数组/数学放大；导出按钮禁用。真实 `OPS-001/003` 数据没有传给页面。 |
| 后台配置、权限和运营管理 | 仅静态 UI；接口部分存在 | 页面展示应用类型、主题域、日志、应用和公告管理；服务端有 OAP、ADM、INT、ARC 读取操作。 | `src/pages/AdminPage.vue:6-186,188-360`；`src/pages/AppAdminPage.vue:3-5`；`src/integration/page-integration-matrix.js:69-71` | 后台页面未定义/消费集成 props；增删改只改变本地响应式数组或提示“本地演示”。权限分级没有在页面路由层执行。 |
| 飞书多维表结构 | 真正完成（技术合同） | 标识合同已固化 64 张表、1311 字段，覆盖应用类型/索引/各类型详情、素材、公告、消息、培训、积分、认证、审批、日志和归档。 | `server/contracts/feishu-base-identifiers.json:1-9`；关键表名见同文件 `:692,948,1701-2517,3327,3682,4015,4342,5777,5943,6218,8840,9153,9502,9801,12763,14029,14274`。 | 合同存在不等于真实表数据、权限、自动化和回调已联调；`server/README.md:63` 仍写“36表/271字段”，与当前合同不一致。 |
| 飞书服务端读代理 | 真正完成（代码层），生产部署未闭合 | 同源operation代理、OAuth、字段投影、文件访问、审批和受控写服务均已装配。 | `server/feishu-vite-plugin.mjs:19-85`；`server/README.md:3-20,22-35` | `server/README.md:42-44` 明确需要OAuth、正式用户会话和生产后端/网关；当前 Vite 插件只服务开发和 preview。 |
| 飞书正式业务写入 | 未完成 | 36个写接口有服务代码和门禁。 | `server/README.md:40-56`；`src/App.vue:94-108` | 只允许双开关下写 `TEST_` 记录，生产明确不得开启；没有正式业务写合同。 |
| EAD审批与状态 | 外部依赖/未实现 | 有EAD静态详情页，允许主机配置中包含 EAD 域名。 | `src/pages/EadDetailPage.vue:1-132`；`vite.config.js:15` | 上架路由只识别 `T003/T005`，选择 `T002` 会抛出“尚未配置真实审批”，见 `src/integration/onboarding-approval.js:4-7`；没有EAD回调、状态回写或管理员配置接口。 |
| 海能Work机器人通知 | 未实现 | 多维表中有“消息通知”表，可读取消息。 | `server/contracts/feishu-base-identifiers.json:4015`；`server/feishu-read-only-service.mjs:49-50` | `src/`、`server/`、`tools/` 和 `docs/` 中没有机器人/webhook发送实现；仅 `AppIcon` 对 `robot` 名称映射图标。通知模板、收件范围、发送结果留痕均未闭合。 |
| 日志、运行监控和告警 | 接口存在但页面未接入；采集链缺失 | 多维表合同包含后台操作日志、接口调用日志、异常处理和后台任务；服务端能读取健康、审计和接口日志。 | `server/contracts/feishu-base-identifiers.json:13385,14029,14274,14550`；`server/feishu-read-only-service.mjs:1388-1404,1530-1578` | 后台页面仍用 `logRows` 假数据并本地处理，见 `src/pages/AdminPage.vue:145-185,320-356`；未发现业务请求自动写审计/接口日志、监控采集器、告警规则或通知出口。 |

## 外部依赖清单

以下能力不能靠当前前端仓库独立补齐：

1. **生产服务端挂载。** `server/README.md:44` 明确Vite中间件只用于本地开发/preview，生产需后端或网关挂载同一分发器。
2. **飞书OAuth与权限。** `server/README.md:42,58-61` 明确12个当前用户接口需要真实登录，回调白名单尚需在飞书后台登记。
3. **正式业务写权限和合同。** 当前36个写接口只能处理 `TEST_` 记录，见 `server/README.md:43,48-56`。
4. **RPA审批后端。** `vite.config.js:7,33-37` 将 `/api/processInstanceStart` 转发到外部审批后端；仓库不包含该后端实现。
5. **EAD正式审批/回调。** 当前没有EAD审批请求、回调字段和状态同步实现。
6. **机器人消息通道。** 缺少机器人地址、模板、接收范围、发送接口和结果日志合同。
7. **运行监控平台。** 缺少指标采集、健康探测、告警判定、告警通知和留存策略的实际提供方。
8. **甲方培训、人才和认证权威表。** 服务器合同具备部分读取能力，但页面接入和真实数据/权限仍需甲方表结构与用户会话。

## 建议优先级

### P0 生产阻塞

1. 将本地网络守卫改为仅开发/演示环境启用，否则生产域名上的所有API请求会被阻止。
2. 提供独立生产服务端或网关挂载飞书分发器，并完成OAuth回调白名单、凭证管理和权限验证。
3. 决定正式写入方案；当前 `TEST_` 通道不能承担应用上架、公告发布、素材维护、认证预约、消息已读和后台配置。
4. 明确EAD、RPA、机器人和监控平台的正式接口、责任方、状态字段和回调范围。

### P1 页面与已有接口接线

1. 先连接素材、认证、公告、运营看板和后台管理页面，因为这些领域已有operation或多维表基础，但页面仍是夹具。
2. 应用中心真实模式不应继续混入 `APP_FIXTURES`，也不应只展示 `TEST_` 应用；详情主体应由 `APP-003` 和类型专属表驱动。
3. 把人才库、人才项目和项目进度页面真正连接 `TAL-001/002/003`，或明确移出当前范围。
4. 让积分规则页面消费 `PTS-004`，并解决“只累计不扣分”与当前 `EXPENSE` 支持的规则冲突。

### P2 完整业务闭环

1. 按RPA、海能Work、EAD、可视化、报表、AI和其他类型拆分表单与审批/配置流程。
2. 补齐更新、下架、版本、审批状态、消息发送和操作日志的历史链路。
3. 将页面专用写操作嵌入业务界面；通用JSON测试面板只能保留为开发工具，不能作为产品功能。

## 审计范围与限制

- 需求来源：`需求规格说明书_数智产品展厅_20260901(1).docx`。按 `word/document.xml` 顺序读取112个段落和7个表格；重点依据说明书段落31-42、44-82、85-100、表5和表6。
- 代码来源：当前仓库 `src/`、`server/`、`tools/`、配置和交付说明；未修改代码、未提交。
- 任务包 `task.json` 已通过位置和结构校验，当前仍为 `scope_review`，未记录范围批准；本报告不改变任务状态或审批。
- 本机缺少技能工具链要求的捆绑LibreOffice，DOCX页面渲染失败。按主任务补充指示，本次只做XML和表格的文本级需求核对，不对说明书版式、页码或图片内容作判断。
- 本机 `.env.local` 的非敏感开关显示真实读取模式已启用、测试写开关未启用；未记录或输出任何凭证值。本审计没有调用外部生产系统，也未把单元测试或合同测试等同于真实联调通过。
