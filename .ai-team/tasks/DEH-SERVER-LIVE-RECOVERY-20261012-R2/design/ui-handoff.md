# UI Handoff

## Sources and visual boundary

- Product source: `../prd.md`.
- UX source: `ux-handoff.md`.
- Visual baseline: the currently deployed Web/Vue design system and components.
- No visual change, frontend source change, or frontend build is authorized.

## Visual system

Preserve the existing typography, color palette, spacing, cards, forms, tables, buttons, icons, focus styles, breakpoints, and loading treatment. No new token, component variant, illustration, placeholder, or content pattern is required.

## Existing component state mapping

- **Success:** Existing page components render formal application, dictionary, department, person, profile, upload, and submission results.
- **Loading:** Existing loading indicators remain visible only while the initial request or its single task is active, then disappear automatically.
- **Empty:** Existing empty components are allowed only for a confirmed authorized empty source.
- **Error:** Existing error presentation receives a stable terminal backend error instead of an endless spinner or a successful empty payload.
- **Disabled:** Existing controls keep their current permission and validation appearance.
- **Permission denied:** Existing 401/403 visual behavior remains unchanged.

## Prohibited presentation inputs

The backend must not supply content that causes the UI to display user IDs, department IDs, `TEST_` dictionary entries, initialization identities, controlled proxy data, partial homepage success, or “正式飞书数据正在首次同步” as a normal business result.

## Accessibility and platform behavior

The existing contrast, keyboard-visible focus, semantic labels, zoom behavior, and responsive layout are unchanged. Web is the only declared platform; mobile and uni-app design rules do not apply.
