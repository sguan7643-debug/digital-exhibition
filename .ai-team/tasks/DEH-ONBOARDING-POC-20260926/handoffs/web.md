# DEH-ONBOARDING-POC-20260926 — Web Engineer Handoff

## 结论与边界

- 最新 code review 的 4 个 open finding 已完成最小修复，适用 Web 检查结果为 `passed`。
- 当前分支：`task/digital-exhibition-ui-0817-dev-r3-web`（非主分支）。
- task 保持 `development`、design approved、Vue Web；未记录 QA repair attempt，未修改 workflow state。
- 未部署、未推送、未合并，未执行 reset/checkout；脏工作区其他既有修改均保留。
- 本结果只证明代码合同与本地测试通过，不作为真实飞书 POC 已执行的证据。

## 最新 4 个 finding 的修复证据

1. **Live verifier 请求通过自身 same-origin middleware**
   - 新增 `tools/onboarding-verifier-api.mjs`：从 `baseUrl` 解析严格 `origin`，所有验证器 API 请求显式携带该 `Origin`；调用方传入的 header 不能覆盖它。
   - `tools/verify-live-onboarding-poc.mjs` 的 list、detail、approve、sync、grant 及重启后 detail 统一使用该传输层。
   - 新增 `tools/onboarding-verifier-origin-http.test.mjs`，启动真实本地 Node HTTP server 并挂载 `createFeishuOnboardingNodeMiddleware`；机器断言 list/detail/sync/grant 同源均为 200，恶意 Origin 为 403 / `CROSS_ORIGIN_REQUEST_BLOCKED`。

2. **审批实例登记失败后的幂等补偿**
   - `server/feishu-approval-service.mjs` 在 `existing.instanceId` 重放路径再次调用幂等 `onInstanceCreated(existing)`，成功后才继续投影与返回。
   - `tools/feishu-approval-service.test.mjs` 覆盖：首次远端审批创建成功、ledger callback 失败、持久化 registry 后模拟重启并重试。结果为远端审批创建恰 1 次、callback 尝试 2 次、ledger 恰 1 个 `APPROVAL_INSTANCE`。

3. **无运行标识字典的删除点 runId 保护**
   - `server/feishu-onboarding-poc-orchestrator.mjs` 在 destructive cleanup 前要求 ledger businessKey 以完整 `TEST_${ledger.runId}` 开头。
   - 读取远端精确 `tableId + recordId` 后，再核对批准 `keyField` 的远端值既与 ledger businessKey 完全一致，也具有相同 runId 前缀；任一不符均拒绝删除。
   - `tools/onboarding-poc-contract.test.mjs` 增加恢复态伪造 ledger：错误 runId 的 ledger 与远端 keyField 即使彼此一致，仍返回 `POC_CLEANUP_OWNERSHIP_MISMATCH`，`deleteRecord` 调用为 0。

4. **UI 回归恢复及逐项迁移/退役**
   - `tools/ui-source-20260904-sync.test.mjs` 增加现存 `CertificationPage`、`TalentPeoplePage`、`TalentProjectsPage`、`OperationsPage`、`MaterialsPage` 的适用断言，覆盖认证模块/预约、人才字段与 dialog 语义、人才项目筛选与抽屉宽度、运营排行可读性、素材页中宽布局。
   - `tools/ui-regression-retirement-map.json` 逐项记录以上 5 组断言从历史测试迁入维护中套件；同时继续明确退役缺失的 `mock-data.js`、`BusinessPreviewGallery.vue`、`IndicatorBuildDialog.vue` 及其替代覆盖。
   - `tools/latest-ui-remediation.test.mjs` 保留为可执行历史入口，转接维护中源回归与退役映射，不再依赖已退役 mock/component；`package.json` 已将该入口纳入 `test:ui-source-sync`。
   - `tools/mounted-indicator-build-dialog.test.mjs` 校验迁移清单及退役替代文件真实存在，防止后续只删测试不补映射。

## 测试先行证据

- verifier 红测：`node tools/onboarding-verifier-origin-http.test.mjs` 首次退出码 `1`，报 `ERR_MODULE_NOT_FOUND: tools/onboarding-verifier-api.mjs`；实现严格同源传输后退出码 `0`。
- approval 红测：首次退出码 `1`，`restart/retry must compensate the failed ledger callback`，实际 callback 次数 `1`、期望 `2`；补偿重放后退出码 `0`。
- cleanup 红测：首次退出码 `1`，伪造字典 ledger 未在归属检查拒绝，已进入删除后验证并报 `POC_CLEANUP_VERIFY_FAILED`；增加删除点双重 runId 校验后退出码 `0` 且 `deleteRecord=0`。
- UI：迁移断言进入维护中可执行套件后专项退出码 `0`；历史失败根因是 `latest-ui-remediation` 直接导入已退役 `src/fixtures/mock-data.js`，现由显式迁移/退役映射替代。
- 历史 POC cleanup ownership 测试曾在 line 87 报 `Missing expected rejection`；此前已修复为 runId + businessKey/keyField + tableId/recordId 双精确归属，本轮在此基础上补齐无运行标识字典的恢复态防护。

## 本轮命令与精确结果

| 命令 | 结果 |
| --- | --- |
| `node tools/onboarding-verifier-origin-http.test.mjs` | 退出码 `0`；真实 HTTP middleware 下 list/detail/sync/grant 同源通过，恶意 Origin 403。 |
| `node tools/feishu-approval-service.test.mjs` | 退出码 `0`；含 callback 失败、重启补偿、单次远端创建及单 ledger 对象。 |
| `node tools/onboarding-poc-contract.test.mjs` | 退出码 `0`；含错误 runId 恢复态 `deleteRecord=0`。 |
| `node tools/latest-ui-remediation.test.mjs` | 退出码 `0`；现存页面迁移断言与退役映射通过。 |
| `npm run test:onboarding-poc` | 退出码 `0`；11 个串行阶段全部通过，包含新增真实 HTTP 同源专项。 |
| `npm run check` | 退出码 `0`；`源码静态、确定性、零外网、语义与原子资产检查通过`。 |
| `npm run test:ui-source-sync` | 退出码 `0`；10 个入口全部通过，包含历史 UI 入口、迁移断言、退役映射、窄屏/键盘/语义合同。 |
| `npm run build` | 退出码 `0`；Vite `6.4.1`，`1932 modules transformed`，`built in 3.21s`；CSS `281.78 kB`（gzip `46.39 kB`），JS `898.44 kB`（gzip `212.38 kB`）。 |
| `git diff --check` | 退出码 `0`；仅显示现有 LF/CRLF 提示，无 whitespace error。 |

## 本轮改动文件

- 运行时：`server/feishu-approval-service.mjs`、`server/feishu-onboarding-poc-orchestrator.mjs`。
- verifier：`tools/onboarding-verifier-api.mjs`、`tools/verify-live-onboarding-poc.mjs`。
- 专项测试：`tools/onboarding-verifier-origin-http.test.mjs`、`tools/feishu-approval-service.test.mjs`、`tools/onboarding-poc-contract.test.mjs`。
- UI 回归：`tools/ui-source-20260904-sync.test.mjs`、`tools/latest-ui-remediation.test.mjs`、`tools/mounted-indicator-build-dialog.test.mjs`、`tools/ui-regression-retirement-map.json`。
- 测试入口：`package.json`。
- 角色产物：`.ai-team/tasks/DEH-ONBOARDING-POC-20260926/handoffs/web.md`。

## 响应式、键盘与可访问性证据

- `test:ui-source-sync` 中的 `mobile-overflow-accessibility-remediation` 继续覆盖 760px 单列、360/320 级窄屏、局部滚动区域可聚焦、`role=region`、可感知名称与根级不裁切。
- 本轮迁移保留人才页面 `role=dialog`、认证/运营/素材页可读布局断言；onboarding 合同继续覆盖键盘、焦点、六态、附件及窄屏卡片。
- 未执行真实飞书授权浏览器截图；上述为静态/本地自动化与生产构建证据，不冒充真实 POC。

## 已知风险、未运行项与真实 POC 前置条件

- 按收敛要求未运行完整 `npm run test:integration`；受影响集成子集由 `npm run test:onboarding-poc` 和新增真实 HTTP middleware 专项覆盖。
- 未运行 live verifier，因此未声称真实 OAuth、真实 Base/媒体/审批写入、外部服务重启、跨 8 天读取和真实 cleanup 已完成。
- 真实 POC 仍需：有效且同一申请人的飞书 OAuth 会话；可用真实审批人；正确 app/tenant 凭据和通讯录、审批、Base 权限；匹配目标 Base 的 fingerprint；结构化跨 8 天自动化产物；可执行外部重启命令；允许创建/精确清理受控 `TEST_` 记录，并接受媒体与审批实例按审计要求 retained。
- 最新 4 个 code-review finding 未完成项：无。真实 POC 外部前置条件仍未满足，不属于本地 passed 声明。

## 最新唯一 P2 收敛补充（UI 有效合同迁移）

- 仅修复最新 `code-review.md` 指出的 UI 回归覆盖遗漏；未修改任何产品源码、评审、聚合报告或 workflow state。
- `tools/ui-source-20260904-sync.test.mjs` 已直接断言以下当前有效合同，并由既有 `test:ui-source-sync` 入口实际执行：
  - `src/style.css` 的 `--xlt-font-caption: clamp(13px` 可读下限；
  - 通知筛选下拉箭头的统一蓝色，以及日期筛选日历图标的 opacity/filter 规则；
  - `AppsPage.vue` 筛选标签的弹性网格、14px/22px 排版和不换行；
  - `PointsPage.vue` 动态数值/单位/时间不换行，以及 1100px 以下双栏收敛为单列。
- `tools/ui-regression-retirement-map.json` 为上述四项分别登记 `GlobalTypographyTokens`、`NoticeFilterIcons`、`AppsPageFilterLabels`、`PointsPageDynamics`，迁移目标均为 `tools/ui-source-20260904-sync.test.mjs`。
- `tools/mounted-indicator-build-dialog.test.mjs` 同步校验完整 9 项迁移清单，防止后续映射被静默缩减。

### 测试先行与阻塞修复

- 首次独立运行 `node tools/ui-source-20260904-sync.test.mjs`：退出码 `1`，精确失败为 `缺少有效 UI 合同迁移映射：tools/latest-ui-remediation.test.mjs:GlobalTypographyTokens`；补齐四项映射后退出码 `0`。
- 首次聚合运行 `npm run test:ui-source-sync`：退出码 `1`，旧迁移清单断言只接受 5 项；将同一 P2 的映射校验扩充为 9 项后重跑通过。

### 最终命令结果

| 命令 | 精确结果 |
| --- | --- |
| `node tools/ui-source-20260904-sync.test.mjs` | 退出码 `0`，`现存 ExhibitionShell、全局样式和页面的适用 UI 源回归合同通过`。 |
| `node tools/mounted-indicator-build-dialog.test.mjs` | 退出码 `0`，迁移/退役映射校验通过。 |
| `npm run test:ui-source-sync` | 退出码 `0`，10 个入口全部通过；本轮四项合同由首个源回归入口直接执行。 |
| `npm run check` | 退出码 `0`，`源码静态、确定性、零外网、语义与原子资产检查通过`。 |
| `npm run build` | 退出码 `0`；Vite `6.4.1`，`1932 modules transformed`，`built in 3.29s`；CSS `281.78 kB`（gzip `46.39 kB`），JS `898.44 kB`（gzip `212.38 kB`）。 |

### 本轮改动文件

- `tools/ui-source-20260904-sync.test.mjs`
- `tools/ui-regression-retirement-map.json`
- `tools/mounted-indicator-build-dialog.test.mjs`
- `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/handoffs/web.md`

最新唯一 P2 未完成项：无。真实 POC 外部前置条件与此前交接一致，本轮未运行 live verifier，也未将静态 UI 断言冒充真实 POC 证据。

## QA repair — 海能Work“唯一标识”写入恢复（2026-09-28）

### 结论与实现

- 根因已确认：历史实现会调用审批后端 `GET /api/onboarding/unique-identifier` 获取 `ONB...`，但迁移到新的 `/api/v1/onboarding/applications` POC 提交流程后，该值没有进入服务端申请记录和“上架申请”投影。
- 新增服务端唯一标识客户端；T005 提交前从 `FEISHU_APPROVAL_BACKEND_URL` 获取唯一标识。同一用户、同一 attempt 并发提交共享一次调用；值持久化到申请注册表，失败重试和服务重启继续使用同一个值。
- 唯一标识同时进入审批创建上下文和申请快照；“上架申请”首次写入及幂等重放均允许写入/补写“唯一标识”。接口失败或返回非法值时阻止提交，不再产生唯一标识为空的新记录。
- “审批实例ID”原逻辑保持不变，继续使用飞书创建审批实例后返回的真实 `instanceId` 写入，并在状态刷新时校准。
- 应用类型动态详情机制核验保留：页面仍为 T001–T009 配置九张对应详情表及不同字段集合，并由 `activeDetailSchema.fields` 动态渲染、由 `buildDetailFields()` 提交；本轮未改成统一表单。

### 测试先行与验证证据

- 红测：新增 `tools/onboarding-unique-identifier-client.test.mjs` 后首次运行退出码 `1`，明确报缺少 `server/onboarding-unique-identifier-client.mjs`。
- 绿测：唯一标识客户端、上线申请服务、上架投影和动态详情合同四项专项测试全部通过。
- `npm run test:onboarding-poc`：退出码 `0`，13 个阶段全部通过。
- `npm run check`：退出码 `0`。
- `npm run build`：退出码 `0`，1932 modules transformed，CSS `282.73 kB`（gzip `46.57 kB`），JS `910.71 kB`（gzip `215.02 kB`）。
- 本地申请页 `http://127.0.0.1:4173/test2/apps/onboarding/apply`：HTTP 200；本地 Vite 服务已重启并加载新服务端模块。
- 真实后端连通检查未通过：`127.0.0.1:28080` / `localhost:28080` 主动拒绝连接，`10.151.23.119:28080` 超时。因此尚不能声明真实 `ONB...` 获取和飞书写表闭环已验证；后端服务或网络恢复后需提交一笔新 T005 申请复验“唯一标识”和“审批实例ID”同时非空。

### 改动文件

- `server/onboarding-unique-identifier-client.mjs`
- `server/feishu-onboarding-service.mjs`
- `server/feishu-approved-app-projection.mjs`
- `server/contracts/feishu-onboarding-poc-schema-manifest.mjs`
- `server/feishu-vite-plugin.mjs`
- `vite.config.js`
- `.env.test.example`
- `tools/onboarding-unique-identifier-client.test.mjs`
- `tools/feishu-onboarding-service.test.mjs`
- `tools/feishu-approved-app-projection.test.mjs`
- `package.json`

### 响应式、键盘与可访问性

- 本轮没有改动页面 DOM、样式、焦点顺序或键盘交互；动态详情字段区域和既有无障碍合同保持不变。
- 当前平台结果记录为 failed 仅因为真实唯一标识后端不可达，非自动化、构建或页面回归失败。

## QA repair — 上线申请文件上传延迟优化（2026-09-28）

### 结论与实现

- 分支保持 `task/digital-exhibition-ui-0817-dev-r3-web`，属于已批准 onboarding POC 在 `qa` 阶段的 Web 修复；未部署、未推送、未合并。
- POC schema 发现增加进程内 single-flight 缓存，启动时只读预热；首次请求若与预热并发会等待同一任务，同一进程后续上传不再重复扫描 5 张表及全部字段。
- schema 管理客户端为表清单和逐表字段清单增加 5 分钟共享缓存；创建表、创建字段或删除字段后精确失效，避免写后读取旧结构。
- TEST_ 安全记录服务缓存已解析表标识，上传元数据写入不再每次重新拉取全部表。
- T005 多附件从严格串行调整为最多 2 个并发；上传期间禁用新的文件选择和失败重试入口，防止跨批次突破并发上限。文件扩展名、大小、MIME、内容特征、SHA-256、TEST_ 幂等及写入门禁均保持不变。

### 测试先行证据

- `node tools/onboarding-poc-contract.test.mjs` 修复前退出码 `1`：两次 `execute` 后 schema 表读取由期望 `1` 增至实际 `3`；修复后退出码 `0`。
- `node tools/feishu-safe-test-record.test.mjs` 修复前退出码 `1`：10 次操作触发实际 `10` 次表清单读取；修复后固定为 `1` 次并退出码 `0`。
- `node tools/onboarding-upload-concurrency.test.mjs` 修复前退出码 `1`：并发池模块不存在；实现后确认 5 个任务最大并发为 `2`、返回顺序稳定，退出码 `0`。
- `node tools/feishu-schema-admin.test.mjs` 缓存断言修复前退出码 `1`：两次表查询实际远程调用 `2` 次；实现后表清单和字段清单各只请求 `1` 次，退出码 `0`。

### 最终命令结果

| 命令 | 精确结果 |
| --- | --- |
| `npm run test:onboarding-poc` | 退出码 `0`；12 个阶段全部通过，包含新增并发上限测试。 |
| `node tools/feishu-schema-admin.test.mjs && node tools/feishu-safe-test-record.test.mjs` | 退出码 `0`；共享 schema 缓存和表标识缓存通过。 |
| `npm run check` | 退出码 `0`；源码静态、确定性、零外网、语义与原子资产检查通过。 |
| `npm run build` | 退出码 `0`；Vite `6.4.1`，`1932 modules transformed`，`built in 3.52s`；CSS `282.73 kB`（gzip `46.57 kB`），JS `905.63 kB`（gzip `214.29 kB`）。 |
| `npm run test:test-deployment` | 退出码 `0`；`/test2`、根 API、重定向、路径穿越和构建资源检查通过。 |
| `$env:EXHIBITION_TEST_ORIGIN='http://127.0.0.1:4173/test2'; npm run test:browser:onboarding-apply` | 退出码 `0`；RPA 提交、T005 实例提交和真实状态查询浏览器链路通过。 |
| `git diff --check` | 退出码 `0`；仅现有 LF/CRLF 提示，无 whitespace error。 |
| `Invoke-WebRequest http://127.0.0.1:4173/test2/apps/onboarding/apply` | HTTP `200`，构建页面可访问；本地服务已用新构建重启。 |

### 改动文件与检查边界

- 运行时：`server/feishu-onboarding-poc-orchestrator.mjs`、`server/feishu-safe-test-record-service.mjs`、`server/feishu-schema-admin-client.mjs`、`server/feishu-vite-plugin.mjs`、`src/integration/concurrency-pool.js`、`src/pages/OnboardingApplyPage.vue`。
- 测试与入口：`tools/onboarding-poc-contract.test.mjs`、`tools/onboarding-upload-concurrency.test.mjs`、`tools/feishu-safe-test-record.test.mjs`、`tools/feishu-schema-admin.test.mjs`、`package.json`。
- 浏览器专项第一次按默认根路径执行时因部署实际位于 `/test2` 而超时；使用正确部署基路径重跑通过。该次失败不是产品回归。
- 本轮没有改变页面布局和 DOM 顺序；上传控件保留键盘可达、可见状态和 `aria-busy`，忙碌期使用原生 `disabled` 语义。未执行真实飞书文件上传测速，因此不承诺固定秒数；实际时延仍受飞书和公网影响。

## QA repair attempt 1 — QA-DEF-01（2026-09-26）

### 修复结论与边界

- 仅修复 `QA-DEF-01`：live verifier 现在分别解析同源的 API base 与应用 public base，不再用一个带 `/test2/` 的地址同时拼接页面和根 API。
- 兼容旧配置 `FEISHU_VERIFY_BASE_URL`：若旧地址含路径（例如 `http://127.0.0.1:4173/test2/`），该路径作为应用 base，API 自动回到同一 origin；若旧地址只有 origin，则应用路径采用 `FEISHU_VERIFY_APP_PUBLIC_BASE`、`VITE_EXHIBITION_APP_BASE` 或默认 `/test2/`。
- 新增可选显式配置 `FEISHU_VERIFY_API_BASE_URL` 与 `FEISHU_VERIFY_APP_BASE_URL`；二者 origin 不一致时立即失败，未放宽 same-origin 安全约束。
- session、health、list、detail、sync、grant 均通过 API base；申请页与详情页均通过应用 base。验证器的 Base 指纹、真实审批人、8 天证据、重启、远端记录和精确清理门禁均未修改。
- task 保持 `qa`，本轮不修改 PRD、设计、QA 报告、reviews、审批或 Team Lead 聚合 `engineering-handoff.md`；未部署、未推送、未合并。

### 测试先行证据

- 先扩展 `tools/onboarding-verifier-origin-http.test.mjs`，要求同一服务上 `/test2/apps/onboarding/apply` 返回 HTML，同时根 `/api/v1/onboarding/applications` 经真实 middleware 返回 JSON，并要求跨 origin 配置被拒绝。
- 首次红测：`node tools/onboarding-verifier-origin-http.test.mjs` 退出码 `1`，ESM 明确报 `resolveOnboardingVerifierTargets` 未导出。
- 最小实现后同一命令退出码 `0`，输出 `live verifier supports a /test2 app base with root /api/v1 endpoints and preserves strict same-origin transport`。

### fresh command evidence

| 命令 | 精确结果 |
| --- | --- |
| `node tools/onboarding-verifier-origin-http.test.mjs`（实现前） | 退出码 `1`；`SyntaxError: ... does not provide an export named 'resolveOnboardingVerifierTargets'`。 |
| `node tools/onboarding-verifier-origin-http.test.mjs`（实现后） | 退出码 `0`；`/test2` 页面、根 API、同源请求与恶意 Origin 拒绝均通过。 |
| `npm run test:onboarding-poc` | 退出码 `0`；11 个串行阶段全部通过，包含新的 `/test2` + 根 `/api/v1` HTTP 回归。 |
| `npm run check` | 退出码 `0`；`源码静态、确定性、零外网、语义与原子资产检查通过`。 |
| `npm run build` | 退出码 `0`；Vite `6.4.1`，`1932 modules transformed`，`built in 4.99s`；CSS `281.78 kB`（gzip `46.39 kB`），JS `898.44 kB`（gzip `212.38 kB`）。 |
| `npm run test:test-deployment` | 退出码 `0`；确认服务器提供 `/test2`、根 `/api/v1` 挂载、根重定向和路径穿越保护，构建资源均位于 `/test2/`。 |

### 本次 repair 改动文件

- `tools/onboarding-verifier-api.mjs`
- `tools/verify-live-onboarding-poc.mjs`
- `tools/onboarding-verifier-origin-http.test.mjs`
- `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/handoffs/web.md`

### 响应式、键盘、可访问性与已知风险

- 本修复只改变 POC 验证器的 URL 解析与请求目标，不改 Vue 页面 DOM、样式、焦点或交互；`npm run test:onboarding-poc` 中既有响应式、键盘、读屏和 Web 入口合同继续通过。
- 本轮未执行真实远端 POC，仍不声称 OAuth、真实审批、跨 8 天证据、外部重启和清理已经通过；这些门禁保持原样，必须由独立 Functional/Compatibility QA 在环境就绪后复验。
- `QA-DEF-01` 的实现阻塞已修复，等待独立 QA 重新运行并更新其自有报告。

## QA repair attempt 1 — code review P2/P3 收敛（2026-09-26）

### 修复结论与边界

- 仅处理最新 `reviews/code-review.md` 的两个 open finding；未修改 review、Functional/Compatibility QA 报告、PRD、设计、审批或 Team Lead 聚合交接。
- P2：`normalizeBaseUrl()` 在 URL 解析前检查原始 `?`/`#` 分隔符，因此含非空或空 query/fragment 的 legacy、API、app base 都会立即失败；`FEISHU_VERIFY_APP_PUBLIC_BASE` 同样拒绝分隔符。正常 root、`/test2/`、显式 API/app base 和 trailing slash 继续规范化为稳定路径。
- P3：验证器先使用标准 `Headers` 对调用方请求头做大小写不敏感规范化，再以 `set('Origin', computedOrigin)` 锁定唯一 Origin，最后转换为普通 header 对象交给 Playwright。调用方的 `origin`、`ORIGIN` 或重复变体均不能覆盖或形成逗号组合值，其他自定义 header 保留。
- API/app 仍必须同源；Base 指纹、真实审批人、schema dry-run、runId 台账、8 天证据、外部重启、远端记录核验和精确清理等 live POC 门禁均未改动。

### 测试先行证据

- 扩展专项测试后首次运行：退出码 `1`，line 70 `Missing expected exception`，证明 legacy `/test2?` 空 query 分隔符被错误接受。
- 只补 P2 原始分隔符校验后第二次运行：退出码 `1`，line 95 `403 !== 200`，证明小写/大写重复 Origin 被组合并遭真实 middleware 拒绝。
- 补 P3 大小写不敏感 header 规范化后第三次运行：退出码 `0`；专项测试同时验证最终 Origin 精确等于 computed origin、自定义非 Origin header 被保留、恶意直接跨源请求仍返回 403。

### fresh command evidence

| 命令 | 精确结果 |
| --- | --- |
| `node tools/onboarding-verifier-origin-http.test.mjs`（P2 红测） | 退出码 `1`；`AssertionError: Missing expected exception`。 |
| `node tools/onboarding-verifier-origin-http.test.mjs`（P3 红测） | 退出码 `1`；`AssertionError: 403 !== 200`。 |
| `node tools/onboarding-verifier-origin-http.test.mjs`（最终） | 退出码 `0`；root、legacy `/test2/`、显式 base、trailing slash、空 `?/#` 拒绝、唯一 Origin 与真实 middleware 同源/跨源行为全部通过。 |
| `npm run test:onboarding-poc` | 退出码 `0`；11 个串行阶段全部通过。 |
| `npm run check` | 退出码 `0`；`源码静态、确定性、零外网、语义与原子资产检查通过`。 |
| `npm run build` | 退出码 `0`；Vite `6.4.1`，`1932 modules transformed`，`built in 3.23s`；CSS `281.78 kB`（gzip `46.39 kB`），JS `898.44 kB`（gzip `212.38 kB`）。 |
| `npm run test:test-deployment` | 退出码 `0`；`/test2`、根 `/api/v1`、根重定向、路径穿越保护及 `/test2/` 构建资源全部通过。 |

### 本次收敛改动文件

- `tools/onboarding-verifier-api.mjs`
- `tools/onboarding-verifier-origin-http.test.mjs`
- `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/handoffs/web.md`

### 响应式、键盘、可访问性与已知风险

- 本轮只修改 Node live-verifier URL/header 边界，不改变 Vue 页面、DOM、样式、焦点或交互；`npm run test:onboarding-poc` 中既有 Web 入口、响应式、键盘和读屏合同继续通过。
- 本轮未运行真实远端 POC，因此不把本地自动化当作 OAuth、真实审批、跨 8 天、外部重启或清理已通过的证据；这些门禁保持原样并等待独立 QA 复验。
- 当前两个 code-review open finding 的实现修复均已有回归覆盖；最终 review verdict 仍由独立 reviewer 更新。

## QA repair attempt 2 — QA-DEF-02 / QA-DEF-03（2026-09-26）

### 分支、范围与实现

- 分支：`task/digital-exhibition-ui-0817-dev-r3-web`。
- 仅处理当前 `qa-report.md` 的 `QA-DEF-02` 与 `QA-DEF-03`；未改变提交、审批、同步、附件授权或 live POC 门禁等业务逻辑。
- `QA-DEF-02`：为图标元数据 grid 显式使用 `minmax(0, 1fr)`，让 flex/grid 内容区可以真实收缩；SHA-256 采用块级、确定宽度、`overflow-wrap:anywhere` 与 `word-break:break-all`，完整文本继续保留为可选择复制的普通文本，不裁剪且不引入页面级横向滚动。
- `QA-DEF-03`：标题动作链接使用居中的 `inline-flex`；在 `≤760px` 时统一设置 `min-height:44px`，不改变桌面紧凑密度。

### 测试先行与浏览器几何证据

- 新增 `tools/onboarding-responsive-accessibility.test.mjs` 后先在修复前运行真实 Edge/Chromium：退出码 `1`。320px 下 SHA-256 元素宽 `263.953125px`、右边界 `402.953125px`，父容器宽仅 `130px`、视口与文档宽均为 `320px`；“飞书授权”高度为 `42.390625px`。失败列表同时包含哈希越出视口、哈希越出父容器、授权触控目标不足 44px。
- 最小修复后同一测试退出码 `0`：320px 下 SHA-256 元素与父容器均为 `130px`，右边界 `269px`，视口与文档宽均为 `320px`；完整 64 位哈希仍在 `textContent` 中，`user-select:auto`，`overflow-wrap:anywhere`，`word-break:break-all`。授权链接在 320px 和 760px 均为精确 `44px` 高。
- `tools/onboarding-poc-web-contract.test.mjs` 增加长期静态回归，锁定可收缩 grid track、哈希强制断行与窄屏 44px 标题动作。

### fresh command evidence

| 命令 | 精确结果 |
| --- | --- |
| `$env:EXHIBITION_TEST_APP_BASE='/test2'; node tools/onboarding-responsive-accessibility.test.mjs`（实现前） | 退出码 `1`；哈希 `right=402.953125px`、`width=263.953125px`、parent `130px`、viewport/document `320px`；授权链接 `42.390625px`。 |
| `node tools/onboarding-responsive-accessibility.test.mjs`（最终） | 退出码 `0`；哈希 `left=139px`、`right=269px`、`width=130px`，parent `130px`，viewport/document `320px`，完整可选择文本；授权链接在 320px/760px 均为 `44px`。 |
| `npm run test:onboarding-poc` | 退出码 `0`；11 个串行阶段全部通过，含新增的 Web 响应式静态合同。 |
| `npm run test:ui-source-sync` | 退出码 `0`；10 个现存 UI/交互/路由回归阶段全部通过。 |
| `npm run check` | 退出码 `0`；`源码静态、确定性、零外网、语义与原子资产检查通过`。 |
| `npm run build` | 退出码 `0`；Vite `6.4.1`，`1932 modules transformed`，`built in 3.12s`；CSS `282.19 kB`（gzip `46.46 kB`），JS `898.44 kB`（gzip `212.38 kB`）。 |
| `npm run test:test-deployment` | 退出码 `0`；`/test2`、根 `/api/v1`、根重定向、路径穿越保护和 `/test2/` 构建资源全部通过。 |

### 本次改动文件

- `src/pages/OnboardingPage.vue`
- `src/pages/OnboardingApplyPage.vue`
- `tools/onboarding-responsive-accessibility.test.mjs`
- `tools/onboarding-poc-web-contract.test.mjs`
- `.ai-team/tasks/DEH-ONBOARDING-POC-20260926/handoffs/web.md`

### 响应式、键盘、可访问性与已知风险

- Edge/Chromium 320×800：长哈希完整断行、可选择复制且无页面横向溢出；320×800 和 760×900：“飞书授权”触控目标均达到 44px。
- 本轮不改变 DOM 顺序、链接语义、可见焦点或键盘导航；既有 onboarding 与 UI 源同步套件继续覆盖标题聚焦、表格/卡片语义、状态播报和焦点样式。
- 未执行真实远端 POC，不能据此宣称 OAuth、真实审批、跨 8 天、外部重启或清理门禁已通过；这些环境证据仍由独立 QA 复验。本修复没有削弱或绕过任何 live POC 门禁。
