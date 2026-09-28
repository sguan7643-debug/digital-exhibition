# Aggregated Engineering Handoff

## Task and Approval Baseline

- Task: `DEH-SYSTEM-POC-CLOSURE-20260927`
- Governed task record: `task.json`
- Approved PRD: `prd.md`
- Approved design aggregate: `design-handoff.md`
- Declared platform: Web only
- Web framework: Vue
- Mobile framework/targets: none / not declared
- Aggregation date: 2026-09-28

## Web Evidence

Source: `handoffs/web.md`

The source handoff records the task branch, approved inputs, task-specific files, exact passing command results, 30-route desktop and 360 px evidence, 200% zoom evidence, authorized-browser evidence, and the real `TEST_` onboarding/projection closure. Its constraints and risks are preserved without reinterpretation.

## Mobile Evidence

`not declared`. The governed `task.json` declares only `platforms: ["web"]`, `mobile_framework: "none"`, and no mobile targets; no mobile handoff is required.

## Shared API and Data Contract

- Web service root is `/test2/`; authenticated Feishu recovery remains same-origin.
- Homepage reads use the aggregate endpoint and retain usable cached data while refresh is pending or fails.
- Onboarding uses the current dictionary, upload, application, approval-instance, status-sync, and approved-projection contracts.
- Upload and submit operations are guarded against duplicate full business requests.
- All POC mutations require current-ledger `TEST_` ownership. Non-`TEST_` records and authorization/security gates are not bypassed.
- User-visible failures must be actionable UI states; raw authorization JSON is not a valid page experience.

## Evidence Integrity Check

- Web source evidence: `handoffs/web.md` — present and complete.
- Governed task and approvals: `task.json` — scope/design approved; release approval not granted.
- Product baseline: `prd.md` — AC-01 through AC-07 mapped in the Web handoff.
- Design baseline: `design-handoff.md`, `design/ux-handoff.md`, `design/ui-handoff.md` — present.
- Real closure evidence: `.local/feishu-onboarding-poc-ledger.json` and `.local/feishu-onboarding-applications.json` — present; remote records were verified read-only against the configured Base.
- Mobile evidence: not applicable to declared scope.
- Conflicts: none found between the approved task, Web evidence, and integrated runtime result.
- Governed Web platform record: must point to `handoffs/web.md`; this aggregate does not directly edit `task.json`.

## Combined Risks

| Risk | Owner | Status | Mitigation |
|---|---|---|---|
| Feishu projection fields may become readable after short eventual-consistency delay | Web Engineer | governed | bounded read retries; preserve old cache; never duplicate a full write request |
| External eight-day live-restart evidence is absent | AI Team Lead | out of this task scope | PRD section 7 assigns long-term OAuth persistence to a separate task; controlled restart contract passed |
| Dirty worktree contains earlier governed-task and user-owned changes | Web Engineer | governed | do not reset; identify closure-owned changes explicitly; verify the integrated branch with full suites |

## Rollback Readiness

- Procedure: Because no release or deployment was performed, revert only the closure-task source/test changes on `task/digital-exhibition-ui-0817-dev-r3-web` to the pre-closure patch/commit, rebuild, rerun all commands and browser gates recorded in `handoffs/web.md`, and restart the local test server. Preserve `.env.local`, `.local` authorization/evidence, and remote `TEST_` records; do not delete or modify non-`TEST_` data.
- Owner: Web Engineer
- Trigger: any P0/P1 regression, build or required-test failure, authorization loop/raw JSON entry, unintended write, or data-boundary violation.
- Verification evidence: `handoffs/web.md` — full test/build exit code `0`, authorized route gates, write gates, and real `TEST_` closure evidence.
- Status: `ready`
