# DEH-LIVE-READ-CLOSURE-20260918 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Close the governed live Feishu read suite at `65 passed / 0 blocked / 0 failed` for AD account `3d8egf55`, while preserving existing business data, retaining only the eight approved least-privilege permission rows, and proving that all task-created `TEST_` fixture rows are removed.

**Architecture:** Add a dedicated fail-closed closure orchestrator around the existing Feishu schema client, read-only service, operation registry, and input resolver. The orchestrator owns a ledger for permission additions and temporary fixture records, injects operation-specific context overrides, runs the existing 65-operation verifier, and always performs independent residue checks. Existing reusable file records are discovered read-only; media upload is forbidden.

**Tech Stack:** Node.js ESM, existing Feishu Open API/schema clients, `node:assert`, existing operation registry and contract validators.

**Approved specification:** `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/design-handoff.md`

**Global constraints:**

- Never edit credentials, deploy configuration, or non-`TEST_` business records.
- The only non-`TEST_` writes are missing rows for the exact eight approved permissions on AD account `3d8egf55`.
- Existing permission rows are never updated or deleted.
- If permission verification is incomplete, delete only permission rows created by this run; after all eight verify, retain them even if later reads fail.
- `APP-010`, `CER-003`, and `COM-010` fixtures must use unique `TEST_` business keys and be deleted in `finally`, then independently queried to prove absence.
- `COM-008` and `MAT-003` may only reuse existing records/files read-only. Never call `uploadMedia`.
- Do not commit: the repository already contains unrelated user-owned changes.

## Task 1: Separate COM-008 logical resource identity from MAT-003 file token

**Files:**

- Modify: `tools/live-read-input-remediation.test.mjs`
- Modify: `server/feishu-live-read-inputs.mjs`

1. Add a failing test with multiple material rows where the first row has no usable file and a later row has a valid token. Assert that `MAT-003` receives `{ materialId, fileId: token }` and `COM-008` receives `{ fileId: materialId }`.
2. Add a failing test for explicit context overrides for `applicationId`, `certificationId`, and `exportId`.
3. Run `node tools/live-read-input-remediation.test.mjs` and confirm the new assertions fail.
4. Replace first-row-only material discovery with first-compatible-record discovery. Maintain separate context values for COM-008 and MAT-003, and merge only allowlisted overrides.
5. Re-run the test and `node tools/feishu-secure-resource-reads.test.mjs`.

## Task 2: Implement governed permission reconciliation

**Files:**

- Create: `server/feishu-live-read-closure.mjs`
- Create: `tools/feishu-live-read-closure.test.mjs`

1. Write fake-client tests for exact AD and exact permission allowlists, idempotent preservation of existing rows, creation of only missing rows, verification of all eight active permissions, and rollback of only this run's rows when verification is incomplete.
2. Assert that existing rows are never updated/deleted and any unknown account or permission code fails before a write.
3. Run the test and confirm it fails because the closure module is absent.
4. Implement the minimum permission ledger and reconciliation API. Use `主键`, `AD账号`, `主体类型=USER`, `主体ID`, `权限编码`, `状态=有效`, `启用=true`, `来源系统=TEST_INTEGRATION`, and a run trace. Query by AD account and verify active exact-code coverage.
5. Re-run the test.

## Task 3: Implement disposable context fixtures and residue proof

**Files:**

- Modify: `server/feishu-live-read-closure.mjs`
- Modify: `tools/feishu-live-read-closure.test.mjs`

1. Add failing tests for unique `TEST_` creation in `使用申请`, `认证项目`, and `导出任务`, including fields required by APP-010/CER-003/COM-010 and the target identity.
2. Test cleanup on success and on injected read failure. Assert deletion uses recorded table/record IDs and that independent exact-key searches return zero.
3. Assert the orchestrator never calls `uploadMedia` and never mutates discovered material/attachment rows.
4. Implement fixture creation, context override output, reverse-order cleanup, and independent residue checks.
5. Re-run the closure unit test.

## Task 4: Add the formal 65-operation closure runner

**Files:**

- Create: `tools/verify-live-read-closure.mjs`
- Modify: `package.json`

1. Add a source-level test assertion that the runner uses the approved account, exact permission allowlist, existing 65-operation registry, contract validation, `try/finally`, cleanup verification, and redacted evidence output.
2. Implement the CLI runner. Order: preflight → permission reconciliation/verification → read-only file discovery → create three fixtures → run 65 reads → cleanup fixtures → independent residue proof → write redacted evidence.
3. Add package script `test:live-read-closure` without changing existing scripts.
4. Run unit/integration checks: `node tools/live-read-input-remediation.test.mjs`, `node tools/feishu-live-read-closure.test.mjs`, `pnpm test:integration`, `pnpm check`, and `git diff --check`.

## Task 5: Execute formal Feishu verification and hand off evidence

**Files:**

- Create: `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/evidence/live-read-closure-<timestamp>.json`
- Create: `.ai-team/tasks/DEH-LIVE-READ-CLOSURE-20260918/handoffs/web.md`

1. Load the existing local Feishu environment without printing secrets and enable the already-approved record-write gate only for this run.
2. Execute the formal runner once. Do not retry destructive stages blindly; use its ledger for any recovery.
3. Verify evidence reports all eight permissions active, 65 passed, no blocked/failed operation, three fixture keys absent, and no media upload.
4. If any gate fails, retain the fail-closed result and evidence; do not fabricate success or broaden scope.
5. Record changed files, commands, outcomes, durations, permission retention, cleanup proof, and remaining blockers in the Web handoff.

## Review focus

- Operation-specific resource identity: COM-008 logical record ID versus MAT-003 file token.
- Permission rollback boundary before and after full eight-code verification.
- Cleanup execution and independent absence checks on every exit path.
- No secret/token leakage in logs or evidence.
- No write outside the exact approved account, permissions, and `TEST_` fixture rows.
