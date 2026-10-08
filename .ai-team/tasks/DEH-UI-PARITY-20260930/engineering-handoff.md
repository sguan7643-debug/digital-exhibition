# Aggregated Engineering Handoff

## Task and Approval Baseline

- Task: `DEH-UI-PARITY-20260930`.
- Scope and design are approved by User in `task.json` and `decision-log.md`.
- Approved inputs: `prd.md`, `design/ux-handoff.md`, `design/ui-handoff.md`, `design-handoff.md`.
- Declared platforms: Web only (`vue`).
- Aggregated: 2026-10-03 Asia/Shanghai.

## Web Evidence

Source: `handoffs/web.md`

- Repository, branch, framework, changed-file inventory, exact command results, responsive/accessibility evidence, constraints and rollback facts are preserved in the source handoff.
- Browser evidence contains 15 paired route/viewport checks and 30 screenshots under `evidence/browser/`.
- Web implementation is ready for independent code review and QA; this statement is not merge, deployment or release approval.

## Mobile Evidence

Source: `task.json`

- `not declared`: `platforms` contains only `web`; `mobile_framework` is `none` and `mobile_targets` is empty.
- H5 responsive behavior is part of the declared Web implementation and is covered by Web evidence; no separate uni-app/mobile worker handoff is required.

## Shared API and Data Contract

- Existing same-origin `/api/v1` API, OAuth session, approval, upload, permission, cache and `/test2` base path are unchanged.
- Dynamic identity and business content remain real-data projections; reference fixture names/counts are not copied.
- Error behavior retains inline/local page states, background retry scheduling and screen-reader announcements. The global floating request bubble is intentionally removed.

## Evidence Integrity Check

- `handoffs/web.md`: present and complete for the only declared platform.
- `evidence/browser/`: present with 30 screenshots.
- Source/test/build commands and outcomes are listed in `handoffs/web.md`.
- Mobile worker evidence: not required because mobile is not declared.
- Governed Web platform check is to reference `handoffs/web.md`; no conflicting platform evidence identified.

## Combined Risks

- Dynamic real content cannot be pixel-identical to static reference fixtures; owner: Web/product acceptance; status: expected; mitigation: geometry/token comparison plus live-data regression tests.
- Live deployment appearance still requires the normal test-server smoke after packaging; owner: deployment operator; status: not executed by this task; mitigation: use the existing `/test2` deployment flow and do not replace server configuration.

## Rollback Readiness

- Procedure: revert the task's listed Vue/CSS/test/package changes and rebuild; no database, Feishu schema or deployment state needs rollback.
- Owner: Web maintainer.
- Trigger: regression in shared shell geometry, OAuth/API behavior, or approved visual acceptance.
- Verification evidence: `handoffs/web.md`, `npm test`, `npm run test:integration`, `npm run build`, and `evidence/browser/`.
- Status: `ready`

