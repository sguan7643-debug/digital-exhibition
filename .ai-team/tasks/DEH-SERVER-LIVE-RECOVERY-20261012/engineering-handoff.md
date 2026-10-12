# Engineering Handoff

## Declared platform

- Web/Vue；本次只修改 Node 后端及部署/审计工具。
- 前端源码和 dist 未修改。
- 详细工程证据：`handoffs/web.md`。

## Candidate

- Release: `DEH-SERVER-LIVE-RECOVERY-20261012-20261011194033`
- Git commit: `6bf133c4541b08be5c414739ea6c680f72d92f25` (`gitDirty=true`; package SHA is authoritative)
- Package: `deploy/digital-exhibition-server-real-data-package.zip`
- SHA-256: `90db99856dd3c64514a391b6c5cb8aef65a76ceea49a0bdcc2810b872307c1a3`
- 纯后端包：235 个文件。

## Verification

- Server read acceptance: passed.
- Runtime metadata/health contract: passed.
- COM-004 bounded Contact API directory and test-data quarantine: passed.
- APP test-reference quarantine and snapshot validation: passed.
- Monotonic operation/homepage task-state regression: passed.
- COM-001 two-table bounded identity read: passed.
- Startup/read/write/package regressions: passed.
- Authenticated live environment verification: pending deployment/operator session.

## Release boundary

- Current test environment remains failed based on `functional-qa-report.md`; this candidate is not deployed and is not release-approved.
- Deployment script performs a fresh staged backend copy, targeted snapshot cleanup and automatic readiness rollback.
- After deployment, run `server/runtime-audit.sh` and the authenticated three-page acceptance including two restarts.
