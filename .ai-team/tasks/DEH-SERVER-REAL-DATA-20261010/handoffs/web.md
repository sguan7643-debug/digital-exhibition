# Web Engineering Handoff

## 结论

`DEH-SERVER-REAL-DATA-20261010` 的后端实现、本地自动化测试和纯后端服务器包已完成。没有修改前端 `src/**` 或根 `dist/**`，也没有直接操作测试服务器。

当前结论是“开发完成、待真实环境 QA”，不是发布验收通过。产品负责人已批准取消正式字典 baseline 强制门禁；发布前仍需在真实授权账号下完成冷/暖性能、字典数据质量、联系人权限、双用户隔离、真实素材下载和正式申请写入验证，不得用 fixture 替代这些证据。

## 根因与修复

1. Vite 插件在构造 middleware stack 时就调用 `prewarm()`，因此 build、配置导入和测试导入会意外访问飞书。现在构造过程完全无副作用；仅 Node HTTP listener 成功监听后显式启动一次预热，关闭后不可重启。
2. operation 进入终态时，分页 sibling/排队任务可能仍占用全局读取槽，造成 COM-005、WB-002 以及无关资源一起排队。现在每次尝试有独立 AbortController，重试、deadline 和终态前都会 abort 并 drain 本次所有上游工作；总并发仍为 3。
3. APP 列表/详情曾允许姓名字段回退为 ID。现在后端批量建立人员和部门映射并返回 owner/developer/组织的 ID+Name；必填正式名称解析失败固定返回 422 `NAME_PROJECTION_INCOMPLETE`，不发布伪成功缓存。
4. COM-004 曾沿用目录分页模型。现在仅允许 canonical session user 查询本人，实时调用飞书联系人接口，返回受权限保护的身份/部门/联系方式；该 operation 强一致且不进入共享缓存或持久快照。
5. COM-005 以前只做弱过滤。现在拒绝 includeDisabled=true，并确定性过滤 `TEST_`、测试初始化和停用项。baseline 缺失时直接读取飞书现有字典并返回实际结果 SHA-256；配置有效 baseline 时继续校验批准人、字段映射和选项全集。
6. WB-003 现在以当前授权用户身份为最低成功合同；统计、消息、待办可为空，但不会把整个个人中心判定为无数据，并继续按 userId 隔离。
7. FAV-002 只返回当前用户 APP 收藏；FAV-003/FAV-004 返回稳定 favoriteId、favoriteVersion/version。APP-005 返回稳定 requestId/applicationId、PENDING status 和 version，保留身份注入、权限、审批、幂等和审计。
8. MAT-002 统一返回 nullable `primaryFile`；存在文件时提供稳定 fileId，不暴露飞书 token。MAT-003 使用该 fileId 签发同源安全下载；无文件返回明确 `MATERIAL_FILE_NOT_AVAILABLE`。
9. 新增后端 schema overlay，服务端合同升级不修改前端源码。缓存只在完整 success schema 通过后提交，联系方式、令牌、Cookie、密钥和附件二进制仍禁止进入缓存。
10. 真实环境发现飞书人员字段可能返回对象或数组，旧实现把 `name` 当作 ID 后无法匹配用户字典。现在兼容 `id/user_id/open_id/union_id` 与 `name/display_name`，优先返回飞书正式姓名，同时仍禁止 ID 冒充姓名。

## 修改文件

后端源码与配置：

- `server/feishu-open-api-client.mjs`
- `server/feishu-read-only-service.mjs`
- `server/feishu-read-operation-contracts.mjs`（新增）
- `server/formal-dictionary-baseline.mjs`（新增）
- `server/feishu-read-cache-policies.mjs`
- `server/feishu-proxy-handler.mjs`
- `server/feishu-vite-plugin.mjs`
- `server/test-deployment-server.mjs`
- `server/homepage-aggregate-middleware.mjs`
- `server/homepage-aggregate-service.mjs`
- `server/business-write-governance.mjs`
- `server/feishu-composite-operation-service.mjs`
- `server/contracts/feishu-write-operation-manifest.mjs`
- `server/feishu-write-operation-service.mjs`
- `deploy/digital-exhibition-test.env.example`
- `package.json`

后端测试与打包：

- `tools/server-real-data-startup.test.mjs`（新增）
- `tools/server-real-data-read-contracts.test.mjs`（新增）
- `tools/server-real-data-write-contracts.test.mjs`（新增）
- `tools/server-real-data-package.test.mjs`（新增）
- `tools/create-server-real-data-package.mjs`（新增）
- `tools/feishu-system-read-cache.test.mjs`
- `tools/feishu-dictionary-comments-read.test.mjs`
- `tools/feishu-first-batch-detail-reads.test.mjs`
- `tools/feishu-secure-resource-reads.test.mjs`
- `tools/feishu-server-proxy.test.mjs`
- `tools/server-cache-contract-repair.test.mjs`
- `tools/server-cache-code-review-findings.test.mjs`（新增）
- `tools/feishu-cache-authorization.test.mjs`
- `tools/feishu-read-only-service.test.mjs`
- `tools/feishu-read-latency-cache.test.mjs`
- `tools/business-write-governance.test.mjs`
- `tools/feishu-write-operation-service.test.mjs`
- `tools/homepage-aggregate.test.mjs`

生成制品：

- `deploy/digital-exhibition-server-real-data-package/`
- `deploy/digital-exhibition-server-real-data-package.zip`
- `deploy/digital-exhibition-server-real-data-package.zip.sha256`

## 自动化测试结果

- `npm run test:server-real-data`：baseline 门禁取消后最终复跑通过（2026-10-10）；覆盖缺少 baseline 时直接读取并过滤飞书字典、真实 Vite config import/build 零飞书调用、监听后单次预热、名称投影、COM-004、WB-003、FAV、APP-005、MAT、abort/drain、日志字段及包完整性。
- `npm run test:server-cache`：通过；65 个读取 operation 分类、六维键、持久快照、同任务合并、5 秒交接、30 次热读、状态 200、身份权限和资源上限无回归。
- `npm run test:homepage-aggregate`：通过；首页原子缓存、single-flight、轻量轮询、LKG 和 warm p95 `0.04ms`。
- `npm run test:business-writes`：通过；36 个正式写入映射、权限、审批、幂等、乐观锁和审计通过。
- `npm run test:test-deployment`：通过。
- `npm run check`：通过。
- 后端集成专项 19 项：通过，包括 public/personal/admin reads、OAuth、auth middleware、approval、schema、正式写入、申请、收藏和下载。
- `git diff --check`：无 whitespace error，仅 Git 的 LF/CRLF 提示。
- `git status --short -- src dist`：空；本任务没有前端源码或根 dist 变更。

全仓 `npm run test:integration` 在与本任务无关的既有前端计划断言处停止：`tools/feishu-page-read-request-plan.test.mjs` 仍期望 4 个 deferred operation，当前前端矩阵实际为 5 个（新增 `APP-003`）。本任务边界禁止修改前端测试/源码，因此未擅自修正；停止前的集成测试均通过，停止后的 19 个后端测试已单独全部通过。

## 部署包

- 目录：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-server-real-data-package`
- ZIP：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-server-real-data-package.zip`
- sidecar：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-server-real-data-package.zip.sha256`
- SHA-256：`34c7dc0d87329f8435f9c8786f31b6bc5411108c1a6f260d66fbdf2e44debcf6`
- 大小：`634,457 bytes`
- 包内文件：`230`
- 扫描结果：无前端 dist、真实 `.env`、runtime-cache、飞书 secret/base token、Cookie、私钥或附件二进制。

## 部署前置条件

1. 将 ZIP 和 sidecar 上传到 `/home/seaoil/pre-demo/releases/`。
2. 不再要求上传 `formal-dictionary-baseline.json`；COM-005 默认读取并过滤飞书现有字典。
3. 当前 `/home/seaoil/pre-demo/test/` 必须是可回滚的在运行版本，且包含前端 dist 和真实 `.env`。本包是纯后端 overlay，不覆盖前端。

## 部署命令

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=$(date +%Y%m%d%H%M%S)
PATCH="$BASE/releases/$RELEASE_ID-patch"
STAGE="$BASE/releases/$RELEASE_ID"
ROLLBACK="$BASE/rollback-$RELEASE_ID"

cd "$BASE/releases"
sha256sum -c digital-exhibition-server-real-data-package.zip.sha256
test -d "$BASE/test"
test -f "$BASE/test/.env"
test ! -e "$PATCH"
test ! -e "$STAGE"
test ! -e "$ROLLBACK"

sudo install -d -m 755 "$PATCH" "$STAGE"
sudo unzip -q digital-exhibition-server-real-data-package.zip -d "$PATCH"
cd "$PATCH/digital-exhibition-server-real-data-package"
sha256sum -c SHA256SUMS.txt

sudo cp -a "$BASE/test/." "$STAGE/"
sudo cp -a "$PATCH/digital-exhibition-server-real-data-package/." "$STAGE/"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$BASE/runtime-cache"
sudo sed -i '/^FEISHU_FORMAL_DICTIONARY_BASELINE_PATH=/d' "$STAGE/.env"
sudo chmod 600 "$STAGE/.env"
sudo chown -R seaoil-deh:seaoil-deh "$STAGE" "$BASE/runtime-cache"

sudo -u seaoil-deh node -e "import('$STAGE/server/test-deployment-server.mjs').then(() => console.log('BACKEND_IMPORT_OK'))"

sudo systemctl stop digital-exhibition-test.service
sudo mv "$BASE/test" "$ROLLBACK"
sudo mv "$STAGE" "$BASE/test"
sudo install -m 644 "$BASE/test/digital-exhibition-test.service" \
  /etc/systemd/system/digital-exhibition-test.service
sudo systemctl daemon-reload
sudo systemctl enable --now digital-exhibition-test.service
echo "DEPLOYED_RELEASE_ID=$RELEASE_ID"
```

## 基础验证命令

```bash
set -euo pipefail
curl -fsS http://127.0.0.1:4173/api/v1/health/live
HTTP=000
for attempt in $(seq 1 30); do
  HTTP=$(curl -sS -o /tmp/deh-ready.json -w '%{http_code}' \
    http://127.0.0.1:4173/api/v1/health/ready || true)
  cat /tmp/deh-ready.json
  [ "$HTTP" = 200 ] && break
  sleep 2
done
test "$HTTP" = 200
sudo systemctl is-active digital-exhibition-test.service
curl -fsSI https://test-pre-demo-seaoil.xdata.work/test2/

sudo systemctl show digital-exhibition-test.service \
  -p User -p Group -p CPUQuotaPerSecUSec -p MemoryHigh -p MemoryMax -p MemoryCurrent
test "$(sudo systemctl show digital-exhibition-test.service -p User --value)" = seaoil-deh
test "$(sudo stat -c '%a' /home/seaoil/pre-demo/runtime-cache)" = 700
test "$(sudo stat -c '%U:%G' /home/seaoil/pre-demo/runtime-cache)" = seaoil-deh:seaoil-deh
test "$(sudo du -sb /home/seaoil/pre-demo/runtime-cache | awk '{print $1}')" -le 3221225472
```

## 真实账号合同与性能验证

先用浏览器完成飞书登录，并把有效测试会话 Cookie 导出为仅 root 可读的 `/root/deh-cookie.txt`。不得把 Cookie 写入仓库或日志。

```bash
set -euo pipefail
COOKIE_FILE=/root/deh-cookie.txt
ORIGIN=https://test-pre-demo-seaoil.xdata.work
test -s "$COOKIE_FILE"
chmod 600 "$COOKIE_FILE"

curl -sS -b "$COOKIE_FILE" -H 'Content-Type: application/json' \
  -X POST "$ORIGIN/api/v1/homepage" -d '{}' \
  -w '\nHTTP=%{http_code} TOTAL=%{time_total}s\n'

# 若上一步为 202，只轮询响应中的同一个 syncId，不重新 POST homepage。
SYNC_ID='<上一步返回的 syncId>'
curl -sS -b "$COOKIE_FILE" \
  "$ORIGIN/api/v1/sync-jobs/$SYNC_ID" \
  -w '\nHTTP=%{http_code} TOTAL=%{time_total}s\n'

# 热缓存 30 次；预期至少 27 次首次 HTTP 200 且小于 5 秒。
for n in $(seq 1 30); do
  curl -sS -o "/tmp/deh-warm-$n.json" -b "$COOKIE_FILE" \
    -H 'Content-Type: application/json' -X POST "$ORIGIN/api/v1/homepage" -d '{}' \
    -w "WARM=$n HTTP=%{http_code} TOTAL=%{time_total}s\n"
done
```

必须另外在浏览器 Network 验证：页面只产生一次 `POST /api/v1/homepage`，后续只轮询同一 syncId；完成后 loading 自动消失；第二次刷新直接 200；没有“首次同步”“数据缺失”、用户 ID/部门 ID、`TEST_` 字典或受控代理占位。

真实 QA 还要记录：APP-001/002/003 名称投影、COM-004 本人联系方式与跨用户 403、WB-003 空统计仍有身份、FAV-002/003/004 当前用户隔离和版本、APP-005 正式申请的审批/幂等/审计、MAT-002/003 有文件下载和无文件业务状态、匿名 401、撤权 403。

## 日志验证

```bash
sudo journalctl -u digital-exhibition-test.service --since '30 minutes ago' --no-pager -o cat \
  | grep -E '\[deh-cache\]|NAME_PROJECTION_INCOMPLETE|CONTACT_PERMISSION_REQUIRED|MATERIAL_FILE_NOT_AVAILABLE'
```

结构化缓存事件应有 traceId、syncId、operationId、keyDigest、attempt、resource/path、elapsed/queue/budget/transition；不得出现 App Secret、Base Token、Cookie、tenant token、原始联系人信息或附件二进制。

## 回滚命令

把 `<RELEASE_ID>` 替换为部署输出值：

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=<RELEASE_ID>
FAILED="$BASE/failed-$RELEASE_ID"
test -d "$BASE/rollback-$RELEASE_ID"
test ! -e "$FAILED"
sudo systemctl stop digital-exhibition-test.service
sudo mv "$BASE/test" "$FAILED"
sudo mv "$BASE/rollback-$RELEASE_ID" "$BASE/test"
sudo chown -R seaoil-deh:seaoil-deh "$BASE/test" "$BASE/runtime-cache"
if [ -f "$BASE/test/digital-exhibition-test.service" ]; then
  sudo install -m 644 "$BASE/test/digital-exhibition-test.service" \
    /etc/systemd/system/digital-exhibition-test.service
fi
sudo systemctl daemon-reload
sudo systemctl start digital-exhibition-test.service
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 30); do
  curl -fsS http://127.0.0.1:4173/api/v1/health/ready && break
  sleep 2
done
curl -fsS http://127.0.0.1:4173/api/v1/health/ready
```

回滚保留 `/home/seaoil/pre-demo/runtime-cache/`。若旧版本不兼容新快照，只能在停服务后把该目录重命名隔离，并新建 `0700 seaoil-deh:seaoil-deh` 空目录；不要直接删除快照。

## 未执行检查与发布阻断

- 未直接部署测试服务器，符合任务边界。
- 未执行真实环境 5 次冷读、30 次暖读、浏览器单 POST、双账号隔离、撤权、正式联系人权限、真实附件下载、正式申请和回滚演练。
- 正式字典 baseline 已改为可选；仍需在真实环境确认过滤后的飞书字典没有测试项、初始化项和停用项。
- 未取得最新服务器 trace/journal，不能把本地自动化结果冒充现场日志证据。
- 全仓集成测试存在一个任务外的前端 deferred-set 旧断言；不影响本任务后端专项通过，但在仓库整体 release review 前必须由前端任务负责人确认并修复。

