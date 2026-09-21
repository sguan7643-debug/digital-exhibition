# Design Review

## Verdict

`approved`

All required review inputs are available. The revised aggregate and UX handoffs resolve both prior changes-required items: they define a concrete five-operation owner/state/retry map and require a single app-base helper for local-root and `/test2` navigation, history, OAuth return, and recovery. No blocking design divergence remains.

This review does not approve design.

## Findings

No findings requiring changes.

## Review evidence

### Resolved check: Concrete affected-operation ownership and scoped recovery

- **PRD Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/prd.md`, acceptance criteria 6, 8, and 11 require deduplicated affected reads, localized recovery, and retry limited to the failed operation(s).
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design-handoff.md`, “Concrete workbench ownership and retry boundaries” now names the existing owner for `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002`, limits every retry to its own operation, and states that duplicate `WB-001` retries disable together.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design/ux-handoff.md`, section 8 now specifies, per operation, the visible component/panel plus normal, loading, empty, error/retry/disabled, and permission-denied behavior.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design/ui-handoff.md`, sections 4.2–5 support the mapped contract: each state stays within its named panel, retains its heading and logical content order, and uses scoped native-disabled retry controls.
- **Impact:** The implementation can now keep unrelated shell and workbench areas available, present the six required states locally, and prove that a retry does not fan out into already-successful operations.
- **Recommendation:** No design change. Require the Web implementation handoff and automated tests to preserve this exact table and prove the retry call set for each row.

### Resolved check: One active-base contract across navigation, OAuth, and recovery

- **PRD Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/prd.md`, acceptance criteria 1–5 require OAuth-before-protected-reads and correctly resolved routes for local `/` and deployed `/test2` paths, including safe query/hash return preservation.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design-handoff.md`, combined implementation intent item 1 now requires the one app-base helper for shell/card links, history updates, OAuth `returnTo`, error/empty/permission recovery, and rejected-return fallback; it prohibits component-level `/test2` concatenation.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design/ux-handoff.md`, section 3.1.1 specifies the helper’s outcomes for ordinary navigation, history/popstate, OAuth returns, all recovery destinations, and unsafe return fallback under both bases.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design/ui-handoff.md`, comparison performed against sections 2, 4, and 7: it provides state-card/recovery behavior without conflicting with the helper contract; its visual requirement for scoped actions applies equally to helper-generated destinations.
- **Impact:** Existing root-absolute link behavior has a single explicit replacement rule, preventing the `/test2` prefix from being lost after callback, ordinary in-app navigation, or recovery.
- **Recommendation:** No design change. Require root and `/test2` tests for ordinary navigation, `history` update, OAuth return, rejected-return fallback, and every state-card recovery destination.

### Cross-check: Full-screen loading, six states, responsive Web, accessibility, and safe diagnostics

- **PRD Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/prd.md`, state inventory and acceptance criteria 5, 7–10 require entry suppression, bounded regional outcomes, distinct empty/permission states, and safe actionable diagnostics.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design-handoff.md`, the state/accessibility contract limits full-viewport presentation to unresolved entry authorization and mandates inline regional feedback after authentication.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design/ux-handoff.md`, sections 5–7 cover `normal`, `loading`, `empty`, `error`, `disabled`, and `permission-denied`; keyboard/focus behavior; one concise live update; and the diagnostic allowlist.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/design/ui-handoff.md`, sections 3–6 use existing contrast-safe tokens, 36px Web controls, visible focus/forced-colors, reduced motion, 320px-safe reflow, nonblocking inline progress, and prohibit secret/identity/raw-response rendering.
- **Impact:** The prior application-wide overlay conflict is explicitly resolved at the design level: only entry checking may be full viewport; authenticated reads cannot mask the shell or steal focus. The Web-only platform declaration is consistent with responsive-browser rules and does not create an undeclared uni-app/native obligation.
- **Recommendation:** No design change. Verify these behaviors in implementation with keyboard, forced-colors, reduced-motion, and narrow-Web-width tests, and ensure trace/error evidence contains only the allowlisted fields.

## Review Boundary

This independent review does not edit `prd.md`; does not edit `design-handoff.md`; does not edit `design/ux-handoff.md`; does not edit `design/ui-handoff.md`; does not approve design or record design approval; does not alter `task.json`; and does not modify task state.
