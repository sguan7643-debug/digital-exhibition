# Design Handoff Aggregate — DEH-SERVER-CACHE-RECOVERY-20261010

Owner: AI Team Lead

## 1. Approved Design Baseline

- Product source: `prd.md`, explicitly scope-approved on 2026-10-10 and recorded in `task.json` / `decision-log.md`.
- UX source: `design/ux-handoff.md`.
- Visual source: `design/ui-handoff.md`.
- Platform: existing Web / Vue only; mobile and uni-app are not declared.
- Implementation boundary: backend source, backend tests, systemd/deployment configuration, task evidence, and a complete server deployment package only.
- Front-end source, root `dist`, components, styles, routes, copy, visual resources, design tokens, and build output must have an empty task change list.
- Feishu Base remains the only business system of record. No Redis, external cache, or additional database is introduced.

## 2. User-Observable Interaction Contract

1. A complete fresh cache, permitted stale cache, or permitted last-known-good snapshot returns HTTP 200 with the original complete success schema within five seconds after real-time session, permission, data-range, and owner validation.
2. A cache hit may start only a silent server refresh. It must not return HTTP 202, create a new browser loading lifecycle, expose cache origin, or replace the displayed complete result with a refresh failure.
3. A true cold request waits no more than five seconds. Completion returns HTTP 200; otherwise it returns one active `syncId` and a positive `pollAfterMs` with HTTP 202.
4. The existing client submits the original request once and polls only that `syncId`. `completed.result` remains the original operation/homepage success object without an additional wrapper.
5. Homepage success is atomic across `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002`. Partial modules, controlled-proxy data, empty placeholders, and per-module progressive success are forbidden.
6. Failed, expired, or timed-out jobs are never returned by a later normal request as an active task. A later request uses a serviceable last-known-good result or receives a newly created active task.
7. Existing loading, normal, empty, error, disabled, authentication-required, and permission-denied UI behavior is preserved exactly. No manual refresh or repeated click is introduced.

## 3. Unified Six-Dimension Identity Design

One canonical descriptor and one serializer must be used by single reads, batch reads, homepage aggregation, task single-flight, in-memory cache, persistent snapshots, write invalidation, startup recovery, and tests:

```text
tenant | user | permission-set | data-scope | operation | normalized-input
```

Design rules:

1. Normalize each raw request once at the service boundary. All downstream paths receive that immutable normalized descriptor; no layer reconstructs it independently.
2. Canonically sort object keys, permission values, data-scope values, and order-insensitive arrays. Preserve order only where the operation contract declares order meaningful.
3. Distinguish absent, null, empty string, numeric, boolean, and empty collection values according to the operation schema; do not use lossy truthy/default conversions.
4. Derive one stable digest from the canonical serialized descriptor. Logs may record the digest and non-secret operation metadata, never raw tokens, cookies, secrets, or protected data.
5. The homepage aggregate uses its own homepage operation identity built from the same six dimensions. Its five child operations use child identities from the same descriptor factory; aggregate and child results never use ad-hoc keys.
6. Cache policy and TTL classification are looked up by operation before any cache use. The inherited 54-cacheable/11-strong-consistency baseline and “unlisted means not cacheable” rule remain fixed.

## 4. Cache Record and Last-Known-Good Design

Each committed cache record contains only business result metadata needed for validation and lifecycle management:

- schema/version identifier;
- six-dimension key digest and operation;
- complete success result;
- committed timestamp, fresh-until timestamp, max-stale-until timestamp;
- integrity/checksum metadata needed for atomic snapshot recovery;
- no Feishu token, cookie, secret, authorization conclusion, or attachment binary.

Serving rules:

1. Fresh entries are served immediately after real-time access validation.
2. Stale/last-known-good entries are serviceable only before the operation's inherited max-stale deadline, after success-schema validation, and only when the current real-time identity/permission/data-scope descriptor still matches.
3. Ordinary/tenant policy remains fresh 60 seconds and max-stale 15 minutes; user/admin policy remains fresh 30 seconds and max-stale 5 minutes.
4. A serviceable stale/last-known-good result is returned HTTP 200 before any refresh is awaited. Refresh is silent and cannot mutate the committed record unless the replacement is fully successful.
5. An entry older than max-stale, schema-invalid, corrupt, or authorization-mismatched is not serviceable and does not suppress creation of a new cold task.
6. A failed refresh leaves the prior committed record intact until its existing max-stale deadline; it does not overwrite timestamps, payload, or integrity metadata.

## 5. Task Registry and State Machine

The task store separates an active single-flight index keyed by the six-dimension digest from retained task records keyed by `syncId`.

Allowed transitions:

```text
queued -> running -> completed
queued -> running -> failed
queued/running -> expired
```

Rules:

1. Only `queued` and `running` tasks may appear in the active single-flight index.
2. Transition to `completed`, `failed`, or `expired` removes the active-index entry in the same synchronous critical section before the terminal result becomes observable.
3. Terminal records remain queryable for at least ten minutes but cannot be merged into a new normal request.
4. A new request seeing a terminal record ignores it for single-flight purposes. It returns serviceable last-known-good data or creates a new task and new `syncId`.
5. Cancellation or disconnect of the initiating browser request ends only that request's wait; it never aborts the detached server task.
6. Task creation and active-index insertion are atomic. Concurrent identical requests can observe exactly one active `syncId`; different six-dimension digests cannot merge or query each other.
7. Each task has one creation timestamp and one 25-second hard deadline covering queueing, authorization waits used by the business task, pagination, retries, backoff, aggregation, validation, memory commit, persistent commit, and verification.

## 6. Success Commit Protocol

No task may become `completed` before its result is reusable. The required sequence is:

1. finish all upstream pages/sub-operations;
2. prove pagination completeness and distinguish a valid zero-record result from incomplete/error output;
3. validate the original operation success schema;
4. prepare one immutable cache candidate under the canonical key;
5. write the persistent snapshot atomically using temporary file, restrictive mode, and atomic rename without destroying the prior good snapshot;
6. publish the same candidate into the in-memory cache;
7. read back/verify both the in-memory lookup and persisted metadata against the same key digest and payload checksum;
8. only then transition the task to `completed`, attach the unchanged complete `result`, and remove it from the active index.

If commit or verification fails, the candidate is not completed; the previous committed entry remains usable, the active index is removed on terminal transition, and the task records a structured terminal error after allowed attempts are exhausted. Strong-consistency operations retain the same task-state discipline but do not create reusable ordinary caches.

## 7. Atomic Homepage Aggregate

1. The homepage task starts the five approved child operations under one shared deadline and global synchronization limiter.
2. Child work may use serviceable child cache entries after real-time access validation; missing children are read from Feishu using the shared canonical descriptor and shared read batch where safe.
3. The aggregate is valid only after all five child results pass their success schemas and the homepage aggregate schema.
4. Child results may be committed under their own canonical keys only if individually complete; the homepage aggregate candidate is committed once after all five are complete. No partial aggregate is published.
5. `completed.result` remains compatible with the existing successful homepage response and contains all five sections.
6. If one child fails and a complete homepage last-known-good exists within max-stale, later normal requests receive that aggregate HTTP 200 and a silent replacement task may run. The failed current task remains terminal and is not reused.

## 8. Retry, Deadline, Pagination, and Concurrency

1. Total attempts are fixed at three, including the initial attempt. At most two retries use backoff of 500ms and 1000ms, capped at 1000ms.
2. Queue time, pagination, authorization, backoff, retries, aggregation, cache commit, and verification consume the same 25-second deadline. No retry starts when remaining budget cannot complete its bounded work.
3. Only explicitly classified transient transport timeout, rate-limit, and temporary upstream 5xx failures are retryable. Authentication, authorization, schema, pagination-integrity, invalid-input, and deterministic errors are not retried.
4. Global Feishu synchronization concurrency remains at most three. Status authorization may receive scheduler priority but cannot increase upstream concurrency above three.
5. Pagination logs page count, cursor progress, record count, queue wait, upstream duration, remaining budget, and completion outcome without recording business payload or secrets.
6. `COM-001` and `WB-003` receive targeted budget tests proving terminal state within 25 seconds and no orphan work after deadline.

## 9. Status Endpoint Contract and Security

For an existing task, request handling order is:

1. validate current session locally; missing login returns 401;
2. locate the task and verify original owner/tenant identity; nonexistent task returns 404 and owner mismatch returns 403 without leaking result;
3. perform real-time permission and data-scope validation with a bounded status wait that does not execute the business operation;
4. explicit denial or revocation returns 403;
5. transient authorization slowness returns HTTP 200 with non-terminal `queued`/`running`; terminal result/error stays withheld until access is confirmed;
6. authorized queries return HTTP 200 with exactly `queued`, `running`, `completed`, `failed`, or `expired`.

Task execution failure is HTTP 200 `state=failed` with structured `error`, never endpoint HTTP 500/504. `completed` directly includes complete `result`. Ordinary operation status includes `operationId` where required. Both status route families share one responder and authorization implementation and never invoke homepage or the original operation.

## 10. Startup Recovery and Readiness

1. Recover snapshots from `/home/seaoil/pre-demo/runtime-cache/` before declaring readiness.
2. Reject corrupt, schema-incompatible, beyond-max-stale, descriptor-incomplete, or policy-disallowed records without damaging the previous file during inspection.
3. Rebuild memory entries using the same canonical-key implementation used by live reads.
4. Probe representative lookups, including homepage and configured representative operations when snapshots exist.
5. `/health/ready` returns ready only after recovery completes and restored entries can actually be found. A zero-snapshot start reports explicit cold readiness and starts bounded prewarm; it cannot claim restored-hit evidence.
6. Restart tests prove a previously committed representative entry is served without making every request cold.

## 11. Observability and Trace Evidence

Structured logs correlate `traceId`, `syncId`, operation, key digest, attempt, task transition, queue wait, authorization duration, pagination progress, upstream duration, remaining deadline, schema result, snapshot result, memory publish, read-back verification, cache disposition, and terminal code.

Logs must support analysis of the predecessor evidence: `sync-9d28d97d-03ee-458e-8a13-cb71747de477`, `trace-0795a3ae-8e04-447e-9c33-5ba1797cec74`, `trace-304e1cdb-f944-4f74-b561-29a23d1f1ffb`, `sync-ae297194-54fc-4366-b520-8e0402b7437a`, and completed `APP-002`/`ADM-003` reread misses. Raw service logs remain an external dependency; old call-stack claims stay hypotheses until logs arrive.

## 12. Resource, Filesystem, and Data Safety

- systemd runs as `seaoil-deh:seaoil-deh`.
- `/home/seaoil/pre-demo/runtime-cache/` remains outside the release tree with mode 0700; snapshot/temp files use 0600.
- CPU remains 1.5 cores, process memory 2GB, cache capacity 3GB, Feishu synchronization concurrency at most three.
- Capacity management evicts expired/low-priority/LRU entries without deleting success-schema fields or representative operation coverage.
- Archives exclude `.env`, live snapshots, credentials, secrets, cookies, tokens, private keys, certificates, and attachment binaries.
- Writes, approvals, idempotency, audit, login, and strong-consistency operations stay real-time. Successful writes precisely update/invalidate affected canonical keys; failed writes do not alter committed entries.

## 13. State and Visual Preservation

| State | Backend contract | Existing Web behavior preserved |
| --- | --- | --- |
| normal | HTTP 200 complete result | Complete content once; no cache/sync distinction |
| loading | initial wait or authorized `queued/running` | One loading lifecycle; no repeated announcement or focus movement |
| empty | complete authorized all-pages zero result | Existing genuine empty state only |
| error | `failed/expired` and no last-known-good | Existing structured error once; no partial/empty/proxy substitute |
| disabled | existing business rule only | No cache-induced disabled state |
| permission-denied | real-time 403 | Existing restricted path; no cached/task leak |

HTTP 401 keeps the authentication path. `warming` is operational, not a new user state. Current responsive, keyboard, focus, contrast, reduced-motion, forced-color, and narrow-Web behavior remains unchanged.

## 14. Verification Design

Required automation covers:

1. key parity across single, batch, homepage, persistence, recovery, and invalidation;
2. schema/commit/read-back before completed;
3. terminal-task removal and new syncId creation;
4. last-known-good HTTP 200 plus silent failed refresh preservation;
5. homepage five-part atomicity;
6. `COM-001`/`WB-003` deadline and fixed retry schedule;
7. both status routes, slow authorization, terminal failure, and 401/403/404 boundaries;
8. zero business replay during polling;
9. five representative operation cache formation and immediate HTTP 200 reread;
10. restart snapshot hit;
11. resource, modes, ownership, capacity, concurrency, and sensitive-data exclusion;
12. zero task changes under front-end source and root `dist`.

Required live evidence after Product Owner deployment includes five raw cold homepage iterations, thirty raw warm iterations, zero status 500/504, zero repeated homepage POST, first/reread evidence for five representative operations, real-page no-refresh completion, 401/403/revocation, restart hit, systemd/resource/cache checks, and rollback verification.

## 15. Cross-Source Traceability

| Approved requirement | UX source | UI source | Aggregate decision |
| --- | --- | --- | --- |
| Warm/stale/last-known-good HTTP 200 | UX 4.1–4.2, 5, 6 | UI 2–4 | Serve before silent refresh; max-stale and security remain fixed |
| Cold handoff and completion | UX 4.3–4.4, 5 | UI 2, 4 | Detached active task, fixed retry/deadline, same syncId polling |
| Failed-job non-reuse | UX 4.5, 6 | UI 4 | Separate active index from retained terminal records |
| Atomic five-part homepage | UX 4.6 | UI 2–4 | Validate all children and commit one aggregate before completed |
| Status/security contract | UX 5–6 | UI 4 | Shared responder, no business replay, authorized 200 states, explicit 401/403/404 |
| Front-end zero change | UX 1, 3, 8 | UI 1–12 | Backend-only implementation; existing visual/accessibility behavior frozen |
| Web only | UX 9 | UI 8 | Web evidence required; mobile/uni-app not declared |

## 16. Open Conflicts and Design Gate

No unresolved product, UX, or visual conflict remains.

Raw server logs, fixed Base/counts, mapped standard/admin/revoked identities, Product Owner deployment, and live resource evidence are required at their applicable implementation/QA gates. Missing evidence keeps affected checks `blocked/not executed` and prevents release approval.

Approval of this design authorizes backend implementation and tests only. It does not authorize deployment, publication, release, risk acceptance, front-end changes, or lower metrics.
