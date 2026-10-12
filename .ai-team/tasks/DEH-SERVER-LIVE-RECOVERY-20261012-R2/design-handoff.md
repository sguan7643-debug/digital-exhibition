# Aggregate Design Handoff

## Sources

- Approved scope and acceptance baseline: `prd.md`.
- Interaction source: `design/ux-handoff.md`.
- Visual source: `design/ui-handoff.md`.
- Platform declaration: Web/Vue only in `task.json`; mobile is not declared.

## 1. Runtime topology and observability

- A single systemd-managed Node service is authoritative for the test backend. Deployment must inventory MainPID, WorkingDirectory, ExecStart, environment file, listening process, cache path, task-state path, and snapshot path.
- Health/readiness output and startup logs must expose release/version, Git commit, build time, PID, cache schema version, cache directory, task store, and working directory without exposing credentials.
- The service must detect or report competing old instances before acceptance. Acceptance evidence must identify the exact process serving port 4173.

## 2. Stable authorization and cache identity

- Build an immutable authorization descriptor from normalized tenant ID, user ID, sorted unique permission identifiers, and sorted normalized data-scope identifiers.
- Build the cache/task key from the authorization descriptor plus operation ID and canonical business input. Canonicalization recursively sorts object keys, normalizes permitted scalar forms, preserves meaningful array order only where the contract requires it, and excludes trace IDs, timestamps, tokens, cookies, request objects, task metadata, and random values.
- Directory and self-contact COM-004 modes receive distinct canonical inputs and cache namespaces.
- A cache entry records schema version, operation, authorization fingerprint, canonical input digest, completeness marker, source timestamps, and full result. Entries with a mismatched schema, fingerprint, incomplete marker, terminal error, controlled/test provenance, or invalid projection are ineligible.

## 3. Cache lifecycle

- Request order is memory cache, persistent snapshot, then live Feishu read.
- A legal fresh cache returns HTTP 200 immediately. A legal stale/last-known-good cache also returns HTTP 200 immediately and starts at most one silent refresh.
- A cold live read waits no more than five seconds. If unfinished, it returns HTTP 202 with one deduplicated task and polling URL while the same promise continues in the background.
- A completed read validates result completeness, atomically writes the persistent snapshot, updates memory cache, and only then marks the task `completed` with the full result.
- Refresh failure records diagnostics but leaves the last-known-good cache intact.
- Startup restores only legal complete entries. Writes use a temporary file plus atomic rename so a restart cannot load a partial snapshot.
- Cleanup tooling removes only HOMEPAGE, APP-001, APP-002, and COM-004 entries/tasks selected by parsed operation metadata; unrelated valid entries are preserved.

## 4. Synchronization task state machine

- Valid transitions are `queued -> running -> completed` or `queued -> running -> failed`.
- `completed` and `failed` are immutable terminal states. Older snapshots, retries, startup recovery, and late worker callbacks cannot overwrite them.
- Task records use one authoritative persistent store with atomic compare-and-set/revision checks. The in-memory view is a cache of that source, not an independent state authority.
- Polling returns HTTP 200 for the same authorized caller while the task is queued/running/completed. A failed task returns a stable terminal body and appropriate failure status according to the existing contract; it is never reported as success and is never reused as active work.
- Worker replay uses only the already validated, allow-listed business input saved at creation. Runtime identity/context and task metadata are stored separately.
- Deadline and cancellation apply to one operation without blocking other resource slots. Different resources may progress independently; one slow Feishu table cannot starve all reads.

## 5. Formal real-data reads and projections

- COM-001 performs a bounded current-user lookup using the authenticated user identity and authorization context; it does not scan an unbounded user table and does not substitute a system-prewarm identity.
- HOMEPAGE coordinates its five required sections independently, reuses section caches, and commits only a complete legal aggregate. A failed section cannot turn proxy, partial, or empty placeholder data into success.
- APP-001/APP-002 return only visible formal applications. Test quarantine is based on explicit, auditable indicators (known fixture IDs/names/flags and controlled-record provenance), not broad matching that suppresses valid production applications.
- APP-003 resolves the requested real application from the same legal application cache/source and batch-projects owner, developer, responsible organization, and developer organization names.
- COM-004 directory mode returns the authorized formal people set and formal departments without contact leakage. Self-contact mode verifies that the requested user is the current authenticated user before returning allowed contact fields.
- COM-005 excludes disabled, `TEST_`, initialization, and known test dictionary rows and returns only formal enabled options.
- Name/department projection uses batched user and department maps. IDs remain available in their ID fields; name fields never copy IDs.
- Fixture, fallback, controlled proxy, and initialization records are never accepted into formal cache or successful task results.

## 6. Startup prewarm and failure isolation

- Prewarm starts only after the Node service has bound its port and runtime startup is complete. Module import, Vite build, tests, configuration loading, and package validation cannot trigger Feishu reads.
- Prewarm uses explicit startup jobs and legal identity scopes. User-bound resources that require a browser identity are warmed only from a valid persisted authorized cache or an authenticated request; a system identity cannot manufacture a user result.
- Each prewarm/read has a bounded resource-local budget and concurrency slot. Failure is isolated, logged, and cannot block successful cache commits for other resources.

## 7. Onboarding write path

- The existing contracts for reference reads, icon upload, attachment upload, and APP-005 submission remain unchanged.
- Upload/download safety, authenticated applicant identity, permissions, approval, idempotency, audit, version, and stable request/application identifiers remain mandatory.
- Read-path repair must not bypass or weaken write-path controls.

## 8. Deployment and rollback

- Package is backend-only and accompanied by SHA-256. Deployment scripts resolve every source, staging, target, cache-cleanup, and rollback path before mutation and reject any path outside `/home/seaoil/pre-demo`.
- The active `/home/seaoil/pre-demo/test` environment file and unrelated frontend assets are preserved. New backend files are staged in a fresh release directory, import-checked, then swapped with a timestamped rollback copy.
- Targeted invalid cache/task records are cleaned after the old service stops and before the new service starts. The deployment never recursively deletes the active tree or any path outside the authorized root.
- Readiness, runtime metadata, single-process ownership, and package SHA are verified before live acceptance. A failed health check rolls back to the preserved release.

## 9. Verification strategy

- Automated checks cover import side effects, canonical keys, task deduplication, terminal monotonicity, persistent restore, stale-on-refresh-failure, targeted cleanup, COM-004 input replay, formal-data quarantine, bounded COM-001, homepage completeness, authorization isolation, uploads, and APP-005 idempotency/audit.
- Live verification uses the real authenticated test session and records HTTP status, syncId, elapsed time, task state sequence, result counts/completeness, warm reread, release metadata, upload/submit identifiers, and two consecutive restart checks.
- The candidate is not complete until `/test2/workbench`, `/test2/apps`, and `/test2/apps/onboarding/apply` satisfy all five final conditions in the deployed test environment.

## 10. Risk controls and stop conditions

- Stop before any resolved path leaves `/home/seaoil/pre-demo`, before any production action, or before any security-control relaxation.
- If formal Feishu data is genuinely absent or inaccessible, report the precise upstream permission/data blocker; do not fabricate or relabel data.
- Frontend changes require a separate approved scope and are not part of this implementation.
