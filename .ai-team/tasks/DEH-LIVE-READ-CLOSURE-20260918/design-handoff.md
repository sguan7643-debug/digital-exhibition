# Aggregate Design Handoff — 正式飞书 65 项读取全量闭环

Author: AI Team Lead 001  
Task: `DEH-LIVE-READ-CLOSURE-20260918`

## Approved sources

- Product baseline: `prd.md`; scope approval is recorded in `task.json` for Product Owner.
- UX source: `design/ux-handoff.md`.
- Visual source: `design/ui-handoff.md`.
- Product review: `reviews/product-review.md`, verdict `approved` after the two safety findings were closed.
- Platform: Vue Web only. uni-app/mobile is not declared.

## Design outcome

This task extends the existing governed live-read runner and evidence flow. It does not add a business-user page or alter product navigation. The implementation must preserve this fixed sequence:

1. Read-only preflight and authenticated AD identity confirmation (`3d8egf55`).
2. Snapshot existing permission rows and calculate the exact eight-code difference.
3. Idempotently create only missing permission rows, record every created record ID immediately, and re-read all eight codes.
4. If the eight-code verification is incomplete, delete only permission rows created by this run and verify the pre-run baseline is unchanged. If complete, retain the eight least-privilege permissions permanently.
5. Discover an existing compatible file token read-only. Never upload a new media object in this task.
6. Create only the minimum precisely deletable `TEST_` records needed for `applicationId`, `certificationId`, and `exportId`, recording each record ID immediately.
7. Execute the complete 65-operation read registry. A result is passed only after a real request and schema validation.
8. In `finally`, delete every task-created temporary record by exact record ID and independently verify absence. The cleanup ledger must never accept permission rows or file-source records.
9. Run regression tests/build, secret-scan the evidence, and accept only `65 passed / 0 blocked / 0 failed` with verified cleanup.

## Isolation model

Three ledgers are mandatory and must not share cleanup inputs:

| Ledger | Contents | Terminal behavior |
| --- | --- | --- |
| Permission ledger | Pre-run snapshot and permission record IDs created by this run | Roll back only before incomplete eight-code verification; otherwise retain permanently |
| Temporary-record ledger | Task-created `TEST_` table records and exact record IDs | Delete and verify absent on success, failure, timeout, or cancellation |
| File-context ledger | Existing source table, masked record reference, irreversible token fingerprint, compatibility result | Read-only; never update, delete, upload, or reveal the full token |

## State and recovery contract

- `normal`: completed phase or schema-valid real read.
- `loading`: visible phase, operation ID, `n/total`, elapsed time, and cancel availability; never a full-screen blocker.
- `empty`: real empty response with `empty=true`; never replaced by fixture data.
- `error`: safe error category, phase, trace ID, cleanup state, and next action.
- `disabled`: unmet preflight, identity mismatch, unavailable compatible file context, running lock, or cleanup debt; no bypass action.
- `permission-denied`: exact missing approved permission and affected operations; no wildcard or ninth permission.
- `cleanup-in-progress` / `cleanup-pending`: cleanup cannot be skipped or ordinarily cancelled; a pending cleanup blocks a new run and any pass claim.

Cancellation stops scheduling new calls and then enters cleanup. Recovery first resolves any cleanup ledger or incomplete permission transaction. Results from different run IDs may not be combined into a synthetic 65/65 outcome.

## Security and evidence

- Never output access/refresh/tenant tokens, cookies, Authorization headers, app secrets, OAuth codes/state, complete file tokens, token-bearing URLs, raw response bodies, or unrelated personal data.
- Evidence may contain operation IDs, counts, safe error codes/messages, trace IDs, permission codes, masked/hash record references, cleanup verification, tests, build result, and evidence paths.
- Identity must come from the authenticated server session; query parameters or arbitrary user overrides cannot authorize the permission write.
- The operation list must remain exactly 65 unique read operations. No fixture, old evidence, 403, missing input, timeout, 5xx, or contract error can be counted as passed.

## Visual and accessibility preservation

Use the existing `src/style.css` design tokens only. If an internal Web runner displays progress, preserve a non-blocking in-flow status, visible text labels, keyboard-operable named controls, existing focus rings, readable contrast, `prefers-reduced-motion`, and responsive reflow from wide desktop to 320px without page-level horizontal overflow. CLI-only output uses the same stable textual state names and structured evidence. Color, icons, and motion are never the only state signal.

## Implementation boundary

Expected implementation areas are the existing live-read input resolver/runner, a bounded least-privilege permission provisioner, precise TEST_ fixture lifecycle support, focused regression tests, and task evidence. Implementation must not add wildcard permissions, modify non-TEST_ business records, upload media, alter Feishu credentials/configuration, deploy, merge, publish, or release.

## Design approval summary

The decision presented to the Product Owner is:

- retain the eight exact permissions as long-term least-privilege access after complete verification;
- guarantee incomplete permission writes restore the previous baseline;
- create and clean only precisely deletable TEST_ table records;
- reuse existing file media read-only and fail closed if incompatible;
- require one-run 65/65 evidence and verified cleanup before success.

This aggregate does not grant design approval or authorize implementation. Development begins only after explicit current-task design approval is recorded.
