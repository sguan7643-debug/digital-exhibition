# Front-end Code Review —限定复核

## Findings

本轮仅复验上一版 Finding 1 和 Finding 2；未发现新增问题。

## Resolved Findings

### Finding 1 — resolved

- 原问题：远程认证预约可伪造本地成功。
- 复核证据：`src/pages/CertificationPage.vue:58-60,193-207,219,369-420` 新增 `CER-004` 配置门禁。远程且未配置时，预约入口、类别按钮和确认提交均 disabled，并显示阻断说明；`openBooking`/`confirmBooking` 在阻断态只播报“未提交预约”，不关闭对话框、不发送请求。mock 模式仍保留本地演示路径。
- 行为证据：`tools/remote-write-blocks.test.mjs` exit 0；`pnpm test:deh-req-gap` exit 0；Web handoff 记录 focused browser write-gate 23/23 路由无写请求。
- 结论：原 Finding 1 已关闭。

### Finding 2 — resolved

- 原问题：远程公告发布入口和编辑页提供了未配置写操作的假性可用控件。
- 复核证据：`src/pages/AnnouncementsPage.vue:34,115-124,175-184` 使用 `ANN-004` 配置门禁；未配置时入口变为 disabled 阻断按钮，不导航、不发送请求。`src/pages/AnnouncementEditorPage.vue:4-9` 接收远程状态并以 `publishConfigured` 控制保存草稿、预览、发布；未配置时显示 `role="alert"`，提交由 `blockPublish` 阻断，取消仍可用。`src/App.vue:323` 传递远程投影与状态。
- 行为证据：`tools/remote-write-blocks.test.mjs` exit 0；`pnpm test:deh-req-gap` exit 0；Web handoff 记录远程写入门禁无请求且 mock 演示保留。
- 结论：原 Finding 2 已关闭。

## Out-of-Scope Observations

- 本轮只验证上述两项；不重新评价其他实现或外部依赖。
- Android/mobile 未声明，不需要移动端交接或平台证据。

## Verification Evidence

- `git rev-parse HEAD`：`49eebedb2d859dc0344c61ddd13aa76210cc3548`。
- `git status --short`：仅保留既有未跟踪 `.ai-team/`、`dist.rar`、`public/live-approval-runner.html`。
- `pnpm exec node tools/remote-write-blocks.test.mjs` — exit 0。
- `pnpm test:deh-req-gap` — exit 0。
- 更新后的 `handoffs/web.md` SHA-256：`697DFF1A7611F11AB1F1294B37BF9B84702C543F5A0920FDF7A60122A72F849D`。

## Verdict

approved
