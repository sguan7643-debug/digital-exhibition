# Web Engineering Handoff

Owned only by the Web engineer for this task.

## Repository and Task Branch

- Repository: `https://github.com/sguan7643-debug/digital-exhibition.git`
- Base commit: `9dec73b7c0db72bde284747de50779f3219bf288`
- Task branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Framework: `vue`
- Reference archive: `digital-exhibition-SOURCE-20260916-165348.zip`
- Reference SHA-256: `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`

## Approved Inputs

- Approved scope: `task.json`, `task-brief.md`, `prd.md`; approved by User.
- Approved design: `design/ux-handoff.md`, `design/ui-handoff.md`, `design-handoff.md`; approved by User.
- Web acceptance: reference-package shell/tokens/controls/responsive geometry must match while real OAuth, API, approval, upload, cache, permission, user identity and `/test2` base-path behavior remain authoritative.

## Changed Files

- `src/App.vue`: removed the reference-external global request-activity bubble; kept internal request tracking, retry scheduling, screen-reader data-source status and inline Feishu authorization recovery.
- `src/style.css`: removed only the global request bubble rules; retained global accessibility and authoritative-detail rules.
- `src/components/ExhibitionShell.vue`: restored the reference package's 150px narrow-desktop sidebar, natural wide navigation sizing, account visibility behavior and certification shell geometry; retained live identity/unread/base-path/accessibility logic.
- `package.json`: registered source-parity and browser-parity regression commands.
- `tools/ui-reference-parity-20260930.test.mjs`: source-level parity guard with explicit live-data/accessibility allowlist.
- `tools/browser-ui-reference-parity.test.mjs`: browser comparison at 1440×1000, 900×900 and 390×844 for five representative routes, with screenshots.
- `tools/global-request-loading-remediation.test.mjs`: changed the UI contract from visible global bubble to background-only request tracking.
- `tools/first-screen-request-budget.test.mjs`: made timeout/cancellation fixtures deterministic and asserted no global bubble.
- `tools/structural-shell-calibration.test.mjs`, `tools/review-remediation.test.mjs`, `tools/unified-header-remediation.test.mjs`: aligned historical assertions with the approved reference package.
- `.ai-team/tasks/DEH-UI-PARITY-20260930/evidence/browser/`: 30 current/reference screenshots covering five routes and three viewport classes.

## Commands and Exact Results

- `node tools/ui-reference-parity-20260930.test.mjs` → exit 0, `approved 2026-09-30 reference parity guard passed`.
- `npm test` → exit 0; 30-route UI, six-state, interaction, H5, long-page and shell regressions passed.
- `npm run test:ui-source-sync` → exit 0; source sync, accessibility, onboarding and application-page contracts passed.
- `npm run test:integration` → exit 0; Feishu security, 101 operations, OAuth/session, approval, write gate and request-tracking contracts passed.
- `npm run test:onboarding-poc` → exit 0; authoritative table, upload, unique identifier, approval projection and notification contracts passed.
- `npm run test:first-screen-budget` → exit 0; deterministic timeout, initial-sync recovery, cancellation and no-global-bubble contracts passed.
- `npm run check` → exit 0; static, deterministic, zero-external-network, semantics and asset audit passed.
- `npm run build` → exit 0; Vite transformed 1932 modules and produced `dist/index.html` plus CSS/JS assets.
- `npm run test:browser:ui-parity` → exit 0; 15 current/reference viewport-route comparisons passed and 30 screenshots were written.

## Web Experience Evidence

- Browser sizes: 1440×1000, 900×900 and 390×844.
- Representative routes: workbench, application center, profile, digital certification and talent people.
- Verified: topbar/frame/sidebar dimensions, brand/background colors, no document-level horizontal overflow, no global request bubble and no page script errors.
- Keyboard/focus: existing full suite retained skip-link, visible focus, mobile drawer focus trap and locally focusable horizontal table regions.
- Semantics/labels: real account name/department and unread count remain labelled; hidden integration status remains an `aria-live` source; table scroll regions retain names and roles.
- Screenshots: `evidence/browser/`.

## Unrun Checks, Constraints, and Risks

- No production/test-server deployment or live Feishu write was performed; both are outside approved scope.
- Visual comparison intentionally permits dynamic real data/text to differ from the reference fixtures. The common shell geometry and design tokens are asserted; business content remains API-authoritative.
- The legacy browser scripts that assume root `/` and an already-authenticated server were not used as release evidence because this repository is configured for `/test2` and OAuth. The parity browser test injects only an authenticated test identity and runs current data mode disabled, so it verifies UI without external writes.
- Rollback is bounded to reverting the listed source/test files; no schema, server or data mutation is involved.

## Governed Platform Check

- Evidence path supplied to the platform check: `.ai-team/tasks/DEH-UI-PARITY-20260930/handoffs/web.md`.

