# Design Review

## Verdict

`approved`

The proposed design is decision-ready with no blocking finding. This reviewer verdict is advisory and does not record or imply user design approval.

## Findings

### Finding: Full-route parity is represented as a route-level contract

- **PRD Evidence:** `prd.md` AC-1, AC-2, AC-3 and AC-7 require evidence for all 30 common routes, correct page bodies and nine independent detail families, and forbid representative sampling.
- **Aggregate Design Evidence:** `design-handoff.md` Implementation Contract items 7–12 and the AC-1/AC-2/AC-3/AC-7 traceability rows require matching reference page structure, nine independent detail implementations and a complete 30-row evidence matrix.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` Information Architecture and Application Details define all route groups and the breadcrumb/hero/facts/family-content order while preserving current actions.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` Component Appearance and Variants defines mandatory detail regions and explicitly rejects one route or a correct shell as evidence for another route.
- **Impact:** The prior failure mode—checking a shared shell and five sample routes while missing page bodies—is directly prevented.
- **Recommendation:** Approve the design only with the all-route evidence gate intact; development and QA must fail when any required route row is absent.

### Finding: Personnel-name and update-time defects have end-to-end design traceability

- **PRD Evidence:** `prd.md` AC-8 requires authoritative names without raw-ID fallback; AC-9 removes the visible update timestamp and its layout reservation while preserving internal synchronization.
- **Aggregate Design Evidence:** `design-handoff.md` Implementation Contract items 3–6 specify removal of only the visual timestamp node/style, retention of the request loading bubble and internal freshness, plus a shared resolved-name-or-neutral-empty contract across all consumers.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` Application Discovery and Person Labels, Interaction Rules and Content Behavior define hit/miss behavior, diagnostics, accessibility text and preservation of background refresh.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` Global Shell and Top Origin plus Application Catalogue and Personnel Metadata define zero residual space, resolved-name styling, muted `—` fallback and rejection of identifiers in visible/accessibility text.
- **Impact:** The design cannot be satisfied by merely hiding text, leaving whitespace, or changing one card while other pages continue to expose codes.
- **Recommendation:** Keep both DOM/accessibility scans and route top-coordinate checks as required implementation evidence, alongside dictionary hit/miss tests.

### Finding: Required states and accessibility behavior are complete

- **PRD Evidence:** `prd.md` State Inventory and AC-6 require loading, empty, error, disabled, permission-dependent, responsive and accessibility behavior without regressions.
- **Aggregate Design Evidence:** `design-handoff.md` preserves the six states, foreground request announcement, focus behavior and current business semantics; its AC-6 row requires keyboard, focus, landmark, reflow and reduced-motion evidence.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` Required States specifies triggers, actions, recovery, focus and announcements for normal/loading/empty/error/disabled/permission-denied; Accessibility Behavior covers names, landmarks, focus restoration and ID non-disclosure.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` Required States provides distinct reference-consistent appearance for every required state and preserves the fixed loading bubble.
- **Impact:** Removing the update-time element will not accidentally remove loading feedback, and visual migration will not weaken permission or keyboard behavior.
- **Recommendation:** Preserve all six state fixtures and keyboard checks during engineering and QA; do not treat normal-state screenshots as complete evidence.

### Finding: Responsive Web scope and design evidence are consistent

- **PRD Evidence:** `prd.md` requires three visual viewports plus six-size overflow/reachability coverage and declares only Vue Web/H5.
- **Aggregate Design Evidence:** `design-handoff.md` Platform Declaration marks Web/Vue and responsive H5 as required and native/uni-app as not declared.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` Web Behavior defines large desktop, compact desktop, H5, narrow H5 and landscape rules, including bounded table scrolling and no document-level overflow.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` Web Visual Rules pins the reference cascade, explicit breakpoints and six verification sizes; uni-app is explicitly not declared.
- **Impact:** The design has no ambiguous mobile commitment and still covers the browser widths where structure and controls are most likely to break.
- **Recommendation:** Use the stored per-route viewport for direct comparison and the six approved sizes for responsive/overflow checks exactly as specified.

## Review Boundary

This independent review does not edit `prd.md`, `design-handoff.md`, `design/ux-handoff.md` or `design/ui-handoff.md`; does not approve design or record design approval; does not alter `task.json`; and does not modify task state.
