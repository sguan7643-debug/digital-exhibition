# Functional QA Report

- **Task:** `DEH-ENTRY-PERF-20260916`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/functional-qa-report.md`

## Environment

- **Build/version:** branch `task/digital-exhibition-ui-0817-dev-r3-web`, baseline `91a8ba1ad452bc348cb3615f1700b55c9e1af9a5`, governed dirty candidate described by `engineering-handoff.md`.
- **Runtime, device, browser, or test account:** Node 20.14 automated Vue/service tests plus authenticated Chromium read-only evidence against `http://127.0.0.1:4173/workbench`.
- **Permissions/configuration:** HttpOnly Feishu session; formal Feishu Bitable read-only; no record/schema write; 8-second upstream, 10-second server-read, and 12-second browser budgets.
- **Evidence:** fresh focused QA command on 2026-09-18; fresh full `pnpm test:integration`, `pnpm test`, `pnpm check`, `pnpm build`, and `git diff --check`; `evidence/live-first-screen-20260918.json`.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-AC-01 | Local-root unauthenticated entry starts OAuth before protected reads. | executed | 1. Run entry-guard test. 2. Exercise local `/workbench` with 401 session probe. 3. Inspect operation calls. | OAuth redirect occurs; no protected operation begins. | Redirect and suppression matched. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-AC-02 | `/test2` unauthenticated entry has the same OAuth-before-read behavior. | executed | 1. Exercise `/test2/workbench` with 401 probe. 2. Inspect redirect and calls. | Base-aware OAuth redirect; zero protected reads. | `/test2` path passed without one-path hard coding. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-AC-03 | Safe path, query, and hash survive OAuth return. | executed | 1. Supply safe nested `/test2` URL with query/hash. 2. Sanitize return target. | Exact safe internal target is retained; unsafe targets rejected. | Safe target retained and unsafe encodings rejected. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-AC-04 | Authenticated `/` and `/test2` routes resolve the intended page. | executed | 1. Resolve local and deployed workbench URLs. 2. Check initial route normalization. | Workbench renders, not not-found. | Both bases resolved to page 01/workbench. | `tools/app-shell.test.mjs`; `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-AC-05 | Session-probe transport/server failure is retryable and suppresses protected reads. | executed | 1. Reject session fetch. 2. Run entry bootstrap. 3. Inspect state and calls. | Entry-unavailable state with retry; no protected read. | Retryable entry state returned; mount/protected reads suppressed. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-AC-06 | Authenticated first-screen operations use a bounded, deduplicated plan. | executed | 1. Build workbench plan. 2. Run five operations concurrently. 3. Count duplicate table reads. | No duplicate operation IDs; shared dictionary work runs once. | Plan deduplicated; user/type dictionary single-flight assertions passed. | `tools/page-read-request-plan.test.mjs`; `tools/feishu-read-only-service.test.mjs` | none | passed | none |
| FQA-AC-07 | Slow/transient upstream completes as a safe bounded failure before 30 seconds. | executed | 1. Delay upstream beyond deadline. 2. Simulate retryable 502/504. 3. Inspect error and retry count. | 8/10/12 budgets apply, at most one retry, sanitized diagnostics. | Deadline, aggregate budget, single retry, and templated upstream path passed. | `tools/feishu-open-api-client.test.mjs`; `tools/feishu-read-only-service.test.mjs`; `tools/first-screen-request-budget.test.mjs` | none | passed | none |
| FQA-AC-08 | One affected operation does not block unaffected page regions and exposes retry. | executed | 1. Start authenticated in-flight request. 2. Inspect rendered progress and handlers. 3. Force timeout. | Visible non-blocking progress; local retry; no viewport/input interception. | In-flow banner remained visible; no full-screen overlay/focus interception; local retry rendered. | `tools/global-request-loading-remediation.test.mjs`; `tools/first-screen-request-budget.test.mjs` | none | passed | none |
| FQA-AC-09 | Successful no-content result is distinct from auth/permission/error. | executed | 1. Return empty successful records. 2. Mount empty state. 3. Compare error and permission states. | Neutral empty state with no automatic retry. | Empty state rendered independently of error and permission states. | `tools/mounted-state-boundary.test.mjs`; `tools/feishu-read-only-service.test.mjs` | none | passed | none |
| FQA-AC-10 | Confirmed session permission denial is instructional and not auto-retried. | executed | 1. Mount permission-denied state. 2. Verify hidden/disabled actions. 3. Inspect retry policy. | Permission state is not auth/red transport error and is not automatically retried. | Permission-specific state and restricted actions passed. | `tools/mounted-state-boundary.test.mjs`; `tools/feishu-personal-read-batch.test.mjs` | none | passed | none |
| FQA-AC-11 | Retry cannot be invoked twice while active and reaches a terminal state. | executed | 1. Force bounded timeout. 2. Inspect retry control binding/disabled state. 3. Complete/cancel request and inspect activity. | Retry disabled while active; terminal state clears activity. | `integrationRetrying` disables retry; timeout/cancel clears activity in `finally`. | `tools/first-screen-request-budget.test.mjs`; `src/App.vue` reviewed binding | none | passed | none |
| FQA-AC-12 | Automated tests/build cover entry, bases, bounded requests, and first-screen states without live writes. | executed | 1. Run focused suite. 2. Run complete integration/UI/static/build/diff checks. | All pass; no live write required. | All commands exited 0; build transformed 1951 modules. | `engineering-handoff.md`; current QA command output | none | passed | none |
| FQA-AC-13 | Real-environment verification is read-only and records safe timing/outcome evidence. | executed | 1. Use authenticated browser session. 2. Load `/workbench`. 3. Record only operation/status/timing. | Five reads complete within 12 seconds; no credential/business-data disclosure or write. | All five returned 200; slowest 9582 ms; evidence contains only approved metadata. | `evidence/live-first-screen-20260918.json` | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-VAL-01 | OAuth return target accepts only a safe path under the active base. | executed | Exercise safe, outside-base, scheme-relative, backslash, and encoded variants. | Only safe same-app target accepted. | Validation passed for root and `/test2`. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-VAL-02 | Timeout diagnostics exclude token, secret, cookie, credentials, instance IDs, and raw data. | executed | Force token/approval/record timeout and inspect serialized error. | Only templated path and safe timing metadata remain. | Sensitive values absent; templated paths present. | `tools/feishu-open-api-client.test.mjs` | none | passed | none |
| FQA-VAL-03 | Configured timeouts cannot exceed approved caps. | executed | Supply oversized 20/30-second configuration. | Resolved values cap at 8-second upstream, 10-second read, 12-second browser. | All cap assertions passed. | `tools/feishu-open-api-client.test.mjs`; `tools/feishu-read-only-service.test.mjs`; `tools/first-screen-request-budget.test.mjs` | none | passed | none |
| FQA-VAL-04 | Read-only task does not issue controlled writes. | executed | Inspect first-screen plan and live evidence mode; run source/static checks. | Only read operations execute. | Evidence mode is `browser-read-only`; no write operation present. | `evidence/live-first-screen-20260918.json`; `pnpm check` | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-STATE-01 | Entry checking | executed | Start bootstrap with pending session probe. | Dedicated full-screen entry status before Vue data page mounts. | Checking surface rendered before mount. | `tools/feishu-entry-auth-guard.test.mjs`; `src/integration/entry-bootstrap.js` | none | passed | none |
| FQA-STATE-02 | OAuth redirecting | executed | Return 401 from session probe. | OAuth starts and page data remains unmounted. | Redirect branch passed with zero protected reads. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-STATE-03 | Entry unavailable | executed | Reject session probe, then retry. | Retryable entry card; still no protected reads until authorized. | Failure and retry branch passed. | `tools/feishu-entry-auth-guard.test.mjs` | none | passed | none |
| FQA-STATE-04 | Authenticated first-screen loading | executed | Start delayed authenticated reads. | Visible progress without blocking unaffected controls. | Non-blocking in-flow banner and live status passed. | `tools/global-request-loading-remediation.test.mjs` | none | passed | none |
| FQA-STATE-05 | First-screen success | executed | Load five real operations with authenticated browser. | Workbench data completes inside browser budget. | Five HTTP 200 results; max 9582 ms. | `evidence/live-first-screen-20260918.json` | none | passed | none |
| FQA-STATE-06 | Empty result | executed | Return valid empty arrays and mount empty state. | Neutral empty state, no error/auth presentation. | Empty state passed. | `tools/mounted-state-boundary.test.mjs`; `tools/feishu-read-only-service.test.mjs` | none | passed | none |
| FQA-STATE-07 | Recoverable request error | executed | Delay beyond timeout and render result. | Local explanation/retry; available content retained; activity clears. | Timeout recovery and cleanup passed. | `tools/first-screen-request-budget.test.mjs` | none | passed | none |
| FQA-STATE-08 | Disabled/unavailable action | executed | Keep retry active and mount disabled state. | Owning action disabled without disabling whole page. | Disabled binding/state contract passed. | `tools/first-screen-request-budget.test.mjs`; `tools/mounted-state-boundary.test.mjs` | none | passed | none |
| FQA-STATE-09 | Permission-dependent failure | executed | Mount permission-denied result under confirmed session. | Instructional permission state; no automatic retry. | Permission UI and action restrictions passed. | `tools/mounted-state-boundary.test.mjs` | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-REG-01 | Approval and other governed integrations sharing the Open API client. | executed | Run complete integration suite after timeout/limiter changes. | Approval/auth/read/write contracts remain green. | Integration suite passed. | `pnpm test:integration` | none | passed | none |
| FQA-REG-02 | Application shell routing and 30-page UI interactions. | executed | Run complete UI suite after banner change. | Routes, controls, responsive behavior, and interactions remain green. | UI suite passed. | `pnpm test` | none | passed | none |
| FQA-REG-03 | Page switch cancellation and stale result suppression. | executed | Begin unresolved load, switch/cancel, inspect terminal state and request count. | All old requests abort and cannot finish as timeout/error. | Cancellation count and `cancelled` terminal state passed. | `tools/first-screen-request-budget.test.mjs` | none | passed | none |
| FQA-REG-04 | Reduced-motion and accessible live request status. | executed | Inspect request banner semantics and reduced-motion rule. | Polite status, busy state, visible text, animation disabled when requested. | Accessibility contract passed. | `tools/global-request-loading-remediation.test.mjs` | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

This report is the only file written and the sole allowed write. Functional QA does not modify implementation, tests, builds, handoffs, approvals, or task inputs; does not write final QA fields; and does not modify task state. Cross-platform QA retains platform compatibility-matrix ownership.
