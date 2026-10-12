# Design Review

## Verdict

`approved`

The design is complete and internally consistent. This advisory verdict does not approve the design gate and does not authorize implementation.

## Findings

### Finding: Full-page scope is represented without retaining the old toast behavior

- **PRD Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`, AC-1 requires one fixed viewport-covering loading surface over the top navigation, sidebar and content, with no right-top toast.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design-handoff.md`, Implementation Contract requires replacing `.request-loading-toast` with a single body-level/full-viewport `.request-loading-overlay`.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ux-handoff.md`, Information Architecture and Web Behavior define one application-level interaction shield covering the visual viewport.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ui-handoff.md`, Global request overlay defines `position: fixed`, `inset: 0` and `z-index: 3000`, above all observed shell layers.
- **Impact:** The design directly corrects the reported corner-toast mismatch and has no reserved corner placement or duplicate overlay.
- **Recommendation:** Implement the new overlay selector and remove the old toast markup, copy and test assertion in one change.

### Finding: Blocking semantics cover pointer, keyboard and scroll behavior

- **PRD Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`, AC-2 requires clicks, scrolling and repeated submissions to be blocked.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design-handoff.md`, UX evidence requires an inert underlying shell plus restored document scroll state.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ux-handoff.md`, Interaction Rules require native `inert`, document scroll lock, teardown cleanup and a teleported/sibling status surface.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ui-handoff.md`, Component Appearance specifies a pointer-receiving full-viewport layer without a dismiss action.
- **Impact:** Keyboard activation cannot bypass a purely visual overlay, and repeated submissions cannot be triggered while a request remains active.
- **Recommendation:** Verify inertness, scroll locking and cleanup in mounted/browser tests rather than relying only on CSS screenshots.

### Finding: Terminal-state recovery and concurrency are defined against the existing request counter

- **PRD Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`, AC-3 and AC-4 require automatic closure on the final terminal request and one merged surface for concurrent requests.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design-handoff.md`, Implementation Contract retains `requestActivity.activeCount` as the sole trigger and count.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ux-handoff.md`, Foreground request flow covers success, failure, cancellation, timeout and concurrent count changes without fixed-delay dismissal.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ui-handoff.md`, Count updates keep one stable centered cluster with no layer animation.
- **Impact:** The proposed design does not introduce a second source of truth, lowering the risk of a stuck overlay or negative request count.
- **Recommendation:** Test overlapping requests and every terminal path, including component unmount cleanup.

### Finding: Silent refresh and existing business states remain separated from global loading

- **PRD Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`, AC-5 and AC-7 require silent refresh to remain interactive and existing business behavior to remain unchanged.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design-handoff.md`, Implementation Contract prohibits changes to silent classification, business/page data logic and backend contracts.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ux-handoff.md`, Silent refresh flow and Required States preserve empty, error, disabled and permission behavior after the overlay closes.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ui-handoff.md`, Required States leave all page-local empty, error, disabled and permission visuals unchanged.
- **Impact:** Cached pages do not become unnecessarily blocked, and the overlay does not replace real error or authorization feedback.
- **Recommendation:** Include a regression case proving a silent-only request never renders the overlay.

### Finding: Responsive and accessibility behavior is implementation-ready

- **PRD Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`, AC-6 requires desktop, narrow, mobile Web, 200% zoom, polite announcements, no focus trap and reduced-motion support.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design-handoff.md`, UI evidence defines responsive typography, safe areas, 320 px support, reduced motion and forced colors.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ux-handoff.md`, Accessibility Behavior specifies status semantics, atomic polite updates, no focus movement and inert underlying content.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ui-handoff.md`, Web Visual Rules define mobile/desktop sizing, wrapping, no horizontal overflow, reduced motion and forced-colors treatment.
- **Impact:** The design avoids treating the automatic wait state as a modal dialog and remains understandable without animation or color alone.
- **Recommendation:** Verify at 320 px, desktop and 200% zoom, and test the reduced-motion media query.

## Review Boundary

This independent review does not edit `prd.md`; does not edit `design-handoff.md`; does not edit `design/ux-handoff.md`; does not edit `design/ui-handoff.md`; does not approve design or record design approval; does not alter `task.json`; and does not modify task state.
