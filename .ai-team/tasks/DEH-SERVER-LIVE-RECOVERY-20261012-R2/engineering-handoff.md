# Engineering Handoff

## Declared platform

- Web/Vue runtime with a Node backend; this change set is backend-only.
- Frontend source and the deployed `dist` are outside this R2 implementation.
- Detailed implementation evidence is in `handoffs/web.md`.

## R2 implementation

- Cache/task ownership now uses one stable tenant + AD-principal identity, so adding Feishu `userId`/`openId` aliases cannot split the cache or reject polling.
- Known operation inputs are canonical allow-listed business objects; sync IDs, trace IDs, task state and timestamps cannot enter cache keys or worker replay.
- Operation and homepage terminal states no longer regress to `running` while a status authorization refresh is slow.
- Homepage section failures no longer abort successful sibling sections or roll back their independent caches.
- Targeted cleanup now includes `WB-002` in addition to HOM-001, COM-001, COM-004, APP-001 and APP-002.
- Service startup and successful OAuth authorization launch deduplicated real-user warmups for COM-001, WB-001, APP-001, APP-002 and COM-004. Existing persisted sessions are warmed after public startup prewarm.
- COM-004 keeps directory and self-contact inputs separate, validates immutable business input before handoff, reads the bounded formal Contact API directory, and quarantines U001-U005/known initialization people.
- Backend package release naming is `DEH-SERVER-LIVE-RECOVERY-20261012-R2-*`; deployment preserves `.env`, `dist` and `.local`, performs targeted cache cleanup, and does not rewrite files outside `/home/seaoil/pre-demo`.

## Automated verification

- `npm run test:server-read-acceptance`: passed.
- `npm run test:server-real-data`: passed.
- `npm run test:server-cache`: passed.
- `node tools/feishu-user-auth.test.mjs`: passed.
- `npm run test:business-writes`: passed.
- `npm run test:onboarding-poc`: passed.
- Production build completed without starting Feishu prewarm during import/build.

## Remaining release work

- Independent code review and functional QA.
- Generate the final backend-only ZIP and SHA-256 after review.
- Deploy only below `/home/seaoil/pre-demo`, run runtime audit, and verify the authenticated three-page flow plus two consecutive restarts.

