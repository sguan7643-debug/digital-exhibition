# Web Engineering Handoff — Incremental Sync Recovery Repair

Status: partial implementation evidence; this is not the completed 30-route UI parity handoff and no governed Web pass has been recorded.

Branch: `task/digital-exhibition-ui-0817-dev-r3-web`

## Bounded implementation

- Preserved the foreground request-processing loading bubble and its polite live announcement.
- Removed the user-facing “正式飞书数据正在首次同步” wording from frontend state, aggregate and request-error paths.
- Continued polling the same homepage or operation sync task after a retryable task-status HTTP failure such as 500/504; the original business request is not replayed.
- Accepted `queued` as a valid operation task state and handled `expired` as a terminal state.
- Converted a rejected page-level batch request into structured per-section failures so the page leaves loading state and retains its automatic retry scope.
- Kept route cancellation connected to the request signal so tracked foreground activity is released in `finally`.

## Changed files for this increment

- `src/App.vue`
- `src/integration/data-state.js`
- `src/integration/page-data-source.js`
- `src/integration/persistent-homepage-client.js`
- `src/integration/safe-proxy-client.js`
- `tools/frontend-sync-recovery.test.mjs`
- `tools/homepage-aggregate-browser.test.mjs`
- `tools/onboarding-apply-interaction.test.mjs` (updates a stale source-shape assertion; production form logic was already correct)
- `package.json` (adds the focused recovery test to `test:integration`; preserves the pre-existing server-cache script changes)

## Test-first evidence

Initial failing command:

```text
node tools/frontend-sync-recovery.test.mjs
```

Initial result: failed on the first retryable homepage task-status error because polling stopped immediately.

Passing checks after implementation:

```text
node tools/frontend-sync-recovery.test.mjs             PASS
node tools/global-request-loading-remediation.test.mjs PASS
node tools/feishu-page-batch.test.mjs                  PASS
npm run test:homepage-aggregate                        PASS
npm run test:first-screen-budget                       PASS
npm run test:homepage-aggregate:browser                PASS
npm run check                                           PASS
npm run test:integration                                PASS
npm run test:ui-source-sync                             PASS
npm test                                                PASS
npm run build                                           PASS
git diff --check                                        PASS (line-ending warnings only)
```

Browser evidence covers a homepage `202` handoff, one task-status `504`, successful polling of the same task, result rendering, loading dismissal, no uncaught page error, and 320/760/1366/1920 widths.

The UI suite initially exposed a stale onboarding source-shape assertion. The production form already computes `applicantDepartmentId` once and submits it in both required department fields; the assertion was updated to validate that equivalent implementation, after which the complete UI source suite passed.

## Accessibility and behavior

- `.request-loading-toast` remains non-modal, non-intercepting and `aria-live="polite"`.
- Removed first-sync wording does not remove loading feedback.
- Automatic polling reuses the server-provided task identifier and remains abortable on route change.

## Known risks / unrun checks

- The repaired frontend has not been deployed to the shared test server in this increment.
- Live cache-hit rate, snapshot restoration, task terminal contracts and homepage aggregate correctness remain backend-owned and must be reverified after backend redeployment.
- The wider 30-route UI parity implementation and evidence matrix are not complete, so `record-platform-check.ps1` was intentionally not invoked.
