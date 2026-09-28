# Functional QA Report

- **Task:** `DEH-MY-APPLICATION-ENTRY-20260927`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-MY-APPLICATION-ENTRY-20260927/functional-qa-report.md`

## Environment

- **Build/version:** branch `task/digital-exhibition-ui-0817-dev-r3-web`, commit `766b33b`, task-attributed working-tree implementation; independent production build generated `index-pICDnYzY.css` and `index-CioyDdoL.js` in an isolated temporary output directory.
- **Runtime, device, browser, or test account:** Node `v20.14.0`; Microsoft Edge `154.0.4258.37` headless; local Web origin `http://127.0.0.1:4173/test2/` returned HTTP 200; desktop 1440×900, narrow 700px/320px/760px, and Edge page scale 200%; controlled identity `QA_USER`.
- **Permissions/configuration:** authorized and unauthenticated/permission-denied responses were exercised with local controlled responses and service-level identity checks. No real Feishu/Base write, deployment, release, merge, or business-data mutation was performed.
- **Evidence:**
  - `E-01` — `node tools/my-application-entry.test.mjs` exited 0. Real Edge narrow geometry: normal connector/next-icon edge `87/87px`; wrapped-copy edge `125/125px`; connector horizontal range `40–42px`, copy begins at `65px`.
  - `E-02` — `node tools/onboarding-apply-interaction.test.mjs` exited 0: `onboarding application interaction contract passed`.
  - `E-03` — `node tools/onboarding-status-live.test.mjs` exited 0: returned real approval-instance status continues to drive the status page.
  - `E-04` — `node tools/mounted-profile-projection.test.mjs` exited 0: mounted normal projection, safe navigation, and permission-denied state passed without fixture leakage.
  - `E-05` — `node tools/onboarding-responsive-accessibility.test.mjs` exited 0. Edge results: authorization-link count `0`; return target height `44px` at both 320px and 760px; document width equals 320px viewport.
  - `E-06` — `node tools/feishu-personal-read-batch.test.mjs` exited 0: ten personal/workbench reads remained scoped to authenticated server identity; the quick entry resolved to `/apps/onboarding/status` and remained enabled with the same rule as the text entry.
  - `E-07` — `npm.cmd run check` exited 0: static, deterministic, zero-external-network, semantic, and atomic-asset checks passed.
  - `E-08` — `npm.cmd run build -- --outDir C:\Users\20266\AppData\Local\Temp\deh-my-application-entry-qa-build-20260927 --emptyOutDir false` exited 0; Vite transformed 1,932 modules. Output was isolated from the repository build directory.
  - `E-09` — in-memory Playwright Edge functional harness exited 0. Both entries had a solid `3px` focus ring and navigated to `/test2/apps/onboarding/status`; loading recovered to empty; error recovered after two requests; disabled and permission-denied cards rendered; empty state exposed “发起申请” and “返回应用中心”; authorization entry visible/focusable counts were `0/0`; invalid submit rendered `请检查以下 12 项`.
  - `E-10` — the same Edge harness measured desktop connector `{left:568.5,right:1091.5,top:489.984375,bottom:491.984375}` exactly between icon edges `568.5` and `1091.5`, with zero text intersections. At `visualViewport.scale=2`, intersections remained zero. Keyboard “返回我的申请” restored the empty list.
  - `E-11` — `node tools/onboarding-approval-routing.test.mjs` exited 0: RPA compatibility and stable `applicationId`/attempt APIs for T005 passed.
  - `E-12` — `node tools/feishu-user-auth.test.mjs` exited 0: OAuth v3 keeps credentials/user token server-side, validates state, and exposes only sanitized identity.
  - `E-13` — `node tools/onboarding-status-redirect-and-origin.test.mjs` exited 0: success redirect and same-origin approval-status query passed.
  - `E-14` — `node tools/feishu-onboarding-middleware.test.mjs` exited 0: authenticated same-origin list/detail/sync/attempt/upload/grant routes passed.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AC-01` | `1` — 文字“我的申请”入口进入现有页面 | executed | 1. 以受控已授权身份打开个人中心。 2. 聚焦标题区“我的申请”。 3. 按 Enter。 | 保持既有行为并进入“我的申请”页面。 | 链接获得 3px 可见焦点环，键盘激活后进入 `/test2/apps/onboarding/status`。 | `E-09` | none | passed | none |
| `AC-02` | `2` — 快捷卡片进入与文字入口相同页面 | executed | 1. 返回个人中心。 2. 聚焦快捷卡片“我的申请”。 3. 按 Enter。 | 进入与文字入口完全相同的页面。 | 快捷卡片获得 3px 可见焦点环并进入同一 `/test2/apps/onboarding/status`。 | `E-01`, `E-06`, `E-09` | none | passed | none |
| `AC-03` | `3` — 允许查看时两个入口同时可用 | executed | 1. 投影仅有 `apps.view` 的已认证用户。 2. 同时查询文字入口与快捷卡片。 3. 依次用键盘激活。 | 两个入口均可用，不出现单侧禁用。 | 两个入口均为语义链接、均可聚焦、均成功导航；快捷入口服务投影为 `enabled:true`。 | `E-06`, `E-09` | none | passed | none |
| `AC-04` | `4` — 不允许查看时沿用同一权限反馈且不绕权 | executed | 1. 挂载个人中心 `permission-denied` 状态。 2. 对无服务端身份的个人读取逐项发起调用。 3. 打开返回 403 的申请列表。 | 沿用既有权限反馈，不新增授权机制或绕过身份权限。 | 个人中心显示需授权/权限提示且不泄露正常数据；无身份读取均拒绝；申请页显示“无法查看该申请”和返回入口。 | `E-04`, `E-06`, `E-09` | none | passed | none |
| `AC-05` | `5` — 空申请列表显示既有空态并可继续操作 | executed | 1. 从入口进入列表。 2. 返回 `{items:[]}`。 3. 检查空态及后续操作。 | 显示既有空态，可发起申请或返回应用中心。 | 显示“暂无上线申请”；“发起申请”指向 `/test2/apps/onboarding/apply`，“返回应用中心”指向 `/test2/apps`。 | `E-09` | none | passed | none |
| `AC-06` | `6` — 已有申请详情中标题和时间不被连线遮挡 | executed | 1. 打开受控已有申请详情。 2. 在桌面 Edge 测量连接线、图标、标题和时间矩形。 3. 在窄屏重复普通文本和长文本测量。 | 每个阶段标题与时间均不被连线遮挡，连接线保持阶段顺序。 | 桌面和窄屏的文字交集数均为 0；连接线精确贴合相邻图标边缘。 | `E-01`, `E-10` | none | passed | none |
| `AC-07` | `7` — 两个或更多阶段在声明 Web 视口互不重叠 | executed | 1. 渲染当前两阶段模型。 2. 验证 1440px 桌面、700px 窄屏普通/换行文本。 3. 在 Edge 设置 200% 页面缩放后重测。 | 标题、时间、图标、连线互不重叠。 | 1440px、700px 普通/长文本及 `visualViewport.scale=2` 均零交集；窄屏长文本使行高增至 80px，连接线仍连续。 | `E-01`, `E-10` | none | passed | none |
| `AC-08` | `8` — 申请页不展示“飞书授权”按钮 | executed | 1. 打开申请页。 2. 查询可见链接/按钮。 3. 查询可聚焦角色。 4. 验证保留的返回入口。 | 不显示“飞书授权”，也无可聚焦残留；返回入口保留。 | 可见数量 `0`、可聚焦数量 `0`；“返回应用中心”保留、可聚焦且有 3px 焦点环。 | `E-02`, `E-05`, `E-09` | none | passed | none |
| `AC-09` | `9` — 原有查看进度链路可用且授权/回调/提交/写入行为未被触及 | executed | 1. 执行状态页真实状态驱动契约。 2. 执行 T005/RPA 提交路由回归。 3. 执行 OAuth 会话与同源状态 URL 回归。 4. 执行认证中间件路由回归。 | 查看进度继续可用；会话、OAuth、审批提交及服务端身份边界保持。 | 状态驱动、T005/RPA 提交路由、OAuth 服务端会话、同源状态跳转、认证列表/详情/同步路由均通过；无真实数据写入。 | `E-02`, `E-03`, `E-11`, `E-12`, `E-13`, `E-14` | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `VAL-01` | 必填申请字段不得无提示提交 | executed | 1. 以有效会话打开申请页。 2. 保持必填业务字段为空。 3. 点击“提交审核”。 | 阻止提交并显示可理解的错误摘要。 | 页面显示 `请检查以下 12 项`，未发起真实审批写入。 | `E-09` | none | passed | none |
| `VAL-02` | 申请人身份由当前会话锁定，不允许客户端切换 | executed | 1. 读取申请页交互契约。 2. 执行会话身份与 OAuth 服务端边界测试。 | 申请人从会话读取，令牌不暴露给客户端，身份不可由下拉框改写。 | 申请页会话读取、只读申请人字段及服务端令牌/状态校验全部通过。 | `E-02`, `E-12` | none | passed | none |
| `VAL-03` | 无身份或无权限读取必须被拒绝 | executed | 1. 对十个个人/工作台读取以空身份调用。 2. 以他人 `userId` 输入调用。 3. 渲染 403 列表。 | 空身份拒绝，不能用输入参数越权切换身份，页面给出权限反馈。 | 空身份返回 `USER_AUTH_REQUIRED`；他人 `userId` 返回 `INVALID_OPERATION_INPUT`；403 页面不显示申请数据。 | `E-06`, `E-09` | none | passed | none |
| `VAL-04` | 删除授权按钮不得留下可见、可聚焦或原生导航残留 | executed | 1. 在 320px 和桌面申请页按角色查询。 2. 遍历可见链接/按钮文本。 3. 检查申请交互契约。 | 数量为 0，其他申请表单与返回入口仍存在。 | 可见/可聚焦均为 0；表单、提交、状态导航和返回入口均保留。 | `E-02`, `E-05`, `E-09` | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `STATE-01` | 成功 | executed | 1. 以已授权身份进入个人中心。 2. 依次打开列表、已有详情和申请页。 | 两入口、详情时间线和申请页均可用。 | 两入口进入同一路由；详情正确渲染；申请页无授权按钮且保留返回/提交能力。 | `E-03`, `E-09`, `E-10` | none | passed | none |
| `STATE-02` | 加载 | executed | 1. 延迟列表响应 700ms。 2. 在响应前检查页面。 3. 等待响应。 | 显示现有加载反馈，不重复导航；完成后进入可用状态。 | 显示 `正在加载我的上线申请…`、`aria-busy=true`，随后进入空态。 | `E-09` | none | passed | none |
| `STATE-03` | 空态 | executed | 1. 返回空申请数组。 2. 检查提示和操作。 | 显示既有空态，并可发起申请或返回。 | “暂无上线申请”、发起申请和返回应用中心均存在且目标正确。 | `E-09` | none | passed | none |
| `STATE-04` | 错误 | executed | 1. 首次返回 500 `QA_ERROR`。 2. 检查错误反馈。 3. 点击“重新读取”。 4. 第二次返回空数组。 | 显示错误且允许重试，恢复后回到可用状态。 | 首次显示“读取失败”和原始错误；第二次请求后恢复为空态，总请求数 2。 | `E-09` | none | passed | none |
| `STATE-05` | 禁用 | executed | 1. 返回 503 `POC_GATES_NOT_READY`。 2. 检查服务禁用反馈和退出操作。 | 显示服务暂不可用，不误导为正常数据。 | 显示“申请服务暂不可用”、门禁未就绪原因及“返回应用中心”。 | `E-09` | none | passed | none |
| `STATE-06` | 权限相关 | executed | 1. 返回 403。 2. 挂载个人中心 permission-denied。 3. 执行无身份/他人身份服务调用。 | 不泄露数据，不绕过会话/权限，并提供既有反馈。 | 页面显示权限提示和返回入口；正常身份数据未泄露；服务端拒绝无身份与身份覆盖。 | `E-04`, `E-06`, `E-09` | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `REG-01` | OAuth/用户会话边界，因为申请人和权限状态依赖当前会话 | executed | 1. 执行 OAuth v3 会话测试。 2. 检查凭据、user token、state 和客户端身份投影。 | 凭据与 token 留在服务端，state 校验有效，仅暴露脱敏身份。 | 全部断言通过。 | `E-12` | none | passed | none |
| `REG-02` | 海能Work T005 与 RPA 提交路由，因为申请页 UI 改动邻接提交流程 | executed | 1. 执行提交路由契约。 2. 检查 T005 稳定 applicationId/attempt API。 3. 检查 RPA 兼容路径。 | 两种已有提交通道不回退。 | T005 稳定 API 与 RPA 兼容路由均通过。 | `E-11` | none | passed | none |
| `REG-03` | 申请成功跳转、状态查询和返回列表，因为入口与详情导航被修改 | executed | 1. 执行同源状态 URL 测试。 2. 执行真实状态驱动测试。 3. 键盘激活详情返回入口。 | 成功后进入状态页，状态由响应驱动，返回列表可恢复。 | 同源跳转和状态驱动通过；键盘返回后显示空列表。 | `E-03`, `E-10`, `E-13` | none | passed | none |
| `REG-04` | 认证的列表/详情/同步/上传/授权路由，因为状态页依赖这些同源中间件 | executed | 1. 执行 onboarding 中间件测试。 2. 检查认证与同源约束。 | 既有路由继续受认证保护并可调用。 | list/detail/sync/attempt/upload/grant 路由全部通过。 | `E-14` | none | passed | none |
| `REG-05` | 静态质量与生产可构建性，因为三处 Vue/服务端文件及测试契约发生变更 | executed | 1. 运行静态检查。 2. 将生产构建输出到隔离临时目录。 | 静态门禁和生产构建通过，不修改仓库构建产物。 | 静态检查通过；Vite 转换 1,932 模块并成功产出隔离构建。 | `E-07`, `E-08` | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

本报告是本轮唯一写入。Functional QA 未修改业务实现、测试、构建产物、交接、批准、`task.json` 或最终 QA 字段；未修改任务状态，未部署、提交、合并或接受发布风险。跨平台兼容性矩阵和最终 QA 记录仍由后续独立角色负责。
