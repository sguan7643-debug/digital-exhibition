# Web handoff — DEH-ENTRY-PERF-20260916

## Delivered implementation

- Entry authentication now uses the configured normalized application base (`/` locally and `/test2` in the test deployment) before mounting protected page integrations.
- Feishu upstream calls use an 8-second deadline, safe templated diagnostics, and tenant-token single-flight.
- Each server `readAll` has a 10-second aggregate budget and at most one retry for 429/502/504 across all its pages.
- Concurrent first-screen `COM-005` and `WB-002` work shares in-flight dictionary reads; duplicate page operation IDs are suppressed.
- Browser remote mode defaults to 12 seconds. A timed-out first-screen request clears activity and shows a local retry banner while retaining already available content. Authenticated business-request progress is now an in-flow, non-blocking status banner: it remains clearly visible, does not cover the viewport, intercept pointer/keyboard input, or steal focus, and exits in `finally`. The pre-mount entry-session decision retains its dedicated full-screen entry surface.

## Task-owned files

- `server/feishu-open-api-client.mjs`
- `server/feishu-read-only-service.mjs`
- `src/integration/app-base-path.js`
- `src/integration/feishu-entry-auth-guard.js`
- `src/integration/entry-bootstrap.js`
- `src/integration/page-read-request-plan.js`
- `src/integration/runtime-config.js`
- `src/App.vue`
- `src/style.css`
- `README-DEPLOY.md`
- relevant focused test files under `tools/`

## Verification evidence

Passed:

```text
node tools/feishu-entry-auth-guard.test.mjs
node tools/app-shell.test.mjs
node tools/feishu-open-api-client.test.mjs
node tools/feishu-read-only-service.test.mjs
node tools/page-read-request-plan.test.mjs
node tools/first-screen-request-budget.test.mjs
pnpm check
pnpm build
pnpm test:integration
pnpm test
git diff --check
```

The full suite initially stopped at a stale root-route source assertion. It was corrected to assert the current base-aware `/` and `/test2` `replaceState` behavior; the targeted test and then the complete UI suite passed.

## 2026-09-18 live verification and budget correction

The first live concurrent probe exposed a mismatch between the approved budget and the implementation defaults: upstream/read/browser values still allowed 12/20/30 seconds. A red-green regression cycle corrected the boundaries to 8/10/12 seconds, raised the existing safe upstream concurrency default from four to eight, and made the application and current-user projections share one minimum-field user-dictionary read.

Fresh browser verification reused the explicitly authorized Feishu browser profile and performed no record write, approval submission, deletion, or schema change. Evidence: `evidence/live-first-screen-20260918.json`.

| Operation | HTTP | Elapsed | Result |
| --- | ---: | ---: | --- |
| `COM-001` | 200 | 6738 ms | passed |
| `COM-002` | 200 | 6738 ms | passed |
| `COM-005` | 200 | 4908 ms | passed |
| `WB-001` | 200 | 9582 ms | passed |
| `WB-002` | 200 | 9582 ms | passed |

The authenticated `/workbench` path returned all five operations without a 401 or a result beyond the 12-second browser budget. The formal Feishu Bitable was treated as the current source of truth; this verification was controlled and read-only.

The first independent code review identified the authenticated full-screen request overlay as a P1 interaction defect. A red-green correction replaced it with the non-blocking status banner and added regression coverage in `tools/global-request-loading-remediation.test.mjs` and `tools/first-screen-request-budget.test.mjs`. The complete integration, UI, static, build, and whitespace checks passed again after that correction.

Additional changed files for the correction:

- `server/feishu-open-api-client.mjs`
- `server/feishu-read-only-service.mjs`
- `src/integration/runtime-config.js`
- `tools/feishu-open-api-client.test.mjs`
- `tools/feishu-read-only-service.test.mjs`
- `tools/first-screen-request-budget.test.mjs`
- `README-DEPLOY.md`

Remaining QA work is independent review of functional, code-review, and compatibility evidence. No production deployment or release action is authorized by this handoff.

## Rollback

Revert only the task-owned source/test changes as one reviewed change set. Do not revert or reset the shared working tree wholesale: it contained unrelated user changes before this task began.
