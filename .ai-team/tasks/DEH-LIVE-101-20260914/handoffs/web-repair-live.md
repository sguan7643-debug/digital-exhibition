# Web Repair Handoff

任务：DEH-LIVE-101-20260914  
平台：Web / Vue  
任务分支：`task/digital-exhibition-ui-0817-dev-r3-web`  
工作树：`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged`  
基线提交：`e7b20cf711b2339ea46c490bf057cde261c036f6`  
修复提交：`ed07a37c293aff9613b3a7b79a7db00e3d381639`（包含前置修复 `e9447eefad5eebcfd32a4ea0b5caae73f4db407a`）  
范围：仅修复 009 code review 的 F-002 至 F-007；未修改正式飞书数据、凭据、审批或发布配置。

## 变更文件

- `package.json`
- `server/feishu-live-cleanup.mjs`
- `server/feishu-live-operation-runner.mjs`
- `server/feishu-write-operation-service.mjs`
- `tools/live-verifier-remediation.test.mjs`
- `tools/verify-live-admin-reads.mjs`
- `tools/verify-live-read-operations.mjs`
- `tools/verify-live-test-attachment.mjs`
- `tools/verify-live-write-operations.mjs`

## 测试优先证据

先新增 `tools/live-verifier-remediation.test.mjs`，在实现前运行：

```text
node tools/live-verifier-remediation.test.mjs
exit 1
Error [ERR_MODULE_NOT_FOUND]: Cannot find module
.../server/feishu-live-operation-runner.mjs
```

该红灯锁定了 F-002/F-006 所需的逐项运行器缺口。实现运行器、显式 COMMAND 拒绝/处理、公共写服务冲突/回滚路径、附件 COM-006/COM-007 路径和清理结果后重跑：

```text
node tools/live-verifier-remediation.test.mjs
exit 0
live verifier remediation red/green contract passed
```

复核过程中又发现 CREATE operation 带 `ifMatch` 时会错误落回 create-only 分支，先补充真实服务合同并确认红灯：

```text
node tools/live-verifier-remediation.test.mjs
exit 1
AssertionError [ERR_ASSERTION]: CREATE operation 的版本验证必须仍经由同一公开 operation 路径
actual: 1
expected: 2
```

最小修复后，同一合同再次转绿：

```text
node tools/live-verifier-remediation.test.mjs
exit 0
live verifier remediation red/green contract passed
```

## F-002 至 F-007 结果

- F-002：写验证器不再首错 `break`；36 个 manifest operation 都会生成独立结果，摘要要求 `expected === executed`。
- F-003：`COMMAND` 不再静默降级为 UPDATE；没有专用 handler 时返回 `COMMAND_NOT_IMPLEMENTED`/HTTP 501，配置 handler 时走专用处理器。
- F-004：版本冲突、更新和回滚均调用 `writeService.execute`，验证入口不再绕过公开 operation 路径直接调用底层记录服务。
- F-005：附件验证绑定 COM-006 创建上传会话和 COM-007 更新上传会话；文件令牌绑定到上传会话记录。当前仓库没有已授权的 Feishu file-token 删除 API，因此采用并明确记录 `FEISHU_MEDIA_RETENTION_UNTIL_APPROVED_GC` / `retained_by_explicit_policy`，不能把媒资删除冒充为已完成。
- F-006：新增 registry-driven 65-read runner；运行清单来自 `OPERATION_REGISTRY.filter(operation => operation.readOnly)`，本地静态核验结果为 `total=101, reads=65, unique=65`，每个 ID 恰有一条结果（passed/blocked/failed）。
- F-007：新增 `cleanupAndVerify`；清理逐项记录错误并执行远程残留检查，admin/write/attachment verifier 不再吞掉 cleanup 异常。

## 完整命令及准确结果

工作目录均为本任务 worktree。

```text
npm test
exit 0
```

输出末尾包含：

```text
H5 导航、卡片、表单、表格与分页响应式合同测试通过
```

```text
npm run test:integration
exit 0
```

输出末尾包含：

```text
TEST_ prefix, idempotency replay, optimistic conflict, rollback and cleanup contracts passed
36-operation write mapping, field whitelist, composite routing and write envelopes passed
live verifier remediation red/green contract passed
```

```text
npm run test:deh-req-gap
exit 0
```

输出末尾包含：

```text
remote certification and announcement write blocking contract passed
```

```text
npm run check
exit 0
源码静态、确定性、零外网、语义与原子资产检查通过
```

```text
npm run build
exit 0
vite v6.4.1
✓ 1946 modules transformed.
dist/index.html                     0.44 kB
dist/assets/index-CLfIGydG.css    300.09 kB
dist/assets/index-CYs_OoXR.js   1,044.26 kB
✓ built in 4.38s
```

```text
git diff --check
exit 0
```

Git 提交后，受控代码范围无已跟踪未提交修改：

```text
git rev-parse HEAD
ed07a37c293aff9613b3a7b79a7db00e3d381639

git status --short --untracked-files=no
clean
```

工作树中仍有基线前已存在、未纳入本修复提交的未跟踪项：`.ai-team/`、`dist.rar`、`public/live-approval-runner.html`；本轮未修改、未删除。

## 真实联调边界

本轮没有运行会访问正式 Feishu 数据的 live verifier，也没有伪造 live pass。以下命令已新增/可供 010 在授权 QA 环境执行：

```text
npm run feishu:write-operations:verify
npm run feishu:test-attachment:verify
npm run feishu:admin-reads:verify
npm run feishu:reads:verify-all
```

其中 `feishu:reads:verify-all` 是新的 65-read registry runner；应使用 `LIVE_EVIDENCE_FILE=<绝对路径>` 保存逐项 JSON。真实运行仍依赖 QA 环境的有效 Feishu OAuth/session、允许的测试表和只读/写权限。

当前仍阻塞整体通过：

- F-001：010 首轮 live artifact 尚未重新生成，修复后必须由 010 重跑并提供每个 operation 的真实 HTTP/响应/清理证据。
- Feishu 审批上游曾返回 `99992402`/`FEISHU_APPROVAL_FAILED`；本轮未将其改写为前端通过。
- 附件 file-token 删除 API 未在本仓库/当前授权中提供，当前只验证上传会话清理并记录明确保留策略。
- 未执行真实 65-read/36-write/attachment/admin live 命令，不能把合同测试视为真实联调通过。

## 010 重跑请求

请 010 基于提交 `ed07a37c293aff9613b3a7b79a7db00e3d381639` 在授权 QA 环境重新执行 36 写、附件、admin read 以及新增的 65-read runner；保留逐项结果、冲突/回滚公开路径、清理后的远程残留检查和任何外部阻塞码。完成后将新报告回传 009/012 复审。

当前 Web repair 结论：`failed`（代码类 F-002 至 F-007 已完成并通过本地回归；真实 live artifact/F-001 未完成）。

## 本轮 010 65-read 失败修复（提交 `5a3d9077b78b75da5a3472943c08124f3bf79021`）

本轮只处理 010 对 `e9447ee` 运行 65 个只读 operation 得到的三类失败：43 个 `INVALID_OPERATION_INPUT`（400）、20 个 `PERMISSION_DENIED`（403）和 2 个 `FILE_ACCESS_SERVICE_UNAVAILABLE`（503，COM-008/MAT-003）。没有读取、写入或修改正式业务数据，没有复制 `.env`、token 或凭据。

### 变更文件

- `package.json`
- `server/feishu-live-read-inputs.mjs`
- `server/feishu-live-operation-runner.mjs`
- `tools/verify-live-read-operations.mjs`
- `tools/live-read-input-remediation.test.mjs`

### 测试优先与实现

- 新增 `createLiveReadInputResolver`，按 operation ID 提供严格输入，而不是把同一分页对象发送给所有接口。
- 静态输入覆盖列表、筛选、排序、详情、预览、运营周期、认证/培训等 operation；需要真实上下文的 operation 从现有 identifier contract 对应 Base 表读取首条可见记录，抽取 `appId`、`announcementId`、`courseId`、`certificationId`、`materialId/fileId`、`applicationId`、`exportId`、`archiveTaskId`、`connectionCode` 等。
- 缺少上下文时返回 `REQUIRED_INPUT_UNAVAILABLE` 与精确 `requiredInput` 字段，不制造伪造 ID。
- `verify-live-read-operations.mjs` 改为注入 `createFeishuFileAccessService`，COM-008/MAT-003 不再因 runner 未配置文件访问服务而直接 503；仍受真实文件 token、用户身份和上游服务状态约束。
- 403 结果保留逐 operation 结果，并补充所需权限编码与可直接打开的本地授权入口。权限映射覆盖本轮 20 个权限失败 ID；身份优先读取 `FEISHU_VERIFY_AD_ACCOUNT`，其次 `LIVE_VERIFY_AD_ACCOUNT`/`LIVE_VERIFY_USER`。
- runner 在输入解析失败时保留已解析输入（或 `null`）及 `requiredInput`，所有 65 个 ID 仍各自产生一条结果。

测试文件先于实现加入。最初运行出现一次红灯，但原因是测试断言把可选 `include` 字段误写成必须存在的 `undefined`；修正测试合同后再运行，未把该测试作者错误报告为产品实现失败。最终准确结果：

```text
node tools/live-read-input-remediation.test.mjs
exit 0
live read operation-specific input contract passed

node tools/live-verifier-remediation.test.mjs
exit 0
live verifier remediation red/green contract passed
```

针对 65 个只读 operation 的确定性解析回归也已加入同一测试：使用受控 fake Base 上下文时 `65/65` 均能生成对象输入，缺少 app 上下文的 APP-003 明确返回 `requiredInput: ["appId"]`。

### 本轮完整命令及准确结果

```text
pnpm test
exit 0
```

末尾输出：`H5 导航、卡片、表单、表格与分页响应式合同测试通过`

```text
pnpm test:integration
exit 0
```

末尾输出：`live verifier remediation red/green contract passed`、`live read operation-specific input contract passed`

```text
pnpm test:deh-req-gap
exit 0
```

末尾输出：`remote certification and announcement write blocking contract passed`

```text
pnpm check
exit 0
源码静态、确定性、零外网、语义与原子资产检查通过
```

```text
pnpm build
exit 0
vite v6.4.1
✓ 1946 modules transformed.
dist/index.html                     0.44 kB
dist/assets/index-CLfIGydG.css    300.09 kB
dist/assets/index-CYs_OoXR.js   1,044.26 kB
✓ built in 4.04s
```

```text
git diff --check
exit 0
```

一次从错误工作目录调用 `pnpm test:integration` 得到 `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`（工作目录为 `C:\Users\20266`，非任务 worktree）；随后在上方授权 worktree 立即重跑并以 exit 0 完成，未将该路径错误计入代码失败。

治理登记与任务结构校验：

```text
powershell.exe ... record-platform-check.ps1 ... -Platform web -Result failed -Evidence <本交接绝对路径>
CHECK web failed

powershell.exe ... validate-task.ps1 ... -EnforceLocation
VALID
```

登记后只读状态：`state=qa`、`web_framework=vue`、`checks.web_passed=false`、`qa.passed=false`、`approvals.release.approved=false`、`repair_attempts=1`。未直接编辑 `task.json`。

### 真实联调边界与 010 重跑请求

本轮没有在本线程执行 `pnpm feishu:reads:verify-all`，因为该命令会访问授权 Feishu 环境；没有把 fake-context `65/65` 解析结果或本地合同测试写成真实接口通过。新的 runner 已准备好 operation-specific 输入、文件访问服务、403 权限清单和授权 URL。

请 010 基于提交 `5a3d9077b78b75da5a3472943c08124f3bf79021`，在已完成飞书 OAuth 且拥有对应权限的 QA 环境重新执行完整 65-read：

```text
FEISHU_VERIFY_AD_ACCOUNT=<已授权测试账号>
LIVE_EVIDENCE_FILE=<绝对路径>/reads-65-5a3d907.json
pnpm feishu:reads:verify-all
```

若结果仍为 403，请直接使用输出中的 `authorization.authorizationUrl` 重新授权，并按 `authorization.requiredPermissions` 逐项补齐权限；若仍为 503，仅保留准确的文件访问/上游阻塞码。真实 65-read、真实 403 授权成功、真实附件 token 和远程残留检查仍是外部依赖，当前不得声称通过。

当前 Web repair 结论仍为：`failed`。本轮代码合同和本地回归通过，但 010 的真实 65-read 尚未重跑，整体 QA/Release 仍未通过。
