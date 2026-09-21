# UX Handoff — Feishu entry authentication and first-screen request performance repair

## 1. Purpose, boundary, and references

This interaction handoff implements the scope-approved product requirement in [PRD](../prd.md) for task `DEH-ENTRY-PERF-20260916`. It defines how a Web user enters through Feishu authentication, receives first-screen read feedback, and recovers from affected operation failures. It does not choose visual tokens, component styling, Feishu configuration, credentials, permissions, deployment, record writes, or release actions.

Behavior evidence used by this handoff:

- [Task brief](../task-brief.md): the observed unauthenticated `COM-001`, `COM-002`, and `WB-001` 401s; `WB-002` 502 after about 15.7 seconds; `COM-005` success after about 25.2 seconds.
- [Decision log](../decision-log.md): Product Owner’s approved 8-second upstream deadline, 10-second total read budget with at most one retry, 12-second browser outcome, configured `/` or `/test2` application base, and diagnostic allowlist.
- [Existing entry guard](../../../../src/integration/feishu-entry-auth-guard.js): the current same-origin session/OAuth interaction and the one-base-path limitation that this task repairs.
- [Existing page data source](../../../../src/integration/page-data-source.js) and [workbench contract](../../../../src/integration/page-read-request-plan.js): remote reads already expose section availability, retry scope, trace IDs, empty/partial outcomes, and the affected first-screen operation set.
- [Existing workbench interaction](../../../../src/pages/WorkbenchPage.vue): workbench search is independently requested through `WB-002`; it already announces search loading and error states.

## 2. Platform declaration

**Web only.** The approved task declares `platforms=["web"]`, `web_framework="vue"`, and no mobile framework or mobile target. This handoff deliberately defines no uni-app, native mobile, touch-only, or mobile navigation behavior. Desktop and responsive Web retain the same logical state and keyboard behavior; responsive reflow is a visual implementation concern, not a separate product flow.

## 3. Information architecture and entry boundary

### 3.1 Active application base

The application has one active, non-secret base-path configuration per Web environment:

| Environment | Active base | Logical route example |
| --- | --- | --- |
| Local development | `/` | `/workbench` |
| Test deployment | `/test2` | `/test2/workbench` |

The base prefix is an environment boundary, not a different product page. A logical application route must resolve to the same page under either active base. Internal navigation and OAuth return handling retain the active base, the safe internal route, query, and hash.

### 3.1.1 Single app-base path-helper rule

Every interaction that creates, reads, compares, normalizes, or restores an internal URL must use **one shared app-base path helper**. The helper receives a logical route (for example, `/workbench` or `/apps?category=AI`) plus the configured active base, and is the sole owner of these outcomes:

| Interaction | Required helper outcome |
| --- | --- |
| Shell brand, primary navigation, sidebar navigation, profile/favorites links, workbench cards, course/notice links, and category/scene navigation | Emit the logical destination beneath the active base: `/workbench` locally and `/test2/workbench` in the test deployment. |
| Browser history updates, popstate comparison, page resolution, and session-route capture/restore | Compare and store the logical route while retaining the active-base physical URL in the address bar. |
| OAuth `returnTo` | Build a same-origin, active-base URL from the current logical route, query, and hash; use it only after helper validation. |
| Entry-error retry, page/region recovery links, empty-state links, permission-denied “return to workbench”, and rejected-return fallback | Reuse the helper to emit the active-base destination. Rejected/foreign/out-of-base destinations fall back to the helper-produced active-base workbench path. |

No component, state surface, route session, or OAuth call may concatenate, hard-code, or hand-write `/test2`; no internal interaction may retain a root-absolute `href` merely because it worked locally. The helper is an interaction contract, not a visual component. Its root and `/test2` results must be proven for ordinary navigation, OAuth return, history update, and every recovery destination above.

Only a same-origin URL beneath the active base is eligible as a return destination. A foreign origin, protocol-relative path, malformed path, backslash variant, or route outside the active base is rejected and must fall back to the active-base workbench entry rather than being followed.

### 3.2 User-facing entry states

Before the Vue application or any protected workbench operation is allowed to run, the user is in one of these mutually exclusive entry states:

1. **Entry checking** — the same-origin HttpOnly session is being checked.
2. **OAuth redirecting** — the session is unauthenticated and the browser is moving to the existing Feishu OAuth entry flow.
3. **Entry unavailable** — the session decision cannot be established because of transport/server failure.
4. **Authenticated route resolution** — the session is confirmed and the same logical route is resolved under the active base.

The workbench page is not presented as usable before state 4. In particular, no `COM-001`, `COM-002`, `COM-005`, `WB-001`, or `WB-002` request may start while entry checking, OAuth redirecting, or entry unavailable is active.

## 4. Primary flows and interaction rules

### Flow A — unauthenticated entry at local root or test base

1. User opens any route under the active base, including `/`, `/workbench`, `/test2`, or `/test2/workbench`, with optional safe query and hash.
2. The entry layer announces that sign-in is being checked and does not expose data-bearing page controls as available.
3. If the session endpoint answers unauthenticated, the browser starts the existing Feishu OAuth flow immediately.
4. The return target is constructed and validated by the single app-base path helper from the current logical route, query, and hash. The browser does not send protected business reads before redirect.
5. After the existing OAuth callback establishes the HttpOnly session, the browser returns through the same helper to the preserved logical route under the same active base and repeats the session decision. It then continues to Flow C.

There is no manual retry or alternate sign-in branch for an explicit unauthenticated response: the approved behavior is OAuth redirection. Browser authentication tokens are never displayed, copied, or stored by this flow.

### Flow B — entry-session unavailable

1. User opens a route under the active base.
2. The session probe fails through a network/transport/server outcome other than an authenticated or unauthenticated decision.
3. The entry layer replaces the pending entry state with a recoverable entry failure. It identifies that sign-in status could not be checked and provides one **Retry sign-in check** action.
4. Selecting retry repeats only the session probe. It does not mount data-bearing workbench content or invoke protected operations until a successful session decision is received. Any fallback destination uses the single app-base path helper.
5. While retry is running, the retry control is disabled and its state is announced. A later successful unauthenticated result follows Flow A; an authenticated result follows Flow C; another fault restores the recoverable entry failure.

### Flow C — authenticated route resolution and first screen

1. Confirmed session state permits application mounting and resolution of the requested logical route beneath the active base through the single app-base path helper; an active-base prefix is never treated as part of a distinct page route.
2. For the workbench, first-screen data begins with the registered affected operations: `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002`. The internal request plan deduplicates equivalent inputs and shares in-flight work; this is not a user-visible choice.
3. The page announces that first-screen data is loading. Each dependent region remains in its own loading state; a slow or failed region must not make unrelated, already available workbench regions inoperable.
4. For any affected operation, a first attempt has an 8-second upstream deadline. A transient result may use at most one retry within the 10-second total server read budget. The browser presents a final success, empty, permission-dependent, or recoverable error state by 12 seconds rather than continuing the former 30-second wait.
5. A successful operation fills its associated region. A failure leaves any previously available data in place where available and localizes recovery to the failed region/operation.

### Flow D — affected workbench retry

1. A user selects **Retry** in an affected failed region.
2. Only the failed, retryable operation(s) in that region are requested. Successful regions and the rest of the page stay available.
3. The selected retry is disabled while in flight to prevent duplicate calls; its region reports loading and then reaches success, empty, permission-dependent, or bounded-error state.
4. A permission-dependent outcome does not automatically retry. It gives the user a permission explanation and directs them to the existing access-support path, if one is already configured; otherwise it provides no invented escalation destination.

### Flow E — workbench filter/search

`WB-002` remains the workbench search operation. A filter/query update may replace a prior search request; only the latest user input owns the visible result. While it runs, the existing result remains readable where possible and the search region announces loading. Its bounded error does not erase the current result or prevent unrelated workbench regions from operating. Authentication-required behavior is handled at the entry boundary; it is not represented as a silent search error.

## 5. Required state contract

The following table is the observable interaction contract for every applicable affected region. “Affected region” means the UI area fed by a given first-screen operation; implementation must map the operation to its existing workbench content without introducing a new page or redesign.

| State | Trigger | Content and permitted actions | Recovery / duplicate protection | Accessibility behavior |
| --- | --- | --- | --- | --- |
| `normal` | Confirmed session and valid operation result. | Existing workbench content and its ordinary links/actions are available. | No recovery control is required. | Use the existing semantic heading and control order; do not announce static content repeatedly. |
| `loading` | Entry check, OAuth redirection preparation, initial affected read, or region retry is active. | Entry loading communicates sign-in decision progress; authenticated page loading communicates which affected region is awaiting data. Available regions remain usable. | The relevant retry/load trigger is disabled while its owned request runs. Older replaced search results cannot overwrite newer input. | Expose concise status through an appropriate live status mechanism; do not steal keyboard focus for routine region loading. Set disabled controls programmatically disabled. |
| `empty` | Confirmed operation success with no relevant records/content. | Show the existing region’s empty result, distinct from loading, error, and permission. Related page navigation remains available. | No automatic retry is required solely because data is empty. | Announce that the relevant region has no results once; preserve the region heading and logical reading order. |
| `error` | Session probe transport/server failure, affected operation budget exhaustion, non-permission operational failure, or safe cancellation outcome. | Entry error offers **Retry sign-in check** and no protected data. Region error identifies the affected content as temporarily unavailable, offers **Retry**, and may show only the safe diagnostic fields in section 6. | Entry retry repeats only session checking. Region retry repeats only retryable failed operation(s); it must not reload successful regions by default. | Put the error summary in a programmatically associated status/alert appropriate to urgency. On user-triggered retry failure, move focus to the updated error summary only when necessary to ensure it is perceived; otherwise preserve focus on the retry control. |
| `disabled` | Entry status unresolved, a retry/load attempt already runs, or an action depends on an unavailable required region. | Explain the unavailable action in context; do not leave controls apparently clickable. | Re-enable only after the owned request reaches a terminal state. No duplicate protected read is started while disabled. | Native disabled state or equivalent semantics are required. Explanatory text must be available to keyboard and assistive-technology users. |
| `permission-denied` | Confirmed session is valid but the affected operation returns an access/permission outcome. | State that the signed-in user lacks access to this content; do not describe it as a sign-in failure. Keep unaffected regions available. | Do not automatically retry. A user may re-enter through existing access/support behavior only if such behavior already exists. | Associate the permission explanation with the affected heading/region; announce it once without exposing identity or permission internals. |

## 6. Safe diagnostic and timing content

For a bounded first-screen error, user-visible and QA-observable diagnostic context is limited to:

- affected operation identifier;
- error category (authentication is handled at entry; permission, timeout/transient service failure, cancellation, or generic unavailable as applicable);
- correlation/trace identifier when supplied;
- elapsed time; and
- retry outcome/count within the approved maximum.

The following must never be rendered, copied into user-facing diagnostics, or included in routine accessibility announcements: Feishu/tenant/user access tokens, cookies, authorization headers, credentials, raw upstream response bodies, Bitable record content, callback parameters containing secrets, or raw identity values. A generic unavailable message is preferable to an unsafe detail.

Timing language must describe a completed bounded outcome, not promise an external Feishu SLA. The user should receive an actionable result within the approved 12-second browser window; implementation/QA records actual elapsed values separately.

## 7. Navigation, focus, and accessibility rules

1. Entry status is announced before page content. OAuth navigation remains browser navigation; after callback, the returned logical route receives the normal page heading as the initial meaningful reading context.
2. The shared app-base path helper must build every preserved return URL, shell/card link, `history` update, page-state recovery link, and return-to-workbench link. It preserves safe query/hash semantics. If it rejects a destination, it emits the active-base workbench path; it does not announce or expose the rejected value.
3. Do not autofocus a global loading indicator or interrupt typing/search merely because a background operation begins. Keyboard focus remains on the user’s current control unless a user action produces an error that otherwise would not be discoverable.
4. Every retry is a keyboard-operable named control, follows the relevant error content in logical tab order, and exposes its busy/disabled state programmatically.
5. Region loading, success-after-retry, empty, error, and permission change each produce one concise update through a live status mechanism. Avoid announcing all five operation statuses as a burst; combine concurrent initial progress into a short first-screen progress summary and let each later terminal region update identify itself.
6. An error must be understandable without color, icon, timing alone, or a DevTools trace. The trace identifier is supplementary, not the only explanation.
7. No state may visually or semantically imply that private Feishu data is loaded before session confirmation.

## 8. Concrete operation-to-workbench-region interaction ownership

The following is the required, concrete mapping for the existing `ExhibitionShell` and `WorkbenchPage` UI. A state surface belongs inside the named owner region; it is not a page-wide retry substitute. “Safe fallback” means the explicitly named existing local display may remain visible without claiming the failed remote operation succeeded. It does not authorize fabricated Feishu data.

| Operation | Existing visible owner component / panel | `normal` and safe fallback | `loading` and `empty` | `error`, retry scope, and `disabled` | `permission-denied` |
| --- | --- | --- | --- | --- | --- |
| `COM-001` | `ExhibitionShell` top-user identity link (name/organization) and `WorkbenchPage` hero greeting identity context. | Normal uses confirmed current-user context. Before a new result is available, the existing neutral “current user” label/avatar presentation may remain, but it must not show a different person or assert current permission. | Loading labels the identity context as being confirmed while the rest of the authenticated workbench may remain available. Empty is not a valid business state for a confirmed current-user read; treat an absent identity as error. | The identity context shows an inline unavailable state. Its Retry issues **only `COM-001`**; the retry control is disabled while that request is active. It must not reload menu, dictionaries, workbench panels, or search results. | Replace the identity context with “current signed-in account cannot access identity information”; do not show a previous person’s name/organization and do not automatically retry. |
| `COM-002` | `ExhibitionShell` primary navigation, left/sidebar application navigation, and navigation visibility driven by the authenticated menu context. | Normal exposes the permitted menu. A safe fallback may retain the current route, brand, and “skip to main content” affordance, but it must not invent menu permissions or expose a navigation item that the remote menu would hide. | Loading keeps only safe route/brand navigation actionable and identifies personalized navigation as loading. Empty means no menu entries were returned: retain only the current route/brand navigation and state that no additional navigation is available. | Navigation area reports that personalized navigation is unavailable. Its Retry issues **only `COM-002`** and is disabled while active. It does not reload identity, dictionaries, workbench content, or search. | Retain only safe current-route/brand navigation and state that the user has no access to additional navigation. Do not redirect to OAuth and do not automatically retry. |
| `COM-005` | `ExhibitionShell` “场景化搜索” controls and the workbench’s reference-data-dependent category/scene filter choices that feed the hot-application panel. | Normal exposes returned dictionary choices. The existing static category/scene labels may remain only as non-remote display defaults; they must not be represented as confirmed remote dictionary data. | Loading leaves already chosen query/scene readable but disables dictionary-dependent choice changes until data is available. Empty shows “no available filter values” and retains free-text query where it does not require a dictionary value. | The filter-reference area reports unavailable data. Its Retry issues **only `COM-005`** and is disabled while active. `WB-002` is not retried solely because dictionary data failed; existing selected values remain readable but are not newly selectable. | Disable dictionary-dependent choices and state that filter reference data is not available to this account; preserve non-dependent navigation/search input. No automatic retry. |
| `WB-001` | `WorkbenchPage` hero data context, **应用类型概览**, **热门应用推荐** initial recommendations, **培训课堂**, **公告通知**, and **我的使用统计** panels. | Normal renders returned personal workbench content. Safe fallback is limited to the existing static workbench demo content already shown by those panels, labelled as local display data when the configured runtime permits it; it cannot be labelled as current Feishu data. | Loading preserves panel headings and either existing prior content or panel-local pending status. Empty is assessed per panel: each panel says it has no current content rather than hiding unrelated panels. | Each named panel/hero area with unavailable `WB-001` content displays its own unavailable status. A retry from any of these `WB-001` surfaces issues **only `WB-001`** and is disabled while active; it must not issue `COM-001`, `COM-002`, `COM-005`, or `WB-002`. Other regions remain usable. | Each dependent panel states that current-account workbench content is unavailable due to access; unaffected shell/search/navigation remains. No automatic retry or OAuth redirect. |
| `WB-002` | `WorkbenchPage` **热门应用推荐** results after a sidebar scene/filter change or workbench query; it is the visible search-result owner. | Normal replaces the result list only for the latest query/filter. Before a new result arrives, the most recent readable result stays visible. | Loading announces application search in this panel and retains the latest readable list. Empty states that the current query/filter has no matching applications, distinct from a failed first-screen recommendation read. | The search-result area states that the current search could not complete and keeps its last readable result if any. Retry issues **only `WB-002`** with the current query/filter and is disabled while active. A superseded request cannot overwrite the newer result. | State that the account cannot search applications under the current access; retain earlier readable results only if policy permits their continued display, otherwise clear them. Do not retry automatically or treat it as an OAuth failure. |

All six states in the table are locally announced under the heading of their named owner region. If two named `WB-001` panels fail together, they share the **same `WB-001` request ownership**: activating one retry disables all duplicate `WB-001` retry controls until the one operation settles. The same single-operation rule applies to `COM-001`, `COM-002`, `COM-005`, and `WB-002`.

## 9. Open questions for design review and implementation evidence

1. The UX contract requires a configured active application base. Implementation evidence must confirm the exact non-secret configuration read by local `/` and test `/test2`; this task does not authorize deployment configuration changes.
2. The existing product packet does not identify an approved access-support destination for permission-denied. Do not invent one; if the existing application already has a support/access workflow, implementation may link to it with evidence.
3. The handoff is an interaction source only. It requires independent visual design review and explicit user design approval before engineering implementation; it does not itself approve design or alter task state.
