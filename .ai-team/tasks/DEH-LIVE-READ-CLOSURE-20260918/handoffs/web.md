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
