# Cross-platform / Compatibility QA Report

- **Task:** `DEH-MY-APPLICATION-ENTRY-20260927`
- **Role:** independent Cross-platform / Compatibility QA
- **Declared platforms:** Web only (`mobile_targets: []`)
- **Result:** `passed`
- **Blocking defects:** `0`
- **Build identifier:** branch `task/digital-exhibition-ui-0817-dev-r3-web`, commit `766b33b`, task-attributed working tree; isolated Vite production bundle `index-pICDnYzY.css` / `index-CioyDdoL.js`
- **Runtime:** Node `v20.14.0`; local origin `http://127.0.0.1:4173/test2/`
- **Browsers:** Microsoft Edge `154.0.4258.37`; Google Chrome `139.0.7258.139` (Chromium)

## Gate Preconditions

| Required input | Observed result | Gate result |
| --- | --- | --- |
| `task.json` | State is `qa`; scope and design approvals are present; release approval remains absent; only Web is declared; Web platform check is recorded as passed. | passed |
| `validate-task.ps1 -EnforceLocation` | `VALID` | passed |
| `prd.md` and `design-handoff.md` | Approved route, timeline, authorization-button, responsive and accessibility intent are complete and consistent. | passed |
| `engineering-handoff.md` | Aggregate Web engineering result is passed; build and focused commands are runnable; rollback status is ready. No worker handoff was consumed by this role. | passed |
| `reviews/code-review.md` | Verdict `approved`; no blocking finding. One P3 permission-metadata maintenance risk remains non-blocking. | passed |
| `functional-qa-report.md` | Result `passed`; all 9 acceptance criteria and required functional states passed; blocking defects `0`. | passed |

## Independent Execution Evidence

| Evidence | Command / method | Exact result |
| --- | --- | --- |
| `E-COMPAT-01` | `node tools/my-application-entry.test.mjs` with Microsoft Edge | Exit `0`. At 700px, normal connector/next-icon edges were `87/87px`; wrapped-copy edges were `125/125px`; connector remained at `40–42px` while copy began at `65px`. |
| `E-COMPAT-02` | Same focused test with `BROWSER_EXECUTABLE_PATH` set to Chrome | Exit `0`, with the same 700px normal and wrapped-copy geometry and zero text-column intrusion. |
| `E-COMPAT-03` | `node tools/onboarding-responsive-accessibility.test.mjs` in Edge and again in Chrome | Both exited `0`. At 320px document width equalled viewport width; at 320/760px the retained return control was `44px` high; “飞书授权” link count was `0`. |
| `E-COMPAT-04` | In-memory Playwright run against the real compiled pages in Edge and Chrome | Both browsers passed at 1440, 760 and 320 CSS px and at Edge/Chrome page scale `2`. Timeline connector/copy intersections were `0`; connector endpoints exactly matched adjacent icon edges; document widths equalled viewport widths. |
| `E-COMPAT-05` | In-memory browser mount of the real `ProfilePage.vue` in Edge and Chrome | Both “我的申请” links had `/apps/onboarding/status`, a visible `3px` focus outline, and one successful Enter activation each. Permission-denied rendering exposed the existing permission feedback and did not expose normal user data. |
| `E-COMPAT-06` | In-memory Playwright run against the real application form in Edge and Chrome at 320px | Visible/focusable authorization-entry count was `0`; “返回应用中心” was `44px` high, showed a `3px` focus outline and activated once with Enter. |
| `E-COMPAT-07` | In-memory Edge state run against the real onboarding list page | Loading transitioned to empty; a 500 error displayed “读取失败” and recovered after keyboard Enter on “重新读取” with exactly two requests; 403 displayed permission feedback; `POC_GATES_NOT_READY` displayed the disabled-service feedback. |
| `E-COMPAT-08` | `node tools/mounted-profile-projection.test.mjs` | Exit `0`; normal remote projection, safe local navigation and permission-denied no-leak behavior passed. |
| `E-COMPAT-09` | `node tools/onboarding-apply-interaction.test.mjs` | Exit `0`; authorization-entry negative contract, session use, submission and status navigation contract passed. |
| `E-COMPAT-10` | `node tools/onboarding-status-live.test.mjs` | Exit `0`; the status page remained driven by the returned approval-instance status. |
| `E-COMPAT-11` | `node tools/feishu-personal-read-batch.test.mjs` | Exit `0`; ten personal/workbench reads remained scoped to authenticated server identity and the quick entry resolved to the approved route. |
| `E-COMPAT-12` | `npm.cmd run check` | Exit `0`; static, deterministic, zero-external-network, semantic and atomic-asset checks passed. |
| `E-COMPAT-13` | `npm.cmd run build -- --outDir %TEMP%\deh-my-application-entry-compat-build-20260927-rerun --emptyOutDir false` | Exit `0`; Vite `6.4.1` transformed `1,932` modules and produced the isolated production bundle. Repository `dist` was not used as QA output. |

The first state-harness execution stopped on a strict locator ambiguity because “暂无上线申请” correctly existed both in the live-region announcement and the visible heading. The harness was corrected to target the unique heading role and the complete state matrix then passed. This was a test-harness issue, not a product defect.

## Web Compatibility Matrix

Evidence paths below refer to the persisted evidence entries in this report.

| Environment / device | Viewport / scale | Build | Scenario | Expected platform behavior | Actual behavior | Result | Evidence path |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edge 154 desktop | 1440×900, 100% | `766b33b + task WT` | Existing two-stage approval timeline | Horizontal connector joins icon edges and never enters title/time rows. | Connector `568.5–1091.5px` exactly matched adjacent icon edges; text intersections `0`; document width `1440px`. | passed | `qa-report.md § E-COMPAT-04` |
| Chrome 139 desktop | 1440×900, 100% | `766b33b + task WT` | Existing two-stage approval timeline | Same as Edge. | Same measured icon-edge endpoints, zero text intersections and no horizontal overflow. | passed | `qa-report.md § E-COMPAT-04` |
| Edge 154 narrow | 700×700 | `766b33b + task WT` | Normal and long wrapped stage copy | Vertical connector stretches through the row gap, touches the next icon and remains left of copy. | Endpoints `87/87px` and `125/125px`; connector right `42px`, copy left `65px`; wrapped row height `80px`. | passed | `qa-report.md § E-COMPAT-01` |
| Chrome 139 narrow | 700×700 | `766b33b + task WT` | Normal and long wrapped stage copy | Same as Edge. | Same measured geometry and zero text-column intrusion. | passed | `qa-report.md § E-COMPAT-02` |
| Edge 154 narrow breakpoint | 760×900 | `766b33b + task WT` | Real compiled detail page | Vertical layout has no connector/text overlap or page overflow. | Connector bottom and next-icon top both `665px`; text intersections `0`; document width `760px`. | passed | `qa-report.md § E-COMPAT-04` |
| Chrome 139 narrow breakpoint | 760×900 | `766b33b + task WT` | Real compiled detail page | Same as Edge. | Same measured geometry, no overlap and no overflow. | passed | `qa-report.md § E-COMPAT-04` |
| Edge 154 compact | 320×900 | `766b33b + task WT` | Detail page, long identifiers, return control and application form | No horizontal overflow; track remains outside copy; controls remain operable. | Connector bottom and next-icon top both `703.484375px`; text intersections `0`; document width `320px`; return target `44px`. | passed | `qa-report.md § E-COMPAT-03`, `E-COMPAT-04`, `E-COMPAT-06` |
| Chrome 139 compact | 320×900 | `766b33b + task WT` | Same compact flow | Same as Edge. | Same timeline/document measurements; return target `44px`. | passed | `qa-report.md § E-COMPAT-03`, `E-COMPAT-04`, `E-COMPAT-06` |
| Edge 154 zoom | 1440×900, page scale 200% | `766b33b + task WT` | Approval timeline under browser zoom | Text, icons and connector remain distinct. | `visualViewport.scale=2`; text intersections `0`; connector still exactly matched adjacent icon edges. | passed | `qa-report.md § E-COMPAT-04` |
| Chrome 139 zoom | 1440×900, page scale 200% | `766b33b + task WT` | Same zoom flow | Same as Edge. | `visualViewport.scale=2`; text intersections `0`; endpoints remained exact. | passed | `qa-report.md § E-COMPAT-04` |
| Edge 154 keyboard | Desktop profile and 320px application form | `766b33b + task WT` | Two “我的申请” entries and retained return control | Semantic links receive visible focus and Enter invokes the configured destination/action once. | Both entries used `/apps/onboarding/status`, showed `3px` focus and activated once; return link showed `3px` focus and activated once. | passed | `qa-report.md § E-COMPAT-05`, `E-COMPAT-06` |
| Chrome 139 keyboard | Desktop profile and 320px application form | `766b33b + task WT` | Same keyboard flow | Same as Edge. | Same href, visible focus and one Enter activation per control. | passed | `qa-report.md § E-COMPAT-05`, `E-COMPAT-06` |
| Edge 154 application states | 1440×900 | `766b33b + task WT` | Loading, empty, error recovery, permission denial and disabled service | Existing feedback is visible, keyboard recovery works and protected data is not exposed. | All states rendered expected feedback; retry recovered with exactly two requests; no normal-profile data leaked in denied state. | passed | `qa-report.md § E-COMPAT-05`, `E-COMPAT-07`, `E-COMPAT-08` |
| Edge and Chrome form | 320×900 | `766b33b + task WT` | Removed authorization action | No visible or keyboard-focusable “飞书授权” control remains; existing return/submission structures remain. | Visible/focusable count `0` in both browsers; return control remained focusable and operable; interaction contract passed. | passed | `qa-report.md § E-COMPAT-03`, `E-COMPAT-06`, `E-COMPAT-09` |

## Basic Accessibility and Interaction Findings

- The two application-entry targets and retained return targets are semantic anchors with visible `3px` focus treatment and verified Enter activation.
- Timeline decoration is confined to the visual track; titles and `<time>` content remain separate and readable at all tested sizes and zoom.
- The removed authorization action leaves no visible or keyboard-focusable control in either tested browser.
- Loading feedback uses `aria-busy`; errors and permission denial expose alert semantics; keyboard retry succeeds.
- Existing forced-colors and reduced-motion source contracts passed the repository static/semantic gate. No screen-reader certification is claimed.

## Defects

None.

## Non-blocking Observation

The code-review P3 observation remains: `applications.view` is retained as descriptive metadata while the “我的申请” entry is intentionally always enabled for route parity. Current server identity and page-level denial checks prevent data exposure; this is a future permission-governance cleanup, not a compatibility blocker for this task.

## Final QA Decision

All required inputs are complete and consistent. Functional QA is evidence-backed and passed, code review is non-blocking, all declared Web platform rows passed, mobile is not declared, and the deduplicated unresolved blocking-defect count is `0`.

**Compatibility QA result: `passed`.**

## Boundary

This report records compatibility verification only. It does not approve release, deployment, publication, merge, scope, design or risk acceptance. No business code, other role artifact, task state, approval, deployment, commit or merge was modified by this role.
