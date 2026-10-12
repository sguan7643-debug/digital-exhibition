# UI Visual Handoff

Owner: UI Visual Designer

## Sources and Evidence

- Approved PRD: `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/prd.md`
- UX source: `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/design/ux-handoff.md`
- Design system: existing exhibition tokens in `src/style.css`, especially `--xlt-navy-900`, `--xlt-ink`, `--xlt-text`, `--xlt-muted`, `--xlt-canvas`, `--xlt-surface`, `--xlt-line`, `--xlt-radius` and `--xlt-shadow`.
- Existing visual precedent: the application entry-checking surface already centers status content on a full-height neutral canvas; the new surface keeps that calm enterprise language while adding an explicit spinner.

## Visual Hierarchy and Direction

The screen becomes a quiet, full-viewport wait state. A nearly opaque neutral canvas covers all application chrome so the right-top toast no longer competes with navigation or page content. The centered status cluster is the only visual focal point:

1. 40 px loading ring.
2. Strong primary status line with live request count.
3. Muted automatic-recovery explanation.

No card shadow, close icon, progress percentage or secondary action is shown. The appearance should read as a temporary system state rather than a modal confirmation.

## Tokens

- Overlay background: `rgba(245, 247, 250, .96)`, derived from `--xlt-canvas: #f5f7fa`.
- Primary text: `var(--xlt-ink, #102a4c)`.
- Supporting text: `var(--xlt-muted, #6b7d91)`.
- Spinner active segment: `var(--xlt-navy-900, #0060a6)`.
- Spinner track: `var(--xlt-line, #d9e2ec)`.
- Layer order: `z-index: 3000`, above the existing shell, drawer, account menu and legacy request layer (maximum observed 2000).
- Horizontal safe padding: `max(24px, env(safe-area-inset-left/right))` as applicable.

## Typography and Contrast

- Primary line: existing application font stack; 20 px desktop, 18 px at widths up to 760 px; 650–700 weight; 1.45 line height; centered.
- Supporting line: 14 px; 1.65 line height; centered; maximum text width 360 px.
- Maintain WCAG AA contrast against the overlay background. Count and sentence remain text, not generated solely by CSS.
- At 200% zoom, allow both lines to wrap naturally without clipping.

## Color, Spacing, Icons, Elevation, and Motion

- Status cluster uses `display:grid`, centered in both axes, with 16 px between spinner and primary line and 8 px between text lines.
- Spinner: 40 × 40 px, 4 px circular border, track in `--xlt-line`, active top segment in `--xlt-navy-900`.
- Standard rotation: 0.8 s linear infinite, matching the existing request spinner cadence.
- Reduced motion: no rotation; retain the two-tone static ring so loading remains visually identifiable.
- Do not apply shadow or border to the entire viewport. Do not use blur because it can be expensive and weakens contrast on shared servers/low-power clients.
- In forced-colors mode, spinner uses system `CanvasText` for the active segment and `GrayText` for the track; overlay uses `Canvas`, text uses `CanvasText`.

## Component Appearance and Variants

### Global request overlay

- Position: fixed, `inset: 0`, full dynamic viewport (`min-height: 100dvh` with 100vh fallback).
- Layout: centered grid, overflow hidden, safe-area-aware padding.
- Pointer behavior: overlay itself receives pointer events; no click handler or dismiss cursor.
- Name should describe the new behavior, e.g. `.request-loading-overlay`; the old `.request-loading-toast` selector and copy are removed.

### Count updates

- Count changes update the same primary text node; size, location and layer do not animate.
- Width must not jump noticeably between one- and multi-digit counts; the centered cluster may naturally reflow.

## Web Visual Rules

- **≥ 761 px:** center the cluster in the full viewport, not merely `#main-content`; primary line 20 px.
- **320–760 px:** 20 px inline padding plus safe-area insets; primary line 18 px; supporting text 14 px; spinner remains 40 px.
- **200% zoom / short viewport:** cluster remains within the viewport, uses natural wrapping and can shrink only by text wrapping; no horizontal scrollbar.
- **Orientation change:** no corner anchoring or slide animation; fixed centering recalculates immediately.
- There are no hover, pressed or focus visual variants because the overlay contains no controls.
- If focus remains visible beneath the overlay in a browser without full `inert` support, the opaque background must ensure it is not perceptible or actionable.

## uni-app Platform Adaptations

Not applicable. This task targets responsive Web only. No native safe-area or uni-app implementation artifact is required beyond CSS environment insets for mobile browsers.

## Required States

### normal

No overlay or reserved space. The application occupies its existing layout without a top/right placeholder.

### loading

Full neutral overlay at layer 3000, centered 40 px ring, primary count line and muted supporting line. The old blue toast panel is absent.

### empty

Overlay is absent. Existing page empty-state visuals are unchanged.

### error

Overlay is absent after the final request settles. Existing error surfaces remain unchanged; no error color is added to the global loading layer.

### disabled

Underlying disabled visuals remain unchanged but are covered while loading. The overlay itself has no disabled variant.

### permission-denied

Overlay closes before existing permission/authentication visuals become authoritative. No lock icon or permission copy is added to the loading layer.

## Open Questions and Conflicts

- No unresolved visual conflict remains after scope approval. The right-top toast styling is intentionally retired for global foreground activity.
- Existing page-local loading components remain visually independent and are out of scope; this handoff changes only the application-level request activity surface.
