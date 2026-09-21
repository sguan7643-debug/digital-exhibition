# Cross-platform Compatibility QA Report

- Task: `DEH-REQ-GAP-20260910`
- Role: 011 — Cross-platform / Compatibility QA
- Review date: 2026-09-13 (Asia/Shanghai)
- Outcome: **passed; governed registration recorded**
- This report is present at the target task packet's `qa-report.md` path. Compatibility evidence and report contents were verified in place before registration.

## Gate and evidence inputs

- `task.json`: `state=qa`; scope and design approvals are `true`; `platforms=["web"]`, `mobile_framework="none"`, and `mobile_targets=[]`. Mobile is not declared and is not applicable to the declared scope.
- Validation: Windows PowerShell 5.1.26100.9444 ran `validate-task.ps1 -TaskFile <absolute task.json> -EnforceLocation`; result `VALID`.
- Repository/build identity: branch `task/digital-exhibition-ui-0817-dev-r3-web`, HEAD `49eebedb2d859dc0344c61ddd13aa76210cc3548`, matching the aggregate engineering handoff.
- Approved PRD and design aggregate are present; design review is `approved` within its bounded review scope.
- `reviews/code-review.md`: verdict `approved`; prior findings are resolved and no blocking finding remains.
- `functional-qa-report.md`: evidence-backed `passed`; no unresolved functional blocking defects are reported. Its boundaries (including no claim of D01–D11 production integration readiness) remain in force.
- `engineering-handoff.md` is the sole source of engineering facts; `handoffs/web.md` was not read. It identifies Web only and mobile/uni-app as not declared.

## Command re-verification

Commands below were independently rerun by 011 against the target HEAD unless explicitly attributed to the fresh Team Lead evidence. Initial isolated-environment `spawn EPERM` launch failures were superseded by the fresh main-environment rerun at the same verified HEAD; they are retained here as environment history, not current blockers.

| Command | Result | Evidence |
|---|---|---|
| `npm run test:deh-req-gap` | exit 0 | This QA execution; target HEAD above |
| `npm run test:ui-source-sync` | exit 0 | This QA execution; target HEAD above |
| `npm test` | exit 0 | This QA execution; target HEAD above |
| `npm run test:integration` | exit 0 | This QA execution; full integration contract completed |
| `npm run check` | exit 0 | This QA execution; target HEAD above |
| `npm run build` | exit 0; 1946 modules; CSS 300.09 kB, JS 1044.26 kB | Fresh Team Lead main-environment evidence, 2026-09-13T05:28:04.732Z |
| `git diff --check` | exit 0 | This QA execution; target HEAD above |
| `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:30-routes` | exit 0; 30/30 route cases | Fresh Team Lead main-environment evidence |
| `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:200pct-shell` | exit 0; 4/4 shell cases | Fresh Team Lead main-environment evidence |
| `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:360-routes` | exit 0; 30/30 route cases | Fresh Team Lead main-environment evidence |
| `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:narrow-header` | exit 0; 5/5 widths | Fresh Team Lead main-environment evidence |
| `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:talent-narrow` | exit 0; 15/15 route-width cases | Fresh Team Lead main-environment evidence |
| `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:write-gates` | exit 0; 23/23 write-gate cases | Fresh Team Lead main-environment evidence |

Fresh main-environment evidence was read-only verified at:
`C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\.ai-team\tasks\DEH-REQ-GAP-20260910\evidence\compatibility-main-run.md`

- Length: `5591` bytes
- SHA-256: `1111F7E81E0715E7C0B5F9E9A89D7D8CB5B0E150A3F5E4283E18DAC28242CAD3`
- Recorded HEAD: `49eebedb2d859dc0344c61ddd13aa76210cc3548`
- All six browser commands and the build are recorded exit 0. Output excerpts include passing assertions (`passed: true`), 200% visible keyboard focus and accessible names, 360px no page-level overflow with no remote requests, and write-gate blocked states.

## Web compatibility matrix

Environment: Playwright Microsoft Edge in the Team Lead main project environment; local preview `http://127.0.0.1:4173`. The evidence identifies the tested commit but does not record an Edge version. Build identifier for all rows: `49eebedb2d859dc0344c61ddd13aa76210cc3548`.

| Platform | Browser / environment | Viewport / size | Scenario | Expected platform behavior | Actual behavior | Result | Evidence path |
|---|---|---|---|---|---|---|---|
| Web | Playwright Microsoft Edge; local preview | Script desktop default | All 30 declared routes: response, mount, exceptions, requests | Every route returns 200 and mounts, without page errors or unexpected non-local requests | 30/30 route command completed exit 0; structured route output includes mounted HTTP 200 cases | Passed | `evidence/compatibility-main-run.md` § browser-30-routes |
| Web | Playwright Microsoft Edge; local preview | 720×500 at 200% shell zoom | Workbench, apps, admin, talent shell geometry and keyboard focus | Shell remains operable; visible focus and accessible names; no critical clipping | 4/4 passed; result excerpts show `focusedVisible: true` and named controls | Passed | `evidence/compatibility-main-run.md` § browser-200pct-shell |
| Web | Playwright Microsoft Edge; local preview | 360×800 | All 30 routes: page overflow, exceptions, non-local requests | No page-level horizontal overflow; expected local table regions may scroll; no page errors or unexpected remote requests | 30/30 passed; excerpt shows viewport/document/body/main widths all 360, no overflowers, and no remote requests | Passed | `evidence/compatibility-main-run.md` § browser-360-routes |
| Web | Playwright Microsoft Edge; local preview | 761, 869, 932, 1000, 1054 px | Shared header wrapping, clipping and destination visibility | Header destinations remain visible and controls do not clip | 5/5 passed; excerpt records all expected visible destinations | Passed | `evidence/compatibility-main-run.md` § browser-narrow-header |
| Web | Playwright Microsoft Edge; local preview | Talent routes × widths 761–1054 px | Talent list/table narrow layout and page overflow | Local table scrolling remains usable; page has no errors or unexpected remote requests; unconfigured writes remain blocked | 15/15 passed; excerpts show HTTP 200, no errors/remote requests, blocked write state | Passed | `evidence/compatibility-main-run.md` § browser-talent-narrow |
| Web | Playwright Microsoft Edge; local preview | Script desktop default | 23 route-specific write gates | Unconfigured write actions are visibly blocked and do not issue write requests | 23/23 passed; excerpt confirms visible blocked states with zero rendered write actions on representative protected routes | Passed | `evidence/compatibility-main-run.md` § browser-write-gates |
| Web | Playwright Microsoft Edge plus independently rerun test/check suites | Declared Web routes and controls | Keyboard traversal, visible focus, names/semantics, route navigation, and safe unconfigured/recovery states | Keyboard users retain visible focus and named controls; route navigation and safe blocked states remain coherent | Browser Tab traversal was exercised in 200% shell cases with visible focus; route coverage completed 30/30; static/integration contract suites passed; write gates visibly blocked | Passed for the tested compatibility contracts | `evidence/compatibility-main-run.md`; `npm test`, `npm run test:integration`, `npm run check` results above |
| Mobile | Not declared | N/A | Mobile / uni-app compatibility | Not applicable to declared scope | `platforms=["web"]`, `mobile_framework="none"`, `mobile_targets=[]`; aggregate engineering handoff also says mobile is not declared | Not applicable to declared scope | Task `task.json`; `engineering-handoff.md` |

## Defects and residual evidence limits

- Unresolved blocking defects across Functional QA and compatibility QA: **0**. Functional QA reports no unresolved blocking defect; the fresh compatibility runs passed their declared assertions. D01–D11 are not reclassified as compatibility defects; their dependency-unmet states remain governed by Functional QA and the engineering handoff.
- The isolated worker's earlier `spawn EPERM` was an execution-environment limitation and was resolved for this evidence set by the fresh main-environment rerun at the same commit.
- This report does not claim a 30-page raw-float SSIM run, text-only zoom testing, assistive-technology narration, or production D01–D11 E2E. These are not represented as completed evidence or used to claim product integration readiness.

## QA decision and registration

The code review is non-blocking, Functional QA is evidence-backed passed, the declared Web build/static/browser checks passed on the current commit, the required Web compatibility rows passed, mobile is consistently not declared, and the deduplicated unresolved blocking-defect count is zero. The governed result to record is therefore `passed` with `BlockingDefects=0`.

The governed result was recorded through `record-qa-result.ps1` under Windows PowerShell 5.1 with this target task packet report as `-Evidence` (`QA passed`). The script wrote the QA fields; `task.json` was not edited directly. The report records only tested Web compatibility and the dependency-unmet safe branch; it does not claim production readiness or release approval.
