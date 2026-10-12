# Aggregate Design Handoff

## Sources

- Product baseline: `prd.md`
- UX source: `design/ux-handoff.md`
- UI source: `design/ui-handoff.md`
- Platform declaration: Web/Vue only in `task.json`; mobile is not declared.

## Approved implementation contract

The browser contract and visual experience remain unchanged. The backend owns one stable flow: validate published business input, separate it from task/auth metadata, return legal fresh/stale cache immediately, or hand off after five seconds to one user-bound task that completes and atomically commits its result.

The formal personnel directory must be authorization-scoped and must reject fixture/fallback/test identities both on live projection and persistent restore. Homepage authorization must retain the browser user context. APP tasks must terminate inside the approved deadline and leave a reusable cache.

All six observable states defined in the UX/UI sources remain supported without frontend changes. Security behavior is unchanged: 401/403, scope isolation, contact privacy, upload governance, and write controls remain live.
