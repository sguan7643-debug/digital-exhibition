# Design Handoff Aggregate — DEH-MY-APPLICATION-ENTRY-20260927

Owner: AI Team Lead

This aggregate preserves the role-owned source handoffs without changing their decisions. It is the design-approval input for the approved PRD.

## UX / Interaction Evidence

Source: [design/ux-handoff.md](design/ux-handoff.md)

- Both visible “我的申请” entries navigate to `/apps/onboarding/status` under one shared availability rule.
- The list route is entered without an application identifier; a list item alone opens a specific detail.
- The approval timeline keeps its connector solely in the icon track, clear of title and time text at all sizes.
- The application form removes only the displayed “飞书授权” entry and preserves all existing authorization and approval behavior.
- Normal, loading, empty, error, disabled and permission-denied behaviors, focus handling, keyboard operation and Web-only boundary are defined in the source handoff.

## UI Visual Evidence

Source: [design/ui-handoff.md](design/ui-handoff.md)

- Reuse the current white-card and ocean-blue visual system; no new visual language or tokens.
- Make the shortcut card a single, visibly focusable link matching the working title link’s availability.
- At wide sizes, use an independent icon-track row and a separate text row: each preceding stage owns one connector from its icon’s outer right edge to the next icon’s outer left edge. The connector never enters a text row. At `≤760px`, retain the current icon-column vertical timeline.
- Remove the rendered authorization button and leave the existing secondary “返回应用中心” control aligned in the heading.
- Preserve existing focus rings, forced-colors behavior, reduced-motion behavior, state colors and responsive breakpoints.

## Cross-Source Traceability

| Approved PRD outcome | UX evidence | UI evidence |
| --- | --- | --- |
| Both “我的申请” entries open one list route | §3–4.1 | §2.2, §4.2, §7 |
| Existing text link remains correct | §4.1 | §4.2 |
| Detail timeline has no text/line overlap | §4.2, §5 | §3, §4.3, §6 |
| Application page no longer shows authorization button | §4.3, §5 | §2.4, §4.4, §5 |
| Existing authorization, approval and data behavior is unchanged | §1, §4.3, §5 | §1, §9 |
| Web responsive and accessible behavior is verified | §6–7 | §6–8 |

## Required Acceptance Evidence

1. Exercise both personal-center entry points and assert the same `/apps/onboarding/status` destination.
2. Verify existing list empty state and one real existing detail without changing business data.
3. Inspect the existing two-stage timeline at desktop, narrow viewport and 200% browser zoom: no connector may cross title/time text. The approved phrase “two or more” is satisfied by this two-stage rendering; third-plus-stage presentation/data-model generalization is explicitly out of scope.
4. Confirm the application form contains no visible or keyboard-focusable “飞书授权” entry while “返回应用中心”, existing form validation, submission and status navigation remain present.
5. Exercise keyboard focus, forced-colors and reduced-motion behavior as specified in both source handoffs.

## Unresolved Conflicts

None. Both source handoffs preserve the approved PRD and explicitly exclude OAuth, approval configuration, Base writes and mobile implementation.

## Approval Boundary

This document is an aggregate for explicit design approval only. It does not constitute design approval, implementation authorization, QA pass or release approval.
