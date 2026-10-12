# Functional QA Report

## Result

Failed on the 2026-10-11 test environment. This records the product-owner supplied read-only evidence; it does not approve a package or release.

Repair-attempt-1 deployment `20261011224534` was retested with an authenticated real user and still failed. The browser issued one `POST /api/v1/homepage`, reused sync job `sync-8d08cc7d-47dc-4e0d-87e2-c36ff3d19fb4`, and received terminal `READ_SYNC_DEADLINE_EXCEEDED`; no manual refresh or duplicate business POST caused the failure.

## Blocking defects

| ID | Acceptance area | Observed result | Status |
| --- | --- | --- | --- |
| QA-01 | Homepage cold/read-through cache | Two consecutive requests returned `202 HOMEPAGE_SYNCING`; jobs terminated with `FEISHU_READ_BUDGET_EXCEEDED` or `READ_SYNC_DEADLINE_EXCEEDED`, both attributed to COM-001. | Blocked |
| QA-02 | Stable fresh/stale reuse | Same authorized identity and input repeatedly returned 202 instead of a near-immediate 200 cache response. | Blocked |
| QA-03 | Sync completion and recovery | COM-001, COM-003, COM-004, MAT-002 and FAV-002 timed out; a 504 terminal task can leave pages loading permanently. | Blocked |
| QA-04 | Required business data | Application dictionaries, authorized directory, personal profile/name/department, APP0076 detail and complete material data did not become available within 30–37 seconds. | Blocked |

## Repair-attempt-1 live trace evidence

- Trace: `trace-715c5249-b6dd-4454-9fa3-bd63566db4d8`.
- Startup cache keys for `COM-005`/`WB-002` differed from the authenticated homepage keys, so startup operation-cache entries were not reusable by the real user.
- `COM-005` and `WB-002` completed and committed, but the atomic homepage did not commit because `COM-001` and `WB-001` failed.
- `COM-001`: `用户字典` and `积分余额` completed; `应用收藏` failed after about 10 seconds with `FEISHU_READ_BUDGET_EXCEEDED`; `消息通知` failed after about 9.1 seconds with `READ_SYNC_DEADLINE_EXCEEDED`.
- `WB-001`: `培训课程` completed; `公告通知`, `用户累计统计`, and `用户月度统计` failed. Read-slot queue time reached 4.449, 5.340, and 9.158 seconds.
- Retry attempt 2 had about 3.046 seconds remaining; attempt 3 reached the shared deadline after about 1 millisecond. These retries could not succeed.
- Evidence source: product-owner supplied service log excerpt `已粘贴的文本.txt`, captured after deployment `20261011224534`.

## Preserved controls

- No evidence permits weakening 401/403 behavior.
- No front-end source or dist change is authorized.
- No new acceptance package or deployment is authorized until these blockers pass local regression.

## Repair focus

1. Remove slow permission-table reads from the critical path of non-privileged cached reads while retaining live checks for permission-gated operations and task-status access.
2. Give COM-001 the full sync deadline and avoid duplicate authorization reads.
3. Ensure completed results commit to memory and persistent snapshots under one stable isolation key; terminal failed jobs must leave the merge index.
4. Add deterministic regression coverage before any package is generated.

## Repair-attempt-2 local candidate

The failed live result above remains authoritative until redeployment. The new backend-only candidate addresses the observed mechanism rather than changing the frontend:

- Startup `COM-005` uses the same normalized homepage input and a securely bindable tenant seed, so the first authenticated tenant can reuse the completed public projection without crossing tenant boundaries.
- Tenant-approved public projections share only a tenant key; user/admin results retain identity, permission and data-scope isolation.
- Shared current-user source projections no longer bypass safe table snapshots, reducing duplicate `用户字典`、`应用收藏`、`消息通知` and `积分余额` reads across COM-001/WB-001.
- Retries are skipped when the remaining deadline cannot accommodate a complete attempt, preventing the observed 3-second and 1-millisecond doomed retries.
- Deterministic coverage proves one cold homepage 202 reaches `completed.result`, all five sections are present, the next request is an immediate 200 without another upstream read, and a restart restores the public projection from the persistent snapshot.

Local evidence: `npm run test:server-read-acceptance`, `npm run test:server-cache`, `npm run test:server-real-data`, `npm run check`, and `npm run test:homepage-aggregate:browser` all passed. Live QA is still pending.
