# DEH-BUSINESS-ISSUES-20261004 Web 工程交接

## 2026-10-06 复核补充

- 角色：Web Engineer。
- 本轮范围：验证第二轮代码复核后的 Web 修复，不修改实现源码、测试或 Team Lead 汇总。
- 关键实现复核：`/apps` 页面使用 `requestActionEnabled` 控制“申请使用”入口；`App.vue` 向 `AppsPage` 传入 `request-action-enabled="integrationRuntime.testWritesEnabled && integrationContract.actions.some(action => action.operationId === 'APP-005')"`；普通远程环境未开启受控测试写通道时不会出现可点击但会被 `executePageWriteOperation` 门禁拦截的假入口；`tools/application-page-actions.test.mjs` 与 `tools/business-issues-20261004.test.mjs` 已覆盖该绑定。
- 本轮代码改动：无实现源码改动，无测试改动；仅更新本 Web handoff 证据。

本轮命令与结果：

- `npm run test:business-issues`：通过。输出包含 `DEH-BUSINESS-ISSUES-20261004 behavior contract passed`，以及 `onboarding service keeps one attempt, isolates owners, grants token-free file access, and restores after eight controlled days`。
- `node tools/application-page-actions.test.mjs && node tools/application-use-flow.test.mjs && node tools/application-interaction-flow.test.mjs`：通过。输出确认应用页真实训练、收藏、详情动作、规范资源、使用/复用构建器、收藏评论培训下载等合同均通过。
- `node tools/feishu-integration-foundation.test.mjs`：通过。输出为 `飞书安全代理、101 操作、30 页面矩阵、字段漂移、游标分页与数据状态基础合同通过`。
- `npm run check`：通过。输出为 `源码静态、确定性、零外网、语义与原子资产检查通过`。
- `npm run build`：通过。Vite 6.4.1 构建成功，转换 1935 个模块，生成 `dist/index.html`、`dist/assets/index-CyyNS4NK.css`、`dist/assets/index-DCY-a-h5.js`。

本轮结论：复核指出的普通远程环境“申请使用”假入口问题已关闭；Web 平台当前复核结果为通过。未执行部署、推送、合并或发布。

## 结论

- 平台：Web / Vue。
- 分支：`task/digital-exhibition-ui-0817-dev-r3-web`。
- 依据：已批准的 `prd.md`、`design-handoff.md` 与 `digital-exhibition-SOURCE-20260916-165348` UI 基线。
- 结果：批准范围内的 Web 实现已完成，相关单元、集成、性能预算、静态检查、生产构建和浏览器回归均通过；未部署、未推送、未合并，未操作真实飞书数据或表结构。

## 完成内容

1. 上架申请表单
   - 接入人选择后通过 `COM-004` 精确用户查询回填真实电话和邮箱；完整用户目录继续只暴露脱敏字段。
   - 申请人和接入人的中国大陆手机号、邮箱同时执行前端与服务端格式校验。
   - RPA 与海能 Work 应用编码规则统一为用户填写并必填；未配置真实审批通道的类型不可提交并显示原因。
   - “全部组织可见”与“部分部门/用户”按真实范围归一化，全部组织范围不再写入虚假用户或部门。
2. 拒绝后编辑重提
   - 被拒绝申请提供“编辑并重新提交”入口，校验申请所有者和拒绝状态。
   - 复制原表单、有效图标和附件引用并创建新的申请尝试；原申请、审批实例和不可变标识保留不变。
   - 服务端留存文件无效或不可用时要求重新上传，不伪造文件成功状态。
3. 应用浏览与详情
   - 应用卡片根据真实 `APP-004` 授权与启动能力展示“立即使用 / 申请使用 / 暂不可用”。
   - 附件从通用对象输出改为结构化名称、类型、大小、时间和预览/下载能力展示，并增加窄屏防溢出。
4. 既有能力回归
   - IndexedDB、服务端缓存、请求去重、静默刷新、局部加载和首页请求预算合同全部保持通过。
   - 首页和详情继续使用真实数据投影，不恢复业务 mock 数据。

## 主要代码与测试

- 页面与组件：`src/App.vue`、`src/pages/OnboardingApplyPage.vue`、`src/pages/OnboardingPage.vue`、`src/pages/AppsPage.vue`、`src/components/AppDetailAuthoritativeBody.vue`、`src/components/AppDetailLiveSections.vue`。
- 前端策略：`src/integration/onboarding-form-policy.js`、`src/integration/application-card-policy.js`、`src/integration/attachment-presentation.js`、`src/integration/operation-contract-schemas.js`。
- 服务端：`server/feishu-onboarding-service.mjs`、`server/feishu-approval-service.mjs`、`server/feishu-read-only-service.mjs`。
- 回归测试：`tools/business-issues-20261004.test.mjs`、`tools/browser-onboarding-apply-flow.test.mjs`、`tools/feishu-onboarding-service.test.mjs`、`tools/feishu-server-proxy.test.mjs`、`tools/onboarding-apply-interaction.test.mjs`，以及现有全量 Web/集成/UI 回归集。

## 测试优先记录

初始失败及修复证据：

1. `node tools/business-issues-20261004.test.mjs` 初始失败：详情组件缺少 `normalizeAttachmentPresentation`，随后完成结构化附件展示并通过。
2. 首轮浏览器链路发现复制来的有效图标未满足原生必填文件输入，修复为“新上传图标或有效复制图标”均满足必填条件。
3. 首版联系人回填将原始电话和邮箱暴露在完整目录，`feishu-server-proxy` 隐私合同失败；改为仅对已认证用户发起明确 `userId + includeContact` 的单用户查询，目录继续脱敏，最终集成测试通过。
4. 最终浏览器复测前两项 UI 尺寸命令误指向启用真实读取但无授权的端口，工作台按设计报告“需要先完成飞书用户授权”；改用既定禁用远端读取的当前构建端口后，视觉和溢出回归全部通过。这是验证环境选择问题，不是产品缺陷。

最终通过：

- `npm run test:business-issues`：通过。
- `npm test`：通过，完整 Web 单元/合同回归通过。
- `npm run test:integration`：通过，完整飞书代理、认证、读取、审批和写门禁集成回归通过。
- `npm run test:onboarding-poc`：通过。
- `npm run test:ui-source-sync`：通过。
- `npm run test:feishu-latency`：通过。
- `npm run test:first-screen-budget`：通过。
- `npm run test:no-mock-data`：通过。
- `npm run test:homepage-aggregate`：通过。
- `npm run check`：通过。
- `npm run build`：通过，Vite 6.4.1 共转换 1935 个模块；生成 `dist/index.html`、CSS 和 JS 产物。
- `git diff --check`：通过；仅出现既有 Windows 换行提示，无空白错误。

## 浏览器验证

- `npm run test:browser:onboarding-apply`，1440×1000：通过联系人回填、RPA/海能 Work 提交、真实状态查询、拒绝后复制重提。
- `npm run test:browser:ui-parity`：通过 15 个用例（5 条代表路由 × 1440/900/390 三档视口）。
- `npm run test:browser:360-routes`，360×800：30/30 路由通过，无页面脚本错误、无横向溢出、无外部请求。
- `npm run test:browser:200pct-shell`，720×500 模拟 200% 缩放：4/4 路由通过，顶栏和导航未裁切，键盘焦点可见。

## 可访问性与边界

- 保留原生表单约束、错误汇总和 `aria-live` 状态播报；键盘焦点与窄屏导航已由浏览器回归覆盖。
- 联系方式自动回填依赖飞书应用拥有对应联系人字段权限；无数据或无权限时保留手动填写，并显示可理解提示。
- 拒绝重提只复用服务端仍有效的受控文件引用；远端文件无法安全复用时必须重新上传。
- 本交接不代表发布批准；未执行部署、推送、合并、真实飞书写入或表结构变更。
