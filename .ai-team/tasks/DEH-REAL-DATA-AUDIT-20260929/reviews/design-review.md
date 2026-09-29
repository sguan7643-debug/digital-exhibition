# Design Review

## Verdict

`approved`

The aggregate design is traceable to the approved product baseline and both role-owned design sources. No blocking divergence was found. This review communicates design readiness only; it does not approve design, alter task state, or authorize development.

## Findings

### Finding: 六个必需状态覆盖一致且恢复路径明确

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` §5 defines success, loading, empty, error, disabled, and permission-dependent behavior in AC-04 through AC-07, with no static fallback data allowed.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` decisions 4 and 11 retain `normal`, `loading`, `empty`, `error`, `disabled`, and `permission-denied`, including section-level partial success and background refresh.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §6 specifies triggers, content, recovery actions, focus, announcements, cache behavior, and protected-data handling for all six states.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §6 maps all six states to existing visual surfaces, visible actions, `aria-busy`, accurate error text, native disabled semantics, and permission-denied presentation.
- **Impact:** Loading, failure, empty, disabled, and unauthorized states cannot silently reintroduce static identities or business records, and users retain state-appropriate recovery paths.
- **Recommendation:** Implement and verify all six states per audit-matrix row; preserve the specified partial-success, background-refresh, and session-switch behavior as additional required states.

### Finding: 32-route and shared-component audit matrix is fully specified

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` In Scope items 9–10 and AC-08/AC-09 require a page-, component-, field-, state-, and evidence-level matrix with no unresolved row.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` “Audit and acceptance design” requires all 32 declared routes and shared components, including DOM text, attributes, accessible names, CSS pseudo-elements, cached states, and only `verified` or evidence-backed `not applicable` closure.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §7.1 enumerates the complete route groups: 4 homepage/personal routes, 2 announcement routes, apps plus 9 detail routes, 2 onboarding routes, 3 points/training routes, 6 operations/admin routes, 1 certification route, 3 talent routes, and 1 materials route, totaling 32; §7.2–7.3 defines every matrix field and verification scenario.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §9 item 1 requires all 32 Web routes and the shared shell to retain the visual system, while items 2–10 define the visual acceptance checks applied across them.
- **Impact:** The design prevents keyword-only or sample-based acceptance and makes every user-visible field and shared default traceable to evidence.
- **Recommendation:** Treat the completed 32-route matrix as a QA gate; no route, shared shell element, hidden state, CSS-generated value, or accessible name may remain pending.

### Finding: 数据源优先级与冲突处置可执行且一致

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` decisions D2–D5, In Scope item 11, and AC-10 establish contract-first resolution, session-first identity, directory-only completion of missing identity fields, operation-contract business data, dictionary-only translation, and recorded conflict handling.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` decisions 2–3 preserve that priority and prohibit dictionaries, defaults, or static fallbacks from overwriting facts.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §4.1 and §5.3 define the same deterministic order and require unresolved contract conflicts to return to product decision rather than being guessed in UI.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §5.4 and §11 require known dictionary mappings to display user-facing text without fabricating unknown mappings, and require missing contracts or unresolved source conflicts to return to product/UX decision.
- **Impact:** Real records cannot be replaced by unrelated sources, guessed labels, hardcoded defaults, or cross-domain values.
- **Recommendation:** Cite the exact operation contract and response field in every audit-matrix row; pause only the affected field if the contract lacks a deterministic source rule.

### Finding: 会话、缓存与跨标签页隔离满足个人信息边界

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` decisions D6–D7 and AC-11/AC-12 prohibit new personal-data persistence, cross-user reuse, plaintext logging, build-time fixation, and real-person test fixtures, while requiring multi-session isolation tests.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` decisions 5–6 require current-user namespace confirmation before cached display and matching user namespace, operation, and parameters for IndexedDB and `BroadcastChannel` reuse.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §§4.3, 5.1, and 5.4 immediately hide prior-user data on account change and reject cache or cross-tab updates whose user namespace, operation, or parameters do not match.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §§5.1 and 6 require neutral loading/hidden identity on session switch, forbid old-account values, and hide protected contact information on permission denial.
- **Impact:** The design blocks stale identities, contact details, and user-scoped records from flashing or leaking across users, sessions, routes, or browser tabs.
- **Recommendation:** Use only de-identified constructed fixtures and include sequential, parallel-session, route-reuse, IndexedDB, and `BroadcastChannel` isolation evidence in the matrix.

### Finding: 响应式 Web、键盘和触控规则完整；mobile/uni-app 正确标记为未声明

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` F2, Out of Scope item 8, AC-14, and AC-15 limit delivery to Web/Vue and prohibit mobile implementation.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` declares Web/Vue only, mobile and uni-app `not declared`, retains existing breakpoints and responsive reflow, and requires at least 44px touch targets on narrow Web.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §§9–10 cover keyboard focus, status announcements, disabled semantics, browser history, responsive Web, IndexedDB, and `BroadcastChannel`, while explicitly marking uni-app not applicable.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §7 defines representative breakpoint ranges from wide desktop through `<=760px`, `<=430px`, `<=380px`, and narrow-Web landscape, plus reflow, wrapping, 44px targets, safe areas, and §10 explicitly marks native mobile and uni-app not declared.
- **Impact:** Dynamic real values can expand, wrap, and reflow without overlap while keyboard, touch, and narrow-browser users retain usable controls; no undeclared platform work is implied.
- **Recommendation:** Verify representative widths on both sides of each existing breakpoint, keyboard-visible focus, 44px narrow-Web targets, forced-colors mode, safe areas, and long real values; record mobile/uni-app as evidence-backed `not applicable`.

### Finding: 可访问性要求在可见内容与辅助技术内容之间完整可追溯

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` AC-05 through AC-09 require accurate loading/error/permission behavior and auditing of attributes, accessible names, dynamic text, and CSS pseudo-elements.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` “Accessibility and visual constraints” requires text plus color, synchronized accessible names, non-disruptive background refresh, permission-state focus, and exclusion of personal information from diagnostic text.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §§6 and 9 specify `aria-busy`, polite live regions, alerts, focus recovery, native disabled semantics, machine-readable time, synchronized visible/accessibility text, and no personal information in diagnostics.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §4 defines contrast corrections, compound visible focus, forced-colors support, and non-color status meaning; §§5–7 preserve labels, readable long values, focusable table regions, and touch-target sizing.
- **Impact:** Removing static content will not leave inaccessible status changes, contradictory labels, low-contrast metadata, invisible focus, or mouse-only recovery.
- **Recommendation:** Include keyboard, screen-reader announcement, contrast, forced-colors, long-text scaling/wrapping, focus recovery, and visible-versus-accessible-name parity in manual evidence.

### Finding: 已知固定假数据目标均被明确纳入设计与验收

- **PRD Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/prd.md` product goal, In Scope items 1–6, and AC-01 through AC-04 prohibit fixed identities, contacts, status/code values, counts, and fabricated business records across the full Web product.
- **Aggregate Design Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design-handoff.md` “Known implementation targets from design evidence” explicitly names `ExhibitionShell.vue` fixed unread count, `AnnouncementsPage.vue` fixed comparison deltas, `CertificationPage.vue` static contact/service data, and `TalentPeoplePage.vue` fixed training/project/count data without limiting the wider audit.
- **UX Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ux-handoff.md` §2.2 explicitly documents the unread count and talent-detail records; §§4.2, 7, and 8 require real counts, contacts, statistics, details, pagination, and disabled reasons across all routes, including certification and announcement field domains.
- **UI Source Handoff Evidence:** `.ai-team/tasks/DEH-REAL-DATA-AUDIT-20260929/design/ui-handoff.md` §§5.2, 5.3, 5.5, 5.6, and §9 explicitly prohibit CSS fixed badge numbers, missing-as-zero statistics, example detail values, and fixed talent training/project/count content, and require contact areas to use real values or accurate absence states.
- **Impact:** The four confirmed defects have decision-ready presentation rules, while the design still requires discovery and closure of equivalent defects elsewhere.
- **Recommendation:** Use these four targets as mandatory regression cases, not as the audit limit; require the complete matrix and build scan to prove no equivalent normal-state static business value remains.

## Review Boundary

This independent review does not edit `prd.md`; does not edit `design-handoff.md`; does not edit `design/ux-handoff.md`; does not edit `design/ui-handoff.md`; does not approve design or record design approval; does not alter `task.json`; and does not modify task state.
