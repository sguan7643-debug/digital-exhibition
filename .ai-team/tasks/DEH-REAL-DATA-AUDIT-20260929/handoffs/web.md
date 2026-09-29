# Web Engineering Handoff

## Task and branch

- Task: `DEH-REAL-DATA-AUDIT-20260929`
- Platform: Web / Vue
- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Scope in this increment: make “我的申请” read the authenticated user's records from `上架申请` for every application type; remove duplicate fields from `应用索引` through a guarded, recoverable schema operation.

## Implementation

- Added authenticated, server-filtered `上架申请` list/detail projections to `server/feishu-read-only-service.mjs`.
- Routed the existing onboarding list/detail service through the authoritative table projection while retaining local upload metadata only for matching HaiNeng Work records.
- Allowed safe non-`TEST_` application numbers such as `PA025` in list/detail/sync routes.
- Updated the list copy and table to describe all application types and display the resolved application type.
- Added a duplicate-field planner and a table-specific cleanup command. The command only targets `应用索引`, preserves the first compatible field, rejects primary/type conflicts, snapshots the schema, deletes later duplicates, and verifies the result.
- Added duplicate detection to the onboarding schema preflight so future duplicate columns fail closed.
- Refreshed the 64-table identifier contract from the live Base after cleanup.

## Live schema evidence

- Before: `应用索引` had 62 fields and 10 duplicate-name groups.
- Applied deletion: 10 later duplicate fields removed; no primary fields removed.
- After: `应用索引` has 52 fields and zero duplicate-name groups.
- Pre-delete schema-definition snapshot: `.local/schema-backups/应用索引-2026-09-29T08-54-44-864Z.json` (local evidence, intentionally not committed). It can reconstruct field definitions, but it does not restore deleted cells.

## Test-first evidence

- Initial failures:
  - authoritative list method absent;
  - duplicate cleanup module absent;
  - non-`TEST_` detail route returned 404.
- Added regression tests:
  - `tools/onboarding-authoritative-table.test.mjs`
  - `tools/feishu-duplicate-field-plan.test.mjs`
  - extended `tools/feishu-onboarding-middleware.test.mjs`

## Commands and results

- `npm run feishu:schema:dedupe-app-index` — passed; exactly 10 safe removals planned.
- `npm run feishu:schema:dedupe-app-index:apply` — applied; live verification reports 52 fields, 0 duplicate groups.
- `npm run feishu:contract:refresh` — passed; 64 tables / 1229 fields refreshed.
- `npm run test:onboarding-poc` — passed.
- `npm run check` — passed.
- `npm run test:integration` — passed.
- `npm run test:ui-source-sync` — passed.
- `npm test` — passed.
- `npm run build` — passed; production bundle generated in `dist/`.
- `git diff --check` — passed; only line-ending warnings were emitted by Git status/diff commands.

## Responsive, keyboard, and accessibility checks

- Existing responsive list-table behavior remains active at 900px and 639px breakpoints.
- The new application-type cell uses the existing `data-label` mobile pattern.
- Existing visible focus, semantic table headers/caption, live loading announcement, and detail-link accessible names remain unchanged.
- Source and mounted interaction suites covering onboarding responsiveness, keyboard, screen-reader status, and detail return behavior passed.

## Changed files

- `package.json`
- `server/README.md`
- `server/contracts/feishu-base-identifiers.json`
- `server/feishu-duplicate-field-cleanup.mjs`
- `server/feishu-onboarding-middleware.mjs`
- `server/feishu-onboarding-poc-orchestrator.mjs`
- `server/feishu-onboarding-service.mjs`
- `server/feishu-read-only-service.mjs`
- `server/feishu-vite-plugin.mjs`
- `src/pages/OnboardingPage.vue`
- `tools/cleanup-feishu-app-index-duplicates.mjs`
- `tools/feishu-duplicate-field-plan.test.mjs`
- `tools/feishu-integration-foundation.test.mjs`
- `tools/feishu-onboarding-middleware.test.mjs`
- `tools/onboarding-authoritative-table.test.mjs`

## Known risks and unrun checks

- A real browser session using a currently authorized RPA applicant was not available in the automated environment, so final visual confirmation with that user's OAuth session remains a manual check.
- The live `上架申请` table itself contains duplicate columns outside the user-authorized cleanup target. They were detected by the refreshed contract but were not deleted because this request explicitly limited deletion to `应用索引`.
- No deployment, server restart, merge, publication, or release was performed in this increment.
