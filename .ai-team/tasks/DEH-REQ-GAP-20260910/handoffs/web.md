# Web Engineer handoff — DEH-REQ-GAP-20260910

## 交付状态

- 平台：Web；框架：Vue 3 + TypeScript/Vite。
- 任务分支：task/digital-exhibition-ui-0817-dev-r3-web。
- 基线提交：a5dd87f。
- 本批最终提交：49eebed（fix: block unconfigured remote writes）。
- 本地预览：http://127.0.0.1:4173，保持运行，仅绑定 loopback。
- 产品工作树已提交；既有未跟踪 .ai-team/、dist.rar、public/live-approval-runner.html 保留且未修改。
- 未 push、merge、deploy、release；未修改 code-review、engineering-handoff 或后端。
- Web 平台门禁结论：passed（静态、集成及 focused browser 门禁均通过）。
- 独立 30 页 raw-float SSIM、text-only zoom、辅助技术朗读仍未运行，未虚构相关证据。

## 本批修改文件

- src/pages/CertificationPage.vue：remote 且 CER-004 正式预约合同未配置时，预约入口和确认提交禁用，显示阻断说明，不关闭为成功、不发请求；mock 模式保留本地演示。
- src/pages/AnnouncementsPage.vue：remote 且 ANN-004 公告发布合同未配置时，发布入口改为 disabled 阻断态，不导航、不发送请求。
- src/pages/AnnouncementEditorPage.vue：接收远程投影/状态；未配置时显示 alert，保存草稿、预览、发布禁用且提交被阻断；取消仍可用。
- src/App.vue：向公告编辑页传递受控远程状态与投影。
- tools/remote-write-blocks.test.mjs：新增 test-first 行为合同。
- package.json：将新阻断合同加入 test:deh-req-gap。

上一批 a7913f5 的浏览器门禁修复仍保留：remote write panel blocked 态、表格局部横向滚动、窄宽 header、人才筛选宽度与测试同步。

## 测试优先证据

- 新合同先红：node tools/remote-write-blocks.test.mjs exit 1，缺少 remoteBookingBlocked、公告发布配置门禁和编辑页远程状态。
- 最小实现后同命令 exit 0：remote certification and announcement write blocking contract passed。
- npm run test:deh-req-gap 中新增合同同样 exit 0。

## 完整命令及结果

最终提交 49eebed 上：

- node tools/remote-write-blocks.test.mjs → exit 0。
- npm run test:deh-req-gap → exit 0。
- npm run test:ui-source-sync → exit 0。
- npm test → exit 0。
- npm run test:integration → exit 0；安全代理、36 张治理表、101 个操作、OAuth/proxy/write gate 合同通过。
- npm run check → exit 0。
- npm run build → exit 0；Vite 6.4.1，1946 modules，CSS 300.09 kB，JS 1044.26 kB。
- git diff --check → exit 0。

## 浏览器命令及结果

预览启动：npm run preview -- --port 4173，地址 http://127.0.0.1:4173。

- EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:200pct-shell → exit 0；4/4 路由焦点可见，topbar/nav 几何有效。
- EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:30-routes → exit 0；30/30 HTTP 200、mounted、pageerror=0、无非本地请求；远程写面板为明确 blocked 或无写合同。
- EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:360-routes → exit 0；30/30 无页面级横向溢出，表格仅局部横向滚动。
- EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:narrow-header → exit 0；761/869/932/1000/1054 五个宽度均通过。
- EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:talent-narrow → exit 0；15/15 人才窄屏场景通过，remote progress 阻断态可见。
- EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:write-gates → exit 0；23/23 remote blocked 路由可见且无写请求。

## 响应式、键盘与基础无障碍

- 真实 Edge/Playwright 已覆盖 200% shell、360px、761–1054px header、人才窄屏和局部表格横向滚动。
- remote 写入阻断使用 role=alert/明确文案；认证预约和公告编辑按钮保持 disabled 语义；表格 region 保持键盘可达。
- 未运行 text-only zoom 200%、辅助技术朗读和独立视觉 SSIM 30 页矩阵；这些仍是后续证据项。

## 外部依赖与风险

- OAuth、真实 Feishu 账号/角色矩阵、真实业务数据及正式写入仍依赖外部服务；未访问生产数据、凭据或真实 Token。
- CER-004/ANN-004 正式写入合同未配置时安全阻断；只有明确受控配置才可启用正式动作。
- 视觉 raw-float SSIM、真实部署环境和辅助技术朗读未执行；Web passed 仅代表本批平台门禁与代码回归。

