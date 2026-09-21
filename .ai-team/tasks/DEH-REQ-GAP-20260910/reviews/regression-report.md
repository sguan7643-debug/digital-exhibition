# DEH-REQ-GAP-20260910 回归测试报告

## 结论

**结果：failed**

指定的全量测试与生产构建均已执行完毕，没有超时或未完成项。`npm test` 与 `npm run build` 通过；`npm run test:integration` 因 1 个源码守卫断言失败而返回 exit code 1。对被 `&&` 短路的第 5–30 项集成测试逐项补跑后，全部通过。综合集成结果为 29/30 个测试脚本通过、1/30 个失败。

101 个 operation registry 的核心契约已实际执行通过；失败点不是 registry 的数量、唯一性、分批、fixture 对齐、传输接收或页面归属，而是 `App.vue` 仍包含测试禁止的 `integrationRuntime.mode === 'remote'` 页面分支。因此当前回归门禁不能判定通过。

## 执行信息

- 执行时间：2026-09-11 00:11（Asia/Shanghai）
- 仓库：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged`
- Git commit：`3fd9504`
- 环境：Windows NT 10.0.26200.0；Node.js `v20.14.0`；npm `10.7.0`
- 约束：仅运行现有测试与构建；未修改产品代码；未提交。

## 命令与结果

| 命令 | Exit code | 通过/失败摘要 |
| --- | ---: | --- |
| `npm run test:integration` | 1 | 30 个串联脚本执行至第 4 项：前 3 项通过，第 4 项 `feishu-integration-review-remediation.test.mjs` 失败，第 5–30 项因 `&&` 短路未由此命令执行。 |
| `npm test` | 0 | 41/41 个串联测试脚本通过。日志出现多条 `Failed to resolve component: AppIcon` Vue 警告，但没有失败用例。 |
| `npm run build` | 0 | Vite 生产构建通过；1939 个模块完成转换；构建耗时约 4.08 秒。产物摘要：HTML 0.44 kB、CSS 292.98 kB、JS 916.22 kB。 |
| `node tools/feishu-integration-round-2-remediation.test.mjs` | 0 | operation registry 相关 Round 2 契约通过。 |
| `node tools/feishu-integration-round-3-remediation.test.mjs` | 0 | operation registry 相关 Round 3 契约通过。 |
| `node tools/feishu-integration-round-4-remediation.test.mjs` | 0 | operation registry 相关 Round 4 契约通过。 |
| `node tools/feishu-safe-test-record.test.mjs` | 0 | 所有写 operation 的 TEST_ 前缀、幂等、冲突、回滚及清理契约通过。 |
| `node tools/feishu-server-proxy.test.mjs` | 0 | 服务端凭据、64 表标识合同、默认分页和只读门禁通过。 |
| 原 `test:integration` 第 5–30 项逐项执行（分别调用其现有 `node tools/*.test.mjs` 命令） | 每项均为 0 | 为消除 `&&` 短路影响，完整补跑 26 项；26/26 通过。包含上述 5 个专项脚本的重复确认。 |

### 集成补跑明细（原脚本序号 5–30）

| 序号 | 测试脚本 | Exit code | 结果 |
| ---: | --- | ---: | --- |
| 5 | `feishu-integration-round-2-remediation.test.mjs` | 0 | passed |
| 6 | `feishu-integration-round-3-remediation.test.mjs` | 0 | passed |
| 7 | `feishu-integration-round-4-remediation.test.mjs` | 0 | passed |
| 8 | `feishu-server-proxy.test.mjs` | 0 | passed |
| 9 | `feishu-app-page-integration.test.mjs` | 0 | passed |
| 10 | `feishu-authenticated-page-entry.test.mjs` | 0 | passed |
| 11 | `feishu-page-read-request-plan.test.mjs` | 0 | passed |
| 12 | `feishu-talent-read-integration.test.mjs` | 0 | passed |
| 13 | `feishu-public-read-batch.test.mjs` | 0 | passed |
| 14 | `feishu-first-batch-detail-reads.test.mjs` | 0 | passed |
| 15 | `feishu-dictionary-comments-read.test.mjs` | 0 | passed |
| 16 | `feishu-personal-read-batch.test.mjs` | 0 | passed |
| 17 | `feishu-workbench-search.test.mjs` | 0 | passed |
| 18 | `feishu-identity-detail-reads.test.mjs` | 0 | passed |
| 19 | `feishu-admin-read-batch.test.mjs` | 0 | passed |
| 20 | `feishu-user-auth.test.mjs` | 0 | passed |
| 21 | `feishu-auth-middleware.test.mjs` | 0 | passed |
| 22 | `feishu-approval-service.test.mjs` | 0 | passed |
| 23 | `feishu-approval-middleware.test.mjs` | 0 | passed |
| 24 | `feishu-current-user-operation.test.mjs` | 0 | passed |
| 25 | `feishu-schema-admin.test.mjs` | 0 | passed |
| 26 | `feishu-safe-test-record.test.mjs` | 0 | passed |
| 27 | `feishu-write-operation-service.test.mjs` | 0 | passed |
| 28 | `feishu-oauth-write-acceptance.test.mjs` | 0 | passed |
| 29 | `application-use-flow.test.mjs` | 0 | passed |
| 30 | `application-interaction-flow.test.mjs` | 0 | passed |

## 101 个 operation registry 契约核对

直接引用 `src/integration/operation-registry.js` 的现有测试脚本共 8 个。7 个脚本完整通过；`feishu-integration-review-remediation.test.mjs` 在最后一个与 `App.vue` 源码结构有关的断言处失败，但该脚本此前的 registry 专项断言均已执行通过。

| 契约 | 证据脚本 | 结果 |
| --- | --- | --- |
| Registry 总数固定为 101 | `feishu-integration-foundation.test.mjs` | passed |
| First/Later/Deferred 分批分别为 25/59/17，合计 101 | `feishu-integration-foundation.test.mjs` | passed |
| 101 个 ID 全部唯一，三批合并也无重复 | `feishu-integration-foundation.test.mjs` | passed |
| 独立 operation fixture 含 101 项，且与运行时 registry ID 精确一致 | `feishu-source-contract.test.mjs` | passed |
| 101 项逐一存在；来源字段门禁、API 标识、API ready、remote enabled 状态符合 fixture/安全默认值 | `feishu-source-contract.test.mjs` | passed |
| 受控 transport 接受全部 101 个 operation ID，并拒绝未知 `BAD-999` | `feishu-integration-review-remediation.test.mjs` 第 23–36 行 | passed（失败断言发生在第 179 行之后） |
| 101 个 operation 全部具有页面归属 | `feishu-integration-review-remediation.test.mjs` 第 49–56 行 | passed（失败断言发生在第 179 行之后） |
| 36 个写接口全部登记到对应页面动作合同 | `feishu-integration-review-remediation.test.mjs` 第 54–62 行 | passed（失败断言发生在第 179 行之后） |
| 所有 operation 默认 `remoteEnabled === false`，写 operation 同样默认关闭 | `feishu-integration-foundation.test.mjs` | passed |
| Round 2/3/4 安全代理、schema、取消与错误优先级契约 | 三个 round remediation 测试 | passed |
| 写 operation 的测试数据隔离与服务端只读门禁 | `feishu-safe-test-record.test.mjs`、`feishu-server-proxy.test.mjs` | passed |

专项结论：**101 个 operation registry 数据与映射契约通过；包含它的整体集成回归仍因下述页面源码守卫失败。**

## 失败用例

### REG-001：App.vue 保留被契约禁止的直接 remote 模式分支

- 失败脚本：`tools/feishu-integration-review-remediation.test.mjs`
- 失败位置：测试第 179 行
- 断言：`assert.doesNotMatch(appSource, /integrationRuntime\.mode\s*===\s*'remote'/)`
- 复现步骤：
  1. 在仓库根目录运行 `npm run test:integration`。
  2. 等待前三个集成脚本通过。
  3. 观察第 4 个脚本在源码结构断言处抛出 `AssertionError [ERR_ASSERTION]`。
- 预期：`src/App.vue` 不应直接包含 `integrationRuntime.mode === 'remote'` 条件，页面读取行为应由既有数据源/operation 能力合同统一决定。
- 实际：`src/App.vue:249` 存在 `if (route === '/apps' && integrationRuntime.mode === 'remote')`。
- 影响：`npm run test:integration` 返回 exit code 1，集成回归门禁失败；不影响本次 `npm test` 或生产构建成功。
- 严重度：Major（阻断集成回归通过）

## 非阻断观察

- `npm test` 的 mounted 详情页测试中多次出现 Vue 警告：`Failed to resolve component: AppIcon`，涉及 `ToolDetailPage`、`HainengWorkDetailPage`、`ReportDetailPage`、`DashboardDetailPage`。所有相关测试仍返回 exit code 0；本报告不将其计为失败用例，但建议后续确认测试挂载配置或组件注册是否完整。
- 任务包当前 `task.json.state` 为 `scope_review`，范围、设计、发布审批均为未批准，且任务目录中没有批准的 `prd.md`、设计交接或 `engineering-handoff.md`。因此本报告仅给出所指定命令的代码级回归证据，不构成正式功能 QA 签核或发布批准。

## 工作区完整性

- 测试前仓库已有未跟踪项：`.ai-team/`、`dist.rar`、`public/live-approval-runner.html`。
- 测试与构建未产生任何已跟踪产品代码差异；构建产物位于现有忽略的 `dist/`。
- 本次唯一有意写入为本报告；未执行 git commit。
