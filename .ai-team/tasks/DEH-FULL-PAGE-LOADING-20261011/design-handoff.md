# Design Handoff Aggregate

Owner: AI Team Lead

This aggregate preserves both role-owned sources. The AI Team Lead alone writes this file; it does not replace, weaken, or silently reconcile either evidence set.

## UX/Interaction Evidence

Source: `design/ux-handoff.md`

- The application-level overlay is triggered only by `requestActivity.activeCount > 0` and is not inferred from page copy or local page state.
- Exactly one full-viewport surface covers the complete authenticated shell and blocks pointer, touch, wheel and keyboard activation beneath it.
- The underlying application shell becomes `inert` and `aria-busy`; the overlay is a sibling/teleported status layer and never a dismissible dialog.
- Focus is not moved or trapped. Document scrolling is locked and restored, and the page returns to its existing normal, empty, error, disabled or permission state after the final request settles.
- Silent background refresh remains invisible and interactive.
- User-facing copy is limited to the live request count and automatic-recovery explanation.

## UI Visual Evidence

Source: `design/ui-handoff.md`

- A fixed `inset: 0` layer at `z-index: 3000` covers navigation, drawers, menus, sidebar and content.
- The overlay uses the established exhibition canvas, ink, muted, line and navy tokens rather than introducing a new palette.
- The centered status cluster contains a 40 px ring, 20/18 px primary text and 14 px supporting text, with no card, shadow, close action or progress percentage.
- Responsive rules cover 320 px mobile Web, desktop, short viewports, safe areas and 200% zoom without horizontal overflow.
- Reduced-motion mode stops rotation while preserving a static two-tone indicator; forced-colors mode uses system colors.

## Cross-Source Traceability

| Approved PRD requirement | UX/Interaction source | UI Visual source |
|---|---|---|
| AC-1 Full-viewport coverage and no right-top toast | Information Architecture; Web Behavior | Visual Hierarchy; Global request overlay |
| AC-2 Block underlying actions and scroll | Interaction Rules; Accessibility Behavior | Component Appearance; Web Visual Rules |
| AC-3 Automatic close on every terminal state | Foreground request flow; Required States | Required States |
| AC-4 Merge concurrent requests and update count | Interaction Rules; Content Behavior | Count updates |
| AC-5 Silent refresh remains invisible | Silent refresh flow | `normal` required state |
| AC-6 Responsive and accessible behavior | Web Behavior; Accessibility Behavior | Typography; Motion; Web Visual Rules |
| AC-7 Preserve existing business behavior | Required States; foreground flow | Required States; page-local loading remains out of scope |

## Implementation Contract

- Replace the current `.request-loading-toast` markup and copy with one body-level/full-viewport `.request-loading-overlay` status surface.
- Keep `requestActivity.activeCount` as the sole trigger and displayed count; do not create another loading store.
- Apply and remove shell `inert`, shell `aria-busy` and document scroll lock from the same loading state, with teardown cleanup.
- Keep silent refresh classification and all business/page data logic unchanged.
- Remove the old statement “页面其他区域仍可继续使用”; use “请稍候，完成后将自动恢复页面”.
- Replace legacy tests that require the toast with tests proving viewport coverage, interaction blocking, concurrency, silent-refresh exclusion, cleanup and reduced-motion behavior.
- Do not modify backend code, API contracts, request timeout behavior, business pages or deployment artifacts in this task.

## Unresolved Conflicts

None. The successor task explicitly supersedes the prior non-blocking toast decision only for application-level foreground request activity. Design approval remains pending and is not inferred from scope approval.
