# UI Handoff

Sources: approved `prd.md` and `design/ux-handoff.md`.

## Visual direction

No visual changes. Preserve the current production Vue Web design system, hierarchy, typography, colors, spacing, icons, imagery, elevation, motion, breakpoints and component variants exactly as implemented. No Figma or new asset is required.

## State treatment

- normal: existing cards, lists, fields and detail layout.
- loading: existing loading bubble/skeleton; no new text, badge or toast.
- empty: existing empty component only after a complete successful response.
- error: existing error surface; do not replace with empty or placeholder data.
- disabled: existing disabled control styling.
- permission-denied: existing login/access-denied surface.

## Responsive and accessibility preservation

- Preserve existing desktop/tablet/mobile Web breakpoints, density, resize behavior, hover and keyboard-visible focus.
- Preserve current text/non-text contrast, type scaling and spacing tokens; this backend-only task introduces no token value.
- Preserve existing pointer and keyboard targets and focus order. No uni-app target, safe-area rule or native adaptation applies.

## Evidence and conflicts

- Evidence: task scope explicitly forbids frontend source and dist changes.
- UX/UI conflict: none. Backend response timing and completeness change without altering visual behavior.
