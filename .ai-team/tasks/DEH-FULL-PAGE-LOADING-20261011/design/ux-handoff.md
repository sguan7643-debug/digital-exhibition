# UX/Interaction Handoff

Owner: UX/Interaction Designer

## Sources and Evidence

- Approved PRD: `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`
- Scope approval: `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/task.json` (`approvals.scope.approved = true`)
- Established request behavior: `src/integration/request-status.js` exposes one application-wide foreground request count; silent background refreshes do not enter that count.
- Current presentation to replace: `src/App.vue` renders `.request-loading-toast` inside `ExhibitionShell`; `src/style.css` positions it at the top right and explicitly permits continued page use.
- Existing shell behavior: `src/components/ExhibitionShell.vue` contains the top navigation, side navigation and `#main-content`; mobile navigation uses layers up to `z-index: 60` and account menus up to `z-index: 90`.

## Information Architecture

The loading surface is application-level system feedback, not page content and not a dialog. It sits above the complete authenticated Web application and has three parts:

1. A viewport-covering interaction shield.
2. A centered progress indicator and current foreground-request count.
3. A short explanation that the page will recover automatically.

No page navigation, business form, retry action, close action, technical code or first-sync message appears inside the loading surface.

## User Flows

### Foreground request

1. The first tracked foreground request starts.
2. The full-viewport loading surface appears immediately and the application shell becomes inert.
3. Additional tracked requests reuse the same surface and update the displayed count.
4. Each request settles through success, failure, cancellation or timeout.
5. When the final tracked request settles, the loading surface is removed, scroll behavior is restored and the underlying page exposes its existing terminal state.

### Silent refresh

1. Existing cached content remains available.
2. A request explicitly classified as silent runs in the background.
3. The global foreground count remains zero, so no loading surface appears and interaction remains available.

### Authorization or route transition

If a tracked request ends in an authorization, permission or route transition, its token must still settle first. The overlay then closes and the existing destination or state becomes responsible for the next screen. The loading surface never becomes a permanent authorization screen.

## Interaction Rules

- Trigger only when `requestActivity.activeCount > 0`; do not infer loading from page state text.
- Render exactly one application-level surface, regardless of request concurrency.
- While visible, prevent pointer, touch, wheel, keyboard activation and repeated submission against the application shell.
- Mark the underlying application shell `inert` while visible. The loading surface must be rendered as a sibling/teleported layer so it is not itself made inert.
- Lock document scrolling while visible and restore the pre-existing scroll-lock state when the count returns to zero or the application unmounts.
- Do not move focus into the loading surface, trap focus, expose a close button or close on Escape.
- Preserve the element that held focus before loading; after loading, do not force focus unless an existing route/state transition already defines a destination.
- The loading surface remains visible as long as at least one request is active. Never hide it with a fixed timer.
- A duplicated or unknown request token must not make the count negative or leave the overlay stuck; retain the current idempotent `endRequest` behavior.

## Content Behavior

- Primary line: `正在处理 {{ activeCount }} 项请求`
- Supporting line: `请稍候，完成后将自动恢复页面`
- The count is the current foreground request count and updates in place.
- Do not display `页面其他区域仍可继续使用`, because the approved behavior now blocks the page.
- Do not display “正式飞书数据正在首次同步”, “数据缺失”, “数据更新时间”, raw status codes, trace IDs or retry instructions.
- The complete status is announced as one atomic unit so assistive technology receives the updated count and explanation together.

## Web Behavior

- Cover the visual viewport with a fixed layer using all four viewport edges, including top navigation, sidebar, open drawers and content.
- The layer must remain centered and readable from 320 CSS px upward and at 200% browser zoom.
- On mobile Web, include safe-area padding and prevent the underlying mobile drawer from opening, closing or scrolling.
- On viewport resize or orientation change, recenter without transitioning from a corner or producing horizontal overflow.
- If the page was already scrolled, preserve that position and return to it when loading ends.

## uni-app Behavior

Not applicable. `task.json` declares Web only and `mobile_framework: none`; mobile requirements in this task mean responsive mobile Web.

## Required States

### normal

- Trigger: foreground request count is zero and the page has normal data.
- Content/actions: no global loading surface; all existing page actions remain available.
- Recovery/focus: no special handling.
- Announcement: existing page announcements only.

### loading

- Trigger: foreground request count is greater than zero.
- Content: spinner, current request count and automatic-recovery explanation.
- Permitted actions: none on the underlying application; no action exists on the loading surface.
- Recovery: automatic when the final request settles.
- Focus/order: do not move focus; underlying shell is inert and absent from sequential interaction while blocked.
- Announcement: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`; expose the current count.

### empty

- Trigger: final request succeeds with an empty business result.
- Content/actions: global loading closes; existing page empty state and its existing actions appear.
- Recovery/focus: governed by the page empty-state contract.
- Announcement: the loading status ends; existing empty-state announcement remains authoritative.

### error

- Trigger: a request fails and its tracking token settles.
- Content/actions: if no foreground requests remain, close loading and show the existing page error/retry UI.
- Recovery/focus: retry follows the existing page behavior and creates a new loading cycle only if it is tracked.
- Announcement: do not announce technical error content from the global loading surface.

### disabled

- Trigger: underlying business controls are disabled by existing rules.
- Content/actions: loading may temporarily cover the page, but it does not alter the disabled rule; after closing, controls retain their prior state.
- Recovery/focus: no global override.

### permission-denied

- Trigger: 401/403 or an existing permission result after the request settles.
- Content/actions: close loading when the count reaches zero, then expose the existing permission/authentication state.
- Recovery/focus: follow the existing authorization flow; the global overlay must never remain above it.

## Accessibility Behavior

- Use status semantics, not dialog or alert semantics, because the surface requires no decision and closes automatically.
- Add `aria-busy="true"` to the application shell while blocked and remove it at zero count.
- Use native `inert` on the underlying shell to block both pointer and keyboard activation; visual coverage alone is insufficient.
- Keep status text as real text and do not rely on spinner motion or color.
- In `prefers-reduced-motion: reduce`, show the static loading ring and text without rotation.
- In forced-colors mode, retain visible ring boundaries and system text/background contrast.
- Do not repeatedly move or reset focus as the request count changes.

## Open Questions and Conflicts

- No unresolved scope conflict. The approved successor task intentionally supersedes only the old non-blocking request-toast interaction while preserving all other UI parity decisions.
- Implementation must resolve the current legacy test assertion that requires `.request-loading-toast`; that assertion conflicts with this approved scope and must be replaced, not retained alongside the new overlay.
