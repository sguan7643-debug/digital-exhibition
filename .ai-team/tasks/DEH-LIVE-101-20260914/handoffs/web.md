# Web handoff

- Branch: task/digital-exhibition-ui-0817-dev-r3-web
- Baseline: existing merged Digital Exhibition Web implementation.
- Registry: 101 unique operations, comprising 65 reads and 36 writes.
- Live QA may execute from `.env.local`; secrets must be redacted from all evidence.
- Writes are restricted to TEST_ records and must be cleaned after verification.
- This handoff records readiness for live QA and does not claim that any live operation has passed.

## 2026-09-16 Web repair — global request loading overlay

Scope: only the approved global request loading visibility and duplicate-action prevention fix. No changes were made to Feishu approval API contracts, OAuth/callback logic, URL token behavior, deployment configuration, release approval, or `task.json`.

Branch / HEAD at repair time:

- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- HEAD before this repair: `91a8ba1ad452bc348cb3615f1700b55c9e1af9a5`
- Task state read from `task.json`: `qa`
- Scope/design approval: `true` / `true`
- Release approval: `false`
- Web framework: `vue`
- Repair authorization: `repair_history[0].platform=web`

Important worktree note:

- The worktree already contained multiple uncommitted live-integration edits before this specific overlay repair, including `src/App.vue`, `src/style.css`, `src/integration/safe-proxy-client.js`, `src/integration/onboarding-approval.js`, `src/pages/OnboardingApplyPage.vue`, and related tests.
- This repair intentionally did not revert or package those existing edits. The overlay fix changed only the relevant parts of `src/App.vue`, `src/style.css`, `package.json`, and added `tools/global-request-loading-remediation.test.mjs`.
- Because `src/App.vue` and `src/style.css` were already dirty before this repair, no clean commit was created in this pass; this avoids accidentally claiming unrelated prior edits as part of this overlay-only repair.

Changed files for this repair:

- `src/App.vue`
  - Replaced the top 30px request hint with a full-viewport request overlay.
  - Added `aria-busy="true"`, `role="status"`, `aria-live="polite"`, focus-on-open, and click/pointer/touch/keyboard event interception.
  - Added concurrent request text: `正在处理 N 项请求`.
  - Added explicit warning text: `请勿重复操作`.
- `src/style.css`
  - Changed `.global-request-loading` to `position: fixed; inset: 0; left: 0; pointer-events: auto`.
  - Added centered panel styling and preserved reduced-motion behavior.
- `tools/global-request-loading-remediation.test.mjs`
  - New TDD contract for full viewport overlay, pointer blocking, concurrent labels/count, reduced motion CSS, and request-status cleanup after failure.
- `package.json`
  - Added the new overlay test to `test:integration`.

### Test-first evidence

New failing test was added before the production fix:

```text
node tools/global-request-loading-remediation.test.mjs
exit 1
AssertionError [ERR_ASSERTION]: 请求遮罩必须明确暴露 busy 状态
```

This failure was expected because the existing UI was a top hint with no `aria-busy`, no full-screen overlay, and `pointer-events:none`.

After the minimal Vue/CSS implementation:

```text
node tools/global-request-loading-remediation.test.mjs
exit 0
global request loading overlay remediation contract passed
```

### Commands and exact results

Targeted related tests:

```text
node tools/global-request-loading-remediation.test.mjs; node tools/onboarding-approval-routing.test.mjs; node tools/onboarding-apply-interaction.test.mjs
exit 0
global request loading overlay remediation contract passed
onboarding type routing uses existing RPA backend, server-side Feishu approval, and real status queries
onboarding application interaction contract passed
```

Static check:

```text
pnpm check
exit 0
源码静态、确定性、零外网、语义与原子资产检查通过
```

Build:

```text
pnpm build
exit 0
vite v6.4.1 building for production...
✓ 1947 modules transformed.
dist/index.html                     0.44 kB │ gzip:   0.32 kB
dist/assets/index-5RTFmKQT.css    301.87 kB │ gzip:  49.23 kB
dist/assets/index-G4fJxYPJ.js   1,064.92 kB │ gzip: 247.64 kB
✓ built in 3.83s
```

Integration tests:

```text
pnpm test:integration
exit 0
...
live verifier remediation red/green contract passed
live read operation-specific input contract passed
global request loading overlay remediation contract passed
```

Regular UI/interaction tests:

```text
pnpm test
exit 0
...
H5 导航、卡片、表单、表格与分页响应式合同测试通过
```

Whitespace/diff check:

```text
git diff --check
exit 0
git diff --check passed
```

### Accessibility / interaction verification

- Semantics: overlay uses `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and `aria-busy="true"`.
- Duplicate-action prevention: overlay uses full viewport coverage and `pointer-events:auto`; click, pointer, touch, and keyboard events are stopped/prevented.
- Focus: overlay receives programmatic focus when loading starts, preventing keyboard focus from staying behind the overlay during active requests.
- Concurrent requests: labels remain tracked in `request-status.js`; UI shows `正在处理 N 项请求` when `activeCount > 1`.
- Completion: request-status test verifies failed requests still decrement and hide the overlay.
- Reduced motion: spinner animation is disabled under `prefers-reduced-motion: reduce`.

### Known risks / blocked or unrun checks

- Real Feishu 65-read / 36-write live QA was not re-run in this overlay repair pass; do not treat these local tests as live operation pass evidence.
- A clean commit was not created because the worktree already contained unrelated uncommitted integration edits before this repair; creating a commit now would risk bundling unrelated changes.
- Browser screenshot evidence for the overlay was not captured in this pass; coverage is via source/behavior contracts plus full build/test/check.
- Overall Web result remains `failed` until independent QA re-runs live verification and reviews the dirty worktree state.

Current Web repair conclusion: `failed`.

## 2026-09-16 Web repair attempt 2 — AUTH-ENTRY-001 initial Feishu entry guard

Scope: only the governed AUTH-ENTRY-001 repair authorized by `repair_history[1].platform=web`: first entry to `/test2/...` must check a same-origin HttpOnly Feishu session before Vue renders; missing session redirects to Feishu OAuth start with a safe return path; valid session renders normally. No production deployment, merge, release, external backend change, or direct `task.json` edit was performed.

Branch / baseline:

- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- HEAD at repair time: `91a8ba1ad452bc348cb3615f1700b55c9e1af9a5`
- Task state read from `task.json`: `qa`
- Scope/design approval: `true` / `true`
- Release approval: `false`
- Web framework: `vue`
- Repair authorization: `repair_history[1].platform=web`

Important worktree note:

- The worktree was already dirty before AUTH-ENTRY-001 work began, including existing live-integration edits in `package.json`, `src/App.vue`, `src/style.css`, several `src/integration/*` files, `src/pages/OnboardingApplyPage.vue`, and related tests.
- This AUTH repair added/changed only the bounded auth-entry files listed below. No clean commit was created because committing from the dirty tree would risk bundling unrelated pre-existing work.
- Web status remains `failed` until 010 re-runs the real QA flow against the updated tree.

Changed files for AUTH-ENTRY-001:

- `src/integration/feishu-entry-auth-guard.js`
  - New entry guard for `/test2` and `/test2/...`.
  - Probes `/api/v1/auth/feishu/session` with `credentials: same-origin` and `cache: no-store`.
  - On `401`, redirects to `/api/v1/auth/feishu/start?returnTo=<safe /test2 path>`.
  - Does not use URL tokens, browser storage, or token-bearing data.
- `src/main.js`
  - Waits for `entryAuthGuard.ensureAuthorized()` before mounting Vue.
  - If guard redirects, the exhibition app is not mounted.
- `server/feishu-auth-middleware.mjs`
  - Adds `GET /api/v1/auth/feishu/session`.
  - Returns `401 USER_AUTH_REQUIRED` when no HttpOnly session resolves.
  - Returns sanitized identity only when a session is valid; token/access-token fields are stripped.
- `server/feishu-user-auth-service.mjs`
  - Adds the session path constant.
  - Tightens returnTo normalization for decoded `//...` and backslash paths.
- `tools/feishu-entry-auth-guard.test.mjs`
  - New TDD test for missing-session redirect, valid-session render, local non-`/test2` skip, safe `/test2` return path preservation, unsafe return path rejection, session endpoint token redaction.
- `tools/feishu-auth-middleware.test.mjs`
  - Updates test stub for the required `resolveIdentity` dependency.
- `package.json`
  - Adds `tools/feishu-entry-auth-guard.test.mjs` to `test:integration`.

### Test-first evidence

New failing AUTH test was added before implementation:

```text
node tools/feishu-entry-auth-guard.test.mjs
exit 1
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\src\integration\feishu-entry-auth-guard.js'
```

After the minimal guard/module/middleware implementation:

```text
node tools/feishu-entry-auth-guard.test.mjs
exit 0
Feishu entry guard probes HttpOnly session before /test2 render and preserves safe return paths
```

Intermediate red during implementation:

```text
node tools/feishu-entry-auth-guard.test.mjs
exit 1
AssertionError [ERR_ASSERTION]: Missing expected exception.
```

Cause: the first returnTo sanitizer did not reject every unsafe encoded/double-slash path covered by the new contract. The sanitizer was tightened and the same test then passed.

### Commands and exact results

Targeted AUTH and overlay regression:

```text
node tools/feishu-entry-auth-guard.test.mjs; node tools/feishu-auth-middleware.test.mjs; node tools/feishu-user-auth.test.mjs; node tools/feishu-authenticated-page-entry.test.mjs; node tools/global-request-loading-remediation.test.mjs
exit 0
Feishu entry guard probes HttpOnly session before /test2 render and preserves safe return paths
Feishu OAuth start and callback routes use redirects, HttpOnly cookies, and sanitized failures
Feishu OAuth v3 keeps credentials and user token server-side, validates state, and exposes only sanitized identity
authenticated pages enter real proxy reads and expose an explicit same-origin Feishu login path
global request loading overlay remediation contract passed
```

Full integration chain:

```text
pnpm test:integration
exit 0
...
Feishu entry guard probes HttpOnly session before /test2 render and preserves safe return paths
...
global request loading overlay remediation contract passed
```

Static check:

```text
pnpm check
exit 0
源码静态、确定性、零外网、语义与原子资产检查通过
```

Build:

```text
pnpm build
exit 0
vite v6.4.1 building for production...
✓ 1948 modules transformed.
dist/index.html                     0.44 kB │ gzip:   0.32 kB
dist/assets/index-5RTFmKQT.css    301.87 kB │ gzip:  49.23 kB
dist/assets/index-C-UHodI8.js   1,067.59 kB │ gzip: 248.37 kB
✓ built in 3.45s
```

Regular UI/interaction tests:

```text
pnpm test
exit 0
...
H5 导航、卡片、表单、表格与分页响应式合同测试通过
```

Whitespace/diff check:

```text
git diff --check
exit 0
Only Git line-ending warnings were printed; no whitespace errors were reported.
```

### Security / accessibility / behavior verification

- Missing Feishu session on `/test2/...` is detected before Vue mount and redirects to same-origin OAuth start.
- `returnTo` preserves safe `/test2/...` pathname, query, and hash.
- External, protocol-relative, encoded protocol-relative, and backslash return paths are rejected by the front-end entry guard and server-side normalization.
- Valid HttpOnly session returns a sanitized identity only; `accessToken`, bearer values, session cookie values, and user tokens are not exposed in JSON/URL/browser storage.
- Existing `IntegrationAuthBanner` flow remains available for in-app authentication-required states; this repair adds the missing pre-render entry guard rather than weakening callback/start security.
- Overlay repair regression was re-run and passed.

### Known risks / blocked or unrun checks

- Real Feishu QA tenant callback and `/test2` browser run were not executed by this thread after the code change; 010 must re-run AUTH-ENTRY-001 in the real environment.
- Web platform result remains `failed` until 010 confirms first-entry OAuth redirect, successful callback return, and live 101-operation QA status.
- No clean commit was created because the repository already had unrelated uncommitted live-integration changes before this repair. This handoff is evidence for the bounded patch, not a clean release artifact.
- No deployment, push, merge, release, formal QA pass, or production-data operation was performed.

Current Web repair conclusion: `failed`; ready to notify 010 to re-run AUTH-ENTRY-001 and the governed live QA checks.

## 2026-09-18 final Web verification — real approval closure and current regressions

- Real OAuth identity `3d8egf55` authorized successfully; browser-visible tokens were not used.
- Approval instance `511FE923-2AAE-4CE1-9512-5698CC2BB685` was resumed without creating a duplicate: first query `PENDING`, test approval `APPROVED`, final query `APPROVED`, and status page displayed “审批已通过”.
- Approved application projection is synchronized to the real application index and 海能 Work detail tables (`projectionStatus=SYNCED`).
- Production projection now writes the live schema fields `申请人AD账号`, `接入人AD账号`, `所属部门ID`, and `接入人所属部门ID`; removed writes to absent legacy fields `负责人ID`, `开发者ID`, and `开发部门ID`.
- Real read rerun executed 65/65 with 40 passed, 25 explicit permission/context blocks, and 0 implementation failures; evidence is preserved instead of treating blocks as passes.
- Fresh local verification passed: `pnpm test:integration`, `pnpm test:deh-req-gap`, `pnpm test`, `pnpm build`, `pnpm check`, and `git diff --check`.
- Announcement drafts now remain in Vue memory for the current mounted page and do not use persistent browser storage.

Current Web engineering conclusion: implementation checks passed; live external permission/context constraints remain truthfully documented in the aggregate handoff.
