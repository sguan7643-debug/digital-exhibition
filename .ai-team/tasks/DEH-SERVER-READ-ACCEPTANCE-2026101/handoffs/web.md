# Web Engineering Handoff

## 2026-10-11 repair attempt 1

The product owner authorized packaging after the source repair passed its local backend gates. A backend-only acceptance package was regenerated; nothing was deployed and release approval remains false.

### Root cause and implementation

- `executeCacheable` previously performed a strong Feishu `用户权限` read before looking up an already committed operation cache entry. In the live environment this consumed roughly 18 seconds, so a valid hot cache still returned 202 at the browser deadline.
- The same authorization phase occupied most of the shared 25-second deadline before COM-001 started its profile projection. User/admin source reads were also forced to bypass safe lower-level snapshots, increasing queue pressure.
- Ordinary authenticated reads now validate the session identity and inspect their identity-isolated operation cache without an unrelated permission-table round trip.
- Permission-gated/admin operations, COM-004 authorized-directory scope checks, task-status access and write authorization retain live permission/data-scope validation.
- COM-001 now performs its required permission/profile reads once inside the parallel business projection and can reuse safe source snapshots. Strong `executeConsistent(COM-001)` remains available and is used by write authorization.
- Terminal failed tasks are verified to leave the active merge index; the next request receives a new syncId and a successful retry commits a reusable fresh cache entry.

### Changed files in this repair

- `server/feishu-read-only-service.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/feishu-read-latency-cache.test.mjs`
- `tools/server-cache-contract-repair.test.mjs`
- `tools/server-cache-code-review-findings.test.mjs`
- task QA/handoff metadata under `.ai-team/tasks/DEH-SERVER-READ-ACCEPTANCE-2026101/`

No frontend source or frontend dist file was changed by this repair.

### Regression evidence

- `npm run test:server-read-acceptance` — PASS.
- `npm run test:server-cache` — PASS, including deployment staging/archive parity, upstream deadline, persistent restore, latency/cache, 65-operation classification, authorization, task completion/status, 30-request warm-hit, code-review findings and write governance.
- `node tools/feishu-persistent-read-cache.test.mjs` — PASS.
- `node tools/homepage-aggregate.test.mjs` — PASS; deterministic warm p95 `0.13ms`.
- `node tools/server-real-data-read-contracts.test.mjs` — PASS.
- `node tools/server-real-data-startup.test.mjs` — PASS.
- `node tools/server-real-data-write-contracts.test.mjs` — PASS.
- `npm run test:server-real-data` — PASS; backend-only package contract passed with 230 files.
- `npm run test:integration:server` — PASS.
- `node tools/test-deployment-server.test.mjs` — PASS.
- `node --check server/feishu-read-only-service.mjs` — PASS.

Added deterministic assertions cover:

- hot COM-005 returns immediately without a slow permission-table call;
- COM-001 completes under a deadline that would fail if authorization and profile reads were serialized;
- COM-001 completion forms a fresh immediate cache hit;
- a terminal failed task is not reused and the retry gets a different syncId;
- permission-gated reads, status polling, 401/403 behavior and the total retry limit remain enforced.

### Backend-only package

- ZIP: `deploy/digital-exhibition-server-real-data-package.zip`
- SHA-256 sidecar: `deploy/digital-exhibition-server-real-data-package.zip.sha256`
- SHA-256: `984a8918648bac8fe4ecf48625d4ffb9da9dc65ae174a2be350577810f9ccca7`
- Package guards verified that no frontend `dist`, real `.env`, runtime cache or detected secret was included.
- The existing whole-site staging/archive was synchronized with the current backend using the existing `dist` and `--skip-build`; frontend source and `dist` were not modified.
- No server deployment was performed.

### Remaining evidence before release

- A later, explicitly authorized deployment must still prove the live 5 cold and 30 warm samples.
- The package is an acceptance candidate, not release approval, and does not claim live-environment acceptance.

## 2026-10-12 repair attempt 2

The supplied live trace showed that startup `COM-005`/`WB-002` cache keys were not reusable by the authenticated homepage and that COM-001/WB-001 duplicated lower-level reads while later retries had too little deadline remaining to succeed.

The backend now aligns the startup COM-005 input with the homepage request, securely promotes tenant-scoped startup projections to the first authenticated tenant, reuses safe current-user source snapshots across aggregate children, and suppresses retries without a complete-attempt runway. User/admin operation caches remain identity/permission/data-scope isolated, and status authorization remains live.

New deterministic coverage proves cold homepage completion with all five sections, immediate warm 200 reuse, persistent-snapshot restore after restart, different-tenant isolation, no doomed retry, and silent browser recovery. `test:server-read-acceptance`, `test:server-cache`, `test:server-real-data`, `check`, and the browser aggregate test pass.

- Candidate ZIP: `deploy/digital-exhibition-server-real-data-package.zip`
- SHA-256: `3df918a3786503b22974b377d9fce22dd24b91cf422035e14976068b98d01842`
- No frontend source or frontend dist was modified by this repair.
- Live 5-cold/30-warm acceptance remains pending; this is not release approval.

## 2026-10-12 emergency backend candidate (live deployment pending)

The latest live evidence isolated three concrete blockers. COM-001 read the complete user dictionary and a legacy `FEISHU_READ_BUDGET_MS` could expire before the approved 25-second task deadline, causing a second attempt with insufficient runway. APP-002 recorded a raw-session authorization fingerprint at handoff and compared it with a verified live fingerprint during polling. COM-004 could restore or return initialization people from the prior directory projection.

The backend now performs a filtered current-user lookup for COM-001, prevents an environment read budget from undercutting the task deadline, prioritizes the five-child homepage batch within the existing three-slot limit, binds a canonical sorted authorization fingerprint on the first successful live status check, filters initialization people, and bounds scoped directory/self-contact reads. The persistent cache namespace is `read-v3`, so v2 directory snapshots containing old test personnel are not served after deployment.

Changed implementation files:

- `server/feishu-read-only-service.mjs`
- `server/feishu-read-isolation-key.mjs`
- `server/homepage-aggregate-service.mjs`

Changed regression files:

- `tools/server-real-data-read-contracts.test.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/feishu-read-latency-cache.test.mjs`
- `tools/feishu-read-only-service.test.mjs`

Passed: `test:server-read-acceptance`, `test:server-real-data`, `test:feishu-latency`, `test:business-writes`, `test:no-mock-data`, and `check`.

- Candidate ZIP: `deploy/digital-exhibition-server-real-data-package.zip`
- SHA-256: `dea126cfaa9391c02c0efb7321f64c746d43a5aa9da2cad3e735211fd556adf2`
- Package: 230 files; no frontend dist/assets; packaged backend hashes match source.
- No server deployment or authenticated browser acceptance has been performed from this workspace.
