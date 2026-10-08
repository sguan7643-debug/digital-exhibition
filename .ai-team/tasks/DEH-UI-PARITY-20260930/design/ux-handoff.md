# UX/Interaction Handoff

Owner: UX/Interaction Designer

## Sources and Evidence

- Approved PRD: `../prd.md`; scope approval recorded in `../task.json`.
- Product evidence: the user designated `digital-exhibition-SOURCE-20260916-165348.zip` as the required UI baseline.
- Reference package SHA-256: `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Established route/state behavior: current and reference `src/fixtures/pages.js` expose the same 30-page calibration matrix plus `/materials` and `/apps/onboarding/apply`, with `normal`, `loading`, `error`, `disabled`, `permission-denied`, and applicable `empty` states.
- Established shell behavior: reference `src/components/ExhibitionShell.vue` defines primary navigation, app-category navigation, scene search, account menu, collapsible desktop sidebar, mobile drawer, focus restoration and Escape handling.

## Information Architecture

The existing information architecture is preserved. Styling work must not remove, merge, rename, or reorder business destinations.

1. **Global shell**
   - Top bar: brand, seven primary destinations, message shortcut, favorites shortcut and authenticated account menu.
   - Left navigation: application categories followed by scene search.
   - Main region: route content followed by the existing platform footer.
2. **General user routes**
   - `/workbench`, `/messages`, `/favorites`, `/profile`, `/announcements`, `/announcements/:id`.
   - `/apps` and the eight application-detail families.
   - `/materials`, `/points`, `/points/details`, `/training`, `/certification`.
3. **Application onboarding routes**
   - `/apps/onboarding/status` and `/apps/onboarding/apply`.
4. **Operations and administration routes**
   - `/operations`, announcement management/editor, application management/editor and `/admin`.
5. **Talent routes**
   - `/talent/people`, `/talent/projects`, `/talent/progress`.

The 32 route entries in `src/fixtures/pages.js` are the mandatory design and verification matrix. Dynamic production identifiers may replace fixture identifiers without changing the route-family layout.

## User Flows

### Global navigation

1. User enters through the current authenticated entry and lands on the resolved route.
2. The shell displays the current authenticated identity and permitted destinations.
3. User selects a primary destination, application category, scene, message/favorite shortcut or account-menu item.
4. Route resolution and current data loading continue to use the present implementation; only presentation changes.

### Application discovery and detail

1. User opens `/apps` or reaches it through a category/scene selection.
2. User filters, sorts or changes card/list presentation using the existing controls.
3. User opens a card or title and reaches the correct detail-family page.
4. Independent actions such as favorite, apply/use and secure download retain their current event boundaries and status feedback.

### Onboarding

1. User opens “我的申请” or application onboarding.
2. Status list continues to use the authoritative `上架申请` source and current-user filtering.
3. User opens detail/status or starts an application form.
4. Existing form validation, upload, submission, approval refresh and retry behavior remain unchanged.

### Operations, administration and talent

1. User enters only when current permissions allow.
2. Lists, filters, drawers, editors and pagination preserve their current order and behavior.
3. Save, publish, retry, cancel and close operations retain their existing confirmation and error handling.

## Interaction Rules

- Visual parity must not change hrefs, route resolution, event payloads, request timing, cache policy or permission decisions.
- Primary navigation uses `aria-current="page"`; category and view controls use `aria-pressed` where already established.
- Desktop sidebar remains collapsible. Collapsing exposes icon-only category controls and an explicit control to reopen scene search.
- Mobile navigation remains a modal drawer: opening moves focus to its close control; `Escape`, backdrop activation or route selection closes it; keyboard focus remains trapped while open and returns to the trigger after closing.
- Search submission remains available through the explicit action and Enter where currently supported. Debounce and request sharing remain untouched.
- Account navigation remains a disclosure menu and closes on outside click, Escape or route change.
- Card-level navigation must not absorb clicks intended for favorite, apply/use, download or other independent controls.
- Drawers and dialogs preserve current close controls, Escape behavior, focus order and focus restoration.
- Disabled actions remain non-operable and must not dispatch requests.
- Error retry performs only the existing bounded retry; visual work must not add automatic write retries.

## Content Behavior

- Real names, departments, organizations, counts, application records and approval states remain authoritative and may differ from the reference package’s sample values.
- Text hierarchy, line limits, truncation and tooltip/full-text access follow the corresponding reference component.
- Long dynamic labels wrap or clamp without changing control height beyond the reference responsive behavior.
- Empty, loading and error copy retains current business meaning and trace identifiers where currently shown; only its layout and appearance are aligned.
- Timestamps continue to show the current data-refresh meaning and must not be replaced by fixture dates.
- Reference-package static identities or labels such as “张三丰 / 物资采购中心” must never be copied into production rendering.

## Web Behavior

- **Desktop (`>760px`)**: fixed top shell, visible left sidebar and independently scrolling main content; existing collapse control remains available.
- **Compact desktop/tablet (`761–1280px`)**: navigation density and icon visibility follow the reference cascade while all destinations remain reachable; no business control may be clipped.
- **H5 (`<=760px`)**: top bar becomes a 56px-plus-safe-area row, desktop primary navigation is replaced by the mobile drawer, content reflows to touch-friendly single-column layouts, and controls use at least the reference 44px control height.
- **Narrow H5 (`<=430px` and `<=380px`)**: multi-column residual groups reduce according to `src/h5.css`; there must be no unintended horizontal document scrolling.
- **Landscape H5**: permitted two-column reference layouts may remain only where `src/h5.css` declares them and controls stay reachable.
- The task does not declare uni-app. Browser Web is the only platform to implement and verify.

## uni-app Behavior

Not declared. `task.json` declares only Web with Vue; no uni-app behavior or adaptation is required.

## Required States

| State | Trigger and content | Permitted actions and recovery | Focus/order and announcements |
| --- | --- | --- | --- |
| `normal` | Current request has usable data; render real content and available controls. | All permission-allowed interactions remain active. | DOM order follows visual order; route and filter selections expose current state semantically. |
| `loading` | Initial or explicit refresh is in progress. Existing stale data may remain visible during silent refresh. | Navigation remains available; duplicate submits are disabled; only current cancel/retry affordances are shown. | Loading status uses the existing live-region mechanism without repeatedly stealing focus. |
| `empty` | Successful request returns no matching records. | User may clear filters, navigate elsewhere or use the existing primary creation/apply action when authorized. | Empty heading precedes explanation and recovery action; recovery is keyboard reachable. |
| `error` | Request or operation fails and no successful replacement is available, or stale data is retained with an error notice. | Existing retry, back, clear-filter or continue-with-stale-data actions remain available as applicable. | Error summary is announced once; focus moves only when current behavior already does so, never on silent refresh. |
| `disabled` | Business state, validation, loading or permissions make an action unavailable. | Disabled control performs no navigation/request; nearby text or title explains the reason where currently available. | Disabled controls are skipped or exposed as disabled according to native semantics; order of remaining controls is unchanged. |
| `permission-denied` | Current identity lacks route, data or operation permission. | User may return, reauthenticate or use another permitted route according to current behavior. | Denial heading and recovery action are first meaningful content; no inaccessible restricted content remains interactive. |

## Accessibility Behavior

- Preserve the skip link to `#main-content` and visible keyboard focus.
- Preserve semantic landmarks for header, navigation, aside, main and footer.
- Preserve accessible names for icon-only actions and state relationships through `aria-current`, `aria-pressed`, `aria-expanded`, `aria-controls`, `aria-modal`, `aria-hidden` and `inert` where currently used.
- Use native controls for form fields and buttons; labels and validation messages remain programmatically associated.
- H5 drawer maintains focus trap, Escape close, backdrop close and trigger-focus restoration.
- Text reflow must tolerate browser zoom and dynamic content without hiding actions.
- Reduced-motion preference removes drawer/sidebar transitions without changing state.

## Open Questions and Conflicts

- No blocking UX conflict. The product requirement “must be the same” is interpreted as identical interaction structure and presentation for the same route/state, while authoritative dynamic values remain allowed to differ as approved in scope.
- Visual-difference thresholds, exact computed styles and screenshot viewports are owned by the UI handoff and must be approved before implementation.
