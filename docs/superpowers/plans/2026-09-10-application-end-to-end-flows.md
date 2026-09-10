# Application End-to-End Flows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and verify real application onboarding, browsing, use, and interaction flows, routing RPA submissions to the existing backend and 海能Work submissions to Feishu Approval.

**Architecture:** Vue pages call only same-origin endpoints. Existing Bitable operations remain behind the secure Vite middleware; a focused Feishu Approval service owns approval definitions, instances, tasks, status mapping, and callback idempotency. UI behavior is driven by typed request builders and server responses rather than optimistic local success.

**Tech Stack:** Vue 3.5, Vite 6, Node.js ESM middleware, Feishu OpenAPI Approval v4 and Bitable v1, Playwright 1.62, Node assertion tests.

**Spec:** `docs/superpowers/specs/2026-09-10-application-end-to-end-flows-design.md`

## Global Constraints

- RPA type `T003` continues to use same-origin `POST /api/processInstanceStart` and the existing backend at `http://10.151.23.119:28080`.
- 海能Work type `T005` uses Feishu Approval through server-side same-origin endpoints.
- Browser code never receives `FEISHU_APP_SECRET`, tenant tokens, or user tokens.
- All created test definitions, instances, records, and attachments use the `TEST_` prefix.
- Existing production records and approval definitions are not modified.
- Existing backend code is not modified.
- Other application types retain their current behavior.
- New behavior follows test-first red-green cycles.

---

### Task 1: Feishu Approval server boundary

**Files:**
- Create: `server/feishu-approval-service.mjs`
- Create: `server/feishu-approval-middleware.mjs`
- Modify: `server/feishu-open-api-client.mjs`
- Modify: `server/feishu-user-auth-service.mjs`
- Modify: `server/feishu-vite-plugin.mjs`
- Test: `tools/feishu-approval-service.test.mjs`
- Test: `tools/feishu-approval-middleware.test.mjs`

**Interfaces:**
- Consumes: Feishu application credentials and the current authenticated identity/session.
- Produces: `createFeishuApprovalService({ client, resolveUserSession, now })` with `ensureTestDefinition`, `createInstance`, `getInstance`, `approveTestTask`, and `handleEvent`.
- Produces: same-origin routes `POST /api/v1/approvals/definitions/test`, `POST /api/v1/approvals/instances`, `GET /api/v1/approvals/instances/:id`, `POST /api/v1/approvals/instances/:id/approve`, and `POST /api/v1/approvals/events`.

- [ ] **Step 1: Write failing client and service contract tests**

```js
assert.equal(await service.ensureTestDefinition().then(x => x.approvalCode), 'TEST_APPROVAL_CODE');
assert.equal((await service.createInstance({ applicationType: 'T005', title: 'TEST_海能Work' }, session)).status, 'PENDING');
assert.equal((await service.getInstance('TEST_INSTANCE')).status, 'APPROVED');
```

- [ ] **Step 2: Run tests and verify failure caused by missing service**

Run: `node tools/feishu-approval-service.test.mjs && node tools/feishu-approval-middleware.test.mjs`

Expected: FAIL because approval modules/routes do not exist.

- [ ] **Step 3: Implement minimal server-only Approval v4 client**

```js
async function approvalRequest(path, { method = 'GET', body, accessToken } = {}) {
  const token = accessToken || await getTenantToken();
  const response = await fetchImpl(`${API_ROOT}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  return assertFeishuSuccess(response, 'FEISHU_APPROVAL_FAILED');
}
```

- [ ] **Step 4: Store user access token only inside the in-memory server session**

```js
sessions.set(sessionId, { identity, accessToken, expiresAt: now() + sessionTtlSeconds * 1000 });
function resolveSession(cookieHeader = '') { return sessions.get(parseCookies(cookieHeader)[SESSION_COOKIE]) || null; }
```

- [ ] **Step 5: Implement approval definition/instance/status/action and middleware validation**

Reject non-`T005`, non-`TEST_` titles, unauthenticated callers, cross-origin callers, malformed instance IDs, repeated event IDs, and bodies over 256 KiB.

- [ ] **Step 6: Run Task 1 tests and commit**

Run: `node tools/feishu-approval-service.test.mjs && node tools/feishu-approval-middleware.test.mjs`

Expected: PASS.

Commit: `feat: add guarded Feishu approval service`

### Task 2: Type-specific onboarding and real status page

**Files:**
- Create: `src/integration/onboarding-approval.js`
- Modify: `src/pages/OnboardingApplyPage.vue`
- Modify: `src/pages/OnboardingPage.vue`
- Modify: `src/runtime/network-guard.js`
- Test: `tools/onboarding-approval-routing.test.mjs`
- Modify: `tools/onboarding-apply-interaction.test.mjs`
- Modify: `tools/browser-onboarding-apply-flow.test.mjs`

**Interfaces:**
- Consumes: `submitOnboarding(form, files, fetchImpl)`.
- Produces: `{ kind: 'rpa'|'feishu', instanceId, status, message }` and `getOnboardingStatus(instanceId)`.

- [ ] **Step 1: Write failing routing/status tests**

```js
assert.equal(resolveApprovalTransport('T003').path, '/api/processInstanceStart');
assert.equal(resolveApprovalTransport('T005').path, '/api/v1/approvals/instances');
assert.throws(() => resolveApprovalTransport('T001'), /未配置真实审批/);
```

- [ ] **Step 2: Run tests and verify expected failure**

Run: `node tools/onboarding-approval-routing.test.mjs && node tools/onboarding-apply-interaction.test.mjs`

Expected: FAIL because T005 still uses local optimistic success and the status page is static.

- [ ] **Step 3: Implement minimal type router and payload builders**

RPA uses multipart `request` plus files. T005 uses a server-approved JSON application payload, uploads any selected files through the approval service, then creates an instance.

- [ ] **Step 4: Persist only the returned instance ID in the route URL**

Navigate to `/apps/onboarding/status?instanceId=<encoded-id>&source=feishu`; never store credentials or an unverified approved state in browser storage.

- [ ] **Step 5: Make status page render loading, pending, approved, rejected, cancelled, and query-failed states from the server response**

- [ ] **Step 6: Run component/browser tests and commit**

Run: `node tools/onboarding-approval-routing.test.mjs && node tools/onboarding-apply-interaction.test.mjs && $env:EXHIBITION_TEST_ORIGIN='http://127.0.0.1:4174'; node tools/browser-onboarding-apply-flow.test.mjs`

Expected: PASS for both RPA and T005 routes.

Commit: `feat: route onboarding by application type`

### Task 3: Application browsing and complete detail projection

**Files:**
- Modify: `server/feishu-read-only-service.mjs`
- Modify: `src/integration/app-read-model.js`
- Modify: `src/integration/page-read-request-plan.js`
- Modify: `src/pages/AppsPage.vue`
- Modify: `src/App.vue`
- Test: `tools/application-browse-flow.test.mjs`
- Test: `tools/browser-application-browse-flow.test.mjs`

**Interfaces:**
- Consumes: operations `APP-001`, `APP-002`, `APP-003`, `APP-007`, `MAT-002`.
- Produces: an application card model and complete detail model joined by `applicationId` and `applicationType`.

- [ ] **Step 1: Write failing browse-flow tests**

Verify T003 filtering, card selection, detail navigation, six related data sets, and explicit empty states.

- [ ] **Step 2: Run tests and verify missing projection/UI binding failure**

Run: `node tools/application-browse-flow.test.mjs && node tools/browser-application-browse-flow.test.mjs`

- [ ] **Step 3: Complete the server projection and page bindings without changing visual structure**

- [ ] **Step 4: Re-run tests and commit**

Commit: `feat: complete application browsing projection`

### Task 4: Application use, reuse, and permission gate

**Files:**
- Modify: `server/feishu-composite-operation-service.mjs`
- Modify: `server/feishu-write-operation-service.mjs`
- Modify: `src/components/AppDetailLiveSections.vue`
- Modify: `src/pages/HainengWorkDetailPage.vue`
- Modify: `src/pages/RpaDetailPage.vue`
- Test: `tools/application-use-flow.test.mjs`
- Test: `tools/browser-application-use-flow.test.mjs`

**Interfaces:**
- Consumes: `APP-004`, `APP-005`, `APP-006`, current-user permission records.
- Produces: request-use, request-reuse, permission grant on approved state, and guarded launch behavior.

- [ ] **Step 1: Write failing tests for request, duplicate prevention, approval-to-permission transition, and unauthorized launch**

- [ ] **Step 2: Run tests and verify expected behavior is absent**

- [ ] **Step 3: Implement real page actions with server-returned status and no optimistic authorization**

- [ ] **Step 4: Run tests and commit**

Commit: `feat: connect application use permission flow`

### Task 5: Favorites, comments, downloads, and training

**Files:**
- Modify: `src/components/AppDetailLiveSections.vue`
- Modify: `src/pages/HainengWorkDetailPage.vue`
- Modify: `src/pages/RpaDetailPage.vue`
- Modify: `src/pages/TrainingPage.vue`
- Modify: `server/feishu-write-operation-service.mjs`
- Modify: `server/feishu-read-only-service.mjs`
- Test: `tools/application-interaction-flow.test.mjs`
- Test: `tools/browser-application-interaction-flow.test.mjs`

**Interfaces:**
- Consumes: `FAV-003`, `FAV-004`, `APP-008`, `MAT-003`, `COM-008`, `TRN-003`, `TRN-004`, `TRN-006`.
- Produces: server-confirmed favorite state, published comments, controlled downloads, related training navigation, and per-course first-live-entry behavior.

- [ ] **Step 1: Write failing interaction tests for success, cancellation, deletion, error, and repeated actions**

- [ ] **Step 2: Run tests and verify expected failures**

- [ ] **Step 3: Bind real operations and preserve accessible feedback/focus behavior**

- [ ] **Step 4: Run tests and commit**

Commit: `feat: connect application interaction flows`

### Task 6: Live acceptance, cleanup, and handoff evidence

**Files:**
- Create: `tools/verify-live-application-flows.mjs`
- Create: `outputs/application-flow-acceptance-20260910.json`
- Modify: `.ai-team/tasks/digital-exhibition-ui-0817-dev-r3-20260821/handoffs/web.md`

**Interfaces:**
- Consumes: all routes and operations from Tasks 1–5.
- Produces: a redacted acceptance report containing route, status, timestamps, TEST_ record IDs, cleanup results, and zero secrets.

- [ ] **Step 1: Run all focused tests, full integration tests, and build**

Run: `npm run test:integration && npm run test:ui-source-sync && npm run build`

- [ ] **Step 2: Run browser flows on the active local origin**

Run all four `browser-application-*.test.mjs` scripts against the running application.

- [ ] **Step 3: Run live RPA and Feishu acceptance**

Create only TEST_ records/instances, verify status and table effects, approve the test instance if the authenticated user is permitted, and collect redacted evidence.

- [ ] **Step 4: Clean TEST_ records and attachments and verify cleanup**

- [ ] **Step 5: Write Web handoff and record platform check**

Record exact commands, pass/fail counts, live blockers, and evidence path. Do not report a flow complete unless its live acceptance passed.

- [ ] **Step 6: Commit evidence and handoff**

Commit: `test: verify application end-to-end flows`
