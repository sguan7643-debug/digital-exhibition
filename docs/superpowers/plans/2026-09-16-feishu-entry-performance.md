# Feishu Entry Authentication and First-Screen Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent unauthenticated protected reads and bound the workbench first-screen Feishu request path.

**Architecture:** A shared base-path utility makes the entry guard, OAuth `returnTo`, and page resolution agree for both `/` and `/test2`. The server becomes the sole place that applies a per-upstream deadline, safe diagnostic envelope, tenant-token single-flight, and bounded retry. The browser has a shorter end-to-end deadline and renders a recoverable state rather than waiting for the legacy 30-second fallback.

**Tech Stack:** Vue 3, Vite, Node.js Fetch API, native `node:assert` test scripts, Feishu Open Platform read-only API.

**Spec:** `.ai-team/tasks/DEH-ENTRY-PERF-20260916/task-brief.md`

## Global Constraints

- Keep Feishu access tokens and session cookies HttpOnly; no browser token storage.
- `VITE_EXHIBITION_APP_BASE` is `/` for local development and `/test2` for the test deployment; its value must be normalized before use.
- Do not change Feishu app credentials, OAuth callback registration, permissions, or data records.
- Upstream Feishu calls time out at 8,000 ms; a retryable read has one retry only and a 10,000 ms total budget.
- Browser operation calls time out at 12,000 ms; no first-screen request retains the current 30,000 ms fallback.
- The workbench must show partial/retryable errors without covering already rendered content indefinitely.

---

### Task 1: Base-path-aware entry authentication and routing

**Files:**
- Create: `src/integration/app-base-path.js`
- Modify: `src/integration/feishu-entry-auth-guard.js`
- Modify: `src/main.js`
- Modify: `src/fixtures/pages.js`
- Modify: `src/App.vue`
- Test: `tools/feishu-entry-auth-guard.test.mjs`
- Test: `tools/app-shell.test.mjs`

**Interfaces:**
- Produces `normalizeAppBasePath(value)`, `isPathWithinAppBase(pathname, basePath)`, `stripAppBasePath(pathname, basePath)`, and `prependAppBasePath(route, basePath)`.
- `createFeishuEntryAuthGuard({ appBasePath, location, fetchImpl, redirect })` returns `ensureAuthorized(): Promise<{authorized:boolean,render:boolean,reason?:string}>`.

- [ ] **Step 1: Write failing base-path and failed-session tests**

```js
assert.equal(sanitizeFeishuEntryReturnTo(new URL('https://host/test2/workbench?q=1#x'), '/test2'), '/test2/workbench?q=1#x');
assert.equal(stripAppBasePath('/test2/workbench', '/test2'), '/workbench');
assert.equal(prependAppBasePath('/workbench', '/test2'), '/test2/workbench');
await assert.rejects(() => guardWithFetchFailure.ensureAuthorized(), /飞书登录状态暂不可用/);
assert.equal(fetchCalls.length, 1);
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `node tools/feishu-entry-auth-guard.test.mjs && node tools/app-shell.test.mjs`

Expected: failure because the existing guard hard-codes `/test2`, root-path entry is skipped, and route resolution cannot remove the deployment base.

- [ ] **Step 3: Implement the base-path contract and guarded bootstrap**

```js
const appBasePath = normalizeAppBasePath(import.meta.env.VITE_EXHIBITION_APP_BASE || import.meta.env.BASE_URL);
const entryAuth = await entryAuthGuard.ensureAuthorized();
if (entryAuth.render) createApp(App, { entryAuth }).component('AppIcon', AppIcon).mount('#app');
```

Make a session `401` redirect to the same-origin OAuth start route with a sanitized return path. For an unavailable session endpoint, mount only a retryable entry-status view; do not mount page integrations or issue protected operations. Pass the normalized base path into `resolvePage` so `/test2/workbench` maps to `/workbench` while all internally emitted navigation restores `/test2`.

- [ ] **Step 4: Run the targeted tests and verify they pass**

Run: `node tools/feishu-entry-auth-guard.test.mjs && node tools/app-shell.test.mjs`

Expected: root and `/test2` unauthenticated entry perform only the session probe before redirect; an unavailable probe exposes a retry state; base-path routes resolve to their page IDs.

- [ ] **Step 5: Commit the isolated change**

Run: `git add src/integration/app-base-path.js src/integration/feishu-entry-auth-guard.js src/main.js src/fixtures/pages.js src/App.vue tools/feishu-entry-auth-guard.test.mjs tools/app-shell.test.mjs && git commit -m "fix: guard Feishu entry for configured app base"`

### Task 2: Bounded and diagnosable Feishu upstream client

**Files:**
- Modify: `server/feishu-open-api-client.mjs`
- Test: `tools/feishu-open-api-client.test.mjs`

**Interfaces:**
- `createFeishuOpenApiClient({ fetchImpl, upstreamTimeoutMs = 8000, now })` must expose the current read methods unchanged.
- `FeishuProxyError` emitted for a timeout includes `code: 'FEISHU_UPSTREAM_TIMEOUT'`, `status: 504`, `upstreamPath`, and `elapsedMs`; it never includes credentials.

- [ ] **Step 1: Write failing deadline and token-single-flight tests**

```js
const client = createFeishuOpenApiClient({ appId: 'id', appSecret: 'secret', baseToken: 'base', fetchImpl: delayedFetch, upstreamTimeoutMs: 25 });
await assert.rejects(() => client.listRecords('tblValid', { pageSize: 10 }), error => error.code === 'FEISHU_UPSTREAM_TIMEOUT' && error.status === 504);
await Promise.all([client.listRecords('tblValid', { pageSize: 10 }), client.listRecords('tblOther', { pageSize: 10 })]);
assert.equal(tenantTokenCalls, 1);
```

- [ ] **Step 2: Run the client test and verify it fails**

Run: `node tools/feishu-open-api-client.test.mjs`

Expected: failure because upstream fetches have no abort signal and concurrent cold reads obtain separate tenant tokens.

- [ ] **Step 3: Implement a shared fetch wrapper and in-flight tenant token**

```js
let tenantTokenPending = null;
async function fetchUpstream(url, init, upstreamPath) {
  const controller = new AbortController();
  const startedAt = now();
  const timer = setTimeout(() => controller.abort(new DOMException('Feishu upstream timeout', 'TimeoutError')), upstreamTimeoutMs);
  try { return await fetchImpl(url, { ...init, signal: controller.signal }); }
  catch (cause) { if (controller.signal.aborted) throw new FeishuProxyError('FEISHU_UPSTREAM_TIMEOUT', '飞书服务响应超时', 504, { upstreamPath, elapsedMs: now() - startedAt }); throw cause; }
  finally { clearTimeout(timer); }
}
```

Use this wrapper for tenant token, Bitable record list, contact, media, and approval calls. Keep error diagnostics allowlisted and redact token, secret, authorization, and cookie fields.

- [ ] **Step 4: Run the client test and verify it passes**

Run: `node tools/feishu-open-api-client.test.mjs`

Expected: timeout is a 504 with safe diagnostics, and two simultaneous cold reads use one token request.

- [ ] **Step 5: Commit the isolated change**

Run: `git add server/feishu-open-api-client.mjs tools/feishu-open-api-client.test.mjs && git commit -m "fix: bound and deduplicate Feishu upstream reads"`

### Task 3: Workbench read budget, retry, and shared projection behavior

**Files:**
- Modify: `server/feishu-read-only-service.mjs`
- Modify: `src/integration/page-read-request-plan.js`
- Modify: `src/integration/runtime-config.js`
- Modify: `.env.local.example` if present; otherwise `README-DEPLOY.md`
- Test: `tools/feishu-read-only-service.test.mjs`
- Test: `tools/page-read-request-plan.test.mjs`

**Interfaces:**
- `readAll(tableName)` retries only one `429` or `502/504` failure while its 10,000 ms total budget remains; it throws the final safe `FeishuProxyError` otherwise.
- Workbench initial operations preserve current schema but do not issue duplicate table/projection work for `COM-005` and `WB-002`.
- `resolveIntegrationRuntime` defaults operation `timeoutMs` to `12000` when remote mode is enabled.

- [ ] **Step 1: Write failing total-budget and duplicated-projection tests**

```js
await assert.rejects(() => service.execute('WB-002', { page: 1, pageSize: 20 }), error => error.status === 504);
assert.equal(listRecordsCalls.filter(call => call.tableId === appTypeTableId).length, 1);
assert.equal(resolveIntegrationRuntime({ remoteEnabled: true }).timeoutMs, 12000);
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node tools/feishu-read-only-service.test.mjs && node tools/page-read-request-plan.test.mjs`

Expected: failure because `readAll` has up to three unbounded attempts, first-screen plans duplicate projections, and remote timeout accepts 30 seconds.

- [ ] **Step 3: Implement a 10-second shared read budget and projection reuse**

```js
const retryable = error => error?.status === 429 || error?.status === 502 || error?.status === 504;
for (let attempt = 0; attempt < 2; attempt += 1) {
  try { return await client.listRecords(table.tableId, query); }
  catch (error) { if (!retryable(error) || attempt === 1 || now() >= deadline) throw error; await sleep(Math.min(300, Math.max(0, deadline - now()))); }
}
```

Cache both successful and in-flight app/dictionary projection promises inside the read-only service. Retain operation response shapes; only eliminate duplicate underlying reads. Update the remote runtime default and documented environment key to 12,000 ms.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `node tools/feishu-read-only-service.test.mjs && node tools/page-read-request-plan.test.mjs`

Expected: one retry maximum, 10-second aggregate server budget, no duplicate projection read, and a 12-second client default.

- [ ] **Step 5: Commit the isolated change**

Run: `git add server/feishu-read-only-service.mjs src/integration/page-read-request-plan.js src/integration/runtime-config.js README-DEPLOY.md tools/feishu-read-only-service.test.mjs tools/page-read-request-plan.test.mjs && git commit -m "fix: bound workbench read budget"`

### Task 4: Browser recoverability, verification, and evidence

**Files:**
- Modify: `src/integration/safe-proxy-client.js`
- Modify: `src/App.vue`
- Create: `tools/first-screen-request-budget.test.mjs`
- Modify: `package.json`
- Create: `.ai-team/tasks/DEH-ENTRY-PERF-20260916/handoffs/web.md`

**Interfaces:**
- `IntegrationRequestError` maintains `{ state, retryable, status, traceId }`; timeout and upstream errors identify a retryable user-visible state.
- First screen renders content already available and a local retry action for affected data, never a persistent whole-page loading state.

- [ ] **Step 1: Write a delayed-proxy browser-state test**

```js
const result = await executeWithDelayedProxy('WB-002', 13000);
assert.equal(result.error.state, 'timeout');
assert.equal(result.error.retryable, true);
assert.equal(requestStatus.isBusy(), false);
assert.match(renderedHtml, /重试/);
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node tools/first-screen-request-budget.test.mjs`

Expected: failure because the current remote fallback permits 30 seconds and the first-screen error lacks a bounded retry outcome.

- [ ] **Step 3: Implement the 12-second client deadline and local recovery presentation**

Keep the global request indicator as a visibility aid, but stop it in `finally` and render per-operation timeout or upstream failures in the affected section. Preserve `traceId` for support diagnostics and never render upstream details or credentials.

- [ ] **Step 4: Run all Web checks and read-only live verification**

Run: `node tools/feishu-entry-auth-guard.test.mjs && node tools/feishu-open-api-client.test.mjs && node tools/feishu-read-only-service.test.mjs && node tools/first-screen-request-budget.test.mjs && pnpm test:integration && pnpm check && pnpm build && pnpm test && git diff --check`

Then, with authorized read-only credentials only, run the targeted first-screen operations and record operation ID, status, elapsed milliseconds, trace ID, and whether a retry occurred. Do not execute write, approval submission, or deployment commands.

- [ ] **Step 5: Write Web handoff and commit only task-owned files**

Record changed files, command results, elapsed evidence, remaining risks, and rollback procedure in the owned handoff. Do not commit pre-existing unrelated worktree changes.

## Self-Review

- Scope coverage: Tasks 1–4 cover the no-session 401 flood, `/test2` route resolution, upstream 502 diagnosis, 25-second duplicated workbench reads, browser timing, and evidence requirements.
- Placeholder scan: no deferred implementation labels or unspecified error behavior remain; all limits, interfaces, files, tests, and commands are explicit.
- Type consistency: the guard returns `authorized/render/reason`; route helpers consume a normalized base path; proxy errors expose `status`, `traceId`, and a safe optional `elapsedMs`; no browser-visible credential field is introduced.

## Execution Handoff

This plan is saved at `docs/superpowers/plans/2026-09-16-feishu-entry-performance.md`. It requires the governed scope and design gates before implementation, then task-by-task Web execution with independent code review and QA.
