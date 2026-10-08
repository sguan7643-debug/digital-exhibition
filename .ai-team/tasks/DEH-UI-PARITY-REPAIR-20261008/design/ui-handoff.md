# UI Visual Handoff

Owner: UI Visual Designer

## Sources and Evidence

- Approved PRD: `../prd.md`.
- UX source: `design/ux-handoff.md`.
- Single visual source of truth: `digital-exhibition-SOURCE-20260916-165348.zip`, SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Read-only extraction used for design inspection: `C:/Users/20266/AppData/Local/Temp/codex-reference-ui-20260916-165348-20261008`.
- Pinned reference files:
  - `src/style.css`: `8EDF30BD6D22DA2160D5B4BDD5615192786E4595EBE59F4E298A9196756FB7C3`.
  - `src/h5.css`: `4B13BD9326808BF5D623D5ECAB8FCB6E8284CCEACA294798E283CF8D459B5398`.
  - `src/components/ExhibitionShell.vue`: `14FB6EDCDCEA4D0350820172A9F71232F5FC02138113CF87CB8BD5C67A9501BD`.
- Defect screenshots and code evidence are listed in `../task-brief.md`; they establish the incorrect detail composition, raw personnel-code display and global update-time row.
- No Figma artifact is required. The supplied Vue/CSS source is the approved design-system evidence.

## Visual Hierarchy and Direction

- Reproduce the source package; do not create a reinterpretation. The hierarchy is enterprise-blue shell → white sidebar → light-gray canvas → white bordered information surfaces → blue primary actions.
- Route content begins directly at its reference inset. A global timestamp row, empty spacer or reserved top band must not appear between shell and page content.
- Real content occupies the same visual regions as fixture content. Dynamic text may differ, but labels, surfaces, grid tracks, action positions and density remain direct parity targets.
- User-facing person slots show a resolved Chinese display name. A technical identifier must never occupy the visual role of a person name; unresolved slots use the same muted `—` treatment as other absent metadata.
- The non-modal foreground request-processing bubble remains visible and floats above content. It must not push page layout or be replaced by first-sync/data-missing bubbles.

## Tokens

These values are taken from the final reference CSS cascade and must remain traceable to the pinned files.

### Color and surface

| Token | Value | Use |
| --- | --- | --- |
| `--xlt-navy-950` | `#052b57` | deep hover/emphasis |
| `--xlt-navy-900` | `#0060a6` | brand and primary action |
| `--xlt-navy-800` | `#0060a6` | active data emphasis |
| `--xlt-link` | `#0060a6` | links and text actions |
| `--xlt-ink` | `#102a4c` | headings/high emphasis |
| `--xlt-text` | `#3e5571` | body text |
| `--xlt-muted` | `#6b7d91` | metadata/neutral `—` |
| `--xlt-canvas` | `#f5f7fa` | route canvas |
| `--xlt-surface` | `#ffffff` | cards/panels/forms |
| `--xlt-line` | `#d9e2ec` | surface borders |
| `--xlt-divider` | `#e7edf3` | internal separators |
| `--xlt-soft` | `#eaf1f8` | selected and icon surfaces |

### Form, shape and elevation

| Token | Value |
| --- | --- |
| `--form-control-border` | `#ccd8e5` |
| `--form-control-hover` | `#8da9c4` |
| `--form-control-focus` | `#1f6fca` |
| `--form-control-ring` | `rgba(0, 96, 166, .16)` |
| disabled background / text | `#f2f4f7` / `#929dab` |
| error | `#c62828` |
| `--xlt-radius` | `7px` |
| `--xlt-shadow` | `0 1px 3px rgba(13, 45, 80, .05)` |

- Controls use a 4px radius unless the corresponding reference selector specifies another value.
- Spacing follows the reference 4/8/12/16/20px rhythm. Standard route inset is 18px 20px 24px; H5 gutter is 12px.
- Do not add gradients, glass effects, heavy shadows, decorative colors or a second card vocabulary.

## Typography and Contrast

- Font stack: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`.
- Final reference typography tokens use fluid values: caption `clamp(13px, calc(12px + .125vw), 15px)`, metadata/control `clamp(14px, calc(13px + .125vw), 16px)`, body `clamp(15px, calc(14px + .125vw), 17px)`, card title `clamp(17px, calc(16px + .125vw), 20px)`, section `clamp(19px, calc(18px + .125vw), 22px)`, page title `clamp(26px, calc(23.5px + .28vw), 32px)`.
- Main line height is 1.6 in the final cascade; route-specific selectors remain authoritative where they intentionally differ.
- White text is limited to primary/active blue surfaces. `#102a4c` and `#3e5571` are used on white/light-gray surfaces; `#6b7d91` is secondary only.
- Visible `:focus-visible` remains at least the reference 3px amber outline (`#ffb648` or route-specific `#ff9f1a`) with 2–3px offset. Form fields use the blue border/ring combination.
- Text and non-text contrast must meet the existing accessible reference result; token lightening is not permitted to imitate screenshots captured with different display calibration.

## Color, Spacing, Icons, Elevation, and Motion

- Top bar uses reference blue, white identity/navigation text and the 3px white active underline.
- Sidebar active items use blue text, pale-blue surface and the reference inset indicator.
- Panels and cards use white, one-pixel `--xlt-line`, 7px radius and the subtle shadow.
- Muted tags use `#2d627d` on `#edf5f8` with a 3–4px radius.
- Application icon tiles use the reference dimensions and muted treatment; dynamic icons remain data-driven.
- Person icons remain decorative companions. Their adjacent text is the resolved name or muted `—`; identifiers are not placed in tooltips, titles or secondary chips.
- Hover/focus transitions stay within `.14–.16s`; shell/drawer transition may use `.22s`. Reduced-motion removes nonessential transitions.
- The request-processing bubble remains `position: fixed`; it must not contribute to route height. No style for `.data-update-time` or an equivalent placeholder is retained.

## Component Appearance and Variants

### Global shell and top origin

- Match the pinned `ExhibitionShell.vue` dimensions, navigation alignment, sidebar widths and responsive transitions.
- Route content begins with the page wrapper's own padding. Remove the global update-time element and its margin; do not replace it with an empty node, minimum height, pseudo-element or hidden-but-sized container.
- Authentication banners render only when their actual state is active and do not preserve inactive space.

### Application catalogue and personnel metadata

- Preserve the reference page heading, type summary, filter surface, result toolbar, card/list controls and card grid.
- Card metadata uses the reference icon/text alignment and clamp behavior. Name slots receive `ownerName`/`developerName`-equivalent resolved values only.
- Unresolved personnel render `—` in `--xlt-muted`; the slot remains in the expected grid so card geometry is stable.
- Tests must reject values matching known internal identifier sources when rendered inside `[data-person-name]`, person metadata cells or their accessible names.

### Nine detail families

Each family receives its own reference page structure, not a generic sparse wrapper:

| Region | Mandatory presentation |
| --- | --- |
| Breadcrumb | reference height/order and route-family labels |
| Hero | icon tile, title, type/domain tags, summary and action group |
| Facts | seven-column reference strip on desktop where defined; responsive reflow without removing facts |
| Primary content | family-specific info grid and feature/process/metric content in reference order |
| Media/files | preview, file, video and download regions only where the family defines them |
| Related content | training and related-application cards in the reference grid |
| Bottom action/comment | reference sticky or flowing treatment for that family; current permission semantics retained |

- Tool, Haineng Work, report, dashboard, dataset, metric, AI, EAD and RPA are independently compared. A correct shell or one correct detail route cannot satisfy another family.

### Lists, tables, filters and editors

- Filters use white bordered surfaces, reference label placement and 36px desktop controls; H5 controls are at least 44px.
- Tables use pale headers, subtle dividers and bounded internal horizontal scrolling. Tables may not expand the whole document.
- Primary action is white on `#0060a6`; secondary/reset is blue on white with the reference border.
- Editor/upload/approval components preserve their current data and validation while adopting the exact reference surface, spacing, heading and footer-action structure.
- Drawers preserve reference width/elevation and remain visually separate from list content.

### Additive pages

- `/materials` and `/apps/onboarding/apply` use the same tokens, page inset, panels, form controls and six-state styling.
- Materials begins directly with its page header; after update-time removal there is no residual top row. Its own record-level “更新时间” fields remain business content unless separately changed by scope.

## Web Visual Rules

### Direct comparison and evidence

- The 30 common routes require individual reference/current captures and a structure inventory; no sampling is accepted.
- Primary comparison uses each route's stored reference viewport. Responsive verification additionally uses 1920×1080, 1672×941, 1000×900, 390×844, 360×800 and 844×390.
- Only dynamic value glyph regions may be masked. Section geometry, top origin, labels, controls, whitespace, cards, tables and action placement remain unmasked.
- Required regression assertions include: no visible “数据更新时间”; no sized `.data-update-time` equivalent; route wrapper top coordinate matches reference tolerance; no raw person identifier in visible/accessibility text; each detail family contains its required regions.

### Breakpoints and resizing

- `>1280px`: full desktop shell and reference density.
- `1001–1280px`: compact desktop navigation and route-specific wrapping.
- `761–1000px`: reduced shell density; detail hero becomes two tracks where reference CSS specifies.
- `<=760px`: mobile drawer, 12px content gutter, safe-area-aware shell, one-column content and 44px minimum controls.
- `<=430px` and `<=380px`: exact narrow-phone overrides from pinned `h5.css`.
- `844×390`: landscape H5 keeps all actions reachable; only bounded data regions scroll horizontally.
- Source cascade order is part of the design. The final computed result, not an isolated early declaration, is authoritative.

## uni-app Platform Adaptations

Not declared. There is no native/uni-app visual deliverable. Safe-area handling applies only to responsive Web CSS.

## Required States

| State | Visual treatment |
| --- | --- |
| `normal` | White reference surfaces on `#f5f7fa`, resolved person names, no update-time row, enabled reference actions. |
| `loading` | Existing content remains where cache permits; foreground processing uses the fixed loading bubble and spinner. No first-sync/data-missing bubble or timestamp placeholder is introduced. |
| `empty` | Reference bounded empty region with heading/explanation/recovery; structural page frame remains present. |
| `error` | `#c62828` error text/boundary and reference recovery action; error does not masquerade as normal person metadata. |
| `disabled` | `#f2f4f7` background, `#929dab` text, unchanged geometry and clear disabled semantics. |
| `permission-denied` | Reference canvas with centered dark heading, muted explanation and blue recovery action; restricted content is absent. |

## Open Questions and Conflicts

No blocking visual conflict. The UX source and approved PRD agree that the visible update-time row is removed while internal freshness remains, the request-processing loading bubble stays, and personnel identifiers are never used as display names. The reference CSS and route sources are available and pinned for implementation.
