# Design Handoff Aggregate

Owner: AI Team Lead

本聚合保留两份角色来源，不替代、不削弱，也不把设计审查或用户批准写成既成事实。

## UX/Interaction Evidence

Source: `design/ux-handoff.md`

- 现有 Web 信息架构、页面入口、表单与前端自动轮询逻辑保持不变；本任务只改变后端可观察合同。
- 统一读取生命周期为：实时身份/权限/范围校验 → 六维键 → fresh 或完整 LKG 直接 200 → 真冷读最多等待 5 秒 → 批准可交接的 operation 返回一次 202 → 仅轮询首次 `syncId` → `completed.result` 自动替换 loading。
- 状态查询不重跑业务 operation；同键 queued/running 合并，failed/expired 退出 merge index。终态前必须 abort 并 drain sibling/queued work。
- 首页仍是 COM-001、COM-002、COM-005、WB-001、WB-002 五段原子结果；独立 operation 的失败不级联；只有此前完整 LKG 可以 stale 200 静默服务。
- normal、loading、empty、error、disabled、permission-denied 六态以及 401 鉴权态均有互斥触发、内容、动作、恢复、焦点和公告规则。
- APP 名称批量投影、COM-004 self-only、COM-005 正式字典、WB-003 身份优先、收藏、APP-005、MAT-002/003 均保持现有入口并由后端提供完整合同。
- Mobile/uni-app 未声明；不要求移动端来源或实现。

## UI Visual Evidence

Source: `design/ui-handoff.md`

- 视觉结论为“完全保持现状”：不新增或修改 token、字体、颜色、间距、组件、断点、hover、focus、contrast、motion、图标、图片、文案或 Figma 资产。
- fresh 与 LKG 显示同一现有正常/空态；后台刷新无 badge、toast 或新 loading。
- 202、queued、running 只延续同一次现有 loading；completed 只更新一次；failed/expired、401、403 分别进入既有错误、鉴权和访问受限承载。
- 无文件素材保留正常卡片并禁用既有下载动作；baseline/投影/权限/上游失败不得伪装为空态。
- 现有断点、键盘焦点、强制色、缩放、触控目标与 responsive 规则全部保持；本任务不得产生任何 `src/**` 或根 `dist/**` 视觉变更。

## Cross-Source Traceability

| Approved PRD area | UX source | UI source | Implementation consequence |
|---|---|---|---|
| 构建/导入零预热 | PRD AC-B01/AC-B02 是权威来源；UX 对内部启动机制不适用 | UI 对内部启动机制不适用；只约束前端零 diff | 模块构造/配置导入无副作用；只有真实 Node service start 显式调用 prewarm；build/config import/test import 各自断言飞书调用为 0 |
| fresh/LKG/5秒/202/轮询 | §4、§6、§7 | §7.1 | 后端返回合同适配既有 loading 与状态边界 |
| 任务合并、25秒、abort+drain | §4.3–4.7、§10 | §7.1 | 单 `syncId`；终态前清零活动/排队工作 |
| 首页五段原子 | §4.7、§10 | §7 normal/error | 不发布 partial；只有完整 LKG 可 stale 200 |
| APP 名称与部门名称 | §5.1 | §7.2 | 批量后端投影；UI 结构不变且 Name 不得复制 ID |
| COM-004 self-only | §5.2、§7 | §7.2 | 实时权限与隐私；401/403 进入既有承载 |
| COM-005 正式字典 | §5.3 | §7.2 | TEST_/初始化/停用过滤；基线缺失是 error |
| WB-003 当前用户隔离 | §5.4 | §7.2 | 身份始终返回，统计/待办可为空结构 |
| FAV、APP-005、MAT | §5.5–5.7 | §7.2 | 稳定 ID/version、幂等审计、同源文件；现有动作不变 |
| 六态与无障碍 | §7、§8 | §6–§10 | 后端状态稳定，避免重复公告、焦点跳动和错误空态 |
| 性能与真实证据 | §10、§11.3 | §10、§11 | 5 cold/30 warm/30 common reads；前端视觉不作为替代证据 |

## API and State Decisions

1. HTTP 200 success 必须是 schema-complete 正式数据；不得把同步提示、ID 伪 Name、代理占位或 partial 数据放进 success。
2. 仅 PRD/UX 明确允许的读取可在 5 秒时返回 HTTP 202；202 不是业务数据，只含安全 handoff 字段。
3. 已存在且授权任务的状态查询始终 HTTP 200 表达 queued/running/completed/failed/expired；401/403/404 保留真实语义。
4. COM-004 联系方式不进入共享缓存、持久快照、日志或跨用户结果；目标用户必须等于 canonical session user。
5. 写操作和下载不得通过缓存绕过权限、审批、幂等、审计、版本或同源校验。
6. 结构化事件保留 trace/sync/operation/key digest/attempt/resource/path/elapsed 等安全字段，排除令牌、Cookie、密钥、原始业务 payload 和附件二进制。
7. 飞书读取已经成功、但必填 owner/developer/department 正式名称仍无法解析时，直接响应和任务 `failed.error` 均使用 HTTP/status `422`、`code="NAME_PROJECTION_INCOMPLETE"`、`retryable=false`。临时飞书网络、限流、超时或上游失败保留其具体 502/503/504 合同与重试属性；两类失败均不得以 ID 代 Name、partial APP 或成功空数据降级。

## Startup and Deployment Artifact Decisions

- `vite.config`、build 入口、测试导入或单纯模块构造不得启动 HTTP listener、prewarm、token 请求或任意飞书读取。服务启动模块必须在 listener 成功监听且运行模式明确为 Node server 后，显式调用一次 prewarm；测试可注入禁用/受控启动器。
- 自动化必须分别导入 Vite 配置、执行 build、导入服务模块但不启动，并对飞书 client/token/prewarm 调用计数断言为 0；真实 server-start 测试再断言只启动一次。
- 部署制品只接受后端服务运行所需源码、服务端依赖、既有静态资源副本和 systemd/说明文件；不得把本任务工作区中的 `src/**` 改动、密钥、真实 `.env`、runtime-cache、Cookie、token、附件或私钥打包。
- 必须生成 ZIP、独立 SHA-256 sidecar 和包内逐文件 `SHA256SUMS.txt`；交接记录本地绝对路径、字节数、摘要和包内敏感项扫描结果。
- 必须提供逐条部署、READY/live/业务合同/资源限制验证及目录交换回滚命令。Codex 不直接上传、不执行服务器命令、不改变测试或生产配置。
- 上述内部机制以批准 PRD 为权威；UX/UI 对构建和打包实现细节明确为不适用，不能用视觉零 diff 替代 AC-B01/AC-B02 或制品完整性证据。

## Engineering Boundaries

- 允许修改：Node 后端源码、机器合同、后端测试、systemd/部署配置与服务器部署包。
- 禁止修改：前端源码、根 `dist`、页面/组件/样式/路由/视觉资源。
- 前序 `DEH-SERVER-CACHE-RECOVERY-20261010` 的 1 个 P1、2 个 P2 是本任务强制关闭项，不得沿用当前 ZIP 作为候选。
- 闫瑾确认的正式业务域 baseline/hash 在发布前必须可核验；缺失不阻止本地开发，但阻止 QA 最终通过、release review 和发布。
- 真实账号、飞书权限、两用户隔离、正式附件和可写记录缺失时，对应 live QA 必须标为未执行并阻止发布，不得以 fixture 冒充。

## Unresolved Conflicts

无 UX/UI 来源冲突。两份来源都要求后端适配现有前端并禁止视觉改动。

尚未完成的不是设计冲突，而是证据门禁：正式字典 baseline、真实授权账号/权限、测试记录/附件和真实环境性能数据需在 QA/release 前提供。

治理状态以 `task.json` 和 `decision-log.md` 为当前事实来源；PRD 中生成时的 `scope_review` 描述属于历史上下文，不改变当前 `design_review` 门禁。
## 2026-10-10 approved amendment — baseline optional

COM-005 的运行时设计调整为 baseline 可选：未配置或无有效批准 baseline 时直接读取并过滤飞书正式字典；有效 baseline 存在时追加一致性校验。部署包和启动流程不得再要求 `formal-dictionary-baseline.json`，缓存结果继续经过 success schema 校验后提交。

