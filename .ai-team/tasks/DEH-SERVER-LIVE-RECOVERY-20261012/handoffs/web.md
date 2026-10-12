# Web 工程交接

## 当前结论

已生成第二次修复候选纯后端包。源码与本地自动化通过；当前测试环境仍是此前失败版本，尚未部署本候选包，因此不得声称线上验收完成。

## 已确认根因

1. operation 与 homepage 状态接口会把一次非 401/403 的状态鉴权错误包装成合成 `failed`；下一次鉴权成功后又返回任务真实 `running/completed`，直接造成终态回退。
2. 状态鉴权 continuation 只按 operation 与身份复用，不含 syncId，不同任务可能错误消费同一结果。
3. COM-004 目录模式仍读多维表“用户字典”，因此 U001/U004、张三丰/赵六等历史初始化记录可被重新缓存。
4. APP-002 仅按应用 ID/名称过滤 TEST，未隔离引用 U00x/D00x 测试人员或部门的正式外观应用。
5. COM-001 同时读取用户、权限、消息、收藏、积分五类数据；首页并发时放大槽位竞争。身份首屏实际只需要用户与权限，其他统计允许返回空结构。
6. 同步任务状态只存在进程内 Map，没有独立任务状态目录；当前健康接口又不暴露 PID/版本，无法区分多实例或旧进程。

## 修复内容

- 状态鉴权基础设施异常只维持可轮询状态，不再伪造任务失败；一旦终态已经对外发布，后续查询不会退回 running。
- 状态鉴权 continuation 加入 syncId 隔离；真实 401/403、撤权与数据范围变化仍即时拒绝。
- COM-004 改为有界真实飞书 Contact API：当前用户、最多 8 个所属部门、每部门最多 4 页/总计 400 人；不读取旧用户字典作为目录，不返回联系方式。
- 新增飞书部门详情读取，确保人员目录投影正式部门名称。
- APP-002/APP-003 写入和快照恢复均拒绝 U001-U005、D001-D005、张三丰/王五/赵六/陈晓明及对应测试引用。
- COM-001 首屏身份读取缩减为用户与权限两张有界表；消息、收藏、积分统计返回 0，不阻断身份和部门展示。
- 健康检查与所有服务响应增加 release、Git commit、PID、缓存 schema、缓存目录；启动日志输出同一运行版本。
- 新增只读运行态审计脚本和原子部署脚本；部署时在新暂存目录删除旧 server，再复制新包，并只清除 HOM-001、COM-001、APP-001、APP-002、COM-004 快照。健康失败自动回滚。

## 修改文件

- `server/feishu-read-only-service.mjs`
- `server/feishu-open-api-client.mjs`
- `server/homepage-aggregate-service.mjs`
- `server/homepage-aggregate-middleware.mjs`
- `server/test-deployment-server.mjs`
- `server/runtime-metadata.mjs`
- `server/runtime-audit.sh`
- `server/install-live-recovery.sh`
- `server/clear-read-cache-operations.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/homepage-aggregate.test.mjs`
- `tools/server-real-data-read-contracts.test.mjs`
- `tools/feishu-read-latency-cache.test.mjs`
- `tools/feishu-open-api-client.test.mjs`
- `tools/test-deployment-server.test.mjs`
- `tools/read-cache-operation-cleanup.test.mjs`
- `tools/create-server-real-data-package.mjs`
- `tools/server-real-data-package.test.mjs`

## 自动化证据

- `npm run test:server-read-acceptance`：PASS。
- `node tools/server-real-data-startup.test.mjs`：PASS。
- `node tools/server-real-data-write-contracts.test.mjs`：PASS。
- `node tools/feishu-open-api-client.test.mjs`：PASS。
- `node tools/feishu-read-latency-cache.test.mjs`：PASS。
- `node tools/test-deployment-server.test.mjs`：PASS。
- `node tools/server-real-data-package.test.mjs`：PASS，235 个文件，无 dist、真实 `.env`、runtime-cache 或密钥。
- Shell 脚本在本机不能执行 `bash -n`（Windows 未安装 Bash/WSL 发行版）；脚本须在 Ubuntu 测试服务器执行并由健康失败自动回滚。

## 候选包

- Release：`DEH-SERVER-LIVE-RECOVERY-20261012-20261011194033`
- Git commit：`6bf133c4541b08be5c414739ea6c680f72d92f25`（`gitDirty=true`，候选内容以 ZIP SHA-256 为准）
- Build time：`2026-10-11T19:40:33.080Z`（UTC）
- ZIP：`deploy/digital-exhibition-server-real-data-package.zip`
- SHA sidecar：`deploy/digital-exhibition-server-real-data-package.zip.sha256`
- SHA-256：`90db99856dd3c64514a391b6c5cb8aef65a76ceea49a0bdcc2810b872307c1a3`

## 部署命令

将 ZIP 与 sidecar 上传到 `/home/seaoil/pre-demo/releases/` 后执行：

```bash
set -euo pipefail
cd /home/seaoil/pre-demo/releases
sha256sum -c digital-exhibition-server-real-data-package.zip.sha256
EXTRACT="/home/seaoil/pre-demo/releases/package-$(date +%Y%m%d%H%M%S)"
test ! -e "$EXTRACT"
install -d -m 755 "$EXTRACT"
unzip -q digital-exhibition-server-real-data-package.zip -d "$EXTRACT"
cd "$EXTRACT/digital-exhibition-server-real-data-package"
sha256sum -c SHA256SUMS.txt
sudo bash server/install-live-recovery.sh
```

部署脚本会保留 `.env`、`dist`、`.local` 与其他运行数据；不会删除整个 runtime-cache。

## 部署后运行态核查

```bash
sudo bash /home/seaoil/pre-demo/test/server/runtime-audit.sh \
  sync-f110802c-43ec-4726-a790-5149e4a68af3 \
  read-31955326-9961-40fd-a8bd-453e417b0a33 \
  read-140e9b9d-4369-4cd6-be86-7efd30d2bc8e \
  read-ed8f505c-0493-4377-adca-0d12c8ecc46c \
  read-b82e2157-ba58-4203-9ebe-eced6fa3293b
```

该输出包含 systemd MainPID、WorkingDirectory、ExecStart、EnvironmentFiles、全部相关 Node 进程、4173 监听者、各进程 cwd/运行路径、缓存文件、健康检查运行版本和指定任务日志时间线；不会输出飞书密钥、Cookie 或令牌。

## 尚未完成的线上验收

- 未获得测试服务器 SSH/执行通道，也没有关胜浏览器会话，无法执行部署、两次重启、三页真实会话、上传与申请提交。
- 必须部署本 SHA 包后验证 `/test2/workbench`、`/test2/apps`、`/test2/apps/onboarding/apply`；记录每项 HTTP 状态、syncId、耗时、最终状态及两次重启结果。
- 在这些证据齐全前，任务保持 QA 未通过，不可发布。
