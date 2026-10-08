# Design Handoff Aggregate

Owner: AI Team Lead

This aggregate preserves both role-owned sources. It does not replace, weaken or silently reconcile either evidence set.

## UX/Interaction Evidence

Source: `design/ux-handoff.md`

- Preserves the current global shell, 32-route information architecture and all business destinations.
- Preserves authenticated entry, application discovery/detail, onboarding, operations, administration and talent flows.
- Prohibits changes to route resolution, event payloads, data requests, cache policy, permission decisions and write behavior.
- Defines desktop collapse, mobile drawer, account disclosure, search, independent card actions, dialog/drawer focus and disabled-action rules.
- Separates real dynamic content from visual parity: real names, departments, counts, timestamps, application records and approval states remain authoritative.
- Defines desktop, compact desktop/tablet, H5, narrow H5 and landscape H5 interaction/reflow behavior.
- Covers `normal`, `loading`, `empty`, `error`, `disabled` and `permission-denied` triggers, permitted actions, recovery, focus and announcements.
- Preserves skip navigation, landmarks, accessible names, state semantics, focus trapping/restoration, text reflow and reduced motion.
- uni-app is explicitly not declared.

## UI Visual Evidence

Source: `design/ui-handoff.md`

- Uses the user-supplied archive as the single visual source of truth, pinned by SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Pins the reference hashes for `style.css`, `h5.css` and `ExhibitionShell.vue` so implementation cannot drift to another historical variant.
- Defines the exact reference color, form, shape, elevation, spacing and typography tokens.
- Defines the enterprise-blue hierarchy, shell dimensions, sidebar dimensions, surface/card vocabulary, forms, tables, pagination, drawers and all nine application-detail families.
- Defines computed-style/cascade preservation and the direct visual-parity rule for the 32-route matrix.
- Defines reference route viewports plus representative desktop, compact desktop and H5 verification sizes.
- Covers normal/loading/empty/error/disabled/permission-denied appearance without changing UX behavior.
- Requires visible focus, contrast preservation, 44px H5 controls, safe-area-aware Web shell and reduced-motion behavior.
- uni-app is explicitly not declared.

## Implementation Contract

1. Treat the reference archive and pinned files as read-only visual evidence.
2. Begin with behavior-relevant visual parity tests that fail against the current implementation.
3. Migrate reference tokens and shared visual rules while preserving current data and event logic.
4. Reconcile `ExhibitionShell.vue`, `style.css` and `h5.css` first, then shared components, then route-specific selectors.
5. Do not copy reference `App.vue`, mock fixtures, session behavior or network guard over current implementations.
6. Keep current live-data components; map their wrappers/selectors into the reference visual regions.
7. Verify all six states and every declared route family, not only normal-state homepage/application screenshots.
8. Record computed-style or screenshot evidence at the route’s reference viewport and representative responsive sizes.
9. Preserve current function, integration, accessibility and build checks alongside visual evidence.

## Cross-Source Traceability

| Approved PRD requirement | UX/Interaction source | UI Visual source | Implementation evidence required |
| --- | --- | --- | --- |
| AC-1 shared shell parity | Information Architecture; Global navigation; Web Behavior | Application shell; Tokens; Web Visual Rules | Shell screenshots/computed styles at desktop, compact desktop and H5; navigation keyboard checks |
| AC-2 shared page parity | 32-route matrix; Application/operations/talent flows | Visual parity decision rule; component and detail-family rules | Route/state/viewport comparison matrix with reference and actual captures |
| AC-3 current-only consistency | Content Behavior; preserved routes and state semantics | shared tokens/components and current-only DOM mapping | Selector/component inventory proving one visual system |
| AC-4 real business preservation | Interaction Rules; Content Behavior | dynamic-content exception and no-wholesale-replacement rule | Existing integration, onboarding, auth, cache, permission and upload regression tests |
| AC-5 state coverage | Required States table | Required States table | normal/loading/empty/error/disabled/permission-denied captures and interaction assertions |
| AC-6 responsive behavior | Web Behavior | breakpoints, resizing and verification viewports | 1672×941, 1920×1080, 1000×900, 390×844, 360×800 and 844×390 checks |
| AC-7 accessibility | Accessibility Behavior | contrast, focus and reduced-motion rules | keyboard/focus, labels, landmarks, drawer trap/restoration, zoom/reflow evidence |
| AC-8 regression evidence | all preserved behavior contracts | pinned design-source hashes and route comparison rule | static check, relevant tests, complete test, build and visual comparison outputs |

## Platform Declaration

- Web/Vue: declared and required.
- uni-app/mobile: not declared in `task.json`; no mobile handoff or native target is required. H5 remains responsive Web and is covered by the Web implementation.

## Unresolved Conflicts

None. Both source handoffs agree that visual parity applies to layout and styling while current authoritative data and business behavior remain unchanged. Any later request to copy old mock data, remove current pages, change business flows or modify backend/deployment is outside the approved scope and requires a successor decision.
