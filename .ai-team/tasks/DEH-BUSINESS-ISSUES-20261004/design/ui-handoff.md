# UI Visual Handoff — 业务问题清单整改

Owner: UI Visual Designer

## Sources and Evidence

- Approved PRD: `../prd.md`.
- Approved-scope UX source: `design/ux-handoff.md`.
- Business screenshots: `../evidence/feishu-issues/01.PNG`–`13.PNG`.
- Sole visual source of truth: `digital-exhibition-SOURCE-20260916-165348.zip`, SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Reference implementation artifacts: `src/style.css`, `src/h5.css`, `src/components/ExhibitionShell.vue`, and the route/state matrix in `src/fixtures/pages.js`.
- Platform: Vue browser Web only; no uni-app adaptation is declared.

The reference archive controls shell dimensions, typography, colors, spacing, borders, radius, elevation, responsive rules and state appearance. This task adds business-state content inside that vocabulary and does not create a new design system.

## Visual Direction and Hierarchy

- Hierarchy remains: primary-blue top bar → white navigation/sidebar → light-gray canvas → white bordered panels/cards → blue primary actions.
- New helper text, availability reasons, stale timestamps and copy-mode notices are secondary content. They must not overpower page titles or primary form fields.
- Error, disabled, stale and permission states are distinguished by text, icon/shape and semantics—not color alone.
- Real dynamic values may differ from the reference fixtures, but component geometry and hierarchy remain parity targets.

## Required Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--xlt-navy-950` | `#052b57` | deep emphasis/hover |
| `--xlt-navy-900` | `#0060a6` | brand and primary action |
| `--xlt-link` | `#0060a6` | links and secondary action text |
| `--xlt-ink` | `#102a4c` | headings/high emphasis |
| `--xlt-text` | `#3e5571` | body text |
| `--xlt-muted` | `#6b7d91` | metadata/helper text |
| `--xlt-readable-muted` | `#5b6e82` | necessary helper, reason, timestamp and recovery text |
| `--xlt-canvas` | `#f5f7fa` | page canvas |
| `--xlt-surface` | `#ffffff` | cards/forms/panels |
| `--xlt-line` | `#d9e2ec` | surface borders |
| `--xlt-divider` | `#e7edf3` | internal separators |
| `--xlt-soft` | `#eaf1f8` | selected/informational surface |
| form border | `#ccd8e5` | normal field boundary |
| form hover | `#8da9c4` | hover boundary |
| form focus | `#1f6fca` | focused field boundary |
| form ring | `rgba(0, 96, 166, .16)` | focused field ring |
| disabled background | `#f2f4f7` | unavailable controls |
| disabled text | `#929dab` | unavailable labels |
| error | `#c62828` | invalid/error content |
| keyboard focus | `#ffb648` | 3px visible focus outline |

- Default panel/card radius is `7px`; controls use `4px` unless a reference component specifies otherwise.
- Default surface shadow is `0 1px 3px rgba(13, 45, 80, .05)`.
- Base spacing rhythm is `4 / 8 / 12 / 16 / 20px`; desktop section gap is `12px`; mobile content gutter is `12px`.
- Do not introduce gradients, glass effects, heavy shadows, oversized status artwork or unrelated colors.

## Typography

- Font stack: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`.
- Desktop scale: caption `10px`, metadata/control `11px`, body `12px`, card title `15px`, section heading `16px`, page title `23px`.
- Mobile scale follows the reference `clamp()` values in `src/h5.css`; controls and field text must not shrink below the approved mobile values.
- Body line height is `1.55` desktop and `1.6` on mobile where the reference override applies.
- Required markers use the existing error red and sit beside the field label without changing label alignment.
- `--xlt-readable-muted` is mandatory for meaningful small text on `#ffffff`, `#f5f7fa` and `#eaf1f8`; measured contrast is approximately `5.25:1`, `4.89:1` and `4.61:1`. `--xlt-muted` may remain for larger secondary metadata that independently passes, while disabled `#929dab` is limited to the truly unavailable control label and never its reason or recovery text.

## Component Specifications

### Application form and contact autofill

- Keep the reference white form panel, 1px line border, 7px radius and `14px 16px` internal padding.
- Auto-filled phone/email controls look like ordinary editable fields. Do not use a disabled fill because users may correct them.
- Add a single muted helper line below the contact control or grouped contact fields: “已从所选接入人资料带入，可修改”. Missing source data uses normal helper styling, not an error state until required validation is attempted.
- Invalid phone/email uses the existing red boundary/message. Focus uses the blue border/ring plus visible keyboard outline.
- When department change clears a contact, preserve field geometry and show the normal placeholder rather than a transient empty card.

### Application type and code policy

- Enabled T003/T005 options use the normal selector treatment.
- Unsupported types remain in the same option/list vocabulary but use disabled background/text and append “暂未开放”. An adjacent helper explains the missing real approval channel.
- A required application-code label includes the reference red `*`; helper text sits below the field in muted text and wraps on narrow screens.
- No visual element may imply that the unique identifier generated the application code.

### Permission scope

- Keep the existing radio group geometry. Each choice has a concise explanation directly below or beside it within the same form section.
- Selecting “全部组织可见” disables and visually mutes department/user selectors while retaining the explanatory relationship.
- Selecting scoped access restores normal field styling and required markers. Validation appears below the dependent group, not as a floating notification.

### Rejected-copy mode

- Place a bounded information banner between page header and form content using `--xlt-soft`, primary-blue icon/left rule, normal body text and 7px radius.
- Banner includes the copy/new-attempt explanation and an inline link to the original rejection summary. It is informational, not success-colored.
- The submit button keeps the standard primary style; label may read “重新提交审批”. Cancel/back remain standard secondary actions.

### Cache, refresh and update time

- “数据更新时间” appears as muted metadata near the relevant page/section controls.
- “数据更新时间”, required helper copy, unsupported-type reasons, stale/error explanations and recovery instructions use `--xlt-readable-muted`, not disabled text color.
- Silent refresh may add a compact spinner/status in the same metadata row. It must not reserve a floating top-right overlay.
- Refresh failure with stale content uses a bounded inline notice inside that section; old content remains full-opacity and usable unless its actions require fresh validation.
- Initial loading without cache uses the existing section skeleton/spinner. Do not blank unrelated panels.

### Application cards and actions

- Preserve reference card dimensions, title/description clamps, icon tile (`50px × 50px`) and footer alignment.
- “立即使用” and “申请使用” use the existing primary action appearance. The visible label reflects the evaluated business action.
- “暂不可用” keeps identical button geometry with disabled background/text; its reason is available as adjacent text or accessible description.
- Long names/metadata clamp within the card and never move the action outside the footer.

### Detail attachments and complex fields

- Replace raw object dumps with file rows/cards inside the existing detail section.
- Desktop file row: filename/title region, type/size metadata, upload time, then authorized actions. Use internal dividers and no independent heavy shadow.
- Mobile file row stacks metadata under the name and places actions in a wrapping final row. Minimum action height is 44px.
- Filename may wrap to two lines; technical hashes/tokens are hidden unless explicitly required in an administrative diagnostic view.
- Tables/long values remain horizontally scrollable inside a bounded content region only; the document itself must not overflow.

## Required State Appearance

| State | Visual treatment |
| --- | --- |
| `normal` | White surfaces on `#f5f7fa`, line borders, normal hierarchy and enabled actions. |
| `loading` | Local bounded loading treatment; stale content remains visible when available; no global bubble. |
| `empty` | White bounded state with dark heading, muted explanation and permitted recovery action; no fixture content. |
| `error` | `#c62828` error text/boundary plus blue retry; preserve old content for stale-read errors. |
| `disabled` | `#f2f4f7` background, `#929dab` text, unchanged geometry and visible reason. |
| `permission-denied` | Centered bounded state on the reference canvas; restricted data/actions are absent. |
| `stale` | Normal content plus muted last-update time and compact inline refresh/error status. |
| `rejected` | Existing rejected status treatment plus visible rejection reason and standard primary resubmit action. |

## Responsive and Verification Rules

- Verify representative desktop `1672×941`, large desktop `1920×1080`, compact desktop `1000×900`, mobile `390×844`, narrow mobile `360×800`, and mobile landscape `844×390`, plus route-specific reference viewports.
- `>1280px`: full desktop shell and density.
- `1001–1280px`: compact desktop navigation per the reference.
- `761–1000px`: reduced navigation density while every destination remains reachable.
- `<=760px`: reference mobile top bar/drawer, 12px gutter, 44px controls and single-column form/list behavior.
- Mobile top bar and drawer include `env(safe-area-inset-top)`, `env(safe-area-inset-left)` and `env(safe-area-inset-right)` within their reference dimensions/padding calculation. Page content keeps the same 12px visual gutter after safe-area compensation.
- Sticky or terminal action areas use bottom padding `max(12px, env(safe-area-inset-bottom))`; the scroll container/end spacer provides matching compensation so the final field, file action and submit/re-submit control remain visible above the browser or gesture area.
- Landscape mobile applies both side insets. Drawer close controls and focus outlines must remain inside the visible safe area without reducing the 44px target.
- `<=430px`, `<=380px` and `761–1100px`: retain exact reference cascade behavior in `src/h5.css`.
- No changed route may gain unintended horizontal document scrolling at 320 CSS pixels or 200% zoom.
- Safe-area QA simulates insets at `390×844` portrait and `844×390` landscape and verifies the top bar, drawer close, focus outline, last content row and terminal actions are neither clipped nor obscured.
- Hover may change color/border without layout shift. `:focus-visible` is never removed. Under reduced motion, transitions are removed.

## Visual Acceptance Mapping

- **AC-1/2/8/9:** field labels, helper copy, disabled types, validation and permission dependencies use the form specifications above.
- **AC-3:** copy-mode banner and resubmit action use the rejected-copy specification.
- **AC-4/5:** local loading, stale time, inline error and no global bubble use the cache/state specification.
- **AC-6:** detail/file rows are bounded and never expose raw objects.
- **AC-7:** action labels and disabled appearance map to real access/launch state without changing card geometry.
- **AC-10/11:** screenshot comparison and automated accessibility/regression evidence use the approved reference archive and viewport matrix.
- **AC-10 contrast/safe area:** meaningful small text is checked at 4.5:1 or better on all three approved surfaces; portrait/landscape safe-area simulations verify every primary and recovery action remains reachable.

## Open Questions and Conflicts

- No blocking visual conflict remains. New business messages fit the established reference component vocabulary.
- Dynamic real data is allowed to differ from fixture text, but it must not change the approved shell or component styling.
- Implementation must reconcile selectors with the existing source cascade; copying isolated declarations without preserving computed results is not acceptable.
