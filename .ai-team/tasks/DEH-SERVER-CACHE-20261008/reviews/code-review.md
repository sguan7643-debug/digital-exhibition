# Front-end Code Review

## Findings

无阻断性发现。

## Out-of-Scope Observations

### Observation: 最新服务器包仍需完成测试环境验收
- **File/Line:** `.ai-team/tasks/DEH-SERVER-CACHE-20261008/handoffs/web.md:10`、`.ai-team/tasks/DEH-SERVER-CACHE-20261008/handoffs/web.md:104`
- **Evidence:** 最新包尚未部署到测试服务器，因此真实飞书环境中的 5 次冷首页、30 次暖首页、真实撤权、重启快照命中、systemd/Nginx 资源限制和现场回滚仍未执行。
- **Impact:** 不影响本次三个代码 finding 的关闭结论，但代码审查批准不能替代功能 QA、部署验证或发布批准。
- **Recommendation:** 部署后按 handoff 中的验收与回滚命令收集独立证据，继续保持 release approval 为 false，直至治理流程完成。

## Verdict

approved

## Review Boundary

- 本次仅对上一版 `reviews/code-review.md` 中的 3 个 finding 做定向复审；任务仍处于 `qa`，Web/Vue 为唯一声明平台，所需任务资料与最新 `handoffs/web.md`、`engineering-handoff.md` 均可用。
- **持续慢鉴权 finding 已关闭：** `server/feishu-read-only-service.mjs:295-309`、`server/feishu-read-only-service.mjs:2019-2088`、`server/feishu-read-only-service.mjs:2176-2215` 增加按 operation 与完整身份隔离的短 TTL continuation；结果在 `consumeTaskStatusAuthorization` 中先删除再返回或抛出，成功与明确 401/403 可由下一轮询一次性消费，瞬时上游失败继续重试。原有 owner、权限指纹和数据范围比较仍位于 `server/feishu-read-only-service.mjs:645-666`，状态查询未调用原业务 operation。
- **持续慢鉴权测试已覆盖：** `tools/feishu-cache-authorization.test.mjs:142-271` 对 completed、failed 和 revoked 三种终态持续施加超过状态预算的鉴权延迟，验证先 HTTP 200 + running，随后分别得到 HTTP 200 + completed、HTTP 200 + failed、HTTP 403，并断言业务读取不增加及下一轮询不重新发起权限读取。
- **AsyncLocalStorage finding 已关闭：** `server/feishu-read-only-service.mjs:2132-2148` 使用 `syncTaskScope.run(undefined, ...)` 启动唯一共享上游鉴权，调用方各自仍通过 `waitForAuthorization` 执行独立 deadline/abort。对应测试 `tools/feishu-cache-authorization.test.mjs:273-328` 验证首个短 deadline 结束后，第二调用方复用同一权限读取并成功，结果为 `reads: 1`、`aborts: 0`。
- **真实冷首页测试 finding 已关闭：** `tools/homepage-aggregate.test.mjs:287-389` 只执行公共 `prewarm()`，随后使用未预热的新身份发起冷请求；测试验证 202 → 同一任务 completed、五段完整结果、消息投影一次、WB-001 写入持久快照、至少一次 flush、峰值并发为 2–3，以及状态轮询不增加业务表读取。
- 审查员独立复跑 `node tools/feishu-cache-authorization.test.mjs` 与 `node tools/homepage-aggregate.test.mjs`：均 PASS。最新 handoff 另记录两组专项各连续 5 次通过，最终 staging 上 `npm run test:server-cache` PASS。
- 最终服务器包 `deploy/digital-exhibition-test-package.zip` 已重建；本地实算大小为 `4,005,925` bytes，SHA-256 与 sidecar 均为 `e42e975ecd5c35e139605bda8ee84a87a660fe285be4d72793a10eab80b63961`，与最新两份 handoff 一致。
- 本次未修改实现、测试、handoff、task.json、前端源码或 dist；唯一写入文件为本审查报告。该 `approved` 仅表示本次代码审查无阻断 finding，不代表合并、部署或发布批准。
