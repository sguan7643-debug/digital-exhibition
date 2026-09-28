# Functional QA Report

- **Task:** `DEH-SYSTEM-POC-CLOSURE-20260927`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-SYSTEM-POC-CLOSURE-20260927/functional-qa-report.md`

## Environment

- **Build/version:** task branch `task/digital-exhibition-ui-0817-dev-r3-web`; production bundle `dist/assets/index-BCRKE5FV.css` and `dist/assets/index-B1IqFWwZ.js`.
- **Runtime, device, browser, or test account:** local `/test2/` server; Chromium/Edge-compatible automated browser; persistent authorized Feishu POC profile; desktop, 360 px, 320/760 px onboarding, 200% zoom, and five narrow-header widths.
- **Permissions/configuration:** real Feishu authorization; same-origin recovery; mutations limited to unique ledger-owned `TEST_` data; non-`TEST_` writes forbidden.
- **Evidence:** `handoffs/web.md`, `engineering-handoff.md`, `.local/feishu-onboarding-poc-ledger.json`, and `.local/feishu-onboarding-applications.json`.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-AC-01 | AC-01 自动化与构建 | executed | 1. Run `npm test`. 2. Run `npm run test:integration`. 3. Run build, no-mock, and source-sync commands. | Every required command exits 0 without weakening data/security gates. | All five required commands exited 0; production assets were generated; no prohibited mock business data was found. | `handoffs/web.md` § Commands and Exact Results | none | passed | none |
| FQA-AC-02 | AC-02 已授权桌面路由 | executed | 1. Start the local service. 2. Reuse the authorized Feishu profile. 3. Visit every declared desktop route and inspect responses/page errors. | 30 routes reach the intended page without white screen, 500, unhandled exception, or authorization loop. | 30/30 routes passed; authenticated status verification reported page errors 0 and external requests 0. | `handoffs/web.md` § Commands and Exact Results / Real TEST_ closure evidence | none | passed | none |
| FQA-AC-03 | AC-03 兼容性路由 | executed | 1. Run the 360 px route suite. 2. Run 200% zoom checks. 3. Run narrow header/talent cases. | Core navigation, content, and operations remain reachable without blocking overlap/crop. | 360 px passed 30/30; 200% passed 4/4; header passed 5/5; talent layout passed 15/15. | `handoffs/web.md` § Web Experience Evidence | none | passed | none |
| FQA-AC-04 | AC-04 真实上线申请闭环 | executed | 1. Use a unique `TEST_` application. 2. Upload icon and attachment. 3. Submit approval. 4. Synchronize status. 5. Open list/detail/status page. | The same application, instance, applicant, authorization data, icon, and attachment are shown. | Latest application is `APPROVED`; list/detail/sync identifiers match; applicant 关胜, user `3d8egf55`, department 董事长办公室, icon, attachment, and hashes are visible. | `handoffs/web.md` § Real `TEST_` closure evidence; `.local/feishu-onboarding-applications.json` | none | passed | none |
| FQA-AC-05 | AC-05 批准后多表投影 | executed | 1. Read the run ledger. 2. Read remote 上架申请, 附件资料, 应用索引, 海能work应用详情. 3. Compare keys/run IDs/instance/file count. | Four projection categories are uniquely related to the same `TEST_` application without cross-link or duplicate. | Five records across four tables matched the same application key/run ID: 1 application, 2 attachments, 1 index, 1 Haineng detail. | `handoffs/web.md` § Real `TEST_` closure evidence; `.local/feishu-onboarding-poc-ledger.json` | none | passed | none |
| FQA-AC-06 | AC-06 数据与权限边界 | executed | 1. Run write-gate regression. 2. Inspect authorized recovery URL. 3. Verify ledger ownership for remote records. | Only ledger-owned `TEST_` data is mutable; authorization and non-`TEST_` gates cannot be bypassed. | 24/24 routes enforced blocked mode with 0 unintended writes; grant URL was same-origin; all POC records carried `TEST_` ownership. | `handoffs/web.md` § Commands and Exact Results / Real `TEST_` closure evidence | none | passed | none |
| FQA-AC-07 | AC-07 最终结论 | executed | 1. Confirm AC-01–AC-06 evidence. 2. Review code verdict. 3. Count open defects/blockers. | The POC may pass only with complete evidence and zero blocking defects. | AC-01–AC-06 passed; code review approved; open defects 0; unresolved blockers 0. | `reviews/code-review.md`; this report | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-VAL-01 | `TEST_` write ownership | executed | Run browser write gates and compare approved projection records to the current POC ledger. | No write outside the current ledger-owned `TEST_` set. | 0 unintended writes; every verified remote record matched the `TEST_` run ID. | `handoffs/web.md` § Commands and Exact Results / Real `TEST_` closure evidence | none | passed | none |
| FQA-VAL-02 | Authorization and same-origin recovery | executed | Use the authorized profile, inspect session state and grant URL, and exercise route/status entry. | Valid session remains authenticated; recovery is same-origin; no raw JSON authorization page. | Session authenticated; same-origin grant URL verified; no unexpected authorization loop or raw JSON entry. | `handoffs/web.md` § Real `TEST_` closure evidence | none | passed | none |
| FQA-VAL-03 | Required fields, file type/size, and duplicate-submit guards | executed | Execute onboarding unit/integration/POC/browser suites with valid/invalid form and upload cases. | Invalid data is rejected visibly and submit/upload cannot duplicate the full business request. | Validation, upload, pending, retry, and duplicate-submit contracts passed; valid icon/attachment hashes persisted. | `npm run test:onboarding-poc`; `npm run test:browser:onboarding-apply`; `handoffs/web.md` | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-STATE-01 | 正常 | executed | Load declared pages; use filters/navigation/upload/submit/view/refresh. | Primary journeys work and expose correct real data. | 30/30 routes and the onboarding browser journey passed. | `handoffs/web.md` § Commands and Exact Results | none | passed | none |
| FQA-STATE-02 | 加载 | executed | Trigger homepage refresh, onboarding submit/status refresh, and inspect concurrent request behavior. | Understandable waiting state; one background job; controls remain reachable; no repeated full request. | Loading contracts passed and request banner no longer captures pointer events. | `src/style.css:28`; `npm test`; `npm run test:integration` | none | passed | none |
| FQA-STATE-03 | 空数据 | executed | Run empty-list/filter/reset contracts for materials and integrated pages. | Explicit empty state and effective reset/clear actions. | Empty-state and filter control contracts passed; full integration suite stayed green. | `npm run test:integration`; `handoffs/web.md` | none | passed | none |
| FQA-STATE-04 | 错误 | executed | Exercise Feishu read/upload/approval failure contracts and retained-cache path. | Actionable message, retry/recovery, and retained usable data where available. | Error and stale-cache contracts passed; no white screen or raw error page occurred in browser regression. | `npm test`; `npm run test:integration`; `handoffs/web.md` | none | passed | none |
| FQA-STATE-05 | 禁用 | executed | Trigger submitting/missing-required/no-write states and run write gates. | Duplicate or unauthorized operations cannot be triggered. | Submit guards and 24/24 blocked write routes passed with 0 writes. | `npm run test:onboarding-poc`; `handoffs/web.md` | none | passed | none |
| FQA-STATE-06 | 权限要求 | executed | Verify the authorized session, same-origin recovery URL, and authenticated page entry contracts. | Authorization uses the normal recovery path and never exposes an incomprehensible JSON page. | Authorized entry passed and the recovery URL is same-origin; no authorization loop was seen. | `handoffs/web.md` § Real `TEST_` closure evidence | none | passed | none |
| FQA-STATE-07 | 窄屏与放大 | executed | Run 360 px, 320/760 px onboarding, five narrow widths, and 200% zoom scenarios. | Navigation, content, focus, and primary operations remain reachable. | All declared responsive suites passed with no blocking overlap or clipping. | `handoffs/web.md` § Web Experience Evidence | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FQA-REG-01 | 首页聚合、旧缓存与非阻塞刷新 | executed | Run homepage aggregate unit/browser checks and trigger background refresh. | One aggregate flow, old data retained on refresh failure, page controls not blocked. | Aggregate browser check passed; stale-cache contracts passed; request banner is non-blocking. | `handoffs/web.md`; `src/style.css:28` | none | passed | none |
| FQA-REG-02 | 应用中心、我的申请与审批详情 | executed | Navigate from application/profile entries to list/detail and refresh status. | Entries route correctly and show the same persisted application. | Route regressions and authenticated list/detail/status verification passed. | `handoffs/web.md` § Real `TEST_` closure evidence | none | passed | none |
| FQA-REG-03 | 素材中心查询、重置、清空筛选 | executed | Execute materials interaction and integration suites with empty and populated projections. | All three controls change query/filter state and remain usable in empty state. | Materials route/interaction contracts passed as part of full and integration suites. | `npm test`; `npm run test:integration`; `handoffs/web.md` | none | passed | none |
| FQA-REG-04 | 顶部导航、人才页面与头像资源 | executed | Run desktop/narrow navigation suites and inspect network/page errors. | No clipped header, broken avatar, external image dependency, or page error. | Header 5/5 and talent 15/15 passed; local avatar fallback used; external requests 0 on closure page. | `src/pages/WorkbenchPage.vue:8`; `handoffs/web.md` | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

This report does not modify implementation, tests, builds, handoffs, approvals, governed QA fields, or task state. Platform compatibility and the governed final QA result remain owned by Compatibility QA.
