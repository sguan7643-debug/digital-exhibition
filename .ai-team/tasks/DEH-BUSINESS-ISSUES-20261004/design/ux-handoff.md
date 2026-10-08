# UX/Interaction Handoff — 业务问题清单整改

Owner: UX/Interaction Designer

## Sources and Evidence

- Approved PRD: `../prd.md`; scope approval is recorded in `../task.json`.
- Business evidence: `../evidence/feishu-issues/01.PNG`–`13.PNG`, extracted from the Feishu “测试问题登记” sheet, revision 94.
- Visual/interaction baseline: `digital-exhibition-SOURCE-20260916-165348.zip`, SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.
- Existing authoritative behavior: current Vue routes, same-origin Node proxy, real organization directory, onboarding contracts, application index, IndexedDB cache, request deduplication and background refresh.
- Platform: browser Web only. No uni-app target is declared.

## Information Architecture

The existing navigation and route families remain unchanged. The work is confined to these task surfaces:

1. **Application Center**: application cards/list, filters, card actions and local refresh status.
2. **Application onboarding**: application form, upload controls, status/detail and rejected-request resubmission.
3. **Application detail**: authoritative detail states, structured attachments and permission-dependent actions.
4. **Workbench**: real data sections with local loading/empty/error/stale states.

No new top-level destination is added. “编辑并重新提交” starts from an owned rejected request and opens the existing application form in copy mode.

## Primary User Flows

### New application request

1. The authenticated applicant opens the onboarding form.
2. Applicant identity, organization and department are populated from the current real session/profile when available.
3. The user chooses an enabled application type. T003 and T005 are enabled; types without a real approval contract remain visible but disabled with “真实审批暂未开放”.
4. The application-code field follows the selected type policy. When required, its label has a required marker and helper text states that it is entered under the current business rule and is not generated from the unique identifier.
5. The user chooses the contact person. Phone and email are copied from that exact directory record. The copied fields remain editable.
6. If the contact person changes, phone/email are replaced from the newly selected record. If the governing department changes and invalidates the selected contact, contact, phone and email are cleared together.
7. The user chooses a permission scope:
   - “全部组织可见” explains that all authenticated users in the organization can see the application, and clears/disables scoped department/user controls.
   - “仅开放给部分部门/用户” enables the scope controls and requires at least one valid department or user according to the contract.
8. Local validation runs before upload/submission. Invalid phone/email and required application code focus the first invalid field.
9. A single submit creates one real request through the supported same-origin contract and navigates to status.

### Rejected request editing and resubmission

1. On a rejected request owned by the current applicant, show “编辑并重新提交”.
2. Activating it opens the onboarding form in copy mode with a banner: “已从被拒绝的申请复制；重新提交将创建新的申请记录”.
3. Editable business fields and existing file references that remain valid are prefilled. Server/session-derived identity and immutable audit identifiers are not editable or copied as new identities.
4. The original rejection reason remains visible by link/summary so the user can correct the request.
5. Successful submission creates a new attempt and status entry; the original rejected record remains unchanged.

### Application discovery and action

1. Cached real applications render immediately when available and show “数据更新时间”.
2. A background refresh updates the list and timestamp without blocking the page. Failure retains old data and shows a local non-blocking notice.
3. Each card evaluates real access and launchability:
   - access granted + valid launch target: “立即使用”;
   - no access + real request contract enabled: “申请使用”;
   - otherwise: disabled “暂不可用” with an explanation.
4. Card navigation and independent action controls remain separate; an action click must not accidentally open the detail route.

### Detail and attachments

1. Cached detail may render first, followed by local background refresh.
2. Attachments render as bounded file rows/cards with name, type, size, upload time and authorized actions.
3. Unknown internal fields, raw objects, tokens and authorization identifiers are not shown as end-user text.
4. Long values wrap or truncate within their container; the page never gains document-level horizontal scrolling.

## Interaction Rules

- All data shown is authoritative or explicitly stale authoritative data; fixture/mock business data is never a fallback.
- Contact autofill is triggered only by a deliberate contact selection or a restored copied request. User edits are preserved until the contact changes again.
- Missing directory phone/email leaves the corresponding field empty with helper copy; the system never invents a value.
- Phone accepts the existing supported international format, including `+86`; email keeps current format validation. Validation messages are associated with the field.
- Unsupported types cannot reach upload or submit. Disabled options expose their reason to pointer, keyboard and screen-reader users.
- Submission and upload controls disable during the active write. Client retries do not create duplicate writes.
- Silent read refresh never steals focus and never displays the removed global floating request bubble.
- Identical concurrent reads share one in-flight request; route changes reuse loaded data under the approved cache policy.
- Search/filter requests use the existing debounce and keyboard submission behavior.
- Permission changes clear contradictory values immediately and announce the changed requirement.
- “立即使用” never appears from a route alone; a launch target is not exposed when permission is absent.
- Attachment view/download actions are individually permission checked and cannot be triggered from disabled state.

## Content Behavior

- Required application code helper: “请按现行业务规则填写；系统不会使用唯一标识自动生成。”
- Unsupported type helper: “该应用类型尚未配置真实审批通道，暂不可提交。”
- All-organization help: “组织内已登录用户均可查看；选择后不再限制具体部门或用户。”
- Scoped help: “仅所选部门或用户可见；请至少选择一个部门或用户。”
- Copied-request banner: “已从被拒绝的申请复制；重新提交将创建新的申请记录，原记录不会被修改。”
- Stale notice includes the last successful data time and says that refresh failed while old data remains usable.
- Dynamic names, departments, counts, records, statuses and timestamps always come from real data; reference-package sample text is presentation evidence only.

## Required States

| State | Trigger and presentation | Actions and recovery | Accessibility behavior |
| --- | --- | --- | --- |
| `normal` | Current real data is usable; form/card/detail controls reflect permissions. | All valid actions are enabled. | DOM order follows visual order; current route/selection is semantic. |
| `loading` | Initial load has no cache, or a local write is active. | Navigation remains available; duplicate write actions are disabled. | Bounded status is announced once; focus is not moved during silent reads. |
| `empty` | Authoritative response succeeds with no record. | Clear filters, return, create/apply when authorized, or refresh. | Heading, explanation and recovery action are ordered and keyboard reachable. |
| `error` | Initial read/write fails, or refresh fails. | Bounded retry; stale content stays visible when available; write errors do not auto-retry. | Error summary is associated/announced; first invalid form field receives focus after submit. |
| `disabled` | Unsupported type, invalid form, active write or unavailable contract. | No request/navigation occurs; adjacent text explains why. | Native disabled/`aria-disabled` semantics; reason remains perceivable. |
| `permission-denied` | User lacks route, record, file or action permission. | Return to a permitted route or reauthenticate. | Restricted content and targets are not rendered as active; denial heading is first meaningful content. |
| `stale` | A last-success snapshot exists while refresh runs or fails. | Continue using old data or trigger bounded retry. | “数据更新时间” and refresh result are announced politely without focus theft. |
| `rejected` | Owned request is rejected. | View reason; edit and resubmit as a new attempt. | Status/reason precede the resubmit action; copy-mode banner is announced on form entry. |

## Responsive Web Behavior

- Preserve the reference breakpoints and shell: full desktop above 1280px, compact desktop/tablet from 761–1280px, and mobile Web at 760px and below.
- Forms become single-column on mobile; controls remain at least 44px high, validation stays directly below its field, and the sticky/terminal action area does not obscure content.
- File rows stack metadata and actions on narrow screens; filenames wrap/clamp without horizontal document overflow.
- Permission radio choices and explanations wrap as a group; dependent selectors appear directly below.
- Card action labels remain visible and do not rely on hover. Mobile drawers preserve focus trap, Escape/backdrop close and trigger-focus restoration.
- On mobile Web, the top bar and drawer respect top/left/right device safe areas. A sticky or terminal submit/action area uses bottom padding of at least `max(12px, env(safe-area-inset-bottom))`, and the scrolling content receives matching end compensation so the final field, attachment action and submit button are never obscured.
- Landscape mobile applies both left and right safe-area insets. Drawer close controls, focus rings and 44px touch targets remain fully inside the visible safe area.

## Accessibility Requirements

- Preserve skip link, semantic landmarks, visible `:focus-visible`, logical headings and real button/input elements.
- Labels, required state, helper text and validation errors use programmatic relationships (`for`, `aria-describedby`, `aria-invalid`).
- Disabled application types expose both disabled state and reason; do not rely on color alone.
- Loading/stale/error updates use polite live regions; submission success/failure may use assertive announcement only once.
- Dialogs/drawers retain focus containment, Escape close and focus restoration. Reduced-motion preference removes transitions without hiding state.
- Text reflow and 200% zoom must retain all controls without two-dimensional page scrolling.
- Necessary helper, reason, timestamp, stale/error and recovery text is ordinary meaningful text and must reach at least 4.5:1 contrast against every approved background. Low-contrast disabled styling is reserved for the disabled control label itself, never for the explanation a user needs to recover.
- Safe-area verification covers `390×844` portrait and `844×390` landscape with simulated top, side and bottom insets; the last content item and every terminal action must remain visible and operable.

## Open Questions and Conflicts

- No blocking UX conflict remains after scope approval.
- A future dedicated application-code allocation API or additional approval contracts would require successor scope; this task must not infer either.
- Visual treatment is constrained by the supplied reference package and is specified in `ui-handoff.md`.
