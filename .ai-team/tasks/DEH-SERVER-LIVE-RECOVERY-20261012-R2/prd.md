# Product Requirements

## 1. Product goal and target user value

- **Fact:** The target users are authenticated business users such as 关胜 who access the digital exhibition test environment.
- **Fact:** The product outcome is not a single error-code patch. Homepage, application center, and onboarding application must obtain real Feishu data through one complete cache, synchronization, and recovery path.
- **Fact:** Users must not manually refresh after a cold read hands off to a synchronization task.

The task succeeds only when the three pages are usable in the real test environment and all five final conditions in the task brief are satisfied together.

## 2. Facts, assumptions, and evidence

### Facts

- **Fact:** The current test server is expected to run from `/home/seaoil/pre-demo/test` and persist read cache under `/home/seaoil/pre-demo/runtime-cache`.
- **Fact:** Server file operations are authorized only inside `/home/seaoil/pre-demo`; all other server paths and projects are excluded.
- **Fact:** Earlier test evidence showed homepage and common reads returning repeated 202 responses, synchronization deadline failures, unstable task authorization, and failed-task reuse.
- **Fact:** Earlier COM-004 results exposed initialization identities including U003/U004/U005 and names such as 王五、赵六、陈晓明.
- **Fact:** The latest supplied server log shows successful `published-readback-ok` commits for parts of APP-002, WB-002, COM-003, and COM-005, but also 324 `CONTROLLED_TEST_RECORD` events and no complete HOMEPAGE/COM-001/COM-004 acceptance evidence.
- **Fact:** The current frontend is treated as already deployed and is not part of this repair scope.
- **Fact:** Authentication, real-time authorization, data-scope isolation, approval, idempotency, audit, and resource limits must remain enforced.

### Assumptions requiring runtime confirmation

- **Assumption:** Existing SSH or terminal credentials on the user's computer can reach the test host without exposing secrets in task evidence.
- **Assumption:** A valid authenticated browser session for 关胜 is available for end-to-end verification.
- **Assumption:** The Feishu tenant contains enough formal applications, departments, and people to satisfy the non-empty page requirements after prohibited test records are excluded.
- **Assumption:** Test-environment service restart and rollback commands affect only the digital exhibition service and files under `/home/seaoil/pre-demo`.

## 3. In-scope and out-of-scope boundaries

### In scope

1. Diagnose the currently running release, process topology, cache files, task-state storage, logs, and the exact data path for HOMEPAGE, COM-001, APP-001, APP-002, COM-003, COM-004, and COM-005.
2. Correct stable cache keys, fresh/stale reuse, persistent snapshot restore, task deduplication, monotonic terminal states, failed-task eviction, and last-known-good behavior.
3. Correct bounded real Feishu reads, current-user authorization continuity, COM-004 directory/self-contact contracts, and formal name/department projection.
4. Prevent fixture, fallback, controlled proxy, TEST_ dictionary, and initialization identities from entering formal results without over-filtering valid applications.
5. Preserve upload and application submission contracts and verify them through the existing latest frontend.
6. Add or update backend regression tests, runtime diagnostics, targeted cache-cleanup tooling, deployment/rollback scripts, backend-only package, and SHA-256.
7. Deploy only within `/home/seaoil/pre-demo`, after resolving absolute paths and creating a recoverable rollback directory.
8. Verify the deployed candidate through the real test URL and authenticated session, recording HTTP status, syncId, elapsed time, task state, result completeness, release metadata, and restart consistency.

### Out of scope

1. Frontend source or frontend `dist` changes.
2. Any operation outside `/home/seaoil/pre-demo` or against production.
3. Mock, fixture, fallback, proxy, or invented business data.
4. Weakening authentication, authorization, approval, idempotency, audit, isolation, or resource controls.
5. Upstream Feishu data cleanup that requires a business owner to edit official source tables.
6. Adding Redis, another database, or replacing Feishu as the formal source.

## 4. Primary user flow

1. An authenticated user opens `/test2/workbench`, `/test2/apps`, or `/test2/apps/onboarding/apply`.
2. The backend validates the current identity, permissions, and data scope before reading or serving cache.
3. If a complete legal fresh/stale cache exists, the first request returns HTTP 200 with complete data, and any refresh runs silently.
4. If no cache exists, the request waits no more than five seconds.
5. If the read is still running, the backend returns HTTP 202 with exactly one active syncId and a polling URL.
6. The frontend polls only that syncId; status requests remain HTTP 200 and do not rerun the original business request.
7. The task reaches one stable terminal state within 25 seconds. A completed task returns the complete result and commits reusable memory and persistent cache.
8. The page replaces loading with real data automatically. A subsequent identical request returns the committed cache directly.
9. On the onboarding page, the user selects a formal application type, business domain, department, and authorized person, uploads an icon and attachment, and submits successfully.

## 5. State inventory

- **Success:** HTTP 200 returns complete real data with resolvable names and departments; completed sync tasks include `result`; uploads and submission return stable identifiers and versions.
- **Loading:** Cold work may show loading for at most the foreground budget and then one pollable task; loading disappears automatically on completion.
- **Empty:** Empty is allowed only when the authorized formal source is genuinely empty. It must carry an explicit legitimate empty structure and cannot be produced by filtering every valid record or by upstream failure.
- **Error:** A task may enter `failed` once with a diagnostic code. A terminal task never returns to `running`, is never reused as active work, and cannot overwrite last-known-good cache.
- **Disabled:** Upload or submit controls are disabled only by the existing business/permission contract, not because reference data remains indefinitely loading.
- **Permission dependent:** Anonymous access remains 401; missing or revoked permission remains 403; cache and task polling revalidate stable normalized authorization without false 403 drift.

## 6. Explicit non-goals / things not to do

- Do not treat readiness HTTP 200 alone as release acceptance.
- Do not mark partial homepage sections, empty placeholders, proxy data, or test records as successful data.
- Do not solve latency by extending user-visible waiting beyond five seconds or task deadlines beyond 25 seconds.
- Do not repeatedly delete the whole runtime cache; cleanup must target only affected operations and preserve unrelated valid entries.
- Do not use an old syncId after a service restart as evidence for the new process.
- Do not claim completion from local automation alone.

## 7. Given/When/Then acceptance criteria

### AC-1 — Three pages return real data

Given 关胜 has a valid authenticated test session, when the user opens the homepage, application center, and onboarding application page, then all three pages display real Feishu-backed business data and formal names/departments rather than blank modules, IDs, proxy data, or test identities.

### AC-2 — Cache and cold handoff behavior

Given a complete legal cache exists for the same tenant, user, permission set, data scope, operation, and normalized input, when the request is made, then it returns HTTP 200 in approximately one second without entering a user-visible sync flow.

Given no legal cache exists, when the operation does not finish within five seconds, then the backend returns HTTP 202 with one valid syncId; polling that syncId remains HTTP 200 and reaches `completed` with a complete result within 25 seconds without repeating the original business request.

### AC-3 — Stable cache and task state

Given a task completes, when the same normalized request is made again and after the service is restarted, then the committed memory/persistent snapshot is reused and the result does not revert to running, disappear, or recreate an unnecessary cold task.

Given a task fails or expires, when the same request arrives, then the failed task is not reused; a legal last-known-good result is returned immediately or one controlled retry task is created.

### AC-4 — Formal dictionaries, people, and names

Given COM-004 directory mode or application projections run, when results are returned or restored, then they contain only authorized formal Feishu people and formal department names; U001-U005, 张三丰、王五、赵六、陈晓明, TEST_ values, and initialization records are absent without suppressing unrelated valid applications.

### AC-5 — Onboarding workflow

Given the onboarding page has loaded, when the user interacts with it, then all formal application types, business domains, authorized departments, and authorized people are selectable; icon and attachment uploads succeed; APP-005 submission succeeds with stable request/application identifiers, status, and version.

### AC-6 — Security and isolation

Given an anonymous, unauthorized, revoked, or differently scoped request, when it accesses a read, cache, task, upload, or submit route, then the existing 401/403, approval, idempotency, audit, and data-scope controls remain effective and no cache leaks across identities or scopes.

### AC-7 — Deployment boundary and rollback

Given the backend package is ready, when it is deployed, then every resolved file operation remains under `/home/seaoil/pre-demo`, the previous release is preserved in a rollback directory, health metadata identifies the new release/PID/cache schema/cache path, and no other server project is modified.

### AC-8 — Test-environment evidence

Given the candidate is deployed, when the five final conditions are tested through the real URL and authenticated session, then the evidence records each relevant HTTP status, syncId, elapsed time, final state, data count/completeness, warm reread, upload/submit result, service release/commit, and two consecutive restart checks.

## 8. Open questions and scope decisions

- Scope approval must explicitly accept test-environment deployment restricted to `/home/seaoil/pre-demo` and reject any operation outside that path.
- If formal Feishu source data is genuinely absent or still references prohibited initialization identities, the backend must report that upstream-data blocker; it must not fabricate data to satisfy a non-empty screen.
- Production deployment and release remain separate decisions and are not authorized by this task.
