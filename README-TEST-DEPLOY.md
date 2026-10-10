# 数智展厅测试服务器部署包

本包同时包含静态页面、Node 服务端、飞书安全代理、本地内存缓存和持久快照实现。飞书多维表格仍是唯一业务数据源。运行快照固定放在部署目录外的 `/home/seaoil/pre-demo/runtime-cache/`，发布和回滚均不得复制或删除该目录。

## 运行边界

- Node.js：`>=20.6`，目标服务器为 `v22.23.2`。
- Node 堆上限：1536MB；systemd 内存硬上限：2GB。
- systemd CPU 上限：150%，即最多 1.5 个 CPU 核。
- 飞书同步并发：最多 3 路。
- 持久快照：最多 3GB；2.4GB 开始清理/淘汰非代表性 LRU，2.85GB 停止新增快照；文件带 SHA-256 完整性校验，目录权限 `0700`，文件权限 `0600`。
- 服务身份：专用非 root 账号 `seaoil-deh:seaoil-deh`，独占运行状态与缓存目录。
- 快照不保存飞书令牌、Cookie、密钥或附件二进制文件。
- 包内已携带固定版本的纯 JavaScript 运行依赖，服务器不需要联网安装 npm 包。

## 部署前准备

如果服务器还没有发布目录，先执行：

```bash
sudo install -d -m 755 /home/seaoil/pre-demo/releases
```

将 `digital-exhibition-test-package.zip` 和 `digital-exhibition-test-package.zip.sha256` 上传到 `/home/seaoil/pre-demo/releases/`，然后执行：

```bash
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
test -f "$BASE/test/.env" || { echo '缺少现有 /home/seaoil/pre-demo/test/.env，请先按下方首次部署说明创建'; exit 1; }
sudo cp --preserve=mode,timestamps "$BASE/test/.env" "$STAGE/digital-exhibition-test-package/.env"
sudo chmod 600 "$STAGE/digital-exhibition-test-package/.env"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$STAGE/digital-exhibition-test-package/.local"
sudo chown -R seaoil-deh:seaoil-deh "$STAGE/digital-exhibition-test-package"
cd "$STAGE/digital-exhibition-test-package"
sudo -u seaoil-deh node -e "import('undici').then(() => console.log('bundled runtime dependency ok'))"
```

首次部署没有旧 `.env` 时，复制 `.env.example` 为 `.env`，填写 `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_BASE_TOKEN`，并保持以下缓存配置：

```env
FEISHU_RUNTIME_CACHE_ENABLED=1
FEISHU_RUNTIME_CACHE_DIR=/home/seaoil/pre-demo/runtime-cache/
FEISHU_RUNTIME_CACHE_OWNER=seaoil-deh
FEISHU_RUNTIME_CACHE_MAX_BYTES=3221225472
FEISHU_MEMORY_CACHE_MAX_BYTES=268435456
FEISHU_SYNC_MAX_CONCURRENCY=3
HOMEPAGE_RESPONSE_BUDGET_MS=5000
FEISHU_SYNC_TASK_TIMEOUT_MS=25000
```

服务会把配置的 `5000ms` 浏览器合同折算为约 `4500ms` 的内部等待预算，为 JSON 序列化、Nginx 和网络传输预留约 `500ms`；后台任务仍继续运行至最长 `25000ms` 的终态截止。

## 切换版本

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
```

Nginx 保持 `/test2/`、`/assets/` 和 `/api/v1/` 转发至 `127.0.0.1:4173`。如需首次安装配置：

```bash
sudo install -m 644 /home/seaoil/pre-demo/test/nginx-test.conf /etc/nginx/conf.d/digital-exhibition-test.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 验证命令

```bash
set -euo pipefail
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4173/api/v1/health/ready; then break; fi
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
sudo find /home/seaoil/pre-demo/runtime-cache -type f -name '*.json' -exec stat -c '%a %n' {} \;
test -z "$(sudo find /home/seaoil/pre-demo/runtime-cache -type f -name '*.json' \( ! -perm 600 -o ! -user seaoil-deh -o ! -group seaoil-deh \) -print -quit)"
```

通过已登录浏览器验证冷缓存任务接管：普通读取最多等待 5 秒；未完成时返回 HTTP 202、`FEISHU_INITIAL_SYNCING`、`syncId` 和 `pollAfterMs`，文案为“请求处理中”；随后查询 `/api/v1/operations/sync-jobs/{syncId}`，直到 `completed` 并取得完整结果。普通读取响应不得包含“正式飞书数据正在首次同步”。

## 回滚命令

将 `<RELEASE_ID>` 替换为本次部署生成的时间戳：

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

回滚保留 `/home/seaoil/pre-demo/runtime-cache/`。如果确认快照与旧版本不兼容，可先停止服务，将该目录重命名为带时间戳的隔离目录，再创建新的 `0700` 空目录；不要直接删除正式数据快照。
