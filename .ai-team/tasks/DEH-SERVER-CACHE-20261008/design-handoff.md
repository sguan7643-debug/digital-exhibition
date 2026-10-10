# Design Handoff Aggregate — DEH-SERVER-CACHE-20261008

Owner: AI Team Lead

## 1. Approved Design Baseline

- Approved product source: `prd.md`.
- Governed scope decision: `decision-log.md`, scope approval recorded at `2026-10-08T13:45:34.9218678Z`.
- Declared platform: Web / Vue.
- Mobile and uni-app: `not declared`, evidenced by `task.json`.
- Implementation boundary: backend source, backend tests, service configuration, and the complete server deployment package only. Front-end source, `dist`, styles, visual assets, routes, components, and build output must have an empty change list.

## 2. UX / Interaction Evidence

Source: `design/ux-handoff.md`

Preserved decisions:

1. Cache and synchronization remain invisible implementation details; no page, route, control, dialog, progress page, countdown, manual-refresh step, or task-detail UI is added.
2. The existing request loading lifecycle begins with the initial request and remains continuous through the five-second wait and any automatic sync-job polling. It ends only on `completed`, `failed`, permission denial, caller cancellation, or navigation cleanup.
3. A serviceable fresh or stale snapshot returns the complete operation success schema after real-time session, permission, and data-scope validation. A stale response may trigger only a silent server-side refresh.
4. With no serviceable cache, the initial request waits at most 5,000ms. Completion returns HTTP 200 directly; otherwise the backend returns the existing client-compatible non-503 task contract with a valid `syncId` and positive `pollAfterMs`.
5. Existing client polling continues without user action until `completed` or `failed`. A client disconnect cannot cancel the server task, and a task cannot be reused across a different isolation key.
6. “正式飞书数据正在首次同步”, “数据缺失”, and equivalent first-sync/manual-retry messages are forbidden in user-visible content. The existing request-processing loading indication remains required.
7. A complete zero-record Feishu result is the only condition that produces the existing empty state. Timeout, partial pagination, running synchronization, permission failure, and integrity failure cannot be presented as empty.
8. Normal, loading, empty, error, disabled, and permission-denied behavior, keyboard order, focus handling, and live announcements remain those of the current Web application. Cache hits, silent refreshes, and polling iterations add no focus movement; the existing `PageStateBoundary` result-heading focus after loading and permission-heading focus on denial remain unchanged.

## 3. UI Visual Evidence

Source: `design/ui-handoff.md`

Preserved decisions:

1. The current enterprise blue-and-white UI, design tokens, typography, spacing, borders, surfaces, shadows, icons, images, responsive breakpoints, H5 rules, and existing state components are frozen.
2. The only synchronization-related foreground visual is the current `.request-loading-toast`, including its existing position, wording, colors, spinner, reduced-motion behavior, non-focusable behavior, and `pointer-events:none` treatment.
3. Initial request and polling use one continuous loading toast; polling cannot create a second toast or make the existing toast flash. Silent background refresh after a complete response creates no toast.
4. No skeleton, blank placeholder, progress bar, task ID, cache badge, stale badge, sync-complete toast, background-refresh toast, new disabled style, or manual-refresh action is allowed.
5. Existing normal, empty, error, disabled, permission-denied, authentication-required, hover, active, focus-visible, and responsive appearances remain unchanged.
6. Web is the only visual target. Figma, uni-app component mapping, mobile-native adaptation, and new visual assets are not applicable.

## 4. Cross-Source Traceability

| Approved PRD requirement | UX source | UI source | Aggregate implementation constraint |
| --- | --- | --- | --- |
| Complete HTTP 200 result from fresh/stale cache after real-time authorization | UX 4.1–4.2, 5, 9 | UI 3, 6, 11 | Backend may change data source behavior only; current page rendering remains untouched. |
| Five-second cold-read handoff and automatic task polling | UX 4.3–4.5, 6.3, 9 | UI 5.1, 6, 12.2 | Return a non-503 compatible task envelope with valid `syncId`/`pollAfterMs`; `completed.result` is the original success schema. |
| Preserve request loading; remove first-sync/data-missing prompts | UX 3.2, 5, 6, 10 | UI 5.1–5.2, 6, 11 | Existing loading remains continuous; forbidden text must be unreachable in rendered DOM and live regions. |
| Complete empty result versus incomplete/error/permission states | UX 4.3–4.4, 5 | UI 6, 11 | Only fully completed zero-record reads use the existing empty state; all other terminal states preserve current distinct handling. |
| Real-time identity/permission and no cross-scope task reuse | UX 2.1, 4.4, 5, 9 | UI 6 permission-denied | Every cache return and task poll revalidates access; denied requests reveal no old result or task existence. |
| Front-end zero change | UX 1, 3, 8, 10 | UI 1, 5, 8, 12.3 | Front-end source, `dist`, CSS, assets, and component diffs must be empty. |
| Web-only platform | UX 8 | UI 10 | Web evidence is required; mobile/uni-app is `not declared`, not unavailable. |

## 5. Required State Contract

| State | Backend observable contract | Existing Web behavior to preserve |
| --- | --- | --- |
| `normal` | HTTP 200 with complete non-empty success schema | Render current content; end loading; no cache/sync message; preserve the existing terminal result-heading focus behavior. |
| `loading` | Initial request is pending or compatible task state is `running` | Keep the current single loading toast and busy lifecycle; do not add another message or focus trap. |
| `empty` | All pages completed, integrity and real-time access checks passed, and result count is zero | Render the current genuine empty state; do not call it missing or syncing. |
| `error` | Task is `failed` or a non-permission terminal error occurs | End loading and use current error handling once; never substitute empty or first-sync text. |
| `disabled` | Only existing business/UI rules trigger disabled state | Caching, queueing, and polling cannot introduce a new disabled appearance or action. |
| `permission-denied` | Current authorization check returns 403 | End loading; show the current permission path and retain the existing focus on the “访问受限” heading; expose neither cached data nor task existence. |

HTTP 401 retains the existing authentication-required/reauthorization behavior.

## 6. Accessibility and Responsive Preservation

- No new focusable element or Tab stop is introduced.
- Loading cannot capture focus. Cache hits, silent refreshes, and polling iterations cannot add scroll or focus movement; terminal transitions retain the current `PageStateBoundary` result-heading and permission-heading focus behavior.
- One polite loading announcement is allowed for one request lifecycle; polling iterations must not repeat announcements.
- Current desktop, narrow-Web, and `max-width:760px` H5 rules remain unchanged, including current safe-area handling and existing touch targets.
- Existing visual accessibility observations are baseline issues, not changes authorized by this backend task. Any unrelated remediation requires a separate front-end task.

## 7. Backend Compatibility Constraints for the Design

1. The task envelope and `/operations/sync-jobs/{syncId}` status contract must remain compatible with `src/integration/safe-proxy-client.js`.
2. `completed.result` must be the original operation success object, without a new wrapper requiring a front-end change.
3. `failed.error` must be structured; a running state cannot be represented only by human-readable first-sync text.
4. The effective ordinary Web request timeout is 30,000ms, the homepage aggregate client cap is 29,500ms, and the packaged Nginx API proxy send/read timeout is 35s. Every backend synchronization task has a 25,000ms hard deadline from task creation, including its initial five-second wait, queueing, retries, backoff, Feishu pagination, and result aggregation. Deadline exhaustion transitions to structured `failed` with code `READ_SYNC_DEADLINE_EXCEEDED`; it cannot remain `running` or return 503. Terminal state is retained for at least ten minutes.
5. Batch reads preserve one overall loading lifecycle and return each child through the existing fulfilled/rejected contract.
6. Page departure may cancel the browser request token but not the isolated background task.

## 8. Verification Evidence Required from the Backend Owner

- Contract tests for HTTP 200, task handoff, `running`, `completed`, `failed`, 401, 403, caller cancellation, batch children, and complete zero-record results.
- Browser regression evidence showing one continuous existing loading toast, no 503 dead end, no manual refresh, and no forbidden first-sync/data-missing text.
- A changed-file audit proving no front-end source, `dist`, stylesheet, component, route, or asset changes.
- Timeout evidence proving the server task reaches a terminal state before the current effective client/proxy timeout.

## 9. Unresolved Conflicts

None between the approved PRD, `design/ux-handoff.md`, and `design/ui-handoff.md`.

No unresolved design conflict remains. The 25,000ms server deadline is frozen against the measured 29,500ms/30,000ms client limits and packaged 35s Nginx API timeout. It may not be extended past the client limit or worked around by changing front-end code, adding a user message, returning 503, or requiring manual refresh.

## 10. Design Gate Summary

The proposed design changes no visible UI. It preserves the current loading experience and makes the backend responsible for delivering either a complete result or an automatically polled terminal task result. Approval of this design authorizes backend implementation planning only; it does not authorize this conversation to edit backend source, deploy, publish, or release.
