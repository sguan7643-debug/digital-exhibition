# Aggregated Engineering Handoff

## Task and Approval Baseline

- Task: `DEH-SERVER-CACHE-RECOVERY-20261010`
- State after approved code review: `qa`
- Scope approval: `2026-10-10T02:41:17.1893201Z`
- Design approval: `2026-10-10T03:07:52.0859006Z`
- Approved product/design inputs: `prd.md`, `design/ux-handoff.md`, `design/ui-handoff.md`, `design-handoff.md`
- Declared platforms: Web only; framework `vue`. Mobile is not declared in `task.json`.
- Repository: `web-task-merged`
- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Aggregate prepared: `2026-10-10` Asia/Shanghai

## Web Evidence

Source: `handoffs/web.md`

The complete engineer evidence remains in that source and is incorporated by reference. The resulting task diff is limited to backend runtime code, backend tests, staged server-package files, the ZIP/sidecar, and governed handoff/task records. The implementation adds a canonical six-dimensional read key, staging-based memory publication, candidate/committed persistent generations that preserve LKG across failed commits and restart, schema/readback gates, an atomic five-section `HOM-001` homepage cache, one deadline covering child reads through composite commit/readback, active-only single-flight indexes, retained terminal task records, explicit transient authorization deferral that excludes deterministic tenant-token/config failures, a shared three-attempt budget, cancellation propagation to in-flight Feishu reads, and correlated cache/sync events.

Repair-attempt supplement: the live screenshot showed the then-deployed package entering sticky READY failure after one startup `FEISHU_UPSTREAM_TIMEOUT`. Startup `prewarm()` had been issuing nine raw table reads outside the bounded operation task, so those reads bypassed the shared deadline/retry/concurrency/correlation controls. The repair now starts COM-005 and WB-002 as bounded, correlated operations, waits for both to settle successfully, and only then runs the WB-001 seed. This removes startup slot starvation, retries transient upstream timeout inside the approved three-attempt/25-second budget, and records table/error/path/elapsed diagnostics without secrets.

Changed implementation and test files recorded by the Web handoff:

- `server/feishu-read-isolation-key.mjs`
- `server/feishu-persistent-read-cache.mjs`
- `server/feishu-read-only-service.mjs`
- `server/feishu-vite-plugin.mjs`
- `server/homepage-aggregate-service.mjs`
- `tools/feishu-read-only-service.test.mjs`
- `tools/homepage-aggregate.test.mjs`
- `tools/server-cache-contract-repair.test.mjs`
- `tools/server-cache-code-review-findings.test.mjs`
- `tools/feishu-cache-authorization.test.mjs`
- `package.json`
- matching files under `deploy/digital-exhibition-test-package/server/`
- `deploy/digital-exhibition-test-package/SHA256SUMS.txt`
- `deploy/digital-exhibition-test-package.zip`
- `deploy/digital-exhibition-test-package.zip.sha256`

Independent Team Lead reruns:

- `node tools/server-cache-contract-repair.test.mjs`: passed.
- `node tools/homepage-aggregate.test.mjs`: passed; reported warm p95 `0.05ms` in the synthetic test.
- `node tools/feishu-cache-authorization.test.mjs`: passed.
- `node tools/server-cache-code-review-findings.test.mjs`: passed; the full five-finding suite also passed 30 consecutive runs after deadline cancellation repair.
- `npm run test:server-cache`: passed, including persistent snapshot, 30-request warm-hit, security, resource/deployment and rollback contracts.
- `npm run test:integration`: passed, including authenticated proxy, status/loading polling and no business-request replay contracts.
- `npm run test:test-deployment`: passed.
- `git diff --check`: no whitespace errors; only line-ending warnings.
- Prior independent code review had approved the earlier implementation; the startup-prewarm repair invalidated that evidence and requires a fresh independent review before the Web check is recorded again.

Package evidence independently rechecked:

- Path: `deploy/digital-exhibition-test-package.zip`
- SHA-256: `02126806aa3012e85c94af860484fa6391c8513779a4bd0ae428f0f79cf46611`
- Sidecar matches the computed digest.
- The five changed backend source files match their staged package copies by SHA-256.
- ZIP contains 372 entries; size `4,011,646 bytes`.

Unrun checks and known limitations:

- No direct server deployment was performed, as prohibited by the approved scope.
- The required real-environment 5 cold / 30 warm runs, browser single-POST evidence, live revoke/401/403 checks, restart recovery and rollback rehearsal remain unexecuted until the user deploys this package.
- The supplied historic trace IDs could not be joined to raw server journal lines from this workspace; the handoff therefore distinguishes QA facts, code facts and hypotheses.
- A packaging command rebuilt the root `dist/` as part of its normal build, but the final `git status --short -- src dist` is empty and no task-resulting frontend source or root-dist diff remains. The relevant frontend contents had already been preserved in the pre-existing HEAD commit; this task does not claim or review them as its implementation.
- This is a backend-only recovery task, so responsive, keyboard and visual accessibility evidence is not applicable to the changed runtime code. Existing front-end polling integration regression tests passed.

## Mobile Evidence

Mobile is `not declared`. `task.json` declares only `platforms: ["web"]`, `mobile_framework: "none"`, and no mobile targets. No `handoffs/mobile.md` evidence is required.

## Shared API and Data Contract

- `POST /api/v1/homepage`: fresh/stale/LKG complete aggregate returns HTTP 200; a true cold miss hands off by the 4.5-second internal response budget with HTTP 202, `syncId`, positive `pollAfterMs`, and only the message `请求处理中`.
- Homepage completion is atomic over `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002`; partial or schema-invalid data cannot publish `HOM-001` or complete the task.
- `/api/v1/sync-jobs/{syncId}` and `/api/v1/operations/sync-jobs/{syncId}` express an existing authorized task as `queued`, `running`, `completed`, `failed`, or `expired` under HTTP 200. A transient real-time authorization delay is represented as continued polling and does not execute the business operation again. Identity failure remains 401, permission/data-scope failure remains 403, and an unknown task remains 404.
- Cache identity remains tenant, authenticated identity, permission set, data scope, operation and normalized input. The cache contains no Feishu token, Cookie, secret or attachment binary.
- A result becomes `completed` only after full operation completion, success-schema validation, persistent snapshot commit, memory publication and same-key readback.
- Failed/expired/timeout tasks leave the active merge index immediately; retained records remain queryable for at least ten minutes. An LKG result is returned immediately with a silent refresh; without LKG, a later request creates a new controlled task.
- Login, authorization, data scope, approval, idempotency, audit and declared strong-consistency operations remain real-time protected.
- Resource contracts remain: synchronization concurrency at most 3, service memory ceiling 2GB, runtime cache 3GB, and systemd CPU quota 150%.

## Evidence Integrity Check

- Web worker evidence: `handoffs/web.md` — present and complete.
- Governed Web check: currently invalidated by repair attempt 1 (`task.json.checks.web_passed=false`); it must be recorded again only after the fresh independent review completes without blocking findings.
- Approved product/design evidence: `prd.md`, `design/ux-handoff.md`, `design/ui-handoff.md`, `design-handoff.md` — present.
- Product review and design review: `reviews/product-review.md`, `reviews/design-review.md` — present with approved verdicts.
- Mobile evidence: not required because mobile is not declared.
- Evidence conflict reconciled: the worker handoff says root `dist` was not modified; the worker later clarified that `npm run package:test` rebuilt it, while final Git evidence shows no resulting `src/` or root `dist/` diff. This aggregate records the command-side effect and the final repository fact separately.
- Evidence still unavailable: live test-server measurements and raw journal for the supplied historic trace IDs. The screenshot proves the old deployment failed READY, but the new package digest above has not been deployed. Consequently, this aggregate does not assert QA or release approval.

## Combined Risks

- Risk: real Feishu latency/quota behavior may differ from deterministic local fixtures. Owner: deployment operator and Functional QA. Status: open. Mitigation: execute the supplied 5-cold/30-warm script and stop on any cold failure or status 500/504.
- Risk: conservative `HOM-001` invalidation can increase silent refresh work. Owner: backend maintainer. Status: monitored by structured cache events. Mitigation: retain LKG and enforce the existing concurrency/resource caps.
- Risk: historic trace causality is not proven without journal access. Owner: deployment operator. Status: open. Mitigation: collect `[deh-cache]` events after deployment with trace, sync, key digest, attempt, page, queue, budget, commit and transition fields.
- Risk: no live rollback rehearsal has been run for this exact ZIP. Owner: deployment operator. Status: open until post-deployment verification. Mitigation: use the bounded directory-swap rollback below and preserve the runtime-cache directory.

## Rollback Readiness

- Procedure: stop `digital-exhibition-test.service`; preserve the new `.local` state; move `/home/seaoil/pre-demo/test` to `/home/seaoil/pre-demo/failed-<RELEASE_ID>`; move `/home/seaoil/pre-demo/rollback-<RELEASE_ID>` back to `/home/seaoil/pre-demo/test`; restore ownership and the prior service unit; daemon-reload, start, then verify `/api/v1/health/live` and `/api/v1/health/ready`. Preserve `/home/seaoil/pre-demo/runtime-cache/`; if an old version rejects the snapshot, stop the service and rename the directory for isolation rather than deleting it.
- Owner: authorized test-server deployment operator.
- Trigger: cold homepage is not 5/5 completed within 25 seconds, any authorized status poll returns HTTP 500/504, warm homepage cannot reach 27/30 first-response HTTP 200, READY fails after the bounded startup period, or 401/403/resource controls regress.
- Verification evidence: `handoffs/web.md` contains exact rollback commands; `npm run test:server-cache` passed `server-cache-deployment-contract.test.mjs`; package and sidecar SHA-256 were independently rechecked.
- Status: `ready`
