# Engineering handoff — DEH-LIVE-101-20260914

## Declaration

- Declared platform: Web (`vue`).
- Mobile / uni-app: not declared (`mobile_framework=none`, `mobile_targets=[]`).
- Branch / baseline: `task/digital-exhibition-ui-0817-dev-r3-web` / `91a8ba1ad452bc348cb3615f1700b55c9e1af9a5`.
- Worktree status: intentionally dirty from the governed repair series; no merge, deployment, publication, or production-data write is included in this handoff.

## Current implementation and evidence

- Real OAuth identity: user `3d8egf55`; token and application secret remain server-side.
- Real approval closure: `.ai-team/tasks/DEH-LIVE-101-20260914/evidence/live-approval-closure.json` records authenticated real HTTP, `PENDING` query, approval `200/APPROVED`, final query `200/APPROVED`, and approved status-page rendering without request interception.
- Real application projection: local governed approval registry entry `511FE923-2AAE-4CE1-9512-5698CC2BB685` records `projectionStatus=SYNCED`, `projectedApprovalStatus=APPROVED`, index record `recvvwCbN9blk5`, and 海能 Work detail record `recvvwCdEpr2ij`.
- Real reads: `.ai-team/tasks/DEH-LIVE-101-20260914/evidence/reads-65-20260918.json` records 65/65 executed, 40 passed, 25 explicitly blocked, and 0 failed. Blocks are either permission-enforced operations or missing runtime resource IDs; they are preserved as evidence and are not represented as passes.
- Existing controlled-write evidence: `.ai-team/tasks/DEH-LIVE-101-20260914/evidence/write-operations-91a8ba1.log` records 36/36 TEST_ writes with cleanup.

## Verification commands

- `pnpm test:integration` — passed on 2026-09-18.
- `pnpm test:deh-req-gap` — passed on 2026-09-18.
- `pnpm test` — passed on 2026-09-18.
- `pnpm build` — passed on 2026-09-18; Vite transformed 1951 modules.
- `pnpm check` — passed after removal of announcement-draft persistent browser storage.
- `git diff --check` — passed; only line-ending warnings were emitted.
- `pnpm feishu:approval:verify -- --resume-instance=511FE923-2AAE-4CE1-9512-5698CC2BB685 --resource-id=TEST_HW_LIVE_1789689344689` — passed.

## Known risks

- Twenty management/admin reads require permissions not assigned to the currently authorized business user. Owner: environment/permission administrator. Status: governed; the service returns explicit `403 PERMISSION_DENIED` and the UI must not fabricate data.
- `COM-008`, `APP-010`, `CER-003`, `MAT-003`, and `COM-010` need a real file, application, certification, or export identifier that is absent in the current tenant fixture. Owner: QA data owner. Status: governed; the verifier records `REQUIRED_INPUT_UNAVAILABLE` rather than issuing a fabricated request.
- Approved TEST_ approval instances and API-created definitions cannot be deleted through the available API. Owner: Feishu test-tenant administrator. Status: governed; records retain `TEST_` markers.
- The working tree contains the cumulative governed repair set and is not a clean release commit. Owner: release integrator. Status: governed; release must package only the reviewed diff.

## Rollback readiness

- Status: ready.
- Owner: Web release integrator.
- Trigger: OAuth callback regression, approval submit/status regression, projection failure, first-screen request regression, or any post-release blocking defect.
- Procedure: stop the candidate deployment; restore the last deployed artifact built before this repair series; restore the prior server bundle; restart the same-origin service; do not delete retained `TEST_` approval records; then re-run the entry-session probe, application directory read, and approval-status GET smoke checks.
- Verification evidence: the previous deployed artifact is independent of this dirty worktree; current replacement artifact is reproducible with `pnpm build`; rollback smoke checks are covered by `tools/feishu-entry-auth-guard.test.mjs`, `tools/feishu-server-proxy.test.mjs`, `tools/onboarding-approval-routing.test.mjs`, and `tools/onboarding-status-redirect-and-origin.test.mjs`.
