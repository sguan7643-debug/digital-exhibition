# Task Brief

## Outcome

Restore the test environment's real-data read path without frontend changes. The backend must preserve validated operation input across asynchronous handoff, exclude historical test personnel, finish homepage and application reads within the approved deadline, and persist reusable results.

## Evidence

- COM-004 `read-9827193b-fd8f-4c18-a63b-e510b917c37b` failed with `INVALID_OPERATION_INPUT` after queue handoff although the browser sent only the published fields.
- Completed COM-004 responses returned `U003/王五`, `U004/赵六`, and `U005/陈晓明`.
- HOMEPAGE `sync-743a4e09-7bde-412e-b23b-a9b9ea894f7e` failed in authorization with `FEISHU_UPSTREAM_TIMEOUT`.
- APP-001 and APP-002 remained running beyond 35 seconds and the page showed zero applications.

## Constraints

- Backend and backend tests/package only.
- Real Feishu data only; no fixture/fallback substitution.
- Preserve authentication, authorization, scope isolation, audit, upload, and write governance.
- Codex does not deploy; live evidence remains the operator's responsibility.
