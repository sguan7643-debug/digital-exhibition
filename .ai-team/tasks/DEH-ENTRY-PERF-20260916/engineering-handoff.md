# Engineering handoff — DEH-ENTRY-PERF-20260916

## Declaration

- Declared platform: Web (`vue`).
- Mobile / uni-app: not declared (`mobile_framework=none`, `mobile_targets=[]`); no mobile worker handoff is required.
- Branch / baseline: `task/digital-exhibition-ui-0817-dev-r3-web` / `91a8ba1ad452bc348cb3615f1700b55c9e1af9a5`.
- Worktree status: intentionally dirty from the governed repair series. This handoff covers only the task-owned files listed in `handoffs/web.md`; it does not authorize merge, deployment, publication, or a Feishu data write.

## Delivered behavior

- Entry authorization resolves the configured application base for local `/` and deployed `/test2` routes before protected page integrations mount.
- Feishu upstream requests have an 8-second deadline; each read has a 10-second aggregate budget; browser remote requests have a 12-second maximum.
- The first-screen plan suppresses duplicate operation IDs, allows up to eight controlled upstream reads, and shares the minimum-field user-dictionary read used by application and current-user projections.
- Timeout and request completion clear loading state in all terminal branches and retain a retryable regional failure instead of waiting for the former 30-second fallback. Authenticated request progress is an in-flow status banner that does not cover the viewport, intercept input, or move focus; only the pre-mount entry-session decision uses a full-screen entry surface.
- No task verification wrote, deleted, or modified a Feishu record. The formal Feishu Bitable was used only as the read-only source of truth.

## Evidence

- Web implementation handoff: `handoffs/web.md`.
- Real authenticated browser timings: `evidence/live-first-screen-20260918.json`.
- `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002` all returned HTTP 200; the slowest completed in 9582 ms, below the 12-second browser budget.
- `pnpm test:integration` — passed on 2026-09-18.
- `pnpm test` — passed on 2026-09-18.
- `pnpm check` — passed on 2026-09-18.
- `pnpm build` — passed on 2026-09-18; Vite transformed 1951 modules.
- `git diff --check` — passed; output contained line-ending warnings only.
- The initial code review P1 about the authenticated full-screen overlay was repaired with a failing-then-passing regression test; the full verification set above passed again after the repair.

## Known risks and review focus

- Live upstream latency is variable and can approach the server budget. Review must confirm timeout cancellation, retry accounting, and shared-read isolation do not cross user/session boundaries.
- The repository contains cumulative pre-existing modifications. Release packaging must include only reviewed task changes and must not reset or absorb unrelated work.
- The current task is read-only by scope. The user's general authority to create or modify formal Bitable data does not expand this task's approved boundary.

## Rollback readiness

- Status: ready for reviewed candidate rollback.
- Owner: Web release integrator.
- Trigger: OAuth-before-read regression, base-path routing regression, first-screen 401/5xx recurrence, a request exceeding the browser budget, or cross-session cached data.
- Procedure: stop the candidate deployment, restore the previous Web/server artifact, restart the same-origin service, and run the entry guard plus the five-operation authenticated workbench smoke check. Do not delete or edit Feishu records as part of rollback.
- Automated rollback smoke coverage: `tools/feishu-entry-auth-guard.test.mjs`, `tools/feishu-open-api-client.test.mjs`, `tools/feishu-read-only-service.test.mjs`, and `tools/first-screen-request-budget.test.mjs`.
