# Engineering Handoff — DEH-SERVER-CACHE-20261008（QA Repair Attempt 2）

## Status

- Local backend repair: complete.
- Task state: `qa`.
- Web platform check: passed; source evidence `handoffs/web.md`.
- Independent code review: `approved`; source evidence `reviews/code-review.md`. The three repair findings were closed with no new blockers.
- Mobile / uni-app: not declared, proven by `task.json.platforms=["web"]`, `mobile_framework="none"`, and empty `mobile_targets`.
- Release approval: false.
- Test-server deployment: not executed by Codex.
- Fresh deployed-environment Functional QA and Compatibility QA: pending after operations deploys the new package.
- Frontend source and root `dist`: not edited by this repair.

## Source Handoffs

### Web Evidence

Source: `handoffs/web.md`

The Web handoff is the authoritative worker record for the branch, exact commands/results, changed files, package metadata, deployment steps, post-deploy browser script, risks, and unrun checks. The governed Web check was recorded as passed from that evidence.

### Mobile Evidence

Source: `task.json`

Mobile is not declared. No `handoffs/mobile.md` is required and no mobile implementation or verification is claimed.

## Repair Outcome

### Homepage aggregation

- The five homepage operations run inside one shared read batch while the global Feishu concurrency remains capped at three.
- `COM-001`, `COM-002`, and `WB-001` reuse one current-user projection after real-time authorization instead of competing for duplicate message, favorite, points, permission, and contact reads.
- Homepage current-user contact lookup uses the direct single-user API when available instead of scanning the whole organization directory.
- The approved six-dimensional final cache key remains unchanged. User identity, permissions, and data scope remain live; only public catalogue data used by `WB-001` may reuse a valid lower-level snapshot.
- Cold requests still hand off within the external five-second contract. The background task keeps the approved 25-second terminal deadline and `completed.result` preserves the original full homepage schema.

### Task status contract

- Both status routes locally validate the authenticated identity and raw task owner before any result is exposed.
- Each poll starts or joins real-time permission/data-scope authorization. Authorization uses a priority queue but shares the same total three-slot limit.
- Temporary Feishu timeout, rate-limit, or controlled 5xx conditions no longer escape as HTTP 500/504. The route returns HTTP 200 with `state=running` and a positive `pollAfterMs`, withholding terminal data until authorization succeeds.
- A timed-out authorization retains one settled outcome for at most six seconds and exactly one next poll. This closes the budget-to-poll gap for completed, failed, and revoked tasks without creating a reusable permission cache.
- Shared upstream authorization is launched with an explicitly empty sync-task AsyncLocalStorage context, so the first waiter's deadline cannot cancel later same-identity waiters.
- Definitive missing identity remains 401; owner, permission, or data-scope mismatch remains 403.
- Status polling reads only authorization and the stored task record; it never re-executes the original operation.
- Completed/failed/expired contracts, operation `operationId`, terminal retention, cache completion gates, snapshots, write governance, and startup readiness remain intact.

## Changed Files

Repair Attempt 2 implementation and tests:

- `server/feishu-read-only-service.mjs`
- `server/homepage-aggregate-service.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `tools/homepage-aggregate.test.mjs`
- `tools/feishu-read-latency-cache.test.mjs`

Generated delivery artifacts:

- `deploy/digital-exhibition-test-package/server/feishu-read-only-service.mjs`
- `deploy/digital-exhibition-test-package/server/homepage-aggregate-service.mjs`
- `deploy/digital-exhibition-test-package/SHA256SUMS.txt`
- `deploy/digital-exhibition-test-package.zip`
- `deploy/digital-exhibition-test-package.zip.sha256`

Governed evidence:

- `.ai-team/tasks/DEH-SERVER-CACHE-20261008/handoffs/web.md`
- `.ai-team/tasks/DEH-SERVER-CACHE-20261008/engineering-handoff.md`
- `.ai-team/tasks/DEH-SERVER-CACHE-20261008/task.json` via `record-platform-check.ps1`

No `src/**`, root `dist/**`, component, style, route, or visual-resource file was edited by this repair.

## Build and Test Evidence

| Command | Result |
| --- | --- |
| `node tools/feishu-cache-authorization.test.mjs` | passed; persistent slow completed/failed, delayed revoke 403, one-shot continuation, and detached shared authorization covered |
| `node tools/homepage-aggregate.test.mjs` | passed; true cold user after public-only prewarm, WB-001 persisted, peak upstream concurrency 2–3, complete five-section result, no poll replay |
| `npm run test:server-cache` | passed, including package/source/checksum/rollback contracts |
| `npm run test:integration` | passed |
| `npm run test:homepage-aggregate` | passed |
| `npm run test:feishu-latency` | passed |
| `npm run test:business-writes` | passed |
| `npm run test:test-deployment` | passed |
| `npm run check` | passed |
| `npm test` | passed |
| targeted latency test repeated ten times | 10/10 passed |
| post-review authorization and cold-homepage targeted tests | each passed 5/5 consecutive runs |
| package forbidden-entry scan | passed; zero `.env`, runtime-cache, private-key, or certificate entries |
| `git diff --check` on repair files | passed; only line-ending warnings |
| governed Web check | `CHECK web passed` |

A single parallel-run test false negative was traced to a test double that attached its AbortSignal listener after the signal could already be aborted. The test double now checks `signal.aborted` first; the production deadline was not relaxed, and the final full suite passed.

## Deployment Artifact

- Package: `C:\Users\20266\Documents\Codex\2026-08-15\we\work\digital-exhibition-ui-0817-dev-r3-20260821\web-task-merged\deploy\digital-exhibition-test-package.zip`
- Size: `4,005,925 bytes`
- SHA-256: `e42e975ecd5c35e139605bda8ee84a87a660fe285be4d72793a10eab80b63961`
- Sidecar: `deploy/digital-exhibition-test-package.zip.sha256`
- ZIP ordinary files: 372.
- Build mode: `node tools/create-test-deployment-package.mjs --skip-build`; no frontend build and no root `dist` mutation.
- Full step-by-step deployment and health/resource verification commands: `handoffs/web.md`, sections 7 and 8.

## Post-deployment Acceptance

The authenticated browser validation script is in `handoffs/web.md`, section 8. It must be run against the new deployment and retained as QA evidence.

Required result:

1. Five forced cold homepage reads all reach `completed.result` with all five sections and no manual refresh.
2. Every existing authorized task poll returns HTTP 200 and one of `running/completed/failed/expired`.
3. Polling does not replay `POST /api/v1/homepage`.
4. At least 27 of 30 warm homepage requests return complete HTTP 200 within five seconds.
5. Existing COM-005, APP-002, MAT-001, WB-003, ADM-003, loading, and forbidden-copy regressions remain passed.
6. 401/403 identity, permission, and data-scope behavior remains intact.

These live checks are not yet executed because the new package has not been deployed. Existing `functional-qa-report.md` and `qa-report.md` continue to describe the previous deployed build and remain failed until fresh independent QA replaces that evidence.

## Rollback Readiness

- Status: `ready`.
- Owner: test-environment operations.
- Trigger: health/readiness does not recover; any of five cold homepage tasks fails to complete within 25 seconds; an existing authorized status request returns 500/504; 401/403 boundaries regress; service identity/resource/cache permission checks fail; or a severe adjacent regression appears.
- Procedure evidence: `npm run test:server-cache` passed the deployment checksum, resource, permission, and rollback contract. A live rollback dry run remains unexecuted and must be retained as deployment evidence.
- Verification after rollback: local live/ready HTTP 200, systemd active, then authenticated homepage smoke test.

Canonical rollback procedure, replacing `<RELEASE_ID>` with the deployment output:

```bash
set -euo pipefail
BASE=/home/seaoil/pre-demo
RELEASE_ID=<RELEASE_ID>

sudo systemctl stop digital-exhibition-test.service
test -d "$BASE/rollback-$RELEASE_ID"
sudo install -d -o seaoil-deh -g seaoil-deh -m 700 "$BASE/rollback-$RELEASE_ID/.local"
if [ -d "$BASE/test/.local" ]; then
  sudo cp -a "$BASE/test/.local/." "$BASE/rollback-$RELEASE_ID/.local/"
fi
sudo mv "$BASE/test" "$BASE/failed-$RELEASE_ID"
sudo mv "$BASE/rollback-$RELEASE_ID" "$BASE/test"
sudo chown -R seaoil-deh:seaoil-deh "$BASE/test" "$BASE/runtime-cache"
if [ -f "$BASE/test/digital-exhibition-test.service" ]; then
  sudo install -m 644 "$BASE/test/digital-exhibition-test.service" /etc/systemd/system/digital-exhibition-test.service
fi
sudo systemctl daemon-reload
sudo systemctl start digital-exhibition-test.service
curl -fsS http://127.0.0.1:4173/api/v1/health/live
for attempt in $(seq 1 20); do
  if curl -fsS http://127.0.0.1:4173/api/v1/health/ready; then break; fi
  sleep 2
done
curl -fsS http://127.0.0.1:4173/api/v1/health/ready
```

The rollback retains `/home/seaoil/pre-demo/runtime-cache/`. If the old release cannot read the new snapshot, operations must stop the service, rename the cache directory to an isolated timestamped path, and create a new owner `seaoil-deh:seaoil-deh`, mode `0700` directory. Do not delete the snapshot.

## Risks and Unrun Checks

- New package not deployed; live five-cold and 30-warm acceptance is pending.
- No live revoked-user fixture, fixed Base row-count matrix, target Ubuntu/Node 22.23.2 smoke test, resource observation, or rollback dry run.
- Real Feishu latency and table pagination can still affect the 25-second SLO; the repair removes duplicated authorization/user projection work and queue starvation, but deployed evidence remains mandatory.
- Package includes the existing unchanged static `dist` required by the integrated server; the repair itself is backend-only.
- Fresh deployed-environment Functional QA and Compatibility QA remain required. The approved code review does not authorize merge, deployment, publication, release, or risk acceptance.
