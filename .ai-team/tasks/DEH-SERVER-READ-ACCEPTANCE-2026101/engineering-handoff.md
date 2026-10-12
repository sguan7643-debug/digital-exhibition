# Engineering Handoff Aggregate

## Delivery status

- Web declared; repair-attempt-2 Node backend candidate completed and local platform checks passed.
- Mobile/uni-app not declared.
- Source evidence: `handoffs/web.md`.
- No frontend source or dist changes are part of this task.

## Build and test evidence

- `npm run test:server-cache`: passed.
- `npm run test:server-read-acceptance`: passed.
- `npm run test:server-real-data`: passed.
- `npm run check`: passed.
- `npm run test:homepage-aggregate:browser`: passed at 320/760/1366/1920 widths.

## Deployment artifact

- `deploy/digital-exhibition-server-real-data-package.zip`
- SHA-256: `3df918a3786503b22974b377d9fce22dd24b91cf422035e14976068b98d01842`
- Backend-only package; existing `.env`, `dist`, and runtime cache must be preserved during deployment.
- Package contract passed with 230 files and verified that no frontend `dist`, real `.env`, runtime cache or detected secret is included.

## Rollback readiness

- Status: ready.
- Owner: server operator.
- Trigger: readiness fails, authenticated task status returns 500/504, cold homepage does not complete within 25 seconds, or warm cache acceptance falls below 27/30.
- Procedure: stop service, move the current `/home/seaoil/pre-demo/test` aside, restore the deployment-created `/home/seaoil/pre-demo/rollback-<release-id>` directory to `/home/seaoil/pre-demo/test`, reinstall its systemd unit, daemon-reload, and restart.
- Verification: local live/ready endpoints, systemd active state, then authenticated browser smoke test.

## Remaining gate

The implementation is ready for test-environment QA. It is not marked accepted or releasable until the real authorized environment supplies 5 cold and 30 warm samples plus the business-page checks in the approved PRD.
