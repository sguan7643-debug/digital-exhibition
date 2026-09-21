# 数智产品展厅需求差距补齐 — Design Handoff

Author: AI Team Lead 001  
Task: `DEH-REQ-GAP-20260910`  
Authored during `design`; controlled task is now `design_review`.

## Sources preserved

- Approved PRD: `prd.md`, SHA-256 `B344393363A60684FFD70CA4286B24FAE865E738E3C8BB15B65DF56188AE6003`.
- UX source: `design/ux-handoff.md`, Author 004, SHA-256 `BFC000E932B9E7551FE76E06B650C3DBA601A7BEC2B34311D4E6FB416D13A8B4`.
- UI source: `design/ui-handoff.md`, Author 005, SHA-256 `BFC4B6D8CF8197A7965CC0591E096338E23CE8691AFD8ACAB491646DA3017986`.
- Platform: Vue Web only. Mobile/uni-app is not declared.

This aggregate preserves both role-owned sources and does not replace them. Where detail differs, the approved PRD controls product scope, UX controls behavior, and UI controls visual treatment.

## Approved design direction

Keep the existing information architecture, navigation, logos, color system, page layouts, density and component family. This task is a data-truthfulness and business-flow completion effort, not a visual redesign. Remote mode must render authoritative server projections; mock data may exist only in an explicitly identified mock mode and must never masquerade as a successful remote response.

## Interaction architecture

1. The existing 30-route shell remains stable. Additive `/materials` and `/apps/onboarding/apply` routes retain their current entries.
2. Each data domain consumes its declared operation results through the page integration boundary rather than direct fixture merging.
3. Applications, materials, training/talent, certification/points, announcements/messages, and operations/admin share the same observable lifecycle: loading → success or empty; recoverable errors expose retry; unauthenticated and unauthorized responses preserve page context and expose only allowed recovery.
4. Controlled writes show pending state, prevent duplicate submission, end loading on every response, and show explicit success or failure. External dependencies without a usable contract remain disabled or blocked with the missing dependency named; no local-only success is presented as persistence.
5. Application use and onboarding preserve server-side permission checks and safe target validation. Approval-dependent publication appears only after the authoritative status is returned and projected.

## Required states

Every affected route implements `normal`, `loading`, `empty`, `error`, `disabled`, and `permission-denied` where applicable. Loading retains surrounding page structure and prevents duplicate actions. Empty states distinguish “no records” from failed loading. Errors expose retry without clearing valid prior content. Disabled controls explain the missing dependency. Permission denial never exposes restricted data or mutating controls.

## Visual implementation constraints

- Reuse existing CSS variables, typography, colors, spacing, borders, radii, icons and elevation from `src/style.css` and existing shell/components.
- Do not replace or redraw the CNOOC or product logos.
- Use existing page-state surfaces and button variants; asynchronous primary actions use the existing disabled/loading treatment and a concise status label.
- Preserve visible keyboard focus, logical tab order, labels and error association. Click/touch targets remain at least the established component height.
- Desktop shell remains unchanged. Responsive Web may reflow grids and action groups without changing information priority or business steps.

## Data and security boundaries

- Browser code receives only server-projected fields; App Secret, access tokens, Base/table/view/field identifiers and upstream file tokens remain server-side.
- Production same-origin API traffic must not be blocked by a localhost-only development guard. Unapproved cross-origin targets remain blocked.
- Remote mode must not filter authoritative production records by `TEST_`, merge fixtures into successful responses, or downgrade a server error to demo success.
- Write operations keep authentication, authorization, validation, idempotency/version checks, audit correlation and explicit result handling.

## Engineering sequence

1. P0: repair the production network guard and REG-001 integration failure.
2. P1-A: make application catalogue and nine detail types authoritative and wire use/onboarding actions.
3. P1-B: wire materials, training/talent, certification/points and announcements/messages to existing operations.
4. P1-C: wire operations/admin read surfaces and truthful disabled/error states for unavailable writes.
5. P2: integrate external approval, robot, monitoring, production gateway and formal write flows as their signed contracts become available.
6. P3: run code review, functional QA, Web compatibility QA and release-readiness review.

Independent engineering tasks may run in parallel only when their changed files do not overlap. `src/App.vue` and shared integration registries have a single owner during integration.

## Design acceptance

- UX and UI sources cover all affected domains and six states.
- Existing visual identity and navigation are preserved.
- Remote data, mock data and blocked dependencies are unmistakably separated.
- Loading, success, empty, failure, disabled and permission states have both behavioral and visual definitions.
- Web accessibility includes keyboard operation, visible focus, meaningful labels, error association and non-color status cues.
- No mobile handoff is required because mobile is not declared.

## Open dependencies

External items D01–D11 in the PRD remain binding inputs. Their absence does not authorize fabricated behavior; the corresponding Web state must remain explicit and testable. No unresolved conflict exists between the UX and UI sources.
