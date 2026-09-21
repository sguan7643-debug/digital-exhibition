# UI Visual Handoff — Feishu entry authentication and first-screen request performance repair

## 1. Scope and source evidence

This visual handoff expresses, without changing, the approved flow and state contract in [PRD](../PRD.md) and [UX handoff](ux-handoff.md) for `DEH-ENTRY-PERF-20260916`.

It is grounded in these existing implementation references:

- [Task brief](../task-brief.md) and [decision log](../decision-log.md): the approved 8-second upstream deadline, 10-second server read budget, 12-second browser outcome, safe diagnostic allowlist, and Web-only delivery boundary.
- [Existing theme](../../../../src/style.css): the established navy, white-surface, thin-divider visual language; named `--xlt-*` tokens; existing state-surface, focus, forced-colors, and reduced-motion treatments.
- [Existing application shell](../../../../src/App.vue): the current request-status surface and live-status conventions.
- [Existing workbench](../../../../src/pages/WorkbenchPage.vue): the current hero, white panels, section headings, search state, and `hot-empty` region pattern.

This is a Web-only task (`platforms=["web"]`). No uni-app framework or mobile target is declared. Responsive browser reflow is specified below; it is not a mobile-app design or a commitment to native safe-area behavior.

## 2. Visual direction and hierarchy

Keep the current restrained enterprise exhibition language: a pale neutral canvas, white bounded information panels, navy action emphasis, and low-elevation dividers. The repair must make request state visible **at the scope that owns it**:

1. **Entry state** is the only full-viewport state. It precedes application content because the identity decision is unresolved.
2. **Workbench first-screen state** stays within its dependent panel or region. The shell and already available panels remain visible and usable.
3. **Search/filter state** stays inside the application-search result region; existing results remain readable while a replacement request is pending.
4. **Permission and bounded-error state** use an explicit heading, plain-language explanation, and scoped action. Color, spinner, elapsed time, or trace ID never carry the meaning alone.

Do not introduce imagery for these operational states. A simple inline status glyph may be used only as supporting decoration (`aria-hidden="true"`); the text and control remain the primary cue.

## 3. Existing visual tokens to use

No new design tokens are introduced. Implementation uses the following existing values from `src/style.css`.

| Role | Existing token/value | Use in this task |
| --- | --- | --- |
| Application canvas | `--xlt-canvas: #f5f7fa` | Entry backdrop and non-panel page ground. |
| Surface | `--xlt-surface: #fff` | Entry card and region state card. |
| Primary action / link | `--xlt-navy-900`, `--xlt-link: #0060a6` | Retry action, active progress accent, and actionable links. White text on this color has about 6.5:1 contrast. |
| Heading | `--xlt-ink: #102a4c` | State title and panel heading; about 14:1 on white. |
| Body content | `--xlt-text: #3e5571` | Required status explanation and diagnostic labels; about 7.6:1 on white. |
| Supporting nonessential metadata | `--xlt-muted: #6b7d91` | Timestamp/elapsed-time supplement only; do not use as the sole essential message at small text. |
| Boundaries | `--xlt-line: #d9e2ec`, `--xlt-divider: #e7edf3` | State-card border and section separation. |
| Error | `--form-control-error: #c62828` | Error icon/accent and error heading; never without the written explanation. |
| Focus | `--form-control-focus: #1f6fca`, `--form-control-ring: rgba(0,96,166,.16)` | Keyboard-visible focus ring. |
| Disabled | `--form-control-disabled-bg: #f2f4f7`, `--form-control-disabled-text: #929dab` | Disabled retry appearance, paired with an explanatory status. |
| Radius/elevation | `--xlt-radius: 7px`, `--xlt-shadow: 0 1px 3px rgba(13,45,80,.05)` | State card follows existing panels, not a new modal language. |
| Spacing | `--xlt-space-1..5: 4/8/12/16/20px`; `--xlt-section-gap: 14px` | State card uses 16px internal padding (20px for entry card), 8px text/action gap, and 12–14px region separation. |
| Type scale | `--xlt-font-caption` 13–15px, `--xlt-font-meta` 14–16px, `--xlt-font-body` 15–17px, `--xlt-font-section` 19–22px, `--xlt-font-page-title` 26–32px | Use section title for an entry title; body for the explanation; meta/caption for safe diagnostics. |

Text meets WCAG AA normal-text contrast by using `--xlt-ink`, `--xlt-text`, or white on `--xlt-navy-900`. The existing muted and disabled tokens remain supplementary only. Borders and spinners are non-text indicators and must be paired with textual status.

## 4. Components and variants

### 4.1 Entry decision surface

Use one centered `entry-state-surface` only before a session decision completes or when it cannot be completed. It occupies the viewport over `--xlt-canvas`, has a white card with `--xlt-radius`, `--xlt-line`, and the existing quiet shadow. Width is `min(480px, calc(100vw - 48px))`; padding is 20px desktop and 16px at narrow Web widths.

- **Checking:** 24–32px progress indicator, title “正在检查飞书登录状态”, one short explanatory line. No button and no workbench shell/data beneath it.
- **OAuth redirecting:** same layout and no action; title “正在跳转飞书授权”. This is transitional browser navigation, not an invitation to retry.
- **Unavailable:** title “暂时无法确认登录状态”, body “请检查网络后重试。登录状态确认前不会加载业务数据。”, then one primary `Retry sign-in check` button. Safe diagnostics, if supplied, are a caption row below the action.

The initial entry surface has no automatic focus transfer. On a user-triggered retry failure, move focus to the updated entry title/status only if the user would otherwise not perceive the changed error; otherwise leave focus on the Retry control as defined by the UX handoff.

### 4.2 Section state card

Use the existing white panel vocabulary (`.panel` / `.inline-state` / `.state-surface`) inside the workbench region that owns the operation. Do not replace the entire workbench with a modal or page mask.

- Preserve the section heading, location, and surrounding panel dimensions where possible.
- Place the state block after the existing heading in normal reading order.
- Minimum block height: 112px for compact panel regions and 160px where a result grid normally occupies the region; horizontally center the status content without hiding the heading.
- Content order: state title, one-sentence explanation, optional safe diagnostic row, then action.
- Retry is a primary navy button, at least the existing 36px control height, with `aria-busy`/native `disabled` while it owns a request. It must not resemble a page reload.
- A secondary text link is allowed only where an already-existing navigation destination exists; do not create a new support route for permissions.

### 4.3 Progress indicator and status line

Reuse the existing circular indicator’s navy top stroke and pale blue track, but use it **inline** for authenticated region loading (20–24px) rather than the current full-screen request overlay. Pair it with a text status such as “正在加载热门应用推荐”.

For concurrent first-screen operations, the shell may display one compact, non-blocking summary (“正在加载 3 项内容”) in a status area; it cannot cover navigation, intercept pointer/keyboard input, or steal focus. Each region still owns its terminal result.

### 4.4 Diagnostics and permission notice

Safe diagnostic content is visually subordinate: `--xlt-font-caption`, `--xlt-text`, wrapping allowed, and `word-break: break-word` for a trace identifier. It contains only the UX-approved operation ID, category, trace ID, elapsed time, and retry count. Never render token/cookie/credential, raw upstream body, identity value, or Feishu record content.

Permission uses the same section card, an explicit title “你暂无权限查看此内容”, and explanatory body. It is visually differentiated with a thin `--xlt-navy-900` left accent or supporting locked icon, not by an invented warning palette. It has no automatic retry and must never look like the unauthenticated entry state.

## 5. Required visual states

| State | Visual treatment | Controls and state ownership |
| --- | --- | --- |
| `normal` | Existing workbench hero/panel/content presentation. Remove only the temporary state block; do not flash a success modal. | Existing controls are enabled according to their current rules. A completed retry may make one concise live-status announcement. |
| `loading` | Entry uses §4.1; authenticated workbench regions use §4.3 inline progress plus a stable white section card. Keep available content at normal contrast. | Only the specific load/retry control is disabled. Search retains old results while its next result set is loading. |
| `empty` | White section card/empty area with existing heading retained, a neutral “暂无相关内容” message in `--xlt-text`, and no error accent or spinner. | No automatic retry. Related existing navigation remains available. |
| `error` | Entry fault uses the centered unavailable surface. Region timeout/transient/cancellation uses a localized white state card, `--form-control-error` accent/icon, explicit temporary-unavailable title, safe diagnostic row, and primary “重试”. | Retry re-requests only this region’s failed operation(s); never block successful regions or invoke a global page reload. |
| `disabled` | Disabled control uses existing disabled background/text, `cursor: not-allowed`, and an adjacent status such as “请求进行中，暂不可重复操作”. | Native `disabled` is required. The reason remains readable in `--xlt-text`; do not rely on low-contrast disabled text alone. |
| `permission-denied` | Localized white state card with navy left accent/supporting lock glyph, title and explanation that distinguish permission from sign-in. No red error treatment unless a separate operational error exists. | No automatic retry. Use an existing access/support action only when implementation proves one exists; otherwise show no fabricated destination. |

## 6. Responsive Web, focus, and motion

### Responsive Web behavior

Use the current Web breakpoints evidenced in `src/style.css` and `WorkbenchPage.vue`:

- **>1420px:** retain two-column workbench panel composition; localized states fill their owning panel.
- **761–1420px:** workbench panels may stack to one column according to the existing `1420px` rule; entry card remains centered and capped at 480px.
- **≤760px:** existing responsive Web rules reflow content to single/two-card grids. The state card is full available panel width, padding reduces to 16px, diagnostics wrap, and the primary retry stays on its own line if needed.
- **320px minimum viewport:** preserve the existing `html/body` minimum. Never cause horizontal scroll through trace IDs or fixed-width state content.

This is responsive Web only. There is no declared uni-app adaptation, device-width commitment, native touch target, or mobile safe-area treatment. On touch-capable browsers, retain the existing Web control minimum of 36px; do not state that this is a separate native target. Browser CSS safe-area insets are not introduced for this task.

### Hover, focus, keyboard, and forced colors

- Primary retry hover follows existing `--xlt-navy-950`; its resting navy state remains visible without hover.
- Every retry and existing keyboard-operable action shows the existing 2px focus ring (`--form-control-focus`/`--form-control-ring`); in `forced-colors: active`, retain the existing `3px Highlight` outline.
- Do not autofocus routine loading or move focus when background request state changes. Respect the UX handoff’s focus rule for retry failures and preserve logical tab order: explanation → diagnostics → Retry.
- Status text uses the existing live-region contract. Visual changes are not the only notification.

### Motion

The only motion is the existing 0.72s linear progress rotation. It is decorative and paired with text. Under `prefers-reduced-motion: reduce`, stop the rotation exactly as existing CSS does; no fade/slide transition is required for state changes. Hover/focus color transitions remain short (existing 0.14–0.15s) and do not delay interaction.

## 7. Implementation conflict and open items

1. **Current global overlay conflicts with the approved regional loading behavior.** `App.vue` currently renders `.global-request-loading` for every tracked request, makes it full viewport, intercepts interactions, and programmatically focuses it. The approved PRD/UX contract requires a full-viewport surface only before session resolution and local state for authenticated first-screen reads. Engineering must scope or replace that overlay without changing the approved flow.
2. **Region mapping remains implementation evidence.** UX requires `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002` failures to appear in their owning workbench regions. The current visual handoff does not invent a new panel mapping; Web engineering must document the concrete mapping before implementation verification.
3. **Permission support destination is not supplied.** Keep the permission visual/action local unless existing application evidence proves an access-support route. No new route or escalation content is designed here.
4. No source conflict exists between the scope-approved PRD and UX handoff. This visual handoff does not approve design, change task state, or authorize engineering.
