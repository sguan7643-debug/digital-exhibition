# Design Review

## Verdict

`approved`

The aggregate design is ready for the user’s explicit design decision. This reviewer verdict does not approve design or authorize implementation.

## Findings

### Finding: The visual source of truth is unambiguous and traceable

- **PRD Evidence:** `prd.md`, sections 2, 3 and AC-1/AC-2 require the supplied archive to be the only visual baseline and require shared shell/page parity.
- **Aggregate Design Evidence:** `design-handoff.md`, “UI Visual Evidence” pins the archive and the three primary visual-source hashes and requires computed-style/capture evidence.
- **UX Source Handoff Evidence:** `design/ux-handoff.md`, “Information Architecture” and “Interaction Rules” preserve the 32-route structure and current behavior while allowing only presentation changes.
- **UI Source Handoff Evidence:** `design/ui-handoff.md`, “Sources and Evidence” records the archive, extracted source and hashes; “Visual parity decision rule” makes visible deviations defects except approved real-data differences.
- **Impact:** Implementation cannot silently choose another historical theme or replace current logic with the older demo project.
- **Recommendation:** Preserve these hashes in implementation evidence and fail visual verification if the reference source changes without a successor decision.

### Finding: All required states have matching behavior and appearance contracts

- **PRD Evidence:** `prd.md`, state inventory and AC-5 require loading, empty, error, disabled and permission-dependent behavior in addition to success.
- **Aggregate Design Evidence:** `design-handoff.md` preserves six-state coverage in both source handoffs and requires state captures/assertions.
- **UX Source Handoff Evidence:** `design/ux-handoff.md`, “Required States” defines trigger, content, actions, recovery, focus/order and announcements for `normal`, `loading`, `empty`, `error`, `disabled` and `permission-denied`.
- **UI Source Handoff Evidence:** `design/ui-handoff.md`, “Required States” defines distinct visual treatments without changing UX recovery behavior.
- **Impact:** Visual parity cannot be falsely accepted from normal-state screenshots while operational states remain inconsistent or unusable.
- **Recommendation:** QA should sample every state contract across representative shared components and all state-capable route families.

### Finding: Responsive Web behavior is implementation-ready

- **PRD Evidence:** `prd.md`, AC-6 requires desktop/H5 parity without clipping, horizontal overflow or unreachable actions.
- **Aggregate Design Evidence:** `design-handoff.md`, AC-6 traceability specifies six representative responsive viewports in addition to route-native reference sizes.
- **UX Source Handoff Evidence:** `design/ux-handoff.md`, “Web Behavior” specifies desktop, compact desktop/tablet, H5, narrow H5 and landscape H5 reflow and interaction rules.
- **UI Source Handoff Evidence:** `design/ui-handoff.md`, “Web Visual Rules” specifies `>1280`, `1001–1280`, `761–1000`, `<=760`, `<=430`, `<=380` and tablet-source-cascade behavior plus 44px H5 controls.
- **Impact:** The implementation has concrete breakpoints and viewports instead of relying on a single desktop screenshot.
- **Recommendation:** Use the route’s stored viewport for direct parity and the six representative sizes for adjacent regression coverage.

### Finding: Accessibility behavior is preserved rather than traded for pixel matching

- **PRD Evidence:** `prd.md`, AC-7 requires keyboard operation, visible focus, semantic labels and no usability regression.
- **Aggregate Design Evidence:** `design-handoff.md`, AC-7 traceability requires keyboard/focus, labels, landmarks, drawer focus restoration and zoom/reflow evidence.
- **UX Source Handoff Evidence:** `design/ux-handoff.md`, “Accessibility Behavior” preserves skip navigation, semantic landmarks, accessible names, native controls, drawer focus management, text reflow and reduced motion.
- **UI Source Handoff Evidence:** `design/ui-handoff.md`, “Typography and Contrast”, “Hover, focus and keyboard-visible focus” and token sections specify contrast roles, blue form ring and 3px amber visible focus.
- **Impact:** Pixel parity does not justify hiding focus, breaking drawer keyboard behavior or exposing restricted content.
- **Recommendation:** Treat accessibility-preserving current behavior as an allowed parity exception only when recorded with evidence; do not remove it to match a static capture.

### Finding: Web-only platform declaration is consistent

- **PRD Evidence:** `prd.md` scopes desktop and H5 responsive Web and excludes unrelated platform work.
- **Aggregate Design Evidence:** `design-handoff.md`, “Platform Declaration” identifies Vue Web as required and uni-app/mobile as not declared.
- **UX Source Handoff Evidence:** `design/ux-handoff.md`, “uni-app Behavior” states not declared and keeps H5 under responsive Web.
- **UI Source Handoff Evidence:** `design/ui-handoff.md`, “uni-app Platform Adaptations” states not declared while preserving Web safe-area CSS.
- **Impact:** No missing mobile artifact or native adaptation is being mistaken for a design gap.
- **Recommendation:** Implement and verify only the declared Vue Web platform; keep H5 evidence in the Web handoff.

### Finding: Product behavior and data integrity remain protected

- **PRD Evidence:** `prd.md`, AC-4 prohibits changes to data sources, request addresses, field mappings, permissions, routes and submissions.
- **Aggregate Design Evidence:** `design-handoff.md`, “Implementation Contract” forbids copying reference `App.vue`, mock fixtures, session behavior or network guard and requires existing integration regression tests.
- **UX Source Handoff Evidence:** `design/ux-handoff.md`, “Content Behavior” requires real names, departments, counts, records and timestamps and explicitly forbids copying the reference static identity.
- **UI Source Handoff Evidence:** `design/ui-handoff.md`, “Open Questions and Conflicts” requires style extraction/selector reconciliation instead of wholesale business-component replacement.
- **Impact:** The product can achieve required visual consistency without reintroducing the old package’s mock-data and dead-user defects.
- **Recommendation:** Web implementation should begin with parity tests and modify presentation layers only; any needed business-logic change must stop as out of scope.

## Review Boundary

This independent review does not edit `prd.md`; does not edit `design-handoff.md`; does not edit `design/ux-handoff.md`; does not edit `design/ui-handoff.md`; does not approve design or record design approval; does not alter `task.json`; and does not modify task state.
