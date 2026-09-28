# Engineering Handoff — Homepage Aggregate Read

## Declared Platforms

- Web/Vue: declared and implemented.
- uni-app/mobile: not declared by `task.json`; not applicable to this task.

## Implementation Summary

The homepage now uses one same-origin aggregate endpoint for `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002`. The service reuses the existing operation contracts, cache, and in-flight requests. One identity- and permission-scoped task owns cold synchronization; status polling reads task metadata only. The request returns fresh, stale, partial, or syncing within the bounded application wait instead of waiting for every Feishu read indefinitely.

The server defaults are now approximately 20 seconds for one Feishu upstream request and 35 seconds for a whole-table read. The browser default is 30 seconds and the aggregate application wait is capped at 29 seconds, defaulting to 25 seconds. Nginx guidance uses 35-second send/read timeouts.

Startup readiness tracks exact homepage public prewarm inputs for `COM-005` and `WB-002`. Liveness is independent. A failed refresh cannot replace the previous successful operation cache entry; valid stale sections remain rendered and are labelled stale.

Detailed file ownership, command transcripts, Web behavior, constraints, and test results are in `handoffs/web.md`.

## Combined Evidence

- Aggregate/single-flight/status/stale refresh/task expiry/prewarm/client-flow suite: passed; 29-second application cap assertion passed and the 100-request synthetic warm p95 was 0.01 ms.
- Upstream and whole-table timeout suites: passed.
- Existing public, personal, current-user, workbench-search, server-proxy, and authorization guard contracts: passed.
- No-mock source gate: passed.
- Static/source audit: passed.
- Production build: passed; 1932 modules transformed.
- Real Edge/Chromium aggregate recovery test: passed at 320/760/1366/1920px, including auto-close, manual dismissal persistence, labelled controls and reduced-motion behavior.
- Local runtime: liveness 200 immediately; readiness 503 while warming and 200 after exact public prewarm completed in about 17 seconds.
- Full historical umbrella suites have three known obsolete fixture/copy blockers recorded in `handoffs/web.md`; no task-relevant failure is hidden.

## Security and Data Boundary

- Browser requests remain same-origin and credentials remain server-side.
- Aggregate reads require an authenticated identity; `syncId` lookup is bound to the same hashed owner scope.
- Task/cache scope includes tenant, user identity, sorted permission set, operation inputs, and aggregate contract version.
- Responses and task identifiers do not contain App Secret, access token, Cookie, phone, or email values.
- No mock or static business data was introduced.

## Known Risks

- Risk: upstream Feishu latency can exceed 30 seconds. Owner: service operator/Feishu administrator. Status: governed by `202 syncing`, lightweight polling, 60-second client stop, and manual retry.
- Risk: snapshots are memory-only and do not survive process restart. Owner: service operator. Status: accepted scope boundary; exact startup prewarm and readiness prevent a false-ready state.
- Risk: full historical umbrella suites contain stale hard-coded fixture/copy assumptions. Owner: repository test-maintenance owner. Status: non-blocking for this task because focused contract, no-mock, build, and affected-operation regressions pass; the blocked commands and causes are preserved in the Web handoff.
- Risk: no production upstream p95 was collected here. Owner: deployment/observability owner. Status: unresolved external evidence; deterministic warm-path, real-browser interaction, and response-boundary tests pass.

## Rollback Readiness

- Status: ready.
- Owner: Web release integrator or test-environment operator.
- Trigger: aggregate endpoint causes authentication leakage, duplicate Feishu fan-out, a request exceeds the configured browser/proxy boundary, readiness falsely passes, stale data is erased on refresh failure, or the homepage regresses.
- Procedure: create a normal revert commit for this task's reviewed changes (do not rewrite history), rebuild `dist`, restore the previous server bundle/configuration, restart the same-origin service, and verify the previous `/test2/`, authorization session, and single-operation endpoints. If already copied to a test host, restore the previously retained deployment directory and Nginx configuration, then reload Nginx.
- Verification evidence: the focused aggregate, timeout, affected operation-contract, deployment-server, no-mock, source-audit, production-build, liveness, and readiness checks listed in `handoffs/web.md` all pass and can be rerun after rollback.

## Delivery Boundary

This handoff records implementation and rollback readiness only. It does not authorize commit, push, merge, deployment, publication, release, or production rollout.
