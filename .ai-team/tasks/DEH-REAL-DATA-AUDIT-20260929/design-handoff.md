# Aggregate Design Handoff

## Task and approved baseline

- Task: `DEH-REAL-DATA-AUDIT-20260929`.
- Declared platform: Web / Vue.
- Mobile and uni-app: `not declared`, evidenced by `task.json`.
- Approved product baseline: `prd.md`.
- Scope decision: `decision-log.md`.
- Product review: `reviews/product-review.md` (`approved`, advisory).

## Role-owned design sources

- UX source: `design/ux-handoff.md`.
- Visual source: `design/ui-handoff.md`.
- Both sources preserve the approved scope and explicitly avoid navigation, information-architecture, business-flow, and visual-system redesign.

## Aggregate design decisions

1. Existing routes, navigation, page hierarchy, layout system, visual tokens, cards, tables, drawers, and form patterns remain unchanged.
2. Each user-visible value follows an existing operation contract. Where no stronger contract rule exists, session identity wins and the directory only fills missing organization, department, telephone, and email fields. Dictionaries translate codes but never overwrite facts.
3. A missing scalar displays `—`; a missing form auto-fill stays blank; an empty collection uses the page's explicit empty state; a wholly optional unsupported section is hidden without leaving an empty panel.
4. Loading, errors, permission denial, disabled capabilities, route reuse, background refresh, and session switching must never render static identities, counts, contacts, statuses, codes, or business records as fallbacks.
5. Cached data may render only after confirming the current user namespace. It displays a data-update time. Refresh success updates in place; refresh failure preserves the last successful data with an accurate failure message and retry action.
6. Session change immediately hides prior-user identity and user-scoped data. IndexedDB and `BroadcastChannel` reuse requires matching user namespace, operation, and request parameters.
7. The top message badge renders a real DOM count only when the authoritative count is greater than zero. The visible count and accessible name must match; CSS cannot generate a fixed number.
8. Statistics display zero only when the API explicitly returned zero. Missing values display `—`; fixed trend values are removed unless a contract supplies them.
9. Certification service contact information is rendered only from its existing contract; absent values use `—` or the section is hidden according to value availability. Static example email, phone, and service hours are forbidden.
10. Talent detail training and project sections render only real contract records. Unsupported or empty sections are hidden or use an explicit empty state; fixed year, project names, participation state, and project count are forbidden.
11. The existing six-state system is retained: `normal`, `loading`, `empty`, `error`, `disabled`, and `permission-denied`. Partial success and background refresh are handled per section without blocking unaffected content or adding persistent floating bubbles.
12. Desktop and responsive Web retain current breakpoints and reflow. Dynamic text may wrap and grids naturally close gaps after hidden cards or sections. Touch targets remain at least 44px on narrow Web.
13. Visible focus, status text, accessible names, and live-region messages must remain synchronized with visible real data. Touched ordinary text uses an existing color meeting contrast requirements; disabled colors are reserved for truly disabled controls.

## Audit and acceptance design

- The implementation must produce a complete real-data display audit matrix covering all 32 declared routes and shared components.
- Every row records route/component, user-visible field and presentation location, operation/response field, dictionary mapping, source priority, current fallback, behavior in all applicable states, session isolation, finding, remediation, changed file, automated evidence, and manual evidence.
- DOM text, form values, attributes, accessible names, dynamic strings, CSS pseudo-elements, download names, details, drawers, filters, paging, and cached states are in scope.
- Final matrix rows may be only `verified` or evidence-backed `not applicable`; no pending or unresolved row may pass QA.

## Known implementation targets from design evidence

- `src/components/ExhibitionShell.vue`: fixed unread count in `aria-label` and CSS pseudo-element.
- `src/pages/AnnouncementsPage.vue`: fixed announcement comparison deltas.
- `src/pages/CertificationPage.vue`: static service hours, email, and telephone despite a contact field in `CER-001`.
- `src/pages/TalentPeoplePage.vue`: fixed training plan, participation state, project names, and project count in every person's detail.
- Other routes and shared components remain subject to the complete matrix; these known targets do not limit the audit.

## Accessibility and visual constraints

- Retain the established font stack, spacing rhythm, colors, radii, shadows, page state surfaces, and responsive rules documented in `design/ui-handoff.md`.
- Use explicit text with color for state meaning; never rely on color or CSS-generated content alone.
- Background refresh does not steal focus. Page-level permission denial focuses its state title; result changes use polite announcements.
- No personal information may appear in errors, request traces, accessible debug text, logs, fixtures, snapshots, or build-time constants.

## Design commands and results

- Governed scope approval was recorded with `record-approval.ps1`; result: `APPROVED scope`.
- Governed transition was recorded with `set-task-state.ps1`; result: `STATE design`.
- `validate-task.ps1 -EnforceLocation`; result: `VALID`.
- Repository evidence was inspected read-only with `rg` and `Get-Content`; no business source was modified during design.

## Design-stage changed files

- `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md`
- `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md`
- `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md`
- `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/decision-log.md`
- `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/task.json` through governed scripts only.

## Risks

- Existing operation contracts may not expose some values that current pages imply. The approved behavior is accurate empty/hidden/disabled presentation, not invented records and not an unapproved new API.
- Existing dirty worktree changes predate this task and must be preserved. Implementation must edit only files required by the audit and must not reset unrelated work.
- Static product copy, navigation labels, and legitimate dictionaries must not be confused with fake business data.
- Personal fields require strict session isolation; a visually correct page that reuses another account's cache is a blocking defect.

## Unrun checks

- No source build, automated test, browser regression, cross-session test, or package build is run in the design stage.
- No deployment, server configuration change, external write, merge, publication, or release is authorized.

This aggregate is ready for independent design review. It does not grant design approval or authorize development.
