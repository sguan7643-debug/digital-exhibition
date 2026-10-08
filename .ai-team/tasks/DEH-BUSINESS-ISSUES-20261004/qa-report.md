# Cross-platform / Compatibility QA Report

- **Task:** `DEH-BUSINESS-ISSUES-20261004`
- **Role:** Cross-platform / Compatibility QA
- **Result:** `passed`
- **Recorded at:** `2026-10-06T11:35:46.6541979+08:00`
- **Declared platforms:** Web/Vue only; no uni-app/mobile target declared.

## Input Completeness

| Input | Status | Evidence |
| --- | --- | --- |
| `task.json` | reviewed | State is `qa`; Web/Vue declared; mobile not declared. |
| `task-brief.md` | reviewed | Feishu issue matrix and scope constraints present. |
| `prd.md` | reviewed | AC-1 through AC-11 and platform expectations present. |
| `design-handoff.md` | reviewed | Aggregate design decisions and Web-only platform boundary present. |
| `engineering-handoff.md` | reviewed | Aggregate engineering evidence and runnable command list present. |
| `reviews/code-review.md` | reviewed | Verdict `approved`; no findings. |
| `functional-qa-report.md` | reviewed | Functional QA result `passed`; no defects or blockers. |
| Governed task validation | passed | `validate-task.ps1 -EnforceLocation` returned `VALID`. |

## Commands Re-run

| Command | Result |
| --- | --- |
| `npm run test:business-issues` | passed |
| `npm run test:feishu-latency` | passed |
| `npm run test:no-mock-data` | passed |
| `npm run test:homepage-aggregate` | passed |
| `node tools/application-page-actions.test.mjs` | passed |
| `node tools/application-use-flow.test.mjs` | passed |
| `node tools/application-interaction-flow.test.mjs` | passed |
| `npm run test:ui-source-sync` | passed |
| `npm run check` | passed |
| `npm test` | passed |
| `npm run test:integration` | passed |
| `npm run test:onboarding-poc` | passed |
| `npm run build` | passed; Vite 6.4.1 transformed 1935 modules and emitted `dist/index.html`, CSS, and JS assets. |
| `npm run test:browser:onboarding-apply` | passed with preview origin `http://127.0.0.1:4173/test2`. |
| `npm run test:browser:ui-parity` | passed with `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173/test2` and `EXHIBITION_REFERENCE_ORIGIN=http://127.0.0.1:4174/test2`; 15 cases. |
| `npm run test:browser:360-routes` | passed with `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173/test2`; 30 routes. |
| `npm run test:browser:200pct-shell` | passed with `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173/test2`; 4 routes. |

Note: the first browser attempts without explicit `/test2` origins reached the preview server but timed out waiting for `#main-content` on non-base routes. They were treated as environment setup failures, not product defects, and were re-run with the declared test base origin.

## Compatibility Matrix

| Environment / device | Viewport or size | Build identifier | Scenario | Expected platform behavior | Actual behavior | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Web, Edge/Chromium headless, local preview | 1440x1000 | `npm run build`, Vite 6.4.1, 1935 modules | Onboarding apply flow | Contact autofill, T003/T005 submit routing, live status, rejected copy and keyboard/screen-reader contract work at desktop size. | Browser flow passed. | passed | `npm run test:browser:onboarding-apply` |
| Web, Edge/Chromium headless, local preview | desktop 1440x1000, narrow 900x900, mobile 390x844 | `npm run build`, Vite 6.4.1, 1935 modules | Reference UI parity on `/workbench`, `/apps`, `/profile`, `/certification`, `/talent/people` | Current shell, topbar, sidebar, main background, no global request bubble, and no horizontal overflow match the approved reference package. | 15 cases passed. | passed | `npm run test:browser:ui-parity` |
| Web, Edge/Chromium headless, local preview | 360x800 | `npm run build`, Vite 6.4.1, 1935 modules | Narrow route overflow for 30 routes | Every route returns 200, has no page errors, no remote requests, no document/main overflow, and accessible horizontal-scroll regions where needed. | 30 routes passed, 0 failures. | passed | `npm run test:browser:360-routes` |
| Web, Edge/Chromium headless, local preview | 720 CSS px with 200% zoom simulation | `npm run build`, Vite 6.4.1, 1935 modules | 200% zoom focus and shell behavior on `/workbench`, `/apps`, `/admin`, `/talent/people` | Topbar/nav remain inside viewport and focused control has visible focus and accessible name. | 4 routes passed, 0 failures. | passed | `npm run test:browser:200pct-shell` |
| Web, Node/Vite runtime | Not visual | `npm run build`, Vite 6.4.1, 1935 modules | Static/unit/integration compatibility baseline | Source audit, route contracts, same-origin auth, approval, write gates, cache, stale fallback, no-mock data, and real projections remain compatible with Web runtime. | All re-run commands passed. | passed | `npm run check`; `npm test`; `npm run test:integration`; `npm run test:business-issues`; `npm run test:feishu-latency`; `npm run test:no-mock-data`; `npm run test:homepage-aggregate`; `npm run test:onboarding-poc` |

## Defects

None.

## Unresolved Blockers

None.

## QA Gate

- Code review is non-blocking: `reviews/code-review.md` verdict is `approved`.
- Functional QA is evidence-backed and passed: `functional-qa-report.md`.
- Declared Web platform compatibility passed.
- No mobile/uni-app platform is declared, so no mobile pass is claimed.
- Blocking defects: `0`.

Compatibility QA is ready to record the governed QA result as `passed`.
