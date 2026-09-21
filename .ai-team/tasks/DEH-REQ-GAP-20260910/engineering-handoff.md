# 数智产品展厅需求差距补齐 — Aggregated Engineering Handoff

Author: AI Team Lead 001  
Task: `DEH-REQ-GAP-20260910`  
Aggregated at: `2026-09-11T16:04:23.6077960Z`

This is the QA-facing engineering source of record. It preserves the declared platform handoff by reference and does not replace the Web Engineer's evidence.

## Task and Approval Baseline

- Governed task: `task.json`; state at aggregation: `development`.
- Approved PRD: `prd.md`; SHA-256 `B344393363A60684FFD70CA4286B24FAE865E738E3C8BB15B65DF56188AE6003`.
- Approved design aggregate: `design-handoff.md`; SHA-256 `8C274E9C77E6433C872EEF679C4E99EDEA2F4F2B833C5FFD10CCF3CF7818851D`.
- Scope approval: recorded for this task as `User-20260911-full-spec-approved`.
- Design approval: recorded for this task as `User-20260911-all-approved`.
- Declared platform: Web only; framework: Vue. Mobile/uni-app is not declared by `task.json`.
- Release approval is not recorded. This handoff does not authorize merge, deployment, publication or release.

## Web Evidence

Source: `handoffs/web.md`; SHA-256 `697DFF1A7611F11AB1F1294B37BF9B84702C543F5A0920FDF7A60122A72F849D`.

- Repository: `C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged`.
- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`.
- Final implementation commit: `49eebed` (`fix: block unconfigured remote writes`); the preceding requirement-gap implementation commits remain part of the branch history and are enumerated by the Web source handoff and Git history.
- Framework/build: Vue 3 + TypeScript/Vite 6.4.1.
- Implementation scope: authoritative remote projections for application catalogue/detail, materials, training, talent, certification, points, announcements/messages, operations/admin and profile; safe application launch; truthful remote write blocking, including certification booking and announcement publishing; production network-guard correction; governed Feishu operation-contract alignment; responsive and keyboard regressions fixed without changing the approved visual identity.
- Latest review-remediation files: `src/pages/CertificationPage.vue`, `src/pages/AnnouncementsPage.vue`, `src/pages/AnnouncementEditorPage.vue`, `src/App.vue`, `tools/remote-write-blocks.test.mjs` and `package.json`. The preceding browser-gate repair changed `src/components/ControlledWritePanel.vue`, `src/components/ExhibitionShell.vue`, `src/h5.css` and six browser-contract scripts. The complete task changed-file history is preserved in Git through `49eebed`.

### Commands and exact results

All commands below ran on commit `49eebed` and returned exit code 0:

- `npm run test:deh-req-gap`.
- `npm run test:ui-source-sync`.
- `npm test`.
- `npm run test:integration`; complete Feishu integration contract covering 64 tables, 1311 fields and 101 registered operations passed.
- `npm run check`.
- `npm run build`; 1946 modules, CSS 300.09 kB, JS 1044.26 kB.
- `git diff --check`.
- `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:200pct-shell`; 4/4 routes passed.
- `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:30-routes`; 30/30 HTTP 200, mounted, no page errors and no non-local requests.
- `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:360-routes`; 30/30 had no page-level horizontal overflow.
- `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:narrow-header`; 5/5 tested widths passed.
- `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:talent-narrow`; 15/15 scenarios passed.
- `EXHIBITION_TEST_ORIGIN=http://127.0.0.1:4173 npm run test:browser:write-gates`; 23/23 remote routes displayed a blocked state and emitted no write request.

### Responsive, keyboard and accessibility evidence

- Real browser coverage includes 360 px layouts, 761–1054 px headers, 200% shell zoom, talent narrow layouts, table-local horizontal scrolling, visible focus and mobile-navigation focus.
- Tables expose keyboard-reachable local scroll regions; blocked writes expose readable status through existing alert/live semantics.
- Independent text-only 200% zoom, complete raw-float 30-page SSIM comparison and assistive-technology narration were not executed. These remain explicit QA observations and are not represented as passing evidence.

### Governed Web check

`task.json.checks.web_passed=true`; evidence is the absolute `handoffs/web.md` path; recorded at `2026-09-11T16:03:50.9540657Z` through `record-platform-check.ps1` under Windows PowerShell 5.1.

## Mobile Evidence

Mobile is `not declared`. Evidence: `task.json.platforms=["web"]`, `mobile_framework="none"`, and `mobile_targets=[]`. No `handoffs/mobile.md` is required and no mobile completion is claimed.

## Shared API and Data Contract

- The browser calls only the approved same-origin server boundary and receives projected fields; Feishu credentials, access tokens, Base/table/view/field identifiers and upstream file tokens remain server-side.
- The server-side identifier snapshot is 64 tables and 1311 fields. The operation registry contains 101 operations: 65 read operations and 36 controlled write operations.
- All 36 write operations remain test-only: both test-write gates must be enabled and the record/resource must carry the `TEST_` prefix. Remote production-mode pages expose a blocked/unconfigured state and do not simulate persistence.
- Authentication, permission denial, loading, empty, error and retry behaviors remain observable. Remote errors are not downgraded to fixture success.
- Application launch requires a canonical application identifier, consumes the governed permission result and validates the target before navigation.
- The current implementation does not claim production approval, RPA/EAD/robot/monitoring integration or formal non-test writes where the signed external contract is absent.

## Evidence Integrity Check

- `task.json`: valid under `validate-task.ps1 -EnforceLocation` when executed with Windows PowerShell 5.1.
- `prd.md`: present and scope-approved; hash recorded above.
- `design-handoff.md`: present and design-approved; hash recorded above.
- `handoffs/web.md`: present; hash recorded above; Web check matches this evidence and is passing.
- Mobile: explicitly not declared; there is no contradictory worker handoff requirement.
- Product code working tree is clean at aggregation. Existing untracked `.ai-team/`, `dist.rar` and `public/live-approval-runner.html` are preserved; they are not evidence of a product-code modification in the final repair commit.
- No conflict was found between the approved PRD/design, the worker handoff and the governed Web check.

## Combined Risks

- D01 — OAuth, formal users, organization/role mapping and data scope. Owner: client identity/Feishu administrator. Status: unresolved external dependency; current mitigation is login/401/403/returnTo and server-denial coverage.
- D02 — signed Base schema/page field set and representative pre-production data. Owner: client data owner. Status: unresolved external acceptance dependency; current mitigation is the 64-table/1311-field contract and authoritative empty/error handling.
- D03/D06 — formal write fields, role ownership, approval routing, idempotency/version/audit rules and per-type samples. Owner: business/backend owners. Status: unresolved external dependency; current mitigation is disabled remote writes plus guarded `TEST_` contracts.
- D04/D05 — RPA and EAD endpoint, authentication, SSO, status/callback and accounts. Owner: respective external system owners. Status: unresolved; Web renders safe blocked/unavailable states.
- D07/D08 — robot delivery and operational monitoring/alert protocols. Owner: message-platform and monitoring/operations owners. Status: unresolved; no fabricated success is exposed.
- D09/D10 — authoritative training/talent/certification flows and signed points-direction rules. Owner: domain data and points business owners. Status: unresolved for formal write/E2E; current read projections and rule-conflict visibility are implemented.
- D11 — formal domain, gateway mount, credential handling and lifecycle/backup baseline. Owner: production operations/security. Status: unresolved; therefore production readiness and lifecycle compliance are not claimed.
- Engineering observation — independent raw-float visual SSIM, text-only zoom and assistive-technology narration remain unexecuted. Owner: Compatibility QA. Status: to be assessed during QA; focused responsive, focus and semantics browser evidence is passing.

## Rollback Readiness

- Procedure: on the task branch, create a new revert commit for the requirement-gap commit range ending at `49eebed` (do not rewrite history), rebuild with `npm run build`, re-run `npm test`, `npm run test:integration`, `npm run check` and the affected browser gate, then restart the loopback preview from the verified artifact. Any future deployed environment must use the same revert commit through its authorized release pipeline.
- Owner: Web Engineer 007 for the task branch; production release owner for any future deployed environment.
- Trigger: a release-blocking functional/security regression, unauthorized write attempt, remote fixture leakage, page-level overflow/focus regression, or QA result requiring restoration to the last accepted baseline.
- Verification evidence: `handoffs/web.md` records the clean branch, final commit and exit-0 build/test/browser commands; Git commit `49eebed` is a bounded reversible change and no merge/deployment occurred.
- Status: `ready`.
