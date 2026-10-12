# Web Engineering Handoff

## 结论

后端恢复链路已完成实现和本地自动化验证。未修改 `src/**` 或根 `dist/**`，未直接部署测试服务器。真实环境 5 次冷读、30 次暖读、浏览器单 POST 与现场 401/403/重启证据仍须由部署方在新包部署后执行；因此本交接不声称真实环境已经验收通过。

工作区中存在其他任务/用户已有的 `src/**` 改动；本任务没有编辑这些文件，也未把它们打入本次纯后端修复范围。以下结论以本任务受控文件、部署包内容和对应测试为准。

## 2026-10-10 启动预热恢复补充

最新服务器截图证实，当时部署包虽然通过 `NEW_PACKAGE_OK` 标记检查，但 `/api/v1/health/ready` 随后稳定返回 HTTP 503、`FEISHU_UPSTREAM_TIMEOUT`。这不是成功部署，且该现场仍运行修复前的启动预热实现。

新增根因定位：`prewarm()` 曾直接并行读取九张飞书表，绕过 operation 级 25 秒截止、三次总尝试、500/1000ms 退避、全局并发 3 和 trace/sync/operation 关联。任意一次瞬时 `FEISHU_UPSTREAM_TIMEOUT` 都会让启动 READY 进入粘性失败；同时 WB-001 与 COM-005/WB-002 争抢全局读取槽位，放大启动长尾。

本轮修复将启动预热改为受控 operation：先并行完成 READY 必需的 COM-005 与 WB-002，二者均成功并持久提交/回读后，再单独执行 WB-001 快照种子。瞬时上游超时会在同一 operation 的统一预算内重试；分页事件现在携带安全的 resource、errorCode、upstreamPath、elapsedMs，以及既有 operationId/traceId/syncId，便于现场准确定位且不记录令牌、Cookie 或密钥。

## 根因

### 日志事实

- 前置 QA 记录显示首页失败任务 `sync-9d28d97d-03ee-458e-8a13-cb71747de477` 最终为 `FEISHU_READ_BUDGET_EXCEEDED`，失败 operation 为 `COM-001`，task trace 为 `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74`。
- 同一轮记录了轮询 HTTP 500 `HOMEPAGE_AGGREGATE_ERROR`，trace 为 `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb`。
- 暖首页 0/10 首次 200；APP-002、ADM-003 completed 后仍再次 202；WB-003 超时失败。
- 本任务禁止直接连接/部署服务器，未取得上述 trace 的原始 journal；这里不把 QA 摘要冒充服务器日志分析。

### 代码事实

- 首页旧实现只拼接五个子 operation 的即时缓存；COM-001/COM-002 为强一致读取，不进入普通 operation 缓存，所以首页不存在可供下一次请求命中的原子聚合缓存。
- 首页 `tasksByKey` 明确保留并复用近期 `failed` 任务，导致新请求取得旧失败 `syncId`。
- operation 缓存原来先发布内存条目，再提交持久快照；任务有机会在持久化/同键回读门槛之前暴露结果。
- 第一轮修复又暴露出提交期间用 candidate 替换 last-known-good 的问题；持久化变慢时读请求会短暂失去旧缓存。
- 首页第一轮 deadline 只覆盖五个子 operation，没有覆盖 `HOM-001` 的持久提交、发布与同键回读。
- 分页层的任务 deadline 计时器曾只拒绝 Promise、不先中止同一 AbortController；极端计时竞争下会遗留仍占飞书配额的鉴权请求。
- 第一版 staging 快照仍会让同键 candidate 覆盖磁盘中的旧 committed generation；若截止后补偿失败或进程重启，未完成候选可能被恢复。
- `TENANT_TOKEN_FAILED` 同时覆盖临时上游问题和无效凭据/缺失 token 等确定性配置故障，不能整类映射成轮询 running。
- ADM-003/MAT-001 缺少浏览器默认输入规范化，语义等价输入会生成不同六维键。
- 分页读取内含额外网络重试，和 operation 重试叠加后无法保证统一的三次总尝试。
- 状态实时鉴权只把部分命名错误识别为暂时故障；原生网络异常存在落入 500/504 映射的风险。

### 假设

- QA 中 `COM-001`/`WB-003` 的长尾由分页读取、额外局部重试、共享并发排队共同放大。没有服务器原始 journal，无法将某一次 trace 精确归因到某一个飞书 page token。

## 实现摘要

- ADM-003、MAT-001 与既有 COM-005/APP-002/WB 输入统一规范化后进入同一六维键。
- operation 提交改为：完整读取/分页完成 → success schema → 独立 staging（旧 LKG 始终可读）→ 持久快照原子提交 → 内存发布 → 同键回读 → completed。
- 增加内部 `HOM-001` 原子聚合缓存；五段全部完整才提交，用户级 TTL 保持 fresh 30 秒、max-stale 5 分钟。
- 首页 fresh/stale/LKG 先 HTTP 200；stale/LKG 只触发静默刷新，失败不覆盖旧聚合。
- active single-flight 与 retained terminal record 行为分离；completed/failed 立即移出 active，终态仍保留至少十分钟供状态查询。
- 无 LKG 的后续请求不会复用 failed/expired/timeout，同键只合并 queued/running。
- 两类状态接口保留实时身份/权限/数据范围复核；暂时鉴权慢只返回 HTTP 200 状态，不重跑业务 operation；401/403/404 保持。
- operation 统一最多三次尝试、500/1000ms 退避、统一 25 秒截止；分页层不再偷偷追加网络重试；并发上限仍为 3。
- 鉴权与业务读取共享同一个最多三次 attempt budget；任务 deadline 会先中止底层飞书请求再完成失败状态，避免孤儿请求继续消耗配额。
- `HOM-001` 的子读取、schema、持久提交、发布与同键回读全部受同一个 25 秒硬截止保护。
- 持久快照使用双 generation：candidate 明确标记 `committed:false`，并与旧 committed 同时落盘；恢复只接受 committed。第二阶段 committed 快照原子成功并重新检查 deadline/依赖后，才发布新内存值；失败时旧 LKG 始终可读并执行有界持久补偿。
- `TENANT_TOKEN_FAILED` 不再属于状态鉴权 transient allow-list；只有明确 transport/429/已批准临时错误才维持 HTTP 200 running，确定性 token/config 错误形成 HTTP 200 `state:failed` 的安全错误。
- 结构化事件包含 trace/sync/key digest/attempt/page/queue/budget/commit/transition，且不写入令牌、Cookie、密钥或原始六维键。
- 写失效会保守失效对应 `HOM-001`，失败刷新不改变 LKG 的 payload 或时间窗。

## 修改文件

- `server/feishu-read-isolation-key.mjs`
- `server/feishu-persistent-read-cache.mjs`
- `server/feishu-read-only-service.mjs`
- `server/feishu-vite-plugin.mjs`
- `server/homepage-aggregate-service.mjs`
- `tools/feishu-read-only-service.test.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/homepage-aggregate.test.mjs`
- `tools/server-cache-contract-repair.test.mjs`
- `tools/server-cache-code-review-findings.test.mjs`
- `package.json`
- `deploy/digital-exhibition-test-package/server/feishu-read-isolation-key.mjs`
- `deploy/digital-exhibition-test-package/server/feishu-persistent-read-cache.mjs`
- `deploy/digital-exhibition-test-package/server/feishu-read-only-service.mjs`
- `deploy/digital-exhibition-test-package/server/feishu-vite-plugin.mjs`
- `deploy/digital-exhibition-test-package/server/homepage-aggregate-service.mjs`
- `deploy/digital-exhibition-test-package/SHA256SUMS.txt`
- `deploy/digital-exhibition-test-package.zip`
- `deploy/digital-exhibition-test-package.zip.sha256`
- `.ai-team/tasks/DEH-SERVER-CACHE-RECOVERY-20261010/handoffs/web.md`

本轮启动预热恢复直接修改：

- `server/feishu-read-only-service.mjs`
- `tools/server-cache-contract-repair.test.mjs`
- 对应部署包内 `server/feishu-read-only-service.mjs`、清单、ZIP 与 sidecar

## 测试优先证据

修复前新增测试按预期失败：

- `node tools/server-cache-contract-repair.test.mjs`：失败于“ADM-003 缺省输入与浏览器显式默认输入必须复用同一六维键”，实际得到两个不同 `read-v2` key digest。
- `node tools/homepage-aggregate.test.mjs`：失败于“首页暖读必须命中独立聚合缓存”，第二次读取让上游调用数从 30 增至 35。

修复后新增/扩展覆盖：持久化前不可命中、提交期间 LKG 持续可读、candidate/committed 双 generation、未提交候选重启不恢复、同键回读门槛、五个代表 operation 完成后直命中、首页原子聚合与 30 次暖读、首页提交阶段硬截止、失败任务新 syncId、LKG 静默恢复、任务状态 200 合同、确定性 tenant token 失败、显式 transient allow-list、鉴权/业务共用三次尝试、鉴权请求截止中止、结构化日志关联字段及敏感值隔离。

## 自动化结果

- `npm run test:server-cache`：通过。
- `npm run test:homepage-aggregate`：通过，测试内 warm p95 `0.02–0.05ms`。
- `npm run test:feishu-latency`：通过。
- `npm run test:business-writes`：通过。
- `npm run test:test-deployment`：通过。
- `npm run test:integration`：通过。
- `npm run check`：通过。
- `npm test`：通过。
- `git diff --check`：通过，仅有 Git 的 LF/CRLF 提示，无 whitespace error。
- `git diff --name-only -- src dist`：空；本任务未修改前端源码或根 dist。
- 包结构扫描：372 entries；`.env` 仅有无密钥的 `.env.example`；runtime-cache、secret/token/cookie/private-key、私钥证书、attachment/upload 目录匹配均为 0。

说明：一次把多个定时专项并行运行时，`feishu-read-latency-cache` 出现一次调度抖动；独立复跑和随后完整 `test:feishu-latency`、`test:server-cache` 均通过。

启动预热恢复测试采用先红后绿：新增“第一次 listRecords 抛出 `FEISHU_UPSTREAM_TIMEOUT`，随后必须在受控 operation 重试内恢复”的场景，修复前按预期失败，修复后通过；同时验证启动只预热 COM-005/WB-002/WB-001，且分页日志具备 operationId/traceId/syncId。最终顺序调整后再次通过 `node tools/server-cache-contract-repair.test.mjs`、`node tools/homepage-aggregate.test.mjs`、`npm run test:server-cache`、`npm run test:integration`、`npm run test:test-deployment`、`npm run check` 和 `npm test`。

## 部署包

- ZIP：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-test-package.zip`
- sidecar：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-test-package.zip.sha256`
- SHA-256：`02126806aa3012e85c94af860484fa6391c8513779a4bd0ae428f0f79cf46611`
- 大小：`4,011,646 bytes`

## 部署命令

先把 ZIP 和 sidecar 上传到 `/home/seaoil/pre-demo/releases/`，然后执行：

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=$(date +%Y%m%d%H%M%S)
STAGE="$BASE/releases/$RELEASE_ID"
ROLLBACK="$BASE/rollback-$RELEASE_ID"

sudo install -d -m 755 "$BASE/releases"
cd "$BASE/releases"
sha256sum -c digital-exhibition-test-package.zip.sha256
getent group seaoil-deh >/dev/null 2>&1 || sudo groupadd --system seaoil-deh
id -u seaoil-deh >/dev/null 2>&1 || sudo useradd --system --gid seaoil-deh --home-dir "$BASE" --shell /usr/sbin/nologin seaoil-deh
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$BASE/runtime-cache" "$STAGE"
sudo unzip -q digital-exhibition-test-package.zip -d "$STAGE"
cd "$STAGE/digital-exhibition-test-package"
sha256sum -c SHA256SUMS.txt
test -f "$BASE/test/.env"
sudo cp --preserve=mode,timestamps "$BASE/test/.env" ./.env
sudo chmod 600 ./.env
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 ./.local
sudo chown -R seaoil-deh:seaoil-deh "$STAGE/digital-exhibition-test-package" "$BASE/runtime-cache"
sudo -u seaoil-deh node -e "import('undici').then(() => console.log('bundled runtime dependency ok'))"

sudo systemctl stop digital-exhibition-test.service
if [ -d "$BASE/test/.local" ]; then sudo cp -a "$BASE/test/.local/." ./.local/; fi
sudo mv "$BASE/test" "$ROLLBACK"
sudo mv "$STAGE/digital-exhibition-test-package" "$BASE/test"
sudo install -m 644 "$BASE/test/digital-exhibition-test.service" /etc/systemd/system/digital-exhibition-test.service
sudo systemctl daemon-reload
sudo systemctl enable --now digital-exhibition-test.service
echo "DEPLOYED_RELEASE_ID=$RELEASE_ID"
```

## 验证命令

```bash
set -euo pipefail
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 20); do
  HTTP=$(curl -sS -o /tmp/deh-ready.json -w '%{http_code}' http://127.0.0.1:4173/api/v1/health/ready || true)
  cat /tmp/deh-ready.json
  [ "$HTTP" = 200 ] && break
  sleep 2
done
test "$HTTP" = 200
curl -fsSI https://test-pre-demo-seaoil.xdata.work/test2/
sudo systemctl is-active digital-exhibition-test.service
sudo systemctl show digital-exhibition-test.service -p User -p Group -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemoryCurrent
test "$(sudo systemctl show digital-exhibition-test.service -p User --value)" = seaoil-deh
test "$(sudo systemctl show digital-exhibition-test.service -p MemoryCurrent --value)" -le 2147483648
test "$(sudo stat -c '%a' /home/seaoil/pre-demo/runtime-cache)" = 700
test "$(sudo stat -c '%U:%G' /home/seaoil/pre-demo/runtime-cache)" = seaoil-deh:seaoil-deh
test "$(sudo du -sb /home/seaoil/pre-demo/runtime-cache | awk '{print $1}')" -le 3221225472
```

现场 trace 日志采集：

```bash
sudo journalctl -u digital-exhibition-test.service --since '30 minutes ago' --no-pager -o cat > /tmp/deh-cache-recovery.log
grep -E 'trace-0795a3ae-8e04-447e-9c33-5ba1797cec74|trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb|\[deh-cache\]' /tmp/deh-cache-recovery.log
grep '\[deh-cache\]' /tmp/deh-cache-recovery.log | grep -E 'syncId|keyDigest|attempt|page|queueMs|budgetMs|commit|transition'
```

## 现场 5 冷 / 30 暖原始结果模板

需使用同一固定身份、Base、权限集合、数据范围和规范化输入。每次冷读只失效目标六维键及 HOM-001，不清共享表缓存。

```text
COLD n=1..5: startedAt=; firstHttp=; firstMs=; syncId=; polls=[{http,state,ms,trace}]; terminal=; totalMs=; sections=COM-001,COM-002,COM-005,WB-001,WB-002; repeatedHomepagePost=0
WARM n=01..30: startedAt=; firstHttp=; firstMs=; completeFiveSections=true|false; syncId=none|value; trace=
STATUS SUMMARY: totalPolls=; http200=; http500=0; http504=0
REPRESENTATIVE: operation=COM-005|APP-002|MAT-001|WB-003|ADM-003; first=; rereadHttp=200; rereadMs=; cacheStatus=; trace=
SECURITY: anonymous=401; revoked=403; wrongOwner=403; missingTask=404
RESTART: readyHttp=200; restoredEntries=; verifiedHits=; firstHomepageHttp=200; firstHomepageMs=
```

通过门槛：冷读 5/5 在 25 秒内 completed；暖读至少 27/30 首次 5 秒内 HTTP 200；状态查询 0 次 500/504；轮询期间原首页 POST 仅 1 次；五个代表 operation 首次完整且同输入复读 200；页面无需手动刷新；401/403、2GB、3GB、并发 3 无回归。

## 回滚命令

把 `<RELEASE_ID>` 替换为部署输出值：

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=<RELEASE_ID>
sudo systemctl stop digital-exhibition-test.service
test -d "$BASE/rollback-$RELEASE_ID"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$BASE/rollback-$RELEASE_ID/.local"
if [ -d "$BASE/test/.local" ]; then sudo cp -a "$BASE/test/.local/." "$BASE/rollback-$RELEASE_ID/.local/"; fi
sudo mv "$BASE/test" "$BASE/failed-$RELEASE_ID"
sudo mv "$BASE/rollback-$RELEASE_ID" "$BASE/test"
sudo chown -R seaoil-deh:seaoil-deh "$BASE/test" "$BASE/runtime-cache"
if [ -f "$BASE/test/digital-exhibition-test.service" ]; then
  sudo install -m 644 "$BASE/test/digital-exhibition-test.service" /etc/systemd/system/digital-exhibition-test.service
fi
sudo systemctl daemon-reload
sudo systemctl start digital-exhibition-test.service
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 20); do curl -fsS http://127.0.0.1:4173/api/v1/health/ready && break; sleep 2; done
curl -fsS http://127.0.0.1:4173/api/v1/health/ready
```

回滚保留 `/home/seaoil/pre-demo/runtime-cache/`。如旧版本不兼容新快照，只能先停服务后把该目录重命名隔离，再创建新的 `0700 seaoil-deh:seaoil-deh` 空目录；不要删除快照。

## 未执行检查与风险

- 未部署服务器，因任务明确禁止直接部署。
- 最新截图中的 READY 503 属于修复前部署包的现场失败；新 SHA-256 为 `02126806aa3012e85c94af860484fa6391c8513779a4bd0ae428f0f79cf46611` 的包尚未部署，不能把截图记为新包验证结果。
- 未执行真实环境 5 冷/30 暖、真实浏览器单 POST、撤权、重启恢复和回滚演练；上方命令与模板供部署后执行。
- 无上述 trace 的服务器原始 journal，因此只能把 QA 记录与旧代码路径对应，不能断言某一具体飞书分页请求是唯一根因。
- HOM-001 对业务表写入采用安全优先的保守失效；会增加下一次静默刷新，但不会绕过权限或返回部分数据。
