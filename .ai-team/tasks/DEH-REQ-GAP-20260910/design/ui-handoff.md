# 数智产品展厅需求差距补齐 — UI 视觉交接

Author: 005 UI Visual Designer  
Target path: `C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\.ai-team\tasks\DEH-REQ-GAP-20260910\design\ui-handoff.md`  
Provenance: temporary draft; Team Lead may only byte-for-byte transfer this file to the target path.  
Status: Authored during `design`; the controlled task is now `state=design_review`. Scope approved; Design / Release not approved. This draft grants neither implementation nor deployment/release authority.

## 1. Sources, scope, and visual boundary

- Authority: `prd.md` (R01–R46) and `design/ux-handoff.md` in the controlled task packet. UX is authoritative for flow, roles, data modes, state recovery, writing gates and accessibility.
- Existing visual evidence: `src/style.css` (`:root`, unified exhibition tokens and form focus/disabled rules); `src/components/ExhibitionShell.vue` (63px topbar, fixed 220px desktop sidebar); `src/components/PageStateBoundary.vue` (retained page, disabled notice, inline state, state surface); `src/components/PaginationControl.vue` (default pageSize=10); existing pages/components in `src/pages/` and `src/components/`.
- Platform: Web/Vue only. `mobile`, `uni-app`, H5/App and mini-program are **not declared**.
- This is not a redesign. Retain logo, shell, navigation, existing page layouts, local image/icon language and information hierarchy. Real-mode data must replace only the existing data-bearing region; it must not add routes, brand colors, card families, dialogs, banners or visualized outcomes not supported by UX.

## 2. Existing visual system (reuse only)

| Concern | Existing CSS evidence / implementation use |
|---|---|
| Shell | `ExhibitionShell.vue`: `topbar` 63px `#0060a6`; `page-frame` grid `220px minmax(0,1fr)`; white sidebar with `#d9e2ec` divider; canvas `#f5f7fa`. Preserve at every existing route. |
| Surface and hierarchy | `style.css`: `--xlt-surface:#fff`, `--xlt-canvas:#f5f7fa`, `--xlt-line:#d9e2ec`, `--xlt-divider:#e7edf3`, `--xlt-radius:7px`, low shadow `0 1px 3px rgba(13,45,80,.05)`. Existing page title → filters → results/card/table → pagination/detail order remains. |
| Type | `style.css`: font stack `Microsoft YaHei`, `PingFang SC`, Arial; `--xlt-ink:#102a4c`, `--xlt-text:#3e5571`, `--xlt-muted:#6b7d91`. Reuse each existing component’s size/line-height; no global rescaling for remote data. |
| Form/action | `style.css`: control min-height 36px, radius 4px; `--form-control-border:#ccd8e5`, hover `#8da9c4`, focus `#1f6fca`, ring `rgba(0,96,166,.16)`, disabled bg `#f2f4f7`, disabled text `#929dab`. Primary action uses existing `#0060a6`; do not introduce a new success color. |
| Lists/paging | `PaginationControl.vue`: default `[10,20,50]`, default `10`; control height 31px/radius4px, current page `#0060a6`, disabled `#f2f4f7/#8b98a8`. List/table density and pagination placement remain route-native. |
| Icons/media | Continue existing local `AppIcon`, `TypeLineIcon`, local SVG/bitmap assets and text labels. Do not use emoji, iconfont substitutions, screenshots as backgrounds, or new third-party illustration. |

Text on normal surfaces must remain at least WCAG 2.x `4.5:1`; focus, borders that convey state, selected state and non-text controls at least `3:1`. Existing state colors cannot be the sole status channel: add the UX-required text, accessible name or state message. When a legacy pixel/token cannot meet the threshold, reuse the existing accessible control/focus token above rather than inventing a new palette.

## 3. Visual mapping for real-data modes and required states

All states preserve the UX contract; this table defines only their surface.

| State / mode | Existing visual carrier | Required visual treatment |
|---|---|---|
| `normal` / `real` | Existing cards, table rows, detail panels and metrics. | Render authorized page-model values in normal hierarchy. Freshness/completeness goes only in existing metadata/status space; no raw source IDs, tokens, URLs or backend payloads. |
| `mock` | Existing deterministic page content. | Preserve existing fixture surface but never label it current/real data. A local refresh restores the fixture; no distinct “success” treatment. |
| `loading` | `PageStateBoundary` retained page / existing result region. | With same-authorized stable data, retain it and mark result region busy; use existing inline loading surface and disable only duplicate initiating control. With no stable data, use existing skeleton/loading region without changing table/card geometry. |
| `empty` | Existing list/grid/table result region. | Preserve title, filter/reset/return and pagination shell; use existing empty copy/location. Never substitute empty for denied, schema-drift, cursor failure, partial failure or stale protected cache. |
| `error` / schema-blocked | Existing `inline-state` or `state-surface`. | Minimal readable category plus opaque trace reference in metadata scale; no raw response. Retain stable values only under the same still-authorized scope. Use an inline focus move **or** one alert, never forced focus + toast + alert. |
| `disabled` | Existing action/button/menu location and `.disabled-notice` when route-wide. | Keep control discoverable; apply existing disabled background/text and concise cause. No spinner pretending request progress, local mutation, optimistic count/status or success prompt. |
| `permission-denied` | Existing `state-surface` permission shell. | Remove rows, details, drawers and cache before paint; show only safe return/recheck. No masked record, blurred prior value or automatic 403 retry. |
| `timeout` / `429` | Existing inline state + initiating read control. | Keep only authorized stable data and label stale; otherwise error surface. Disable repeated read trigger; show retry timing only if UX/contract provides it. Never auto-retry writes. |
| `partial-data` / `data-stale` | Existing related card/detail/table subsection + metadata. | Keep successful section, mark unavailable/incomplete/stale subsection with text and existing weak surface. KPI/chart total must not look complete/current. Read-safe regional retry stays in existing action location. |

## 4. Buttons, forms, detail density, feedback and controlled writes

- Buttons retain the existing 36px visual height / 4px radius. For async work, preserve label footprint; place the existing spinner/“处理中” within it, set `aria-busy`, and disable duplicate intent only. Navigation, Back and UX-permitted cancel remain available.
- Existing success/failure feedback location is used once only: success must follow verified response, not click; failure retains current draft/selection where UX permits. `PageStateBoundary` inline feedback may not obscure filters, table actions, drawers or pagination.
- Keep existing form fields at min-height 36px, 14px body text where component uses it, 8–14px local group spacing and existing white-surface/line styling. Inline field error uses the existing `--form-control-error:#c62828` border/ring and associated text; do not add a standalone form page or a new confirmation dialog.
- Detail pages/drawers preserve existing white surface, `7px` radius, thin line and source order. Loading keeps the detail container dimensions; permission revocation closes protected drawer and returns focus to safe heading/launcher.
- All writes remain disabled until UX/PRD evidence gates close. For a future approved write, reuse an already evidenced confirmation surface only: pending disables duplicate submit; 409 preserves draft and states data changed; partial success renders per-item results with no overall-success claim; cancel/timeout/revoke/rollback clears pending presentation and claims no write/rollback completion.

## 5. Web responsive, focus and density rules

- Desktop baseline keeps `220px` sidebar and 63px topbar. At widths below the existing component breakpoints, preserve `ExhibitionShell.vue`’s current navigation behavior; do not introduce a new responsive composition in this task.
- Lists/tables retain source columns, caption/header/sort state and operation column. At constrained width or browser/text-only 200%, use existing horizontal scroll wrappers (`.table-scroll`, `.horizontal-scroll-region`, talent/progress wrappers) rather than truncating rows, hiding fields, shrinking text or converting tables into mobile cards.
- Existing page content padding is `18px 20px 24px` (`style.css`). Keep filter rows, result regions and pagination in normal reading order; result/header/action focus must scroll into view and not land behind fixed shell elements.
- Keyboard order: skip link → header → left navigation → h1/filters → result/card/table → pagination → existing drawer/footer. Enter submits search/activates primary action; Space activates button/selection; Escape closes only current existing drawer/dialog and restores launcher focus. No positive `tabindex`.
- `:focus-visible` uses current form border/ring and current button/link outline; preserve at least 2px visual ring and 2px offset where the component applies offset. Focus cannot be removed by `loading`, `partial-data`, `data-stale` or disabled notices. Honor `prefers-reduced-motion`: no state-motion dependency.

## 6. Visual acceptance and unresolved evidence

- Verify every affected existing route at normal, loading, empty, error, disabled and permission-denied; include timeout/429/partial/stale wherever the UX declares it. No test may claim remote completion while fixture fallback remains presented as real.
- Verify forms, existing drawers, tables, pager default 10, 200% browser/text zoom, keyboard focus return, text/non-text contrast and no visual leakage of credentials, table/field IDs, raw errors, sensitive values or full attachment URLs.
- No visual conflict is identified: the UX requires retained shell/navigation and existing state carriers, which match the implemented CSS evidence. External dependency gaps (formal proxy, field inventory, write gates, OAuth/role contracts) remain non-visual blockers; their pages stay mock/disabled/blocked as UX specifies.

End of temporary UI handoff. No Design/Release approval, code change, task-state change, commit, deployment or release is implied.
