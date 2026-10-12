# UX Handoff

## Sources and boundary

- Approved product source: `../prd.md`.
- Existing Web/Vue pages and their currently deployed request contracts are the interaction baseline.
- No frontend source, `dist`, route, navigation, copy, component, or visual change is authorized.
- Declared platform is Web only; no uni-app/mobile target is in scope.

## User flow

1. An authenticated user opens `/test2/workbench`, `/test2/apps`, or `/test2/apps/onboarding/apply`.
2. The existing page sends its normal business request once.
3. A legal complete fresh or stale cache renders immediately. A stale result may trigger only a silent background refresh.
4. A cold read may remain in the existing loading state for at most five seconds, then receives one `202` response containing a stable `syncId` and polling address.
5. The existing frontend polls that same task. Polling never resubmits the original business operation and never creates another task.
6. The task reaches `completed` or `failed` within 25 seconds. On `completed`, the polling response contains the full business result and the page replaces loading automatically without a manual refresh.
7. On the onboarding page, all existing selectors become usable after their real reference results arrive. The existing upload and submit interactions continue without contract changes.

## Interaction rules

- Hot-cache reads return complete data immediately and keep refresh activity invisible.
- Cold handoff returns exactly one active task for the same normalized authorization and business input.
- The task result, not a second call to the original business endpoint, ends loading.
- Terminal states are monotonic: `completed` and `failed` never revert to `queued` or `running`.
- A failed refresh cannot replace a last-known-good legal cache with empty, proxy, test, or partial data.
- A legitimate empty result must be distinguishable from upstream failure or complete filtering of contaminated rows.
- COM-004 directory mode uses `{page,pageSize,sort}`; current-user contact mode uses `{userId,includeContact,page,pageSize,sort}`. Internal task metadata never enters either business input.
- Current-user contact values may be null when Feishu permission does not expose them; fabricated values and identifier-as-name fallbacks are prohibited.
- Unauthorized or changed-scope access remains an explicit 401/403 and cannot read another identity's cache or task.

## Required states

- **Success:** Existing cards and forms display complete real Feishu data with resolved names and departments.
- **Loading:** Existing loading treatment is bounded by the five-second foreground wait plus polling of one task; it ends automatically.
- **Empty:** Existing empty treatment is shown only when the authorized formal source is genuinely empty.
- **Error:** The page receives one stable terminal failure with a diagnostic code; it must not remain indefinitely loading.
- **Disabled:** Existing upload and submit controls are disabled only by existing permission or validation rules.
- **Permission-dependent:** Existing 401/403 behavior is preserved, with stable normalized task authorization preventing false permission drift.

## Accessibility and responsive behavior

Existing keyboard order, labels, visible focus, screen-reader announcements, text scaling, and responsive reflow are preserved. No new UI element is introduced. Backend completion must replace the existing loading state without moving focus unexpectedly.

## Acceptance traceability

- PRD AC-1/AC-4: success and valid-empty states contain only formal real data.
- PRD AC-2/AC-3: bounded loading, one task, monotonic terminal state, reusable cache.
- PRD AC-5: existing selectors, uploads, and submit become usable.
- PRD AC-6: permission-dependent states remain isolated.
- PRD AC-8: the three existing pages are verified through the real authenticated test session.
