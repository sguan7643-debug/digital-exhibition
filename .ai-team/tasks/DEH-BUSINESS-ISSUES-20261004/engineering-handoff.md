# Engineering Handoff — DEH-BUSINESS-ISSUES-20261004

Owner: AI Product Team Lead

## Source Evidence

- Platform source handoff: `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/handoffs/web.md`.
- Approved scope and design: `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/prd.md`, `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/design-handoff.md`.
- Governed task packet validation: `pwsh -NoProfile -ExecutionPolicy Bypass -File C:\Users\20266\.codex\plugins\cache\personal\ai-product-team\0.1.0+codex.20260814074815\scripts\validate-task.ps1 -TaskFile C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\.ai-team\tasks\DEH-BUSINESS-ISSUES-20261004\task.json -EnforceLocation` returned `VALID`.
- Branch reported by Web Engineer: `task/digital-exhibition-ui-0817-dev-r3-web`.
- Current declared platforms in `task.json`: Web only; mobile/uni-app is `not declared`.

## Implementation Summary

The Web implementation completes the approved business issue remediation without deployment, merge, publication, production configuration changes, Feishu schema mutation, or live data cleanup.

Implemented behavior:

1. Application onboarding form now uses real selected-user lookup for contact phone/email autofill, keeps fields editable, and validates applicant/contact phone and email on the client and server.
2. Application code handling is contract-driven and visible: supported real submission types require user-entered codes; the unique identifier is not reused as an application code.
3. Unsupported application types are disabled before submission, while T003 and T005 remain the only real submission paths in this scope.
4. Permission scope selection explains all-organization versus assigned-scope behavior and clears conflicting department/user restrictions.
5. Rejected onboarding requests can be copied into a new auditable attempt for the original owner; the old record and approval identifiers remain unchanged.
6. Application cards resolve actions from real authorization, launchability, and the currently executable application-request channel: `立即使用`, `申请使用`, or disabled `暂不可用`. `/apps` declares the `APP-005` request contract, but normal remote runtime without the controlled write gate now renders a disabled unavailable action instead of a clickable request that would fail at execution.
7. Application detail attachments render as bounded file presentations instead of raw objects and preserve narrow-screen layout.
8. Existing IndexedDB/server-memory cache, request dedupe, stale-while-refresh, background refresh, update time, BroadcastChannel sharing, and no global request bubble behavior remain under regression coverage.

## Changed Files

Tracked files changed:

- `package.json`
- `server/feishu-approval-service.mjs`
- `server/feishu-onboarding-service.mjs`
- `server/feishu-read-only-service.mjs`
- `src/App.vue`
- `src/components/AppDetailAuthoritativeBody.vue`
- `src/components/AppDetailLiveSections.vue`
- `src/components/ExhibitionShell.vue`
- `src/integration/operation-contract-schemas.js`
- `src/integration/page-integration-matrix.js`
- `src/pages/AppsPage.vue`
- `src/pages/OnboardingApplyPage.vue`
- `src/pages/OnboardingPage.vue`
- `src/style.css`
- `tools/browser-200pct-shell.test.mjs`
- `tools/browser-onboarding-apply-flow.test.mjs`
- `tools/feishu-integration-foundation.test.mjs`
- `tools/feishu-onboarding-service.test.mjs`
- `tools/feishu-server-proxy.test.mjs`
- `tools/first-screen-request-budget.test.mjs`
- `tools/global-request-loading-remediation.test.mjs`
- `tools/onboarding-apply-interaction.test.mjs`
- `tools/review-remediation.test.mjs`
- `tools/structural-shell-calibration.test.mjs`
- `tools/unified-header-remediation.test.mjs`
- `tools/verify-browser-360-route-overflow.mjs`

New task or implementation files:

- `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/`
- `src/integration/application-card-policy.js`
- `src/integration/attachment-presentation.js`
- `src/integration/onboarding-form-policy.js`
- `tools/business-issues-20261004.test.mjs`

Related untracked prior UI parity task packet remains present and is not owned by this engineering aggregate:

- `.ai-team/tasks/DEH-UI-PARITY-20260930/`
- `tools/browser-ui-reference-parity.test.mjs`
- `tools/ui-reference-parity-20260930.test.mjs`

## Verification Results

Commands run after the implementation:

- `npm run test:business-issues` — passed.
- `node tools/feishu-integration-foundation.test.mjs` — passed.
- `node tools/application-page-actions.test.mjs && node tools/application-use-flow.test.mjs && node tools/application-interaction-flow.test.mjs` — passed.
- `npm run check` — passed.
- `npm test` — passed.
- `npm run test:integration` — passed.
- `npm run build` — passed; Vite 6.4.1 transformed 1935 modules and produced `dist/index.html`, CSS, and JS assets.

Code-review follow-up:

- First code review returned `changes_required` because `/apps` showed `申请使用` from `testWritesEnabled` rather than a declared application-request contract.
- The first Web fix added `APP-005` to the `/apps` integration contract.
- Second code review returned `changes_required` because the button could still be enabled in normal remote mode while its click path used the test-write-gated executor.
- The current Web fix passes `request-action-enabled` from `App.vue` to `AppsPage`, requiring both `APP-005` declaration and the currently executable controlled write channel before the card shows a clickable `申请使用`; otherwise it remains `暂不可用` with a reason.
- The latest Web handoff records `CHECK web passed` at `2026-10-06T03:10:29.0872663Z` after the current request-action fix.

Commands and broader browser evidence reported by the Web Engineer in `handoffs/web.md`:

- `npm run test:onboarding-poc` — passed.
- `npm run test:ui-source-sync` — passed.
- `npm run test:feishu-latency` — passed.
- `npm run test:first-screen-budget` — passed.
- `npm run test:no-mock-data` — passed.
- `npm run test:homepage-aggregate` — passed.
- `git diff --check` — passed, with only existing Windows line-ending warnings reported.
- `npm run test:browser:onboarding-apply` — passed at 1440×1000.
- `npm run test:browser:ui-parity` — passed for 15 route/viewport cases.
- `npm run test:browser:360-routes` — passed for 30 routes at 360×800.
- `npm run test:browser:200pct-shell` — passed for four routes at simulated 200% zoom.

## Platform Coverage

- Web/Vue: declared, implemented, and recorded as passed in `task.json` with evidence `.ai-team/tasks/DEH-BUSINESS-ISSUES-20261004/handoffs/web.md`.
- Mobile/uni-app: not declared in `task.json`; no `handoffs/mobile.md` is required for this task.

## Rollback Readiness

- Status: `ready`.
- Owner: deployment operator or repository maintainer for the Web package.
- Trigger: blocking regression found before release, failed deployment smoke test, or business rejection of this task's behavior.
- Procedure:
  1. Revert this task's Web/source/test changes from the task branch or restore the last known good Git revision before `DEH-BUSINESS-ISSUES-20261004`.
  2. Rebuild with `npm run build`.
  3. Re-run at minimum `npm test`, `npm run test:integration`, `npm run test:business-issues`, and `npm run check`.
  4. If a test server package was produced later by a release actor, rebuild the package from the reverted revision and replace the deployed test package only after the same smoke checks pass.
- Verification evidence: current forward implementation passes the core unit, integration, business, static, and production build commands listed above.

## Known Risks and Non-Actions

- No live Feishu mutation, schema apply, duplicate-field cleanup, deployment, merge, push, package publication, or release action was executed as part of this handoff.
- Contact phone/email autofill depends on the authenticated Feishu app having permission to read those contact fields; if unavailable, the form keeps manual entry and validation.
- Rejected-copy file reuse only works for safe local controlled file references; otherwise users must upload required files again.
- Additional real approval contracts for unsupported types remain out of scope and require a successor task.
