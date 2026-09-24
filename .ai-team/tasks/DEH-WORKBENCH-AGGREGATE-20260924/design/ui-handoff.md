# UI Visual Handoff

## Sources

- Approved product scope: `../prd.md`
- Approved interaction source: `ux-handoff.md`
- Existing visual system evidence: `src/style.css` integration toast styles and root form-control tokens

## Visual Direction

No new visual direction is introduced. Preserve the established exhibition shell, page cards and top-right data-status bubble. This task changes state logic and copy, not the page grid, navigation, typography or brand palette.

## Hierarchy and Components

1. Page content remains the primary layer.
2. Data request status uses the existing fixed `.integration-toast-stack` at z-index 120.
3. Active loading uses the existing blue `.request-activity-banner`.
4. Recoverable stale/error status uses the existing amber `.integration-recovery`.
5. The close control remains in the top-right corner of the amber bubble and never overlaps copy or the retry action.

## Traceable Tokens

Use existing values from `src/style.css`; do not introduce replacements:

| Concern | Existing value |
| --- | --- |
| Font family | `Microsoft YaHei`, `PingFang SC`, Arial, sans-serif |
| Page background | `#f3f6f9` |
| Focus color | `#0060a6` |
| Focus ring | `rgba(0,96,166,.18)` |
| Loading foreground/background/border | `#17304f` / `rgba(238,246,255,.98)` / `#a9c9e8` |
| Warning foreground/background/border | `#664c12` / `rgba(255,250,232,.98)` / `#e6c86f` |
| Warning action background | `#9a6b00` |
| Bubble radius | `12px` |
| Bubble shadow | existing `0 12px 32px` rules |
| Desktop offset | top `84px`, right `24px`, max width `440px` |
| Narrow offset | top `68px`, right `10px`, width `calc(100vw - 20px)` |

## Typography and Spacing

- Keep existing 15px loading title, 14px recovery message and 11px trace identifier.
- Keep current 13px/15px bubble padding and 8px/12px recovery gaps.
- Do not change application-card or homepage section spacing.
- Long trace IDs wrap with `overflow-wrap:anywhere` and must not widen the bubble.

## Component Variants and Required States

### Normal

- No status bubble when data is fresh and complete.
- Page content keeps existing styles.

### Loading

- Use the current pale-blue banner and spinner.
- When usable content already exists, the banner floats above it without adding layout height.

### Empty

- Use existing section empty-state visuals.
- Do not use amber warning styling for a confirmed empty result.

### Error

- With stale data, use the current amber recovery bubble.
- Keep white-on-amber retry button, visible close icon and trace identifier.
- Without usable content, preserve the existing full/section error-boundary visuals.

### Disabled

- Disabled retry keeps current opacity `.58` and wait cursor.
- No extra disabled overlay is introduced.

### Permission denied

- Preserve the existing authorization banner; do not restyle it as a data warning.

## Controls and Focus

- Retry has a minimum height of 34px per existing component.
- Close remains 24×24px visually; its full button stays keyboard reachable and receives the existing 2px amber focus outline.
- Existing hover and focus-visible states remain unchanged.
- No focus is moved when a bubble appears or disappears.

## Motion

- Preserve the existing 200ms toast entrance and 720ms loading spinner.
- Under `prefers-reduced-motion: reduce`, disable both as currently specified.
- Automatic success dismissal should remove the bubble without introducing a new exit animation requirement.

## Contrast

- Reuse only the existing reviewed color pairs.
- Text, controls and focus indicators must remain distinguishable at 200% zoom and Windows high-contrast conventions; native focus/accessibility semantics must not be removed.

## Responsive Web Rules

- Breakpoint remains 760px.
- Above 760px, recovery content uses message/action columns.
- At or below 760px, recovery content becomes one column and the action aligns to the start.
- Validate 320px, 760px, 1366px and 1920px widths; no horizontal page overflow may be introduced.

## Platform Differences

- Web/Vue only.
- Touch targets, safe areas and uni-app adaptations are not applicable because mobile/uni-app is outside the approved task scope.

## Unresolved Conflicts

None. The approved UX behavior can be represented by the existing visual system without new components or tokens.

