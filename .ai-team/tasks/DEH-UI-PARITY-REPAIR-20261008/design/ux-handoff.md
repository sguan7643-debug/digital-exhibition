# UX/Interaction Handoff

Owner: UX/Interaction Designer

## Sources and Evidence

- Approved PRD: `../prd.md`; scope approval is recorded in `../task.json` and `../decision-log.md`.
- Visual/interaction baseline: `digital-exhibition-SOURCE-20260916-165348.zip`, SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Baseline route evidence: reference `src/fixtures/pages.js` defines the 30-route calibration matrix and each route's normal/loading/error/disabled/permission-denied coverage, plus applicable empty states.
- Defect evidence: the reference application-detail screenshot and current screenshot listed in `../task-brief.md`; application cards exposing `3d8egf55` and `4gg8ad25`; the global “数据更新时间” row on Materials Center.
- Established behavior to preserve: current authenticated shell, live Feishu data, permission checks, uploads, approvals, cache/stale-while-refresh behavior, request activity indicator, forms and write actions.

## Information Architecture

The existing destinations and routing remain unchanged. The 30 direct parity routes are grouped as follows:

1. **Personal and communication:** `/workbench`, `/messages`, `/favorites`, `/profile`, `/announcements`, `/announcements/:id`.
2. **Application discovery:** `/apps`.
3. **Nine detail families:** tool, Haineng Work, report, dashboard, dataset, metric, AI, EAD and RPA detail routes.
4. **Application onboarding:** `/apps/onboarding/status`.
5. **Points and learning:** `/points`, `/points/details`, `/training`, `/certification`.
6. **Operations and administration:** `/operations`, announcement management/editor, application management/editor and `/admin`.
7. **Talent:** `/talent/people`, `/talent/projects`, `/talent/progress`.

Additive routes such as `/materials` and `/apps/onboarding/apply` retain their current business flow and use the same shell, content hierarchy, state behavior and responsive rules. They are covered by cross-cutting regressions but do not replace any of the 30 direct route comparisons.

## User Flows

### Global entry and navigation

1. The current authentication/session check resolves the user before rendering protected content.
2. The shell exposes the same top navigation, left application navigation, scene search and account actions as the reference.
3. Selecting any destination changes route without a full-page reload and moves focus according to current router behavior.
4. No visible “数据更新时间” row is inserted between the shell and route content. The first route-level block begins at the reference content origin.
5. Background synchronization remains silent. Foreground work continues to use the existing non-blocking “正在处理” loading bubble.

### Application discovery and person labels

1. The user opens `/apps`, filters or sorts the application directory, and switches card/list view where available.
2. Every person-labelled slot (including负责人、开发者、申请人、操作人) receives an internal identifier and an authoritative display-name projection.
3. If the user dictionary contains a match, the UI displays only the resolved name. The identifier remains internal and may be retained in accessible diagnostics only when it is not exposed as visible content or an accessible name.
4. If no match exists, the visible value is `—`; the unresolved identifier is recorded through existing diagnostic/logging infrastructure, not shown to the user.
5. Card title navigation, favorite and apply/use actions remain independent and keep current payloads.

### Application details

1. Opening an application routes to the matching detail family rather than a generic sparse layout.
2. The user first encounters the reference breadcrumb and hero with icon, title, tags, summary and permitted actions.
3. A seven-item fact/metric strip follows the hero where defined by the reference family.
4. Family-specific information panels, features, preview/media, files, training, related applications and comment/action areas follow in reference order.
5. Missing live fields use the existing neutral-empty convention inside the reference structure; missing data must not remove required structural regions or introduce unrelated cards.

### Lists, editors and administration

1. List routes retain current search, filtering, sorting, pagination and row/card actions.
2. Editor routes retain validation, upload, submit/cancel, permission and success navigation behavior.
3. Admin, operation and talent routes retain role gating, drawers, confirmation steps and focus restoration.
4. UI migration may change DOM grouping only where required for parity; request inputs, write semantics and success destinations stay unchanged.

## Interaction Rules

- The reference route structure is mandatory; no representative route may stand in for another route's interaction structure.
- Do not change hrefs, operation IDs, payloads, request timing, cache policy, auth/permission decisions, approval semantics or idempotency behavior.
- Keep the global foreground request loading bubble. It remains non-modal, announces progress politely, does not steal focus and disappears when the foreground request count reaches zero.
- Remove only the visible update-time row and its layout reservation. Do not remove or disable `lastSyncedAt`, cache freshness calculations or silent background refresh.
- Card containers must not absorb events from nested favorite, apply/use, download or retry controls.
- Loading or disabled submit controls suppress duplicate actions. No automatic write retry may be introduced.
- Desktop sidebar, mobile drawer, account disclosure, dialogs and drawers keep Escape handling, outside/backdrop behavior and trigger-focus restoration.
- Filter reset restores the route's reference default state without forcing authentication or a full-page reload.
- Long real-data strings wrap or clamp according to the reference component; a person identifier is never used as a visible overflow fallback.

## Content Behavior

- Real data remains authoritative. Reference sample identities, counts and dates are never copied into production rendering.
- Visible person names come from the user dictionary. The content fallback order is `resolved display name` → `—`; raw user ID, AD account, open ID or employee code is not a display-name fallback.
- Department and organization labels continue to use their authoritative dictionaries; unresolved values use the same neutral presentation and are not relabelled as valid names.
- The label “数据更新时间” and its timestamp are absent from visible page content on every route. Internal timestamps remain available to logic and diagnostics.
- Loading, empty, error and permission messages keep current business meaning. First-sync/data-missing informational bubbles remain excluded where already approved, while the foreground request-processing bubble remains visible.
- Dynamic data value differences are allowed in parity captures, but the container, label hierarchy, action placement and content order remain comparison targets.

## Web Behavior

- **Large/standard desktop (`>1280px`):** fixed reference shell, visible sidebar and route content at the reference top origin; no update-time row above content.
- **Compact desktop/tablet (`761–1280px`):** navigation density reduces according to the reference cascade; actions wrap without clipping and all destinations remain reachable.
- **H5 (`<=760px`):** mobile drawer replaces desktop navigation, content reflows to one column where the reference specifies, and required controls remain at least 44px high.
- **Narrow H5 (`<=430px`, including 390×844 and 360×800):** cards, facts, filters and action groups reflow without document-level horizontal overflow.
- **Landscape H5 (`844×390`):** bounded horizontal scrolling is allowed only for reference table regions, never for the whole document.
- Direct comparison uses each route's stored reference viewport plus the approved six verification sizes: 1920×1080, 1672×941, 1000×900, 390×844, 360×800 and 844×390.

## uni-app Behavior

Not declared. `task.json` declares Vue Web only. H5 is responsive Web, not a native or uni-app deliverable.

## Required States

| State | Trigger and content | Permitted actions and recovery | Focus/order and announcements |
| --- | --- | --- | --- |
| `normal` | Usable live or cached data is present in the reference route structure; names are resolved before display. | All permission-allowed navigation and actions remain active. | DOM order follows visual order; route/view state is exposed with current semantics. |
| `loading` | Initial foreground read or explicit foreground action is pending; stale cached content may remain during background refresh. | Navigation remains available; duplicate submits are disabled. The global processing bubble remains visible for foreground requests. | `aria-live="polite"` announces processing without focus movement; silent refresh creates no visible timestamp row or message bubble. |
| `empty` | A successful request returns no matching records. | Clear filters, navigate, or use the authorized primary create/apply action. | Empty heading, explanation and recovery action appear in that order and remain keyboard reachable. |
| `error` | A request fails and no usable replacement exists, or stale content is retained with a bounded error. | Existing retry/back/clear-filter actions remain available; retry repeats only the failed read. | Error summary is announced once; trace data is available for diagnosis but raw person identifiers are not used as labels. |
| `disabled` | Validation, business state, loading or permission makes a control unavailable. | Disabled control dispatches no request; existing explanatory copy remains. | Native disabled semantics or `aria-disabled` are preserved, with no hidden focus target. |
| `permission-denied` | Identity lacks route/data/action permission. | Existing return, reauthorization or permitted-route action remains available. | Denial heading and recovery action are first meaningful content; restricted records and person data are not exposed. |

## Accessibility Behavior

- Preserve skip navigation, semantic `header`/`nav`/`aside`/`main`/`footer` landmarks and route-level heading order.
- Preserve visible `:focus-visible`, native labels, validation associations, `aria-current`, `aria-pressed`, `aria-expanded`, `aria-controls`, modal semantics and focus restoration.
- The loading bubble is announced politely and never becomes a keyboard trap.
- Removing the update-time element must also remove it from the accessibility tree; no empty paragraph or hidden focusable placeholder remains.
- Resolved names are the accessible text for person slots. Internal IDs must not leak through `title`, `aria-label`, alternate text or off-screen duplicate content.
- Browser zoom/text reflow must not hide actions; reduced-motion preference removes nonessential transition without changing state.

## Open Questions and Conflicts

No blocking UX conflict. The approved scope explicitly authorizes authoritative person-name projection and removal of the visible update-time row while preserving internal synchronization and all business behavior.
