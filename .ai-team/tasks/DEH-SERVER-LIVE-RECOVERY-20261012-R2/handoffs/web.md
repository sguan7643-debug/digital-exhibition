# Web Engineering Handoff

## Root causes addressed

1. One browser principal acquired extra aliases after authorization, changing cache keys, task owner keys and authorization fingerprints.
2. Internal sync metadata leaked into several canonical operation inputs, creating repeated cold keys and unsafe worker replay.
3. Homepage aborted all sibling reads as soon as one section failed, discarding successful work and cache commits.
4. Status authorization latency masked completed/failed tasks as `running`, violating terminal monotonicity.
5. Restart prewarm covered only tenant-wide data and ignored valid persisted authorized sessions, leaving the first real-user homepage cold.
6. Targeted cleanup omitted WB-002, allowing contaminated application-search snapshots to survive deployment.

## Files changed for R2

- `server/feishu-read-isolation-key.mjs`
- `server/feishu-read-only-service.mjs`
- `server/homepage-aggregate-service.mjs`
- `server/feishu-user-auth-service.mjs`
- `server/feishu-vite-plugin.mjs`
- `server/clear-read-cache-operations.mjs`
- `server/install-live-recovery.sh`
- `tools/server-cache-contract-repair.test.mjs`
- `tools/homepage-aggregate.test.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/read-cache-operation-cleanup.test.mjs`
- `tools/create-server-real-data-package.mjs`
- `tools/server-real-data-package.test.mjs`

## Contract notes

- COM-004 directory: `{page,pageSize,sort}` plus optional approved filters.
- COM-004 self-contact: `{userId,includeContact:true,page,pageSize,sort}`.
- The task worker receives only the validated canonical business object.
- A terminal task remains terminal; a confirmed real permission revocation still returns 403.
- Formal Contact API data remains the COM-004 directory source. Bitable initialization users are never used as a production fallback.

## Evidence

- Stable identity alias and internal-metadata cache-key tests pass.
- Homepage independent-section completion and terminal monotonicity tests pass.
- COM-004 immutable handoff, bounded directory, formal-name projection and controlled-test quarantine tests pass.
- Persistent cache, stale fallback, startup restore, write governance, upload and APP-005/onboarding suites pass.

## Deployment boundary

- Deploy only the backend-only package.
- Mutating filesystem paths must resolve below `/home/seaoil/pre-demo`.
- Do not replace frontend `dist`, `.env`, `.local`, or unrelated runtime-cache entries.
- Live acceptance remains mandatory before release completion.

