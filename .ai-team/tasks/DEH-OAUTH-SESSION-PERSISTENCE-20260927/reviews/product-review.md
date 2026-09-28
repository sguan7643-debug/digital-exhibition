# Product Scope Review

## Verdict

`changes_required`

该任务针对已验证的本地 POC 重复授权阻塞，且范围限制为 Web 本地开发；但在范围批准前，仍须明确持久化保护边界、恢复有效性策略，并消除安全验收标准与 OAuth 协议流程的冲突。完成下列决策后可重新评审。本评审不批准范围。

## Findings

### Finding: 持久化授权材料的本地保护边界尚未可验证

- **Evidence:** `prd.md` 将“本地存储实现与位置”列为范围审批所需的开放问题；`server/feishu-user-auth-service.mjs` 当前将包含 `accessToken` 的会话记录存入进程内 `sessions` Map。`task.json` 将令牌不得进入前端、日志或仓库列为范围外事项，且风险等级为 `high`。
- **Impact:** 未指定运行时目录、访问权限、记录粒度、写入方式和清理责任时，无法判断 AC-01、AC-06、AC-08 是否可被实现和验证；不当的文件位置或权限会使服务重启恢复变成对本机其他用户或仓库内容的令牌暴露风险。
- **Recommendation:** 在范围批准前确认以下最小约束：持久化记录仅位于仓库外、当前操作系统用户可访问的运行时目录；文件/目录仅允许该用户访问；记录以随机浏览器会话标识为键，原子写入；只保存恢复所必需的服务端材料及明确的过期时间；登出、过期、损坏读取和服务启动清理都会删除对应记录；该目录不得被前端静态服务、测试快照或日志读取。实现方式可在设计阶段选择，但这些约束应作为范围内的不可变验收条件。

### Finding: 会话恢复的有效性判定和不可恢复处置尚未确定

- **Evidence:** `prd.md` 的“恢复有效性策略”仍是开放问题。当前 `server/feishu-user-auth-service.mjs` 仅以 `expiresAt` 清理并从内存 Map 解析会话，未提供持久化恢复或令牌可用性验证机制；`task-brief.md` 要求保留过期处理和登出语义。
- **Impact:** 若只恢复未过期的本地记录，已被飞书撤销的令牌可能被暂时视为已授权；若每次恢复都使用不受控的上游校验，又会引入额外延迟和故障路径。没有明确策略，AC-02、AC-05、AC-09 和 AC-10 的“有效”与“不可恢复”判断无法一致测试。
- **Recommendation:** 在范围批准前确认默认恢复策略：仅在浏览器携带原有 HttpOnly 会话标识、持久化记录完整且本地 `expiresAt` 未到期时恢复；首次受保护飞书调用若明确返回授权失效，则立即删除该会话记录并只返回重新授权引导；网络超时或非授权类上游故障不得误清除会话或泄露诊断细节。将“授权撤销后首次受保护调用”加入自动化和浏览器验证证据。

### Finding: AC-08 对 OAuth `state` 的零响应暴露要求与既有授权流程冲突

- **Evidence:** `prd.md` 的 AC-08 要求在“浏览器响应”中不得出现 OAuth `state` 原值；但 `prd.md` 的主流程和 AC-09 均要求保留 OAuth `state` 回调校验。`server/feishu-user-auth-service.mjs` 的 `beginAuthorization` 会将随机 `state` 放入飞书授权 URL，并设置 HttpOnly state Cookie；`completeAuthorization` 则比较回调参数与该 Cookie 及服务端 `pendingStates` 记录。
- **Impact:** 现有 OAuth 授权跳转本身需要浏览器接收包含 `state` 的授权 URL、并在回调时提交该值，因此按字面无法同时满足“不得出现在浏览器响应”和“保留 state 校验”。验收人员将无法一致判定 AC-08 与 AC-09 是否通过，且可能促使实现错误地移除必要的 CSRF 防护。
- **Recommendation:** 在范围批准前将 AC-08 明确为：不得在应用页面、前端持久化存储、应用日志、测试快照、Git 变更或用户可见错误信息中暴露令牌、授权码或 `state`；允许 `state` 仅在 OAuth 授权跳转及回调的协议参数中短时传递，并要求该值为随机、单次使用、有短 TTL、不得记录。确认该例外后，将 state 失配、过期和重复使用的脱敏验证列为 AC-10 证据。

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, or change task state.
