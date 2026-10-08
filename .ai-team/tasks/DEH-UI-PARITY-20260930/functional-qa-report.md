# Functional QA Report

- **Task:** `DEH-UI-PARITY-20260930`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-UI-PARITY-20260930/functional-qa-report.md`

## Environment

- **Build/version:** Base `9dec73b7c0db72bde284747de50779f3219bf288` plus the task diff on `task/digital-exhibition-ui-0817-dev-r3-web`; engineering build result exit 0.
- **Runtime, device, browser, or test account:** Node 20.14.0; Edge/Chromium via Playwright; 1440×1000, 900×900 and 390×844 browser viewports; deterministic authenticated UI-parity identity only for browser rendering.
- **Permissions/configuration:** Web/Vue only; `/test2` application base; browser visual checks use data mode disabled to avoid external writes; integration tests exercise same-origin OAuth/API contracts and permission gates.
- **Evidence:** `engineering-handoff.md`, `handoffs/web.md`, `reviews/code-review.md`, `evidence/browser/`, plus the QA command results recorded below.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-AC1` | `AC-1 Shared shell parity` | executed | 1. Start current and reference builds. 2. Open five representative routes at three viewports. 3. Compare topbar, frame, sidebar, color and background metrics. | Shared shell has no unapproved visual difference. | All 15 metric comparisons passed; no global request bubble appeared. | `npm run test:browser:ui-parity` exit 0; `evidence/browser/` | none | passed | none |
| `FQA-AC2` | `AC-2 Shared page parity` | executed | 1. Execute source parity guard. 2. Run route/page visual contracts. 3. Review paired current/reference screenshots. | Shared pages retain the reference visual system; only dynamic data differs. | Source guard, 30-route visual contracts and paired browser captures passed. | `npm run test:ui-source-sync` exit 0; `npm test` exit 0; `evidence/browser/` | none | passed | none |
| `FQA-AC3` | `AC-3 Current-only page consistency` | executed | 1. Run onboarding/application-page source tests. 2. Run shared form/card/detail/admin/talent visual contracts. | Current-only pages use the same tokens, shell and controls. | Onboarding, details, admin, talent and current-only state surfaces passed shared style contracts. | `npm run test:ui-source-sync` exit 0; `npm test` exit 0 | none | passed | none |
| `FQA-AC4` | `AC-4 Real business behavior preservation` | executed | 1. Run full integration suite. 2. Run onboarding POC suite. 3. Verify no mock-data restoration in the diff and source parity guard. | OAuth, same-origin APIs, approval, cache/read plans, permissions, upload and routing remain unchanged. | 101-operation integration suite and all onboarding POC contracts passed; no mock business fallback was introduced. | `npm run test:integration` exit 0; `npm run test:onboarding-poc` exit 0; `tools/ui-reference-parity-20260930.test.mjs` | none | passed | none |
| `FQA-AC5` | `AC-5 State coverage` | executed | 1. Run mounted state-boundary and page-state tests. 2. Run first-screen timeout/recovery test. 3. Run permission and disabled-state contracts. | Loading, empty, error, disabled and permission states preserve semantics and recovery. | Six-state contracts, timeout/retry scheduling, disabled controls and permission behavior passed; request tracking remains internal without a floating bubble. | `npm test` exit 0; `npm run test:first-screen-budget` exit 0; `npm run test:integration` exit 0 | none | passed | none |
| `FQA-AC6` | `AC-6 Responsive behavior` | executed | 1. Run H5 overflow/accessibility tests. 2. Run browser parity at desktop, narrow desktop and H5 sizes. 3. Check page-level overflow. | No unintended horizontal overflow, clipping, unreachable actions or broken layout. | H5 suite and all 15 browser cases passed; document width equalled viewport width. | `npm test` exit 0; `npm run test:ui-source-sync` exit 0; `npm run test:browser:ui-parity` exit 0 | none | passed | none |
| `FQA-AC7` | `AC-7 Accessibility and interaction preservation` | executed | 1. Run interaction and mounted tests. 2. Verify focus, labels, live regions, mobile drawer and table scroll regions. | Keyboard, focus visibility, semantics and existing interactions remain available. | Skip link, focus restoration/trap, named controls, live status and accessible horizontal regions passed. | `npm test` exit 0; `npm run test:ui-source-sync` exit 0; `handoffs/web.md` | none | passed | none |
| `FQA-AC8` | `AC-8 Regression evidence` | executed | 1. Verify static check/build evidence. 2. Independently run full, source-sync, integration, onboarding and browser parity suites. 3. Confirm risk/rollback documentation. | Required checks pass with traceable comparison and risk evidence. | All independent QA suites passed; engineering build exit 0; paired screenshots and rollback facts are present. | `handoffs/web.md`; `engineering-handoff.md`; QA command results; `evidence/browser/` | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-V1` | Real identity and business data must not be replaced by reference fixture values. | executed | Inspect shell bindings and run integration/source guards. | Account identity and business records remain API-derived. | `entryAuth.identity` and live operation projections remain authoritative; parity test explicitly guards them. | `tools/ui-reference-parity-20260930.test.mjs`; `npm run test:integration` exit 0 | none | passed | none |
| `FQA-V2` | Permission, same-origin and write gates remain enforced. | executed | Run integration and onboarding suites covering OAuth, session, write prefixes, origin and grants. | Unauthorized/cross-origin writes are rejected and permissions remain scoped. | All security and permission contracts passed. | `npm run test:integration` exit 0; `npm run test:onboarding-poc` exit 0 | none | passed | none |
| `FQA-V3` | `/test2` base-path navigation remains valid. | executed | Run source/integration/onboarding base-path contracts and browser parity against `/test2`. | Routes and API URLs resolve without copying reference root-only behavior. | Browser parity mounted all tested `/test2` routes; onboarding verifier preserved root `/api/v1`. | `npm run test:browser:ui-parity` exit 0; `npm run test:onboarding-poc` exit 0 | none | passed | none |
| `FQA-V4` | Removed request bubble must not remove request accounting or recovery. | executed | Run request-activity and first-screen budget tests. | No floating bubble; accounting clears on success/failure and retry/cancellation remain functional. | Request activity, timeout categorization, retry scheduling and cancellation passed without visual bubble. | `npm run test:integration` exit 0; `npm run test:first-screen-budget` exit 0 | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-S-NORMAL` | `normal` | executed | Open representative current/reference routes and run mounted normal-state tests. | Usable page with reference-aligned shell and real-data bindings. | 15 browser comparisons and mounted normal-state contracts passed. | `npm run test:browser:ui-parity` exit 0; `npm test` exit 0 | none | passed | none |
| `FQA-S-LOADING` | `loading` | executed | Execute six-state and first-screen request tests. | Local loading semantics remain available without blocking global bubble. | Loading contracts passed; request status remains tracked internally. | `npm test` exit 0; `npm run test:first-screen-budget` exit 0 | none | passed | none |
| `FQA-S-EMPTY` | `empty` | executed | Execute mounted state boundary and application empty-result tests. | Empty state is explicit, styled consistently and recoverable via filters/navigation. | Empty-state and explicit no-result contracts passed. | `npm test` exit 0; `npm run test:ui-source-sync` exit 0 | none | passed | none |
| `FQA-S-ERROR` | `error` | executed | Execute error-state, timeout and malformed-response tests. | Error remains local, announces status and retains retry behavior. | Error/timeout mapping, live announcements and retry scope passed. | `npm test` exit 0; `npm run test:integration` exit 0; `npm run test:first-screen-budget` exit 0 | none | passed | none |
| `FQA-S-DISABLED` | `disabled` | executed | Execute global control-state and mounted disabled-page tests. | Disabled controls retain semantics, styling and non-action behavior. | Disabled field/control and page-state contracts passed. | `npm test` exit 0 | none | passed | none |
| `FQA-S-PERMISSION` | `permission-denied` | executed | Execute permission-dependent mounted and integration tests. | Denied actions stay unavailable; authentication recovery remains explicit and safe. | Permission hiding, identity binding, OAuth recovery and grants passed. | `npm test` exit 0; `npm run test:integration` exit 0 | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FQA-R1` | Global navigation, sidebar collapse, filters and history restoration. | executed | Run shell, interaction, session-history and navigation-card suites. | Navigation and page-state restoration remain unchanged. | All interaction/session contracts passed. | `npm test` exit 0 | none | passed | none |
| `FQA-R2` | Application onboarding, upload, unique identifier and approval projection. | executed | Run complete onboarding POC suite. | Existing submission and approval behavior remains intact. | All onboarding POC contracts passed. | `npm run test:onboarding-poc` exit 0 | none | passed | none |
| `FQA-R3` | OAuth, authenticated reads, cache/read plans and write security. | executed | Run full integration suite. | Existing live integration boundaries remain intact. | All integration contracts passed. | `npm run test:integration` exit 0 | none | passed | none |
| `FQA-R4` | Production compilation. | executed | Review recorded `npm run build` output and generated asset summary. | Vue application compiles without errors. | Build exited 0 after 1932 transformed modules. | `handoffs/web.md` | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

This report is the only file written and the sole allowed write. Functional QA does not modify implementation, tests, builds, handoffs, approvals, or task inputs; does not write final QA fields; and does not modify task state. Cross-platform QA retains platform compatibility-matrix ownership.
