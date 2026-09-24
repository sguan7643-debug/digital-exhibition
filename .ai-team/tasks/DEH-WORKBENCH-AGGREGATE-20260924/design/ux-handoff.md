# UX / Interaction Handoff

## Sources

- Approved product scope: `../prd.md`
- Existing behavior evidence: `src/App.vue`, `src/integration/page-data-source.js`, `src/integration/data-state.js`
- Existing page shell and state boundaries: `src/components/ExhibitionShell.vue`, `src/components/PageStateBoundary.vue`

## Information Architecture

The task does not add a page or change navigation. The homepage remains the same page and visual hierarchy. It changes only the data-loading interaction beneath that page:

1. One homepage aggregate request owns the five homepage data sections.
2. One lightweight sync-status request owns cold-start progress.
3. Existing page content remains interactive while a background refresh runs.
4. The existing top-right data-status bubble remains the single user-facing recovery surface.

## Primary Flows

### Fresh load

1. User enters the homepage.
2. The page issues one aggregate request.
3. A fresh `200` response populates all available sections.
4. Loading feedback ends and any prior data-recovery bubble closes automatically.

### Stale but usable load

1. The aggregate response returns usable cached data with one or more stale sections.
2. The page renders the usable data immediately and does not blank any successful section.
3. A non-blocking bubble says that data is being updated or could not be refreshed.
4. Only one server-side refresh task runs. The page polls status by `syncId` when provided.
5. On completion, the page fetches the aggregate result once and closes the bubble when no required section remains unavailable.

### True cold start

1. The aggregate request returns `202 syncing` with `syncId`.
2. The stable shell, navigation, headings and independent controls remain visible.
3. Data regions show their existing local loading/empty placeholders; the status bubble says that formal Feishu data is syncing.
4. The page polls only the lightweight status endpoint every 2 seconds.
5. On `completed`, the page fetches the aggregate result once.
6. After 60 seconds without completion, automatic polling stops. The user can manually retry from the bubble.

### Failure and recovery

1. If a refresh fails with usable stale data, keep the data and show a closable warning bubble.
2. If no usable data exists, show the existing recoverable error state and a retry action.
3. A manual retry creates or joins one sync task; repeated clicks while pending are disabled.
4. Once all required sections become usable, the warning bubble closes automatically.
5. If the user closes a bubble manually, the same `syncId`/failure generation does not reopen it. A new failure generation may show a new bubble.

## Interaction Rules

- The browser must never call the five homepage operations individually during homepage load or polling.
- Route departure, component unmount, logout or authorization failure stops the polling timer and ignores late responses.
- Polling uses the server-provided interval when valid, with a 2-second default and a safe 1–10 second clamp.
- Only one aggregate refetch occurs after status changes to `completed`.
- `failed` and `expired` stop automatic polling.
- Existing content is preserved during refresh; new loading state must not replace usable content.
- A successful empty collection is an empty state, not an error and not a reason to retry.
- Manual retry is disabled and labelled “正在重试…” while active.
- Trace identifiers remain available in the recovery bubble for support but are not the primary message.

## Content Behavior

| State | Primary message | Action |
| --- | --- | --- |
| Fresh | No bubble | None |
| Syncing with no usable data | “正式飞书数据正在首次同步，页面其他区域仍可使用。” | Optional manual retry only after automatic polling stops |
| Refreshing with usable data | “数据正在更新，当前内容仍可使用。” | Close |
| Refresh failed with stale data | “部分飞书数据暂时不可用，已保留可用内容。” | Retry affected data; Close |
| Timed out with stale data | “部分飞书数据请求超时，已保留可用内容。” | Retry affected data; Close |
| Failed with no data | “飞书数据暂时不可用，请稍后重试。” | Retry |
| Permission denied | Existing authorization/permission message | Existing authorization action |

Messages must not expose upstream response bodies, credentials or personal data.

## Required States

### Normal

- Render all available homepage sections.
- Do not show the recovery bubble when all required sections are usable and not stale.

### Loading

- Preserve the page shell and any usable content.
- Announce syncing once through the existing polite live region.
- Do not move keyboard focus automatically.

### Empty

- Render the existing business empty state for a confirmed empty section.
- Do not show a retry bubble solely because the result is empty.

### Error

- With stale data: preserve content, show a non-modal warning bubble with retry and close.
- Without data: use the existing recoverable error boundary and retry path.
- Keep `traceId` available for support.

### Disabled

- If the data integration is disabled by configuration, preserve the existing disabled behavior and do not start polling.
- Retry controls are disabled while a retry is active.

### Permission denied

- Keep the existing Feishu authorization banner or permission state.
- Do not return stale data from another identity or start anonymous user-data polling.

## Accessibility

- The loading and recovery surfaces remain non-modal and must not steal focus.
- Use `role="status"`, `aria-live="polite"` and `aria-atomic="true"` for concise state transitions; avoid announcing every 2-second poll.
- Announce only semantic changes: sync started, completed, failed or stopped.
- Retry and close controls are keyboard reachable with visible focus and accessible names.
- Close button keeps the label “关闭数据请求提示”.
- Reduced-motion preference disables entrance and spinner animation.
- Content order stays DOM-logical; the fixed bubble is supplementary and not the only place where a blocking error is explained.

## Responsive Web Behavior

- At widths above 760px, the existing top-right bubble position and two-column message/action layout remain.
- At 760px and below, the bubble occupies viewport width minus 20px and actions stack below the message.
- At the supported 320px minimum width, message, retry, trace ID and close control must remain visible without horizontal scrolling.
- Resizing does not restart synchronization or reset dismissal state.

## Platform Differences

- Web/Vue is the only platform in scope.
- uni-app, mobile native and mini-program behavior are not applicable and must not be inferred from this handoff.

## Open Questions

None. Poll interval, automatic-stop duration, prewarm boundary and stale windows are fixed by the approved PRD.

