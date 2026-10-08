# Design Handoff Aggregate

Owner: AI Team Lead

This aggregate preserves both role-owned sources. It does not replace, weaken or silently reconcile either source handoff.

## UX/Interaction Evidence

Source: `design/ux-handoff.md`

- Preserves the existing authenticated shell, route destinations, live Feishu data, permission decisions, uploads, approvals, writes, cache behavior and success destinations.
- Defines the 30 direct-parity routes and keeps additive pages on the same interaction/state system without using them as substitutes for the 30 comparisons.
- Requires all visible person fields to resolve through the authoritative user dictionary. The visible fallback is `—`; raw user/AD/open/employee identifiers stay internal and out of visible and accessible labels.
- Removes the visible global “数据更新时间” row and its layout reservation while preserving `lastSyncedAt`, freshness calculations and silent refresh.
- Explicitly preserves the global non-modal foreground request loading bubble and removes only first-sync/data-missing messaging already excluded by approved behavior.
- Defines separate application catalogue, nine detail-family, onboarding, list/editor/admin and talent flows without changing operation IDs or payloads.
- Covers `normal`, `loading`, `empty`, `error`, `disabled` and `permission-denied`, including triggers, recovery, focus order and announcements.
- Defines large desktop, compact desktop/tablet, H5, narrow H5 and landscape H5 reflow and accessibility behavior.
- Confirms uni-app/mobile is not declared.

## UI Visual Evidence

Source: `design/ui-handoff.md`

- Pins the approved archive and reference `style.css`, `h5.css` and `ExhibitionShell.vue` hashes as the only visual source of truth.
- Defines the final reference CSS tokens, fluid typography, spacing, borders, radii, elevation, focus treatments and responsive cascade.
- Requires the route wrapper to begin at its own reference inset with no update-time text, empty node, margin, minimum height, pseudo-element or hidden-but-sized replacement.
- Preserves the fixed request-processing bubble so loading feedback floats without changing page geometry.
- Defines person-name visual slots: resolved name in normal text, unresolved `—` in muted text, stable geometry and no technical ID in visible/accessibility content.
- Establishes distinct mandatory region contracts for all nine application-detail families: breadcrumb, hero, facts, family-specific body, media/files where applicable, related content and bottom action/comment area.
- Defines component appearance for catalogue cards, forms, filters, tables, pagination, editors, upload regions, drawers and additive pages.
- Requires individual screenshots and structure evidence for every common route and all six approved responsive verification sizes.

## Implementation Contract

1. Treat the reference archive and pinned extracted files as read-only evidence.
2. Add failing regression checks for route structure, update-time absence/layout origin and person-name projection before or with implementation.
3. Remove the global `.data-update-time` render node and its styling/space only; do not remove `lastSyncedAt` or cache/refresh logic.
4. Preserve `.request-loading-toast`, its spinner and polite live announcement for foreground requests.
5. Replace all user-dictionary lookups that expose `lookup.get(id) || id` in user-facing name properties with a shared display-name resolution contract: resolved name or neutral empty value plus diagnostic evidence.
6. Audit every consumer of owner/developer/applicant/operator/person-name properties, including visible text, `title`, `aria-label`, off-screen text and list/detail projections.
7. Migrate route structure from the matching reference page file rather than styling the current sparse structure until it merely looks similar.
8. Implement all nine detail families independently while reusing shared visual primitives where their reference structure is actually shared.
9. Preserve current read/write operations, permissions, validation, upload, approval, idempotency, audit and routing behavior.
10. Reconcile shared shell/tokens first, then route-family structure, then route-specific styling; do not overwrite current `App.vue`, server, fixtures or integration logic wholesale with reference mock code.
11. Capture evidence for every route and state required by the PRD. Dynamic text masking is limited to glyph regions and cannot hide container or whitespace differences.
12. Run focused person-projection/timestamp tests, route structure tests, complete unit/integration tests, production build and six-size browser checks before claiming Web completion.

## Cross-Source Traceability

| Approved PRD requirement | UX/Interaction source | UI Visual source | Required implementation/verification evidence |
| --- | --- | --- | --- |
| AC-1 all-route evidence | Information Architecture; Web Behavior | Direct comparison and evidence | 30-row route matrix with reference/current screenshot, structure result and viewport |
| AC-2 page-body parity | Application details; Lists/editors/admin | Component variants; nine detail families | Route-level region assertions and unmasked screenshot comparisons |
| AC-3 nine detail families | Application details flow | Nine detail families table | Independent tests/captures for tool, Haineng Work, report, dashboard, dataset, metric, AI, EAD and RPA |
| AC-4 bounded dynamic masking | Content Behavior | Direct comparison rules | Explicit mask manifest limited to dynamic glyph regions |
| AC-5 business preservation | Interaction Rules | Component variants and no mock-data rule | Existing auth, permission, upload, approval, cache, write and route regression results |
| AC-6 responsive/accessibility | Web and Accessibility Behavior | Breakpoints, focus and required states | Six viewport checks, keyboard/focus, landmarks, labels, reflow and reduced-motion evidence |
| AC-7 no sampling | 30-route matrix rule | Individual comparison rule | QA fails when any route/state evidence row is absent |
| AC-8 real person names | Person-label flow; Content Behavior | Personnel metadata appearance | Dictionary-hit and dictionary-miss tests; DOM/accessibility scan rejects raw identifiers in name slots |
| AC-9 remove update time/space | Global entry flow; Interaction Rules | Global shell/top-origin rule | Text/node absence check, route top-coordinate comparison, cache/silent-refresh regression |

## Platform Declaration

- Web/Vue: declared and required.
- H5: covered as responsive Web.
- uni-app/native mobile: not declared in `task.json`; no mobile handoff is required.

## Unresolved Conflicts

None. Both source handoffs preserve the approved business behavior and agree on the reference archive, all-route parity, authoritative person-name display, removal of the global update-time row/space and retention of foreground request loading feedback.
