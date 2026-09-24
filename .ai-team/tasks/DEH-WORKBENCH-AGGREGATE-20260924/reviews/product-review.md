# Product Scope Review

## Verdict

`approved`

该任务已达到范围决策就绪状态。问题、用户价值、页面级聚合边界、30 秒响应语义、单飞同步、轻量轮询、启动预热、陈旧降级、权限隔离和验收证据均已明确。本结论只表示产品评审通过，不代表用户已经批准当前任务范围。

## Findings

### Finding 1：30 秒目标已被定义为可验证的响应边界

- **Evidence:** `prd.md` 1.1、5.3、AC-04 明确规定每次聚合 HTTP 请求必须在 30 秒内返回 `200` 或 `202`，不承诺飞书冷读取在 30 秒内完成。
- **Impact:** 避免将不可控的飞书上游耗时误写成产品保证，同时可以直接验证浏览器和代理侧不再出现应用等待导致的 504。
- **Recommendation:** 实现时在应用层约 25 秒主动收口，并将 Nginx 超时设置为高于 30 秒的部署前置条件。

### Finding 2：启动预热与用户身份边界已消除歧义

- **Evidence:** `prd.md` A-02、3.1、4.3、AC-07 将启动预热限定为公共表；用户专属数据在首次授权请求后按租户、身份和权限指纹单飞同步。
- **Impact:** 既满足首页关键公共数据预热，又不会在没有用户身份时错误读取、缓存或共享个人数据。
- **Recommendation:** 用户批准范围时需明确接受该边界；实现不得把 readiness 通过解释为所有用户数据都已预热。

### Finding 3：轮询不会再次触发完整业务读取

- **Evidence:** `prd.md` 4.2、5.2、7.2、AC-06 明确状态接口只读任务和缓存元数据，完成后仅重新拉取一次聚合结果。
- **Impact:** 首次读取期间不会因前端轮询或多个组件而生成重复飞书任务。
- **Recommendation:** 测试必须同时断言状态轮询次数和实际上游调用数，不能只断言 HTTP 状态码。

### Finding 4：陈旧缓存的可用性与安全边界均可验收

- **Evidence:** `prd.md` A-03、4.1、6、AC-08、AC-09 规定刷新失败不覆盖成功快照，同时限制租户、身份、权限、输入、合同版本和最大陈旧窗口。
- **Impact:** 可以防止页面变空，也避免跨身份复用或无限期返回旧数据。
- **Recommendation:** 聚合响应应保留分区级状态，避免单个分区失败导致其他已成功分区被清空。

## Verification Summary

- 五项首页 operation 已固定为 `COM-001`、`COM-002`、`COM-005`、`WB-001`、`WB-002`。
- HTTP 结果已固定为 `200 fresh/stale/partial` 或 `202 syncing`，并有 30 秒硬边界。
- 同步任务键已包含租户、身份、权限、输入和合同版本维度。
- 启动预热、状态轮询、陈旧降级、真实空数据、部分可用、任务过期和异常浮窗恢复均有明确状态与验收标准。
- 现有单 operation 接口保留兼容，不在本任务执行部署、发布或持久化缓存。
- `task.json.state=scope_review` 且 `approvals.scope.approved=false`，符合评审前提。

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, or change task state.
