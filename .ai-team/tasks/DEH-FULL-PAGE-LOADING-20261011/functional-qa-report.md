# Functional QA Report

- **Task:** `DEH-FULL-PAGE-LOADING-20261011`
- **Result:** `passed`
- **Report path:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/functional-qa-report.md`

## Environment

- **Build/version:** Base `6bf133c4541b08be5c414739ea6c680f72d92f25` plus the task diff; production Vite build generated successfully.
- **Runtime, device, browser, or test account:** Node 20.14 test runner; local test deployment at `http://127.0.0.1:4173/test2/`; headless Microsoft Edge/Chromium; widths 320, 760, 1366 and 1920; reduced-motion emulation enabled for loading-state verification.
- **Permissions/configuration:** Deterministic same-origin authenticated browser routes; no external account or production write used.
- **Evidence:** `.ai-team/tasks/DEH-FULL-PAGE-LOADING-20261011/handoffs/web.md`, `tools/full-page-loading-20261011.test.mjs`, `tools/homepage-aggregate-browser.test.mjs`.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-AC1 | AC-1 全视口覆盖 | executed | 1. Start a tracked homepage request. 2. Wait for the global surface. 3. Measure its viewport rectangle and inspect selectors. | One fixed overlay covers navigation, sidebar and content; no corner toast. | Rect matched the complete 1366×900 viewport; source/build contain only `.request-loading-overlay`. | `node tools/homepage-aggregate-browser.test.mjs` exit 0; `node tools/full-page-loading-20261011.test.mjs` exit 0; Web handoff. | none | passed | none |
| QA-AC2 | AC-2 阻止底层操作 | executed | 1. Keep the request pending. 2. Inspect shell inertness, body overflow and overlay pointer behavior. | Underlying click, keyboard activation and scroll are blocked. | Shell had `inert`; body computed overflow was hidden; overlay pointer-events was `all`. | Browser acceptance test exit 0; `src/App.vue:535`; `src/style.css:1162-1163`. | none | passed | none |
| QA-AC3 | AC-3 自动结束 | executed | 1. Exercise normal completion and transient failure/retry. 2. Wait for the last token to settle. 3. Inspect overlay and body class. | Overlay and scroll lock close automatically on terminal settlement without refresh. | Overlay became hidden and `request-loading-active` was removed; failure lifecycle also returned count to zero. | Browser acceptance and task contract tests exit 0. | none | passed | none |
| QA-AC4 | AC-4 并发合并 | executed | 1. Begin two request tokens. 2. Settle one. 3. Settle the second. | One surface uses count 2, remains at count 1, closes at zero. | Request activity reported 2 → 1 → 0 with one overlay source. | `node tools/full-page-loading-20261011.test.mjs` exit 0. | none | passed | none |
| QA-AC5 | AC-5 静默刷新 | executed | 1. Run background cache recovery at 320/760/1366/1920. 2. Observe visible loading selector. | Silent refresh does not display global loading and page remains usable. | Browser suite reported background recovery stayed silent at all four widths. | `node tools/homepage-aggregate-browser.test.mjs` exit 0; `safe-proxy-client.js` silent exclusion assertion. | none | passed | none |
| QA-AC6 | AC-6 可访问性与响应式 | executed | 1. Inspect status semantics. 2. Run browser at four widths. 3. Enable reduced motion. 4. Run static audit. | Readable, no overflow, polite atomic status, no focus trap, no spinner motion in reduced mode. | Status semantics present; no focus action; four widths passed; computed animation name was `none`; source audit passed. | Browser acceptance exit 0; `npm run check` exit 0; task contract exit 0. | none | passed | none |
| QA-AC7 | AC-7 业务回归 | executed | 1. Run targeted loading, UI parity and sync recovery tests. 2. Build production bundle. 3. Run broad UI suite through mounted page/state checks. | Existing route, page-state and request-recovery behavior remains intact after overlay removal. | Targeted tests and build passed; broad UI suite passed route, interaction, mounted and six-state checks before stopping at an unrelated materials backend assertion. | Web handoff exact command results; `npm run build` exit 0. | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-VAL-1 | Only foreground requests trigger the overlay | executed | Inspect silent-request contract and run background recovery. | `silent` requests do not increment foreground activity. | Source contract matched and no overlay appeared during silent recovery. | Task contract and browser acceptance tests exit 0. | none | passed | none |
| QA-VAL-2 | Loading cannot be manually dismissed | executed | Inspect rendered overlay for controls, dialog semantics and handlers. | No close control, Escape behavior, retry action or dialog role. | Overlay contains only spinner and status text with `role=status`. | `src/App.vue:525-532`; task contract exit 0. | none | passed | none |
| QA-VAL-3 | Request count never becomes stuck on tested terminal paths | executed | Settle overlapping requests and throw inside `trackRequest`. | Count returns to zero through normal and failure paths. | Both paths returned `isLoading=false`. | `tools/full-page-loading-20261011.test.mjs` exit 0. | none | passed | none |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-STATE-NORMAL | normal | executed | Load a fresh homepage response and wait for completion. | Overlay absent; normal page usable. | Overlay hidden after response and body unlocked. | Browser acceptance exit 0. | none | passed | none |
| QA-STATE-LOADING | loading | executed | Hold aggregate sync as running. | Full-page overlay visible with count, inert shell and scroll lock. | All loading checks passed in the browser. | Browser acceptance exit 0. | none | passed | none |
| QA-STATE-EMPTY | empty | executed | Run mounted six-state/page-state suite and allow request settlement. | Global overlay closes; existing empty state remains authoritative. | Existing mounted empty-state checks passed before the unrelated broad-suite stop. | `npm test` output recorded in Web handoff. | none | passed | none |
| QA-STATE-ERROR | error | executed | Throw a tracked request and run existing error-boundary mounted checks. | Tracking closes in `finally`; existing error state remains available. | Count returned to zero and mounted error recovery passed. | Task contract exit 0; broad UI command evidence in Web handoff. | none | passed | none |
| QA-STATE-DISABLED | disabled | executed | Run mounted six-state checks with existing disabled state. | Overlay does not alter the page's underlying disabled rule. | Mounted disabled-page behavior passed. | `npm test` output recorded in Web handoff. | none | passed | none |
| QA-STATE-PERMISSION | permission-denied | executed | Run mounted six-state permission checks and source terminal cleanup checks. | Loading closes before the existing permission UI becomes authoritative. | Permission/hidden behavior passed; terminal tracking cleanup remained zero. | Broad UI command evidence and task contract in Web handoff. | none | passed | none |
| QA-STATE-RECOVERY | recovery | executed | Return sync status from running through transient 504 to completed. | Same task is polled, overlay closes automatically, no reload or uncaught error. | One aggregate request, two status calls, zero page errors; overlay closed. | Browser acceptance exit 0. | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| QA-REG-1 | UI parity and removal of obsolete toast | executed | Run UI parity and global request-loading source contracts. | New overlay retained; old toast and old non-blocking copy absent. | Both targeted contracts passed. | Targeted regression command in Web handoff. | none | passed | none |
| QA-REG-2 | Frontend sync recovery | executed | Run polling recovery contract and browser transient recovery. | No original-request replay, leaked loading state or manual refresh. | Source and browser recovery checks passed. | `tools/frontend-sync-recovery.test.mjs`; browser acceptance exit 0. | none | passed | none |
| QA-REG-3 | Production compilation | executed | Build the Vite production bundle. | Vue template, teleport and styles compile successfully. | 1,940 modules transformed; build exited 0. | `npm run build` result in Web handoff. | none | passed | none |
| QA-REG-4 | Static accessibility/network baseline | executed | Run project source audit. | Existing semantics and zero-external-network constraints remain valid. | Audit passed. | `npm run check` exit 0. | none | passed | none |

## Defects

None.

## Unresolved Blockers

- None.

## QA Boundary

This report is the only file written and the sole allowed write. Functional QA does not modify implementation, tests, builds, handoffs, approvals, or task inputs; does not write final QA fields; and does not modify task state. Cross-platform QA retains platform compatibility-matrix ownership.
