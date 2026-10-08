# PRD — 数智展厅业务问题清单整改

## 1. Product Goal and Target User Value

目标是把飞书“测试问题登记”中的业务反馈转化为可验证的整改项，让业务用户能够稳定完成应用上架、审批跟踪、授权后使用和详情浏览，同时不破坏已经按 `digital-exhibition-SOURCE-20260916-165348` 完成的标准 UI。

目标用户价值：

- 申请人填写更少、错误更少，提交前即可知道是否具备真实审批通道。
- 被拒绝的申请可以保留历史记录并快速修改重提。
- 授权用户在应用中心看到与权限一致的操作。
- 首页和详情页快速展示真实数据，加载、旧缓存和失败状态清晰可辨。
- 详情中的附件和复杂数据可读、可操作且不撑破页面。

## 2. Facts, Open Assumptions, and Evidence

### Facts

| Fact | Evidence |
| --- | --- |
| 飞书工作表“测试问题登记”包含 13 个问题截图，快照 revision 94。 | `task-brief.md`; `evidence/feishu-issues/01.PNG`–`13.PNG` |
| 接入人目录模型已经读取 `mobile`、`email`，但选择接入人后没有自动回填监听。 | `src/pages/OnboardingApplyPage.vue` 中 `userOptions` 与现有 `watch(userOptions)` |
| T005 的应用编码输入控件动态必填，但标签没有必填星号。 | `src/pages/OnboardingApplyPage.vue` 的 `:required="form.type === 'T005'"` |
| 审批状态页支持查询和刷新，没有拒绝后的编辑重提入口。 | `src/pages/OnboardingPage.vue`; `evidence/feishu-issues/03.PNG` |
| 首页已改为真实聚合读取，业务 mock 数据回退已有自动化禁令。 | `src/pages/WorkbenchPage.vue`; `tools/no-mock-business-data.test.mjs`; `tools/homepage-aggregate.test.mjs` |
| 已实现 IndexedDB 持久缓存、服务端内存缓存、请求去重、静默刷新和失败保留旧数据。 | 现有缓存/读取实现与 `tools/feishu-read-latency-cache.test.mjs`、`tools/feishu-system-read-cache.test.mjs` |
| 详情页有 loading/empty/error 边界，但附件对象仍会被拼成原始字段文本。 | `src/components/AppDetailStateBoundary.vue`; `src/components/AppDetailAuthoritativeBody.vue`; `evidence/feishu-issues/08.PNG` |
| 应用中心动作主要由静态详情路由决定，尚未完整消费真实授权与访问方式。 | `src/pages/AppsPage.vue`; `src/state/interaction-controllers.js` |
| 当前前端展示 T001–T009 类型详情字段，但真实审批提交仅实现 T003 和 T005。 | `src/pages/OnboardingApplyPage.vue`; `src/integration/onboarding-approval.js`; `server/feishu-approval-service.mjs` |
| `10.151.23.119:28080/api/onboarding/unique-identifier` 是唯一标识接口，不是已证明的应用编码生成接口。 | `server/onboarding-unique-identifier-client.mjs`; 用户此前明确指定该接口用途 |
| 上一 UI 对齐任务已通过功能 QA、兼容性 QA 和发布就绪审查。 | `.ai-team/tasks/DEH-UI-PARITY-20260930/` |

### Open Assumptions Requiring Scope Approval

1. **Application code policy:** because no separate authoritative code-allocation API is evidenced, the safe default is to keep the field user-entered and visibly required only where the real contract requires it. The system must not derive it from the unique identifier or infer the next code from Feishu rows.
2. **Rejected resubmission:** the safe default is to copy editable data from the rejected application into a new attempt and retain the rejected record unchanged for audit.
3. **Unsupported types:** the safe default is to expose T003 and T005 as selectable submission types; other configured catalog types remain visible as “真实审批暂未开放” but cannot be submitted.
4. **Authorized card action:** “立即使用” is shown only when real access scope and a launchable URL/route are both present; otherwise the page shows “申请使用” only when a real request contract is enabled, else “暂不可用”.

## 3. In-Scope and Out-of-Scope Boundaries

### In Scope

- Maintain a traceable 13-row issue matrix with statuses: already resolved, code fix required, verification required, or external dependency.
- Auto-fill contact phone/email from the selected real directory user without overwriting later deliberate user edits unless the selected user changes.
- Keep applicant/contact phone and email validation consistent and accessible.
- Align application-code label, required state, help text, payload, and validation with the approved code policy.
- Add a rejected-application “编辑并重新提交” flow that prefills a fresh attempt.
- Verify persistent cache, request deduplication, stale-while-revalidate, retry, update timestamp, cross-tab refresh sharing, and no global floating request bubble.
- Keep homepage data real and make local section loading/empty/error/stale states explicit.
- Render detail attachments as file rows/cards rather than raw objects; prevent page overflow.
- Determine application-card actions from real access/launch fields and permission state.
- Add concise permission-scope help and enforce field relationships for “全部组织可见” versus “部分部门/用户”.
- Preflight application type support before submission and prevent unsupported requests from reaching an error after the form is filled.
- Re-run reference-package visual parity across affected routes and viewports.

### Out of Scope

- Adding an application-code allocation API without an authoritative contract.
- Treating the unique identifier as an application code.
- Creating approval routes for unsupported application types without backend/EAD contracts.
- Editing Feishu table schemas, deleting records, or backfilling production data.
- Replacing real data with reference package fixtures.
- Broad UI redesign, deployment, merge, publication, or production changes.

## 4. Primary User Flow

1. User enters Application Center and opens “应用上架申请”.
2. The page loads the current authenticated applicant, organization directory, available submission types, and stale cached data if present.
3. Applicant information is prefilled. When the user selects a contact, the page preloads the contact’s phone and email from the same real directory record.
4. The user chooses an application type:
   - T003 routes to the existing RPA submission contract.
   - T005 routes to the existing Feishu approval/onboarding contract.
   - Other types are visibly unavailable before the form can be submitted.
5. The form shows consistent required markers, validation, permission-scope explanation, and application-code help.
6. On submit, the existing real backend contract creates the request and the page moves to the status page.
7. If approved, the application is projected to the real application index and authorized users receive the correct card action.
8. If rejected, the user can choose “编辑并重新提交”; the system loads the old application, creates a new attempt, and preserves the original record.
9. Application Center and details immediately use cached content, refresh in the background, show the update time, and retain old content on refresh failure.
10. Detail attachments render as bounded file items with available metadata/actions rather than raw objects.

## 5. State Inventory

| State | Required behavior |
| --- | --- |
| Success | Real data is shown; contact fields are prefilled; valid submission reaches status; authorized card action is correct; attachments are structured. |
| Loading | Loading is local to the affected form/list/detail section; cached content remains visible where available; no global floating bubble. |
| Empty | Explain that no real record is available and provide the relevant recovery action without substituting mock data. |
| Error | Preserve last successful cached data, show its update time, and provide bounded retry; submission errors remain local and do not duplicate attempts. |
| Disabled | Unsupported application types and unavailable write contracts are disabled before submission with a concise reason. |
| Permission-dependent | Directory choices, card actions, launch URLs, attachment actions, and detail content reflect authenticated user permissions; denied content is not leaked. |
| Stale | Cached data is displayed with “数据更新时间” and a background-refresh indicator; refresh failure does not blank the page. |
| Rejected | Show rejection reason/status and an “编辑并重新提交” action that starts a new auditable attempt. |

## 6. Explicit Non-Goals / Things Not to Do

- Do not fabricate contact information, application codes, access grants, launch URLs, approval instances, or successful submissions.
- Do not use the reference archive’s names, counts, records, dates, or mock identity.
- Do not restore the removed floating request-activity bubble.
- Do not overwrite a rejected application record when resubmitting.
- Do not infer “立即使用” solely from a hard-coded route.
- Do not show unsupported types as normal selectable options that fail only after completion.
- Do not expose raw attachment objects or authorization identifiers as end-user display text.

## 7. Open Questions and Decisions Needed for Scope Approval

Scope approval must confirm the four safe defaults listed in section 2:

1. Keep application code as a visibly required user field for current real contracts until a dedicated allocation API is supplied.
2. Resubmit rejected requests by copying into a new attempt, preserving the original.
3. Allow real submission only for T003 and T005; mark other types unavailable before form completion.
4. Drive card actions from real authorization plus launchability, never from route alone.

Supplying a dedicated code-allocation API or additional approval contracts later would be a successor scope unless provided before this scope is approved.

## 8. Acceptance Criteria

### AC-1 Contact information autofill

Given the real directory provides a selected contact’s phone and email, when the user selects that contact, then both fields are populated from that exact directory record, remain editable, and retain phone/email format validation.

### AC-2 Application code consistency

Given an application type requires an application code, when the type is selected, then the label visibly marks the field required, help text explains the current source, and both browser and server validation reject an empty value consistently.

Given a type does not require a code, when it is selected, then no hidden required validation is applied.

### AC-3 Rejected application resubmission

Given an application belongs to the current authenticated applicant and is rejected, when the user selects “编辑并重新提交”, then a new form is prefilled from the old application, the old record remains unchanged, and a successful resubmission creates a new attempt and status record.

### AC-4 Refresh and cache behavior

Given a successful cached snapshot exists, when a route is revisited or refreshed, then cached content is rendered before background refresh; a successful refresh updates content and timestamp, while a failed refresh retains old content with a non-blocking error.

Given multiple components request an identical operation concurrently, when the request starts, then only one upstream request is made and all consumers share the result.

### AC-5 Real homepage data

Given remote mode is active, when the workbench loads, then all application, course, notice, and usage sections use authoritative responses or explicit real empty/error states and never use mock business fixtures.

### AC-6 Detail state and attachment presentation

Given application detail is loading, empty, failed, stale, or available, when the page renders, then it displays the correct local state without blanking unrelated regions.

Given attachment objects are present, when the detail renders, then each attachment displays bounded name/type/size/date/actions and no raw object dump or document-level horizontal overflow appears.

### AC-7 Application-card actions

Given the current user has real access and the application has a valid launch target, when the card renders, then it shows “立即使用”.

Given access is absent but a real application-request contract is enabled, when the card renders, then it shows “申请使用”.

Given neither condition is true, when the card renders, then it shows a disabled “暂不可用” action with an explanation.

### AC-8 Permission-scope clarity

Given the user chooses “全部组织可见”, when the permission section updates, then the UI explains that all authenticated organization users can see the application and clears/disables conflicting department/user restrictions.

Given the user chooses “仅开放给部分部门/用户”, when the section updates, then the required scoped department/user controls are enabled and validated.

### AC-9 Submission-type preflight

Given the selected type has no real approval contract, when the page presents the type, then it is unavailable before submission and explains that the real approval channel is not configured.

Given T003 or T005 is selected, when the form is valid, then submission uses only the existing same-origin real contract for that type.

### AC-10 UI parity and accessibility

Given an affected route at approved desktop and H5 viewports, when compared with `digital-exhibition-SOURCE-20260916-165348`, then shell, typography, spacing, cards, fields, buttons, and responsive behavior retain the approved visual standard except for necessary issue-resolution content.

Given keyboard and screen-reader interaction, when users navigate the changed controls and states, then focus visibility, accessible names, live announcements, and error focus remain available.

### AC-11 Regression evidence

Given implementation is complete, when the full unit, integration, onboarding, cache, browser parity, accessibility, static-check, and production-build suites run, then they pass with zero blocking defects and the 13-row issue matrix records evidence for every row.

