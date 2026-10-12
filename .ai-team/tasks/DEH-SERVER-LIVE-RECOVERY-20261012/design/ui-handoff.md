# UI Handoff

## Sources

- Approved PRD: `../prd.md`
- UX source: `ux-handoff.md`
- Existing Web visual system and components

## Visual direction

No visual change is authorized. Preserve existing typography, colors, spacing, cards, forms, responsive breakpoints, hover/focus styles, and loading treatment.

## State presentation

- Normal: existing components display formal data.
- Loading: existing loading bubble remains until automatic completion.
- Empty: existing empty treatment is used only for a legitimate formal empty result.
- Error: existing error treatment receives a terminal backend error instead of indefinite loading.
- Disabled and permission-denied: existing visual and interaction rules remain unchanged.

Contrast, keyboard-visible focus, text scaling, and responsive behavior are inherited without source or dist changes. Web is the only declared platform; uni-app rules are not applicable.
