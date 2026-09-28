# Web Engineering Handoff

Owned by the Web engineer for task `DEH-SYSTEM-POC-CLOSURE-20260927`.

## Repository and Task Branch

- Repository: `web-task-merged`
- Task branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Framework: Vue Web
- Service base path: `/test2/`
- Delivery boundary: local and pre-release POC verification only; no production deployment, merge, push, or non-`TEST_` write was performed.

## Approved Inputs

- Governed task: `../task.json`
- Approved PRD: `../prd.md`
- Approved aggregate design: `../design-handoff.md`
- UX handoff: `../design/ux-handoff.md`
- UI handoff: `../design/ui-handoff.md`
- Web acceptance criteria: PRD AC-01 through AC-07.
- Authentication rule: use a real Feishu-authorized session and normal authorization recovery; never bypass the authorization gate.
- Data rule: real writes are limited to uniquely traceable `TEST_` data owned by the current POC ledger.

## Changed Files

The closure task made or verified the following task-specific Web changes on top of the existing dirty task branch:

- `src/pages/WorkbenchPage.vue`: removed the external avatar dependency and retained a local fallback so the workbench has no third-party image request failure.
- `src/style.css`: made the global request-activity banner non-blocking so it cannot intercept page controls while background requests are active.
- `tools/browser-onboarding-apply-flow.test.mjs`: aligned the browser flow with the current authorized session, dictionary projection, file upload, application submit, approval instance, and status-sync contracts.
- `tools/browser-narrow-header-clip.test.mjs`: reused the authorized browser profile, used bounded navigation waits, and validated the current seven-item top navigation.
- `tools/browser-talent-narrow-layout.test.mjs`: reused the authorized profile and bounded route navigation.
- `tools/verify-browser-write-gates.mjs`: exercised the current write-gate test panel through the authorized profile.

The branch already contained the approved onboarding, homepage aggregation, materials, profile-entry, OAuth, data-projection, server, and regression changes from the preceding governed tasks. They were treated as the integrated POC baseline and were not reset or overwritten. The dirty worktree therefore contains user-owned and earlier task-owned files outside this closure task.

## Commands and Exact Results

All commands below completed with exit code `0` on the task branch:

| Command | Exact result |
|---|---|
| `npm test` | passed; full unit/contract suite completed |
| `npm run test:integration` | passed; integration suite completed |
| `npm run test:no-mock-data` | passed; no prohibited mock business data detected |
| `npm run test:ui-source-sync` | passed; UI source synchronization checks completed |
| `npm run test:onboarding-poc` | passed; controlled service restart, authorization, upload, submission, approval status, projection, and accessibility contracts completed |
| `npm run build` | passed; production assets generated as `dist/assets/index-BCRKE5FV.css` and `dist/assets/index-B1IqFWwZ.js` |
| `npm run test:browser:onboarding-apply` | passed; output: `应用上线申请浏览器链路通过：RPA 后端提交、T005 飞书实例提交、真实状态查询` |
| homepage aggregate browser check | passed |
| desktop declared-route browser regression | passed, 30/30 routes |
| 360 px declared-route browser regression | passed, 30/30 routes |
| 200% zoom browser regression | passed, 4/4 scenarios |
| narrow header regression | passed, 5/5 widths (761/869/932/1000/1054 px) |
| talent narrow-layout regression | passed, 15/15 cases |
| browser write-gate regression | passed, 24/24 routes blocked correctly with 0 unintended writes |

Real `TEST_` closure evidence:

- POC ledger: `.local/feishu-onboarding-poc-ledger.json`, run `TEST_ONBOARDING_POC_20260926161450051_b5a9a634`, status `ACTIVE`, 23 governed objects.
- Application store: `.local/feishu-onboarding-applications.json`; the latest approved application and approval instance were visible through the authenticated API and status page.
- Read-only remote Base verification matched the configured Base fingerprint and verified five records across four tables: one 上架申请, two 附件资料, one 应用索引, and one 海能work应用详情. Every record matched the same application key and `TEST_` run ID.
- Authenticated browser/API verification passed: session authenticated; list and detail refer to the same approved application and instance; sync returns `APPROVED`; icon and attachment SHA-256 values are present; grant URL is same-origin; status page renders approved; page errors `0`; external requests `0`.
- The approved detail displayed applicant 关胜, authorized user `3d8egf55`, department 董事长办公室, and the uploaded icon and attachment.

## Web Experience Evidence

- Responsive coverage: 30 routes at desktop and 360 px; 200% zoom; header widths 761–1054 px; onboarding checks at 320/760 px.
- Pointer and keyboard reachability: the background request banner no longer captures pointer events; full interaction and accessibility suites passed; focus-visible and form-label contracts remained green.
- Loading, empty, error, disabled, permission-required, narrow-screen, and zoom states are covered by the full suite and specialized onboarding/browser checks.
- Authorization failures use the same-origin recovery path rather than a raw JSON page.
- Browser regressions reported no blocking overlap, clipping, white screen, resource 500, unhandled page error, or unexpected authorization loop.

## Unrun Checks, Constraints, and Risks

- Feishu Base projection fields are eventually consistent. Read-only verification required at most five bounded reads for one attachment record and two reads for another/detail projection; the application data stayed correct. Owner: Web Engineer. Status: governed by bounded read retry and retained-cache behavior.
- The strict external eight-day live-restart artifact expected by `tools/verify-live-onboarding-poc.mjs` was not produced. It is outside the approved task acceptance boundary: PRD section 7 explicitly leaves long-term OAuth persistence to a separate task. The controlled eight-day service contract included in `npm run test:onboarding-poc` passed.
- No production release or deployment was attempted. No non-`TEST_` record was created, changed, or deleted.
- Rollback consideration: revert only closure-task source/test changes on this task branch, rebuild, rerun the listed suites, and preserve `.env.local`, authorized browser profiles, local evidence, and remote `TEST_` evidence.

## Governed Platform Check

Evidence path supplied to the governed Web platform check: `.ai-team/tasks/DEH-SYSTEM-POC-CLOSURE-20260927/handoffs/web.md`.
