# Web 交接 — DEH-LIVE-READ-CLOSURE-20260918

- 分支：`task/digital-exhibition-ui-0817-dev-r3-web`
- 框架：Vue 3
- 结果：`failed`（确定性前端错误已修复；真实飞书详情读取仍存在 10 秒预算 `504`，不可宣称闭环通过）

## 本轮修复

1. `MAT-001` 详情页读取不再发送服务端未允许的 `page/pageSize`，消除截图中的 HTTP 400。
2. 应用中心普通首入不再自动调用 `/api/v1/approvals/reconcile`；审批提交、审批状态页和服务端显式审批动作继续负责状态同步，避免旧审批实例错误污染普通应用读取并阻塞首屏。
3. 保留页面切换时取消旧页面请求的行为；DevTools 中 `(canceled)` 是预期竞态保护，不作为后端失败。
4. 本地联调配置补充 `VITE_EXHIBITION_APP_BASE=/test2`；OAuth 返回 `/test2/` 后会规范到 `/test2/workbench`，不再被解析成“页面不存在”并同时误发工作台读取。

## 变更文件

- `src/App.vue`
- `src/integration/page-read-request-plan.js`
- `tools/page-read-request-plan.test.mjs`
- `tools/feishu-page-read-request-plan.test.mjs`
- `.env.local`（本地运行配置，不进入版本库）

## 测试证据

- RED：`node tools/page-read-request-plan.test.mjs` 在修复前因 `MAT-001` 实际输入为 `{ page: 1, pageSize: 100 }` 失败。
- RED：`node tools/feishu-page-read-request-plan.test.mjs` 在修复前因应用中心自动包含 `/api/v1/approvals/reconcile` 失败。
- GREEN：上述两项定向测试通过。
- `pnpm test:integration`：通过。
- `pnpm check`：通过。
- `pnpm build`：通过，1956 modules transformed。
- `http://127.0.0.1:4173/test2/`：HTTP 200；Vite 运行时注入的应用基础路径为 `/test2`。

## 响应式、键盘与可访问性

本轮未改视觉结构、焦点顺序、交互控件或响应式布局；删除的是隐藏的自动对账副作用，MAT-001 仅修正请求输入。既有 UI/无障碍合同由集成与静态检查继续覆盖。

## 已知阻断

- `APP-003` / `APP-009` 等真实飞书详情读取仍可能达到服务端 `FEISHU_READ_BUDGET_MS` 默认 10 秒并返回 504。
- 浏览器请求已由 `Promise.allSettled` 并发发出；截图中同批接口同时结束，慢点位来自服务端到飞书的表读取、2 秒短缓存和字段组合缓存分裂，不是前端串行排队。
- 缓存、SWR、共享表快照、冷启动同步态和写后精确失效属于 `DEH-FEISHU-READ-LATENCY-20260918`。该任务当前仅范围批准，设计批准仍为 `false`，因此本轮没有越权实施。

## 2026-09-28 系统级读取性能修复

- 结果：`passed`（Web 实现、自动化回归、本地 HTTP 冒烟及真实飞书高频读取热路径验证通过）。
- 65 个读取操作已建立完整策略矩阵：56 个缓存读取采用 stale-while-revalidate，9 个强一致读取不缓存但共享同键并发中的上游任务。
- 应用中心、素材中心、个人中心和上架申请详情等多接口页面改为一次页面批量请求；首页继续使用专用聚合接口。
- 个人消息、收藏和积分读取把用户过滤条件下推到飞书，避免整表读取后再由 Node 过滤。
- 缓存加入旧数据降级、LRU 容量边界和命中/刷新/失败/同请求复用指标；刷新失败时仍返回未超过允许旧数据窗口的缓存，避免页面变空。
- 新增批量接口严格限制为 1–16 个只读操作，逐项返回状态；`202 INITIAL_SYNCING` 不会被前端误判为成功。

### 变更文件

- `server/feishu-read-cache-policies.mjs`
- `server/feishu-read-only-service.mjs`
- `server/feishu-proxy-handler.mjs`
- `src/integration/safe-proxy-client.js`
- `src/integration/page-data-source.js`
- `tools/feishu-system-read-cache.test.mjs`
- `tools/feishu-page-batch.test.mjs`
- `tools/feishu-read-only-service.test.mjs`
- `package.json`

### 验证证据

- 测试先行：新测试初次运行因缺少读取策略模块失败，完成实现后转为通过。
- `npm run test:feishu-latency`：通过。
- `npm run test:integration`：通过。
- `npm run check`：通过。
- `npm test`：通过。
- `npm run build`：通过，1932 modules transformed。
- 本地 `GET /test2/`：HTTP 200；`POST /api/v1/operations/batch`：HTTP 200，结果项 `code=OK`。
- 真实飞书验证：5 个首页高频操作各 32 次、并发 8；全部通过。P95：COM-001 0.20ms、COM-002 0.05ms、COM-005 0.26ms、WB-001 0.06ms、WB-002 0.63ms。
- 真实冷预热耗时 40.865 秒；该值反映飞书首次整表同步成本，不把它伪装成热路径达标。服务启动预热与旧缓存降级已保护页面请求，但后续仍可继续以增量同步压缩首次部署等待。

### Web 平台检查

- 本轮没有修改页面结构、视觉样式、焦点顺序或键盘交互。
- 页面层请求收敛、错误态和取消语义保持兼容；单项初始同步与失败仍由既有页面降级路径处理。
- Web 平台检查通过；未声明移动端平台。
