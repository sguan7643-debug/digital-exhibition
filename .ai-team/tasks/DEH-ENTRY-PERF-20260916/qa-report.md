# Platform Compatibility QA Report

## Governed Inputs

- `task.json`: state `qa`; Web/Vue declared; no mobile framework or mobile targets; scope/design approved; Web engineering check passed.
- Approved `prd.md`: responsive Web entry and first-screen behavior for local `/` and deployed `/test2`; no native/mobile commitment.
- Aggregate `design-handoff.md`: full-screen surface only before authorization; authenticated progress must remain regional/non-blocking; responsive breakpoint behavior specified.
- Aggregate `engineering-handoff.md`: 8/10/12-second budgets, read-only live evidence, complete build/static/UI/integration evidence, and rollback triggers are available.
- `reviews/code-review.md`: `approved`; no open blocking finding. The earlier full-screen business-request P1 is repaired and covered by fresh tests.
- `functional-qa-report.md`: `passed`; zero defects and zero unresolved blockers.

## Input Readiness

All required governed inputs are available, consistent, current after the loading-banner repair, and validated with `validate-task.ps1 -EnforceLocation` (`VALID`). The calibrated browser recorded by the project is Microsoft Edge. No additional browser support matrix and no uni-app target is declared. An optional Firefox probe was attempted but the locally downloaded Playwright Firefox executable could not start because its Windows side-by-side runtime was unavailable; it is not represented as passed and does not replace or expand the declared Edge Web scope.

## Compatibility Matrix

| Platform/target | Environment/device | Size | Build | Scenario | Expected platform behavior | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web | Microsoft Edge, authenticated desktop | 1440×900 | candidate at baseline `91a8ba1a` plus governed task diff | Real `/workbench` first-screen requests, keyboard Tab, request progress | HTTP 200 page; progress visible but not fixed/covering; no overflow; visible focus | Banner observed with `position: static`, 1180px within content; document/main widths bounded; skip link received visible focus; no page error | passed | Executed Edge compatibility probe on 2026-09-18; `evidence/live-first-screen-20260918.json` for request outcomes |
| Web | Microsoft Edge, authenticated tablet-width | 760×900 | same candidate | Responsive workbench during real first-screen request | No viewport/main overflow; visible request state; keyboard focus visible | Document/main width exactly 760px; static 720px banner; visible skip-link focus; no page error | passed | Executed Edge compatibility probe on 2026-09-18 |
| Web | Microsoft Edge, authenticated narrow Web | 390×844 | same candidate | Narrow responsive workbench during real first-screen request | No horizontal overflow; progress wraps inside content; focus remains available | Document/main width exactly 390px; 370px static banner; visible focus; no page error | passed | Executed Edge compatibility probe on 2026-09-18 |
| Web | Microsoft Edge touch emulation | 390×844, touch/mobile input | same candidate | Tap mobile navigation open and close while request progress is visible | Touch control opens/closes accessible drawer; page remains usable and bounded | Banner observed; `aria-expanded`/`inert` changed correctly; drawer opened and closed; no overflow or page error | passed | Executed Edge touch probe on 2026-09-18 |
| Web | Node/Vue contracts | responsive source and state matrix | same candidate | H5 reflow, entry guard, non-blocking progress, reduced motion | Navigation/cards/forms/tables/pagination reflow; OAuth-before-read; request status accessible | All three focused suites exited 0 | passed | `node tools/h5-responsive-remediation.test.mjs`; `node tools/global-request-loading-remediation.test.mjs`; `node tools/feishu-entry-auth-guard.test.mjs` |

## Web Compatibility

- **Declared/calibrated browser:** Microsoft Edge. Desktop, tablet-width, narrow Web, keyboard, and touch-input rows all passed.
- **Responsive sizes:** 1440×900, 760×900, and 390×844 had no document or main-content horizontal overflow. The in-flow activity banner remained within the content width.
- **Keyboard/focus:** Tab traversal exposed the skip link with `:focus-visible`; authenticated request progress did not move focus or intercept keyboard input.
- **Semantics/accessibility:** The request banner retains `role=status`, `aria-live=polite`, `aria-busy=true`, visible progress text, and reduced-motion handling. Entry failure remains a separate pre-mount status surface.
- **Pointer/touch:** At 390×844 with touch input, the 44px mobile menu control opened and closed the modal navigation drawer; its `aria-expanded` and `inert` states matched the visual state.
- **Navigation and entry:** Root and `/test2` base-path contracts passed; protected operations remain suppressed until the HttpOnly session decision is authorized.
- **Fresh platform commands:** `pnpm check` passed; `pnpm build` passed with 1951 transformed modules; responsive, activity-banner, and entry-guard focused tests passed.

## uni-app Compatibility

Not declared. `task.json` sets `mobile_framework=none` and `mobile_targets=[]`; the approved design explicitly defines responsive Web rather than a native/uni-app target.

## Compatibility Defects

None.

The first touch probe used the wrong expected class (`is-mobile-open`) and the second attempted to locate an intentionally inert/hidden opener after the drawer opened. These were QA probe errors, not product defects. The corrected probe observed the drawer open and close successfully.

## Aggregate Blocking Defects

- Functional QA unresolved blocking defects: 0.
- Compatibility QA unresolved blocking defects: 0.
- Deduplicated aggregate unresolved blocking-defect count: 0.

## Repair and Regression History

No governed failed-QA repair attempt was required. Before QA recording, code review found one P1 full-screen authenticated-request overlay. Engineering repaired it with failing-then-passing tests, regenerated the engineering handoff, and reran the complete integration, UI, static, build, and whitespace checks. Functional QA and the compatibility matrix above use only the post-repair candidate.

## Governed Result Record

- Exact command: `record-qa-result.ps1 -TaskFile <task.json> -Result passed -BlockingDefects 0 -Evidence .ai-team/tasks/DEH-ENTRY-PERF-20260916/qa-report.md`
- Command output: `QA passed`; subsequent governed validation output: `VALID`.
- Final governed result: `passed`; aggregate unresolved blocking-defect count `0`.
- Unavailable evidence that prevented a governed result: none for the declared platform. Optional, undeclared Firefox probe is explicitly not counted as passed.

Compatibility QA alone among QA roles invokes `record-qa-result.ps1` and `record-repair-attempt.ps1`. The report does not directly edit `task.json`, approve release, merge, deploy, publish, release, or accept risk.
