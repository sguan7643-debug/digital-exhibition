# UX / Interaction Handoff — DEH-REQ-GAP-20260910

Author: 004 UX Designer  
Target path: `C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\.ai-team\tasks\DEH-REQ-GAP-20260910\design\ux-handoff.md`  
Provenance: temporary draft; Team Lead may only byte-for-byte transfer this file to the target path. This draft does not approve Design, Release, code, deployment, or external capability.

## 1. Gate, authority, and boundaries

- Authored during `design`; the controlled task is now `state=design_review`. `approvals.scope.approved=true` by `User-20260911-full-spec-approved`; Design and Release remain false. Platform is Vue Web only; mobile/uni-app is not declared.
- Approved PRD: `prd.md` (current package copy). It defines the immutable R01–R46 completion matrix, 30 existing Web routes, external dependency handling, and acceptance rules. This UX source does not alter that matrix.
- Evidence read: `task-brief.md`, `decision-log.md`, `reviews/code-gap-audit.md`, `reviews/regression-report.md`, and predecessor R3 UX/design handoffs in the shared task package. Current audit says the product combines static demo pages, a real Feishu read/controlled-test foundation, and uneven page consumption.
- Existing UI/navigation and the 30-page baseline are retained. No visual redesign, new page, mobile flow, direct external call, or fake EAD/RPA/AI/monitoring result is introduced.
- The target is a temporary draft because the controlled repository path is outside this writable workspace. No other file is written.

## 2. Information architecture and user flows

Existing shell remains: global header → role-scoped left navigation → page title/breadcrumb → filters/search → cards, list or table → existing detail route/drawer → pagination. Entry and return preserve the originating route, query, sort, page, selection, scroll anchor and focus where the resource is still authorized. If a selection disappears or permission changes, focus returns to the result heading.

Roles and safe entries:

- Ordinary user: workbench, application catalogue/details, favorites, announcements, messages, training, certification, points and permitted materials.
- Business developer/app owner: existing application onboarding form and status; application type determines the available submission route.
- Content, department and platform administrators: existing announcement, application, material, talent, operations and admin pages only when server role checks permit them.
- Unauthorized role: render a minimal permission-denied state; do not briefly render protected content or rely on hidden buttons as authorization.

Core flow: enter page → capability/identity check → read proxy page model → filter/search/sort/page → open existing detail/drawer → return to source. A filter, sort or page-size change always clears the proxy cursor chain and returns page 1. Search text is a draft until Search/Enter; Reset clears page filters and returns the approved fixture or a new read response.

## 3. Real, mock, disabled, and blocked boundary

Every route request first evaluates a server-provided envelope: `mode` (`real|mock|disabled|blocked`), operation, schema version, freshness, completeness, opaque trace ID, role/field capabilities and (for lists) `hasMore,nextPageToken`.

| Mode | When usable | Content and action |
|---|---|---|
| real | Actual proxy, Base/table/view/field mapping, role scope and schema contract are evidenced | Render only authorized minimum fields; expose freshness/completeness text where the existing page has a status context. |
| mock | Real mapping is not enabled but predecessor-approved deterministic fixture exists | Preserve current page behavior; never label fixture as current business data. Refresh resets fixture. |
| disabled | Write/high-risk action lacks allowlist/test record, rollback switch is off, or prerequisite is missing | Existing action location remains non-operative with an explanation; reads and navigation remain available. |
| blocked | Required read contract is missing, permission denied, schema drifted, or no safe mock applies | Show minimal unavailable/error state; do not expose stale protected fields or guess field mappings. |

Browser calls only an approved same-origin proxy. No browser code, URL, storage, logs or screenshots may contain app secrets, access tokens, full sensitive attachment URLs, raw Feishu responses or personal-sensitive fields. Existing `TEST_` writes are test-only and cannot be presented as production completion.

## 4. Domain interaction contracts

### Applications and onboarding (R02–R16)

- `/apps` consumes authoritative APP-001/002 projection when mapping is complete; do not filter out production records by `TEST_` or mix `APP_FIXTURES` in real mode. Category, topic, search, sort and paging update the result subset and count; zero authorized records is empty, not permission denied.
- Nine existing detail routes consume APP-003 and type-specific fields. Missing fields remain unavailable/empty; hard-coded fixture values must not masquerade as real. “Use” first checks current resource permission and safe target address; only an allowed result opens it. Denied, unreachable or missing address states do not navigate externally.
- Onboarding form validates required fields and attachments locally. T003/RPA, T005/HainengWork, EAD and other type approval routes are distinct; a missing formal route stays disabled/blocked. Submit is never optimistic: show pending, verified external ID/status, approved, rejected, cancelled or failed. Unknown/expired/cross-user instances are rejected without revealing existence.

### Materials, training, talent, certification and points (R17–R26)

- Materials list/detail uses MAT-001/002/003 only when page mapping exists; short-lived same-origin download is allowed only after permission check. Missing file, expired address, 403 and timeout are explicit error/permission states; no browser-side upstream token.
- Training consumes TRN projection; no-data is empty and must not fall back to fixed courses in real mode. Enrollment/cancel remains disabled until formal write permission and test/production evidence exist. External learning links require an allowlisted target.
- Talent pages must preserve existing list, drawer and return behavior while consuming TAL-001/002/003 when available. Field-level denial omits protected values. Add/edit/export stays disabled without formal write/data evidence.
- Certification reads CER contracts where available; appointment/application actions remain disabled if formal process is absent. Do not simulate certification success.
- Points overview/details consume PTS-001/002/003/004 when mapped. If the “only accumulate, no deduction” rule conflicts with a negative `EXPENSE`, show a rule-conflict state and block affected mutation until the business owner signs the rule.

### Announcements, messages, operations and admin (R27–R37, R41)

- Announcement front end consumes ANN list/detail/attachment projections; filters and paging retain query context. Attachment access is permission checked. Admin save/publish/offline/delete remains disabled without formal write contract and version/audit evidence.
- Messages show only current-user rows and safe target paths. Mark-read, bot send, template and delivery-log actions do not show success without a confirmed write response; an unknown target never navigates.
- Operations, admin and audit pages load only after role checks. Real aggregates/logs replace fixed arrays only after operation mapping; a partial aggregate is labelled incomplete and never presented as a full KPI. Export, recompute, remediation and configuration writes remain disabled pending contracts.
- Monitoring/alerts are not invented: absent platform configuration is a clear not-configured/blocked state, not a fixed alert count.

## 5. Shared state contract

| State | Trigger and content | Allowed action / recovery / focus |
|---|---|---|
| normal | Authorized schema-matched response or approved mock fixture | Normal existing controls; focus page heading on entry; no bulk announcement. |
| loading | Initial read, committed filter/search/sort/page-size/page request or safe retry | Keep last authorized stable data and set result `aria-busy`; disable duplicate trigger only. Announce once politely; focus stays on initiator. |
| empty | Successful authorized zero visible records | Keep shell and filters; offer reset/change filter/return. One `role=status`; never use for 403, schema, cursor or partial failure. |
| error | Network/5xx, invalid response, missing resource, schema drift or non-retryable failure | Minimal error category plus opaque trace ID; do not expose raw response. Retry only contract-approved read; otherwise return. Move focus only if user remains in the failing container, else preserve host focus and announce once. |
| disabled | Missing write evidence, rollback off, unsupported action or prerequisite | `disabled`/`aria-disabled` with reason; zero network, local mutation and success announcement. |
| permission-denied | 401/403, role/tenant/field denial or revoked access | Remove protected content/cache before next paint; show safe return/recheck. No automatic 403 retry. Focus permission heading/return once. |
| timeout / 429 | Proxy timeout or rate limit | Keep authorized stable data as stale when contract allows; do not silently loop. Retry only safe reads and honor contract `Retry-After`; never blind-retry writes. |
| partial-data / data-stale | Main result succeeds but relation/field/batch fails, or cache is old | Render usable region with explicit unavailable/incomplete/stale text; do not claim complete/current totals. Retry only failed read region. |

## 6. Controlled writes and lifecycle

Writes may be enabled only after a named action allowlist, dedicated test/production view and records, field permissions, retention/cleanup owner, idempotency/version contract, and explicit Design/implementation gates are recorded. Before sending, use an existing approved confirmation surface; if none is evidenced, keep the action disabled.

Each confirmed intent gets one opaque idempotency key. Duplicate submits return the same server result; amended content creates a new intent. Version/ETag conflict returns 409 without overwrite. Batch/related writes report per-item success and failure; any failure prevents an overall-success claim. Cancel, timeout, permission revoke, rollback-off or navigation clears pending UI state without deleting or changing a real record. Rollback is server controlled and returns disabled/error or an explicitly approved mock fallback.

On logout, role/tenant change, route/resource change, permission loss or schema drift, clear protected result cache, cursors, pending requests, drafts and temporary file URLs. Late responses for an obsolete route/query key are ignored.

## 7. Web accessibility and interaction behavior

- Keyboard order remains skip link → header → left navigation → title/filters → results/table → pagination → existing drawer/footer; no positive tabindex. Enter activates links/search/primary actions; Space activates buttons and selection; Escape closes only the topmost existing dialog/drawer and restores its launcher focus.
- Tables expose caption/name, `th` headers, sort state, selected row and current page. Overflow containers scroll to focused cells. Forms associate inline errors with fields; failed submit focuses the first error only when the user is still in that form.
- Existing dialogs/drawers retain accessible name, modal semantics and focus trap. Permission revocation closes protected drawer content and moves focus to the safe permission/return heading.
- Use one live-region announcement per state change; do not combine toast, alert and forced focus. Announcements and accessible names are desensitized.
- At browser/text-only 200% zoom, retain desktop Web IA; allow horizontal/vertical scrolling, keep every action reachable, prevent permanent occlusion/cropping, and scroll programmatic focus into view.

## 8. Open questions and evidence gaps

| ID / owner / gate | Missing evidence | UX consequence |
|---|---|---|
| OQ-01 AIFORCE owner, before implementation | Proxy base URL, auth propagation, request/response/error/timeout/retry and rollback contract | Real calls remain blocked; keep mock/disabled. |
| OQ-02 Feishu/data owner, before real reads | 64-table/1311-field versioned inventory, views, field IDs/types, relations and capability matrix | No field-name guessing; affected routes remain mock/blocked. |
| OQ-03 Business/backend + table owner, before writes | Formal write fields, allowlist, dedicated records, idempotency, version, audit and cleanup | All writes disabled, including favorites, comments, enrollment, approvals and admin actions. |
| OQ-04 RPA/EAD/target-system owners, before type E2E | Formal approval routes, IDs, callbacks, status, SSO/allowed hosts and test accounts | Type-specific onboarding/use remains blocked; no fake success. |
| OQ-05 Training/talent/certification owners, before data acceptance | Authoritative samples, role scope, status and material rules | Pages may be wired but cannot claim real completion. |
| OQ-06 Points owner, before rule implementation | Signed “accumulate only” treatment of expense/expiry/adjustment | Negative direction remains visibly conflicted and blocked. |
| OQ-07 Security/operations owner, before production | OAuth whitelist, gateway mount, credential management, retention/backup/recovery and lifecycle evidence | No production-readiness or release claim. |

## 9. Acceptance checklist

- [ ] Existing UI/navigation is unchanged; Web-only, no mobile/uni-app delivery.
- [ ] R01–R46 completion evidence distinguishes repository behavior from external production closure.
- [ ] Real mode has page → proxy operation → actual table/view/field → role/permission mapping; missing mapping never becomes empty or success.
- [ ] Thirty-page regressions cover normal/loading/empty/error/disabled/permission-denied plus timeout, 429, partial and stale data where applicable.
- [ ] Filter/search/sort/page-size resets page 1 and clears cursors; stale/out-of-order responses cannot replace current data.
- [ ] Browser never exposes credentials, raw sensitive data, direct Feishu calls or unredacted attachment addresses.
- [ ] Every write is disabled until its explicit evidence gate; enabled tests prove confirmation, idempotency, conflict, partial failure, cleanup and rollback behavior.
- [ ] Keyboard, focus return, dialog/table semantics, live announcements and 200% zoom remain reachable and non-duplicative.

End of temporary UX handoff. Design and Release approvals remain separate governance decisions.
