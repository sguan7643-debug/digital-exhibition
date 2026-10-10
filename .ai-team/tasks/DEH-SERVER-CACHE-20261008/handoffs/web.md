# Web Engineering Handoff — DEH-SERVER-CACHE-20261008（QA Repair Attempt 2）

## 1. 交付结论

- 分支：`task/digital-exhibition-ui-0817-dev-r3-web`。
- 框架：Web / Vue；本轮只修改后端源码、后端测试、任务交接和服务器部署包。
- 修复了首页五个子 operation 在实时鉴权、用户投影和飞书同步槽上的重复竞争；真实服务风格的缩短时限测试已覆盖“冷请求 202、后台在硬截止前 completed、完整 result、轮询不重放业务 operation”。
- 修复了任务状态查询在实时鉴权暂时超时时暴露 HTTP 504 的问题。已存在且原始身份匹配的任务会继续通过 HTTP 200 返回 `running`；终态结果在实时权限与数据范围校验成功前不会释放。明确的 401/403 仍原样生效。
- 飞书多维表格仍是唯一业务数据源；未引入 Redis 或其他数据库。
- 未部署测试服务器。新包部署前，不能把真实环境 5 次冷请求和暖缓存 90% 指标声明为通过。
- 未修改前端源码或根 `dist`；工作区中原有用户前端改动均保留。

## 2. 本轮实现

### 2.1 首页聚合

- 首页五个 operation 在同一个共享读取批次执行，并继续受全局最多 3 路飞书同步并发限制。
- `COM-001`、`COM-002`、`WB-001` 复用同一次已实时鉴权的当前用户投影，避免重复读取消息、收藏、积分和用户信息。
- 当前用户通讯录摘要优先通过单用户接口读取，不再为首页扫描整棵部门/人员目录。
- 首页仍使用同一套六维缓存键；仅 `WB-001` 的公开目录底层表可以复用有效启动快照，身份、权限和当前用户数据仍实时读取。
- 后台任务硬截止仍为 25 秒；`completed.result` 保持原首页成功响应结构。

### 2.2 任务状态合同

- `/api/v1/sync-jobs/{syncId}` 和 `/api/v1/operations/sync-jobs/{syncId}` 先做本地会话身份及原始任务 owner 校验，再做实时飞书权限/数据范围校验。
- 状态鉴权有独立的短响应预算，并进入高优先级鉴权队列；它与业务同步共同遵守最多 3 路并发。
- 临时上游超时、限流或 5xx 不再映射成任务状态 HTTP 500/504，而是 HTTP 200、`state=running`、正整数 `pollAfterMs`。
- 超时后仍在执行的实时鉴权只保留一个最长 6 秒、一次性消费的续接结果，使下一轮询能够取得 completed/failed 或明确 403；消费后立即删除，不形成长期权限缓存。
- 已完成或失败的任务在实时鉴权尚未完成时暂不泄露 `result` / `error`；鉴权成功后返回真实终态。
- 明确未登录仍返回 401；用户、权限集合或数据范围不匹配仍返回 403。
- 状态查询只读取任务记录和实时权限，不重新执行原业务 operation。

### 2.3 并发与截止

- 实时鉴权请求按身份单飞合并，但不继承第一个浏览器调用者的短截止；每个调用者单独执行自己的等待预算。
- 共享上游鉴权明确在空的 AsyncLocalStorage 同步任务上下文中启动；首个调用者超时不会取消第二个同身份调用者复用的权限读取。
- 鉴权队列优先于普通分页队列，避免首页同步占满三路槽后状态查询长期饥饿。
- 测试用 AbortSignal 桩补齐“信号已在监听器安装前中止”的处理，消除并发负载下的假阴性；生产截止时间未放宽。

## 3. 修改文件

本轮 Repair Attempt 2 直接修改：

- `server/feishu-read-only-service.mjs`
- `server/homepage-aggregate-service.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/homepage-aggregate.test.mjs`
- `tools/feishu-read-latency-cache.test.mjs`
- `.ai-team/tasks/DEH-SERVER-CACHE-20261008/handoffs/web.md`

重新生成的后端部署交付物：

- `deploy/digital-exhibition-test-package/server/feishu-read-only-service.mjs`
- `deploy/digital-exhibition-test-package/server/homepage-aggregate-service.mjs`
- `deploy/digital-exhibition-test-package/SHA256SUMS.txt`
- `deploy/digital-exhibition-test-package.zip`
- `deploy/digital-exhibition-test-package.zip.sha256`

治理脚本会更新：

- `.ai-team/tasks/DEH-SERVER-CACHE-20261008/task.json` 中的 Web 检查字段。

明确未由本轮编辑：

- `src/**`
- 根 `dist/**`
- 前端组件、样式、路由和视觉资源

## 4. 自动化测试结果

本机：Windows，Node.js `v20.14.0`，npm `10.7.0`。

| 命令 | 结果 | 关键证据 |
| --- | --- | --- |
| `node tools/feishu-cache-authorization.test.mjs` | PASS | 持续慢鉴权下 completed/failed 最终可见、撤权最终 403；状态始终不重跑业务；第二调用者复用未继承首调用者截止的同一次权限读取。 |
| `node tools/homepage-aggregate.test.mjs` | PASS | 新用户真实冷首页（仅公共启动快照）完成 202→completed 五段 result；WB-001 已持久提交、上游峰值 2–3、共享消息投影一次、轮询不重读；通讯录使用飞书 userId。 |
| `npm run test:server-cache` | PASS | 持久快照、六维键、30 次暖读、任务状态、启动恢复、资源/权限、包内源码/校验清单和回滚合同全部通过。 |
| `npm run test:integration` | PASS | 完整后端集成及前端同步协议兼容通过。 |
| `npm run test:homepage-aggregate` | PASS | 精确末行：`homepage aggregate single-flight, lightweight polling, stale fallback, and client flow passed; warm p95=0.10ms`。 |
| `npm run test:feishu-latency` | PASS | 读取预算、硬截止、中止、重试、缓存和共享投影通过。 |
| `npm run test:business-writes` | PASS | 36 个正式写映射、身份、权限、审批、幂等和审计治理通过。 |
| `npm run test:test-deployment` | PASS | `/test2/`、API、静态文件和子路径构建合同通过。 |
| `npm run check` | PASS | 源码静态、确定性、零外网、语义与原子资产检查通过。 |
| `npm test` | PASS | 默认完整回归通过。 |
| `git diff --check -- <本轮后端与测试文件>` | PASS | exit code 0；仅 Windows LF/CRLF 提示。 |

一次将 `test:server-cache` 与完整集成并行运行时，测试桩漏记了已提前中止的 AbortSignal，产生一次假阴性；修正测试桩后，目标测试连续 10 次通过，随后完整 `npm run test:server-cache` 通过。没有放宽生产时限或跳过断言。

审查修复后的鉴权专项与真实冷首页专项各连续运行 5 次，均为 5/5 通过。

## 5. 部署包

- ZIP：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-test-package.zip`
- SHA-256：`e42e975ecd5c35e139605bda8ee84a87a660fe285be4d72793a10eab80b63961`
- 大小：`4,005,925 bytes`
- ZIP 普通文件项：`372`
- 禁止项扫描：`.env`、`runtime-cache`、私钥/证书文件均为 `0`
- 旁车：`deploy/digital-exhibition-test-package.zip.sha256`
- 生成命令：`node tools/create-test-deployment-package.mjs --skip-build`
- 根 `dist` Git 状态为空；生成过程没有构建或改写前端。

## 6. 未执行检查与已知风险

- 新包尚未部署，因此以下真实环境验收未执行：5 次首页冷请求全部最终 completed；30 次暖首页至少 90% 在 5 秒内 HTTP 200；真实撤权用户；目标 Ubuntu/Node 22.23.2；systemd/Nginx 资源限制；现场回滚。
- 当前测试地址仍运行上一部署版本时，原有 `READ_SYNC_DEADLINE_EXCEEDED` 和状态 HTTP 504 证据仍然有效，不能用本地通过覆盖。
- 真实首页速度仍受飞书当时延迟、Base 记录量和权限表分页影响。新实现减少了重复读取与槽位竞争，但必须以新包部署后的同一账号和同一 Base 复测。
- 本包携带现有、未改写的前端 `dist` 以维持当前一体化服务器结构；本轮代码差异仅为后端。
- Web 视觉、键盘、焦点和完整可访问性矩阵未重新执行，因为本轮禁止并且没有前端变更；默认前端回归 `npm test` 已通过。

## 7. 部署命令

先上传以下两个文件到 `/home/seaoil/pre-demo/releases/`：

- `digital-exhibition-test-package.zip`
- `digital-exhibition-test-package.zip.sha256`

准备版本：

```bash
sudo install -d -m 755 /home/seaoil/pre-demo/releases

set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=$(date +%Y%m%d%H%M%S)
STAGE="$BASE/releases/$RELEASE_ID"

cd "$BASE/releases"
sha256sum -c digital-exhibition-test-package.zip.sha256
getent group seaoil-deh >/dev/null 2>&1 || sudo groupadd --system seaoil-deh
id -u seaoil-deh >/dev/null 2>&1 || sudo useradd --system --gid seaoil-deh --home-dir "$BASE" --shell /usr/sbin/nologin seaoil-deh
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$BASE/runtime-cache"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$STAGE"
sudo unzip -q digital-exhibition-test-package.zip -d "$STAGE"
(cd "$STAGE/digital-exhibition-test-package" && sha256sum -c SHA256SUMS.txt)
test -f "$BASE/test/.env" || { echo '缺少 /home/seaoil/pre-demo/test/.env'; exit 1; }
sudo cp --preserve=mode,timestamps "$BASE/test/.env" "$STAGE/digital-exhibition-test-package/.env"
sudo chmod 600 "$STAGE/digital-exhibition-test-package/.env"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$STAGE/digital-exhibition-test-package/.local"
sudo chown -R seaoil-deh:seaoil-deh "$STAGE/digital-exhibition-test-package"
cd "$STAGE/digital-exhibition-test-package"
sudo -u seaoil-deh node -e "import('undici').then(() => console.log('bundled runtime dependency ok'))"
echo "RELEASE_ID=$RELEASE_ID"
```

切换版本：

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=$(find "$BASE/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort | tail -n 1)
STAGE="$BASE/releases/$RELEASE_ID/digital-exhibition-test-package"
ROLLBACK="$BASE/rollback-$RELEASE_ID"

sudo systemctl stop digital-exhibition-test.service
if [ -d "$BASE/test/.local" ]; then
  sudo cp -a "$BASE/test/.local/." "$STAGE/.local/"
fi
sudo chown -R seaoil-deh:seaoil-deh "$STAGE" "$BASE/runtime-cache"
sudo mv "$BASE/test" "$ROLLBACK"
sudo mv "$STAGE" "$BASE/test"
sudo install -m 644 "$BASE/test/digital-exhibition-test.service" /etc/systemd/system/digital-exhibition-test.service
sudo systemctl daemon-reload
sudo systemctl enable --now digital-exhibition-test.service
echo "DEPLOYED_RELEASE_ID=$RELEASE_ID"
```

## 8. 验证命令

```bash
set -euo pipefail
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4173/api/v1/health/ready; then
    echo READY_OK
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:4173/api/v1/health/ready
curl -fsSI https://test-pre-demo-seaoil.xdata.work/test2/
sudo systemctl is-active digital-exhibition-test.service
sudo systemctl show digital-exhibition-test.service -p User -p Group -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemoryCurrent
test "$(sudo systemctl show digital-exhibition-test.service -p User --value)" = seaoil-deh
test "$(sudo systemctl show digital-exhibition-test.service -p MemoryCurrent --value)" -le 2147483648
sudo stat -c '%a %U:%G %n' /home/seaoil/pre-demo/runtime-cache
test "$(sudo stat -c '%a' /home/seaoil/pre-demo/runtime-cache)" = 700
test "$(sudo stat -c '%U:%G' /home/seaoil/pre-demo/runtime-cache)" = seaoil-deh:seaoil-deh
test "$(sudo du -sb /home/seaoil/pre-demo/runtime-cache | awk '{print $1}')" -le 3221225472
sudo journalctl -u digital-exhibition-test.service --since '15 minutes ago' --no-pager | tail -n 300
```

在已登录的测试页面 DevTools Console 执行以下验收脚本。它不重复原首页请求，只轮询原 `syncId`：

```js
(async () => {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function run(forceRefresh) {
    const started = performance.now();
    const first = await fetch('/api/v1/homepage', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(forceRefresh ? { forceRefresh: true } : {})
    });
    const firstStatus = first.status;
    let body = await first.json();
    if (firstStatus === 202) {
      const syncId = body.syncId;
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        await sleep(Number(body.pollAfterMs) || 2000);
        const status = await fetch(`/api/v1/sync-jobs/${encodeURIComponent(syncId)}`, {
          credentials: 'include'
        });
        if (status.status !== 200) throw new Error(`状态接口返回 HTTP ${status.status}`);
        body = await status.json();
        if (['completed', 'failed', 'expired'].includes(body.state)) break;
      }
      if (body.state !== 'completed') throw new Error(JSON.stringify(body));
      body = body.result;
    }
    const elapsedMs = Math.round(performance.now() - started);
    const complete = body?.code === 'OK'
      && body?.data
      && Object.keys(body.data).length === 5;
    if (!complete) throw new Error('首页结果不完整');
    return { firstStatus, elapsedMs, complete };
  }

  const cold = [];
  for (let index = 0; index < 5; index += 1) cold.push(await run(true));
  const warm = [];
  for (let index = 0; index < 30; index += 1) warm.push(await run(false));
  const warmWithinFiveSeconds = warm.filter(item => item.firstStatus === 200 && item.elapsedMs <= 5000).length;
  console.table(cold);
  console.table(warm);
  console.log({
    coldCompleted: cold.length,
    warmWithinFiveSeconds,
    warmRate: warmWithinFiveSeconds / warm.length
  });
})();
```

通过条件：

- 冷请求 5/5 最终取得完整五段首页数据，期间无需刷新页面。
- 每次状态查询均为 HTTP 200，状态仅为 `running/completed/failed/expired`（首页创建时的初始 202 除外）。
- 暖请求至少 27/30 在 5 秒内直接 HTTP 200 返回完整结果。
- Network 中没有对原 `POST /api/v1/homepage` 的轮询重放。

## 9. 回滚命令

将 `<RELEASE_ID>` 替换为部署输出的版本号：

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=<RELEASE_ID>

sudo systemctl stop digital-exhibition-test.service
test -d "$BASE/rollback-$RELEASE_ID"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$BASE/rollback-$RELEASE_ID/.local"
if [ -d "$BASE/test/.local" ]; then
  sudo cp -a "$BASE/test/.local/." "$BASE/rollback-$RELEASE_ID/.local/"
fi
sudo mv "$BASE/test" "$BASE/failed-$RELEASE_ID"
sudo mv "$BASE/rollback-$RELEASE_ID" "$BASE/test"
sudo chown -R seaoil-deh:seaoil-deh "$BASE/test" "$BASE/runtime-cache"
if [ -f "$BASE/test/digital-exhibition-test.service" ]; then
  sudo install -m 644 "$BASE/test/digital-exhibition-test.service" /etc/systemd/system/digital-exhibition-test.service
fi
sudo systemctl daemon-reload
sudo systemctl start digital-exhibition-test.service
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4173/api/v1/health/ready; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:4173/api/v1/health/ready
```

回滚负责人：测试环境运维。触发条件：ready 无法恢复、首页 5 次冷验收任一次不能在 25 秒内 completed、状态接口出现 500/504、401/403 边界回归、或资源/权限检查失败。回滚保留 `/home/seaoil/pre-demo/runtime-cache/`；若旧版本无法读取新快照，先停服务并把缓存目录重命名隔离，再创建新的 0700 空目录，不直接删除快照。

## 10. Web 平台检查证据

- 证据文件：`.ai-team/tasks/DEH-SERVER-CACHE-20261008/handoffs/web.md`
- 本地 Web/后端检查结果：passed。
- 任务保持 `qa`；需要新包部署后的独立 Functional QA 和 Compatibility QA，当前交接不构成发布批准。
