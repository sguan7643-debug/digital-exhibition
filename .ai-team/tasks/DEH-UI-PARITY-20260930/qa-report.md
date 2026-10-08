# Platform Compatibility QA Report

## Governed Inputs

- `task.json` state, approvals, and declared platforms/targets: state `qa`; scope/design approved by User; Web/Vue declared; no uni-app targets; governed Web platform check passed.
- Approved `prd.md` platform intent: desktop and H5 Web parity, no unintended overflow or inaccessible controls, real business behavior preserved.
- Aggregate `design-handoff.md`: exact reference visual system, six required states, responsive sizes and accessibility behavior.
- Aggregate `engineering-handoff.md` and build evidence: complete; build, static check, full tests, integration tests and browser evidence recorded.
- `reviews/code-review.md` verdict and open findings: `approved`; no blocking findings.
- `functional-qa-report.md` result and open defects/blockers: `passed`; zero defects and zero unresolved blockers.

## Input Readiness

- `task.json`: available, valid under `validate-task.ps1 -EnforceLocation` (`VALID`).
- Scope/design approvals: available and current.
- Aggregate engineering handoff and runnable build commands: available and consistent.
- Code review: available, non-blocking, approved.
- Functional QA: available, passed, no open defect/blocker.
- Web platform evidence: available and governed check passed.
- uni-app evidence: not required because no mobile platform/target is declared.
- Overall readiness: complete; a governed final QA result may be recorded.

## Compatibility Matrix

Build for every row: base `9dec73b7c0db72bde284747de50779f3219bf288` plus task diff; Vite output `index-DJeoDrCw.css` / `index-DPbMm8fk.js`.

| Platform/target | Environment/device | Size | Build | Scenario | Expected platform behavior | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web | Microsoft Edge (Chromium), desktop | 1672×941 | task diff | Workbench, apps, talent; current vs reference | Matching shell geometry/colors; no global bubble or page overflow | All assertions passed | passed | Exact six-size matrix command: Edge/Chromium, 36 cases, exit 0 |
| Web | Microsoft Edge (Chromium), wide desktop | 1920×1080 | task diff | Workbench, apps, talent; current vs reference | Matching shell geometry/colors; stable wide navigation | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web | Microsoft Edge (Chromium), compact desktop | 1000×900 | task diff | Workbench, apps, talent; current vs reference | Reference compact shell, reachable navigation and content | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web/H5 | Microsoft Edge responsive emulation | 390×844 | task diff | Workbench, apps, talent; current vs reference | Mobile shell, no document overflow, no floating bubble | All assertions passed | passed | Exact six-size matrix command plus `evidence/browser/`, exit 0 |
| Web/H5 | Microsoft Edge responsive emulation | 360×800 | task diff | Workbench, apps, talent; current vs reference | Narrow H5 reflow with reachable controls | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web/H5 | Microsoft Edge responsive emulation | 844×390 | task diff | Workbench, apps, talent; current vs reference | Landscape reflow without clipping or document overflow | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web | Playwright Chromium, desktop | 1672×941 | task diff | Workbench, apps, talent; current vs reference | Same as Edge row; independent installed browser binary | All assertions passed | passed | Exact six-size matrix command: `browsers=[edge,chromium]`, exit 0 |
| Web | Playwright Chromium, wide desktop | 1920×1080 | task diff | Workbench, apps, talent; current vs reference | Matching shell geometry/colors and wide layout | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web | Playwright Chromium, compact desktop | 1000×900 | task diff | Workbench, apps, talent; current vs reference | Matching compact geometry and no overflow | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web/H5 | Playwright Chromium responsive emulation | 390×844 | task diff | Workbench, apps, talent; current vs reference | Matching mobile shell and safe content width | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web/H5 | Playwright Chromium responsive emulation | 360×800 | task diff | Workbench, apps, talent; current vs reference | Narrow H5 remains usable and bounded | All assertions passed | passed | Exact six-size matrix command, exit 0 |
| Web/H5 | Playwright Chromium responsive emulation | 844×390 | task diff | Workbench, apps, talent; current vs reference | Landscape H5 remains usable and bounded | All assertions passed | passed | Exact six-size matrix command, exit 0 |

## Web Compatibility

- Browser engines: Microsoft Edge stable Chromium and separately installed Playwright Chromium both passed the same six-size, three-route current/reference matrix (36 route-size-browser cases).
- Additional representative comparison: `npm run test:browser:ui-parity` passed 15 cases and generated 30 paired screenshots for workbench, apps, profile, certification and talent routes.
- Static/build: `npm run check` exit 0; `npm run build` exit 0 with 1932 transformed modules.
- Responsive sizes: 1672×941, 1920×1080, 1000×900, 390×844, 360×800 and 844×390 all passed.
- Keyboard/focus and semantics: consumed the passing Functional QA result and independently confirmed the aggregate evidence includes skip navigation, visible focus, mobile drawer focus handling, named controls/live regions and focusable horizontal data regions.
- Pointer/input/navigation/resize: the matrix repeatedly creates pages at each size and verifies mounted routes, no page errors, bounded document width, reference shell geometry and removal of floating request UI.
- Firefox was not used: its cached binary could not start in this Windows execution environment (`spawn UNKNOWN`). It is not listed as a separately declared product environment; the required independent browser check was completed with Edge stable and Playwright Chromium.

## uni-app Compatibility

Not declared. `task.json` sets `mobile_framework` to `none` and `mobile_targets` to an empty list. H5 is responsive Web and is covered above.

## Compatibility Defects

None.

## Aggregate Blocking Defects

- Functional QA unresolved blocking defects: 0.
- Compatibility QA unresolved blocking defects: 0.
- Deduplicated aggregate unresolved blocking-defect count: 0.

## Repair and Regression History

No governed repair attempt was needed. All required compatibility rows passed on the initial QA build. The Firefox launch limitation was resolved by adding a separate Playwright Chromium QA runtime; no project source, dependency manifest or business behavior changed.

## Governed Result Record

- Exact command: `record-qa-result.ps1 -TaskFile .ai-team/tasks/DEH-UI-PARITY-20260930/task.json -Result passed -BlockingDefects 0 -Evidence .ai-team/tasks/DEH-UI-PARITY-20260930/qa-report.md`
- Output: `QA passed`
- Final governed result and actual aggregate unresolved blocking-defect count or zero: `passed`, 0.
- Unavailable evidence that prevented a governed result: none.

Compatibility QA alone among QA roles invokes `record-qa-result.ps1` and `record-repair-attempt.ps1`. The report does not directly edit `task.json`, approve release, merge, deploy, publish, release, or accept risk.
