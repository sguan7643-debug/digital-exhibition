# UI Visual Handoff

Owner: UI Visual Designer

## Sources and Evidence

- Approved PRD: `../prd.md`.
- UX source: `design/ux-handoff.md`.
- Visual source of truth: `digital-exhibition-SOURCE-20260916-165348.zip`, SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Extracted source: `C:/Users/20266/Documents/Codex/runs/digital-exhibition-SOURCE-20260916-165348`.
- Traceable implementation references:
  - `src/style.css`, SHA-256 `8EDF30BD6D22DA2160D5B4BDD5615192786E4595EBE59F4E298A9196756FB7C3`.
  - `src/h5.css`, SHA-256 `4B13BD9326808BF5D623D5ECAB8FCB6E8284CCEACA294798E283CF8D459B5398`.
  - `src/components/ExhibitionShell.vue`, SHA-256 `14FB6EDCDCEA4D0350820172A9F71232F5FC02138113CF87CB8BD5C67A9501BD`.
  - `src/fixtures/pages.js`: 30 calibrated routes plus `/materials` and `/apps/onboarding/apply`, including reference viewport dimensions and state coverage.
- No Figma write is required; the supplied Vue/CSS source is the design-system evidence.

## Visual Hierarchy and Direction

- The visual direction is restrained enterprise blue, information-first and low-decoration. It must match the supplied source rather than reinterpret it.
- Global hierarchy is: blue top bar → white navigation/sidebar → light-gray canvas → white bordered content surfaces → blue primary actions.
- Page titles and section headings use dark navy; descriptive and metadata text use blue-gray; white is reserved for surfaces and text on primary controls.
- Multi-color decorative KPI imagery is hidden where the reference hides it. Icons are line-oriented or visually muted unless the reference component explicitly uses a colored asset.
- Dynamic data may change text length and count, but it must occupy the same hierarchy, spacing and component frame as the reference.
- Every common route/state is a direct parity target. There is no alternate visual direction for current live-data pages.

## Tokens

These values come directly from the reference source and are implementation requirements.

### Core color tokens

| Token | Value | Use |
| --- | --- | --- |
| `--xlt-navy-950` | `#052b57` | deep hover/emphasis |
| `--xlt-navy-900` | `#0060a6` | primary brand/action |
| `--xlt-navy-800` | `#0060a6` | active and chart emphasis |
| `--xlt-link` | `#0060a6` | text links |
| `--xlt-ink` | `#102a4c` | headings and high-emphasis text |
| `--xlt-text` | `#3e5571` | body text |
| `--xlt-muted` | `#6b7d91` | secondary metadata |
| `--xlt-canvas` | `#f5f7fa` | page background |
| `--xlt-surface` | `#ffffff` | cards, forms and panels |
| `--xlt-line` | `#d9e2ec` | component border |
| `--xlt-divider` | `#e7edf3` | internal separators |
| `--xlt-soft` | `#eaf1f8` | selected/muted blue surface |

### Form tokens

| Token | Value |
| --- | --- |
| `--form-control-border` | `#ccd8e5` |
| `--form-control-hover` | `#8da9c4` |
| `--form-control-focus` | `#1f6fca` |
| `--form-control-ring` | `rgba(0, 96, 166, .16)` |
| Disabled background | `#f2f4f7` |
| Disabled text | `#929dab` |
| Error | `#c62828` |

### Shape and elevation

- Default radius: `7px` (`--xlt-radius`).
- Primary/secondary control radius: `4px` unless the reference component declares another value.
- Icon tile radius: `5px`; account popover radius: `10px`.
- Default surface shadow: `0 1px 3px rgba(13, 45, 80, .05)`.
- Side drawer elevation: `8px 0 28px rgba(2, 35, 70, .2)`.
- Do not add gradients, glass effects, heavy shadows or new decorative colors.

### Spacing

- Base rhythm: `4px`, `8px`, `12px`, `16px`, `20px`.
- Desktop section gap: `12px`; H5 section gap: `14px` where reference typography overrides apply.
- Standard desktop page inset follows the route reference, typically `18–24px`; H5 content gutter is `12px`.
- Filter/form surfaces use reference padding `14px 16px` and gap `14px` unless a route-specific selector says otherwise.

## Typography and Contrast

- Font stack: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`.
- Desktop scale:
  - caption `10px`;
  - metadata/control `11px`;
  - body `12px`;
  - card title `15px`;
  - section heading `16px`;
  - page title `23px`.
- H5 scale:
  - caption `clamp(13px, calc(12px + .125vw), 15px)`;
  - metadata `clamp(14px, calc(13px + .125vw), 16px)`;
  - body `clamp(15px, calc(14px + .125vw), 17px)`;
  - card title `clamp(17px, calc(16px + .125vw), 20px)`;
  - section `clamp(19px, calc(18px + .125vw), 22px)`;
  - page title `clamp(26px, calc(23.5px + .28vw), 32px)`.
- Body line height is `1.55` on desktop and `1.6` on H5 where the reference override applies.
- White text is used on `#0060a6` primary controls and top bar. `#102a4c`/`#3e5571` are used on white or `#f5f7fa`; `#6b7d91` is secondary text only.
- Borders and active outlines provide non-color shape cues. QA must verify text contrast, focus visibility and disabled/error distinction; do not lighten tokens beyond reference values.

## Color, Spacing, Icons, Elevation, and Motion

- Top bar background is `#0060a6`, bottom border `#143f6b`, with white brand and active navigation text.
- Active top navigation has a 3px white underline; active sidebar/category items use blue text and pale-blue background, with the reference left inset indicator where declared.
- Global page canvas is `#f5f7fa`; content surfaces are white with `#d9e2ec` borders.
- Muted tags use text `#2d627d`, background `#edf5f8`, radius `3px`.
- Tables use `#f4f7fa` headers, `#e7edf3` dividers and `#f8fafc` hover rows.
- Application icon tiles are `50px × 50px`, 7px padding, `#f8fafc` background, 1px line border and 5px radius when the reference selector applies.
- Navigation glyphs keep reference dimensions and filtering. Current dynamic application icons remain data-driven but fit the same tile geometry.
- Standard focus is the reference 3px amber outline (`#ffb648`; state surfaces may use `#ff9f1a`) with 2–3px offset. Form controls additionally use the blue focus border/ring token.
- Hover transitions remain short (`.14–.16s`); mobile drawer/sidebar transitions use `.22s`. Under `prefers-reduced-motion: reduce`, transitions are removed.

## Component Appearance and Variants

### Application shell

- Desktop top bar height `63px`; horizontal padding `18px` at full width.
- Desktop brand basis `190px`, font `20px`; seven primary navigation items remain centered.
- User/avatar group remains right-aligned; identity text uses real current-user values.
- Desktop sidebar width `220px`, collapsed width `56px`; white surface with 1px line border.
- Main content is independently scrollable on the `#f5f7fa` canvas; footer remains visually integrated with the canvas.

### Surfaces and cards

- Panels, card grids, list containers, editor sections and detail sections share white surface, 1px line border, 7px radius and subtle shadow.
- Application cards use reference spacing, heading hierarchy, description clamp, metadata and footer button alignment. Current real counts and labels do not change card geometry rules.
- KPI cards are centered, information-first and hide decorative images where the reference does.

### Forms and filters

- Controls use white background, line border and blue focus ring; invalid controls use `#c62828`.
- Filter/form bars are white bordered surfaces, with labels above or aligned according to the reference route.
- Primary action: white text on `#0060a6`; secondary/reset: blue text on white with `#9eb3c8`/`#9fb4c9` border.
- Disabled fields use reference gray background/text and native disabled cursor/semantics.
- Upload, validation, approval and cache-status components retain their current content and behavior but inherit these control/surface tokens.

### Tables, pagination and drawers

- Header rows are pale gray, body rows white, internal dividers subtle, and hover uses `#f8fafc`.
- Current page uses white text on primary blue; non-current controls are white with line borders.
- Wide tables remain horizontally scrollable inside their bounded surface rather than expanding the document.
- Drawers/dialogs use existing semantic and focus behavior with reference surface, border, radius and elevation.

### Detail families

- Product detail pages preserve the reference hero, metric strip, info grid, file table, training/related cards and comment/action hierarchy.
- Current authoritative-detail components must project into those same visual regions; they must not add a second card vocabulary.
- Direct style parity is required for tool, Haineng Work, report, dashboard, dataset, metric, AI, EAD and RPA detail families.

## Web Visual Rules

### Verification viewports

- Use each route’s recorded reference viewport in `src/fixtures/pages.js` for the primary direct comparison.
- Also verify representative desktop `1672×941`, large desktop `1920×1080`, compact desktop `1000×900`, H5 `390×844`, narrow H5 `360×800`, and H5 landscape `844×390`.
- Common-route screenshots compare shell, layout and components. Real dynamic text may differ, but computed style and container geometry must match the reference component.

### Breakpoints and resizing

- `>1280px`: full desktop navigation and reference density.
- `1001–1280px`: compact desktop navigation per `ExhibitionShell.vue`.
- `761–1000px`: reduced navigation glyph/identity density while preserving all destinations.
- `<=760px`: 56px-plus-safe-area top bar, modal navigation drawer, 12px gutter, 44px controls and single-column form/list behavior.
- `<=430px` and `<=380px`: apply the exact narrow-phone rules from reference `h5.css`.
- `761–1100px`: preserve tablet-specific rules declared at the end of reference `h5.css`.
- Source cascade order is part of the visual baseline. When selectors overlap, implementation must preserve the reference computed result rather than copy isolated declarations out of order.

### Hover, focus and keyboard-visible focus

- Hover changes border/background only as specified by the reference; no layout shift.
- `:focus-visible` is always visible and must not be removed by global resets.
- Keyboard focus follows the UX order; drawer/dialog focus rings remain inside visible bounds.
- Touch layouts do not depend on hover to reveal required information or controls.

### Visual parity decision rule

- For the 32 route entries, any visible difference in shell dimensions, component placement, typography, color, spacing, border, radius, elevation, state styling or responsive behavior is a defect unless it is caused solely by approved real-data content or an accessibility-preserving current behavior.
- Implementation may retain current-only DOM wrappers, but their computed presentation must map to the reference visual region.
- Visual QA records route, state, viewport, reference screenshot, actual screenshot and finding. No single homepage screenshot is sufficient.

## uni-app Platform Adaptations

Not declared. The task contains no uni-app target, touch safe-area requirement beyond Web CSS `env(safe-area-inset-*)`, or native component adaptation.

## Required States

| State | Visual treatment |
| --- | --- |
| `normal` | White surfaces on `#f5f7fa`, standard line borders, reference hierarchy and enabled primary/secondary actions. |
| `loading` | Retain current content during silent refresh when available; loading surface uses the same canvas/text tokens, bounded progress indicator and no blocking yellow retry bubble unless the current business state explicitly requires it. |
| `empty` | White bounded empty surface or reference inline state, centered/ordered heading, explanation and primary recovery action; no oversized decorative artwork unless present in reference. |
| `error` | Error text/control boundary uses `#c62828`; page-level error surface preserves reference canvas and blue retry action. Error styling must not resemble success or disabled state. |
| `disabled` | `#f2f4f7` control background, `#929dab` text, reduced emphasis and unchanged geometry; non-form retained content may use the reference `.72` opacity with an explanatory notice. |
| `permission-denied` | Centered state surface on reference canvas, dark heading, muted explanation and blue recovery action; restricted content is not visually exposed as active. |

## Open Questions and Conflicts

- No blocking visual conflict. The reference package and current project share the same 32-route fixture matrix, so every declared route has a direct design family.
- Dynamic identity, data values, approval states, traces and timestamps are intentionally not pixel-identical to fixture text. Their containers and computed styles remain parity targets.
- The implementation must not replace current business components wholesale. Style extraction and selector reconciliation are required to avoid losing live behavior.
