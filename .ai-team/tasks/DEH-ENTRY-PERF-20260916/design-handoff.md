# Design Handoff — Feishu Entry Authentication and First-Screen Performance Repair

## Sources and declared platform

- Product baseline: [prd.md](prd.md), approved by the Product Owner on 2026-09-16.
- Interaction source: [design/ux-handoff.md](design/ux-handoff.md), owned by UX.
- Visual source: [design/ui-handoff.md](design/ui-handoff.md), owned by UI Visual Design.
- Declared platform: Web/Vue only. `task.json` declares no mobile platform, mobile framework, or mobile target; no uni-app output is required.

## Combined implementation intent

1. Resolve a configured active application base (`/` locally, `/test2` in the test environment) through one app-base helper before entry authorization and route resolution. The same helper alone builds shell/card links, history updates, OAuth `returnTo`, empty/error/permission recovery links, and the rejected-return fallback; no component may hand-concatenate `/test2`.
2. Before the session probe resolves, display an entry-only state. A `401` starts the existing OAuth flow; a transport/server error displays a retryable entry state and prevents all protected business reads.
3. After authentication, first-screen requests are visible in their owning workbench region. `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002` must not turn the entire page into a blocked overlay.
4. The service contract is 8 seconds per upstream call, at most one retry inside a 10-second server read budget, and a browser success/empty/permission/recoverable-error outcome within 12 seconds.
5. A region retry invokes only its failed retryable operation(s); it disables its own trigger until terminal state. Search preserves readable prior results and applies only the latest input.
6. Render only allowlisted diagnostics: operation ID, category, trace ID, elapsed time, retry count. Never expose tokens, cookies, credentials, raw upstream content, identity values, or record data.

## State and accessibility contract

| State | Required presentation | Interaction and accessibility |
| --- | --- | --- |
| Entry checking / OAuth redirect | Centered entry surface only; no data page underneath. | Concise live status; no forced focus. |
| Entry unavailable | Centered entry card with “Retry sign-in check”. | Retry repeats only session check; protected requests remain suppressed. |
| Region loading | Inline 20–24px progress and scoped text in existing white panel. | Do not mask shell or steal focus; disable only owning control. |
| Empty | Existing heading plus neutral empty message. | No automatic retry. |
| Timeout / transient error | Local state card with explanation, optional safe diagnostic row, and “Retry”. | Preserve successful regions; logical order explanation → diagnostics → retry. |
| Permission denied | Local navy-accent state, not an authentication or red error state. | Do not auto-retry; only link to a proven existing access path. |

Use existing `--xlt-*` tokens, 36px existing control height, focus ring, forced-color outline, and reduced-motion behavior. At `<=760px`, state cards consume the available panel width with 16px padding and wrapping diagnostics; no native/mobile adaptation is introduced.

## Mandatory engineering resolution

The current `.global-request-loading` full-viewport overlay conflicts with the approved contract because it intercepts input and focuses itself for every request. Engineering must restrict a full-viewport surface to unresolved entry authorization and replace authenticated request feedback with the regional states above.

## Concrete workbench ownership and retry boundaries

| Operation | Owning existing UI region | Scoped retry |
| --- | --- | --- |
| `COM-001` | `ExhibitionShell` user identity and `WorkbenchPage` hero greeting context | Only `COM-001`; an absent identity is an error, never a different user's identity. |
| `COM-002` | `ExhibitionShell` primary/sidebar personalized navigation | Only `COM-002`; safe fallback retains current route and brand, not invented menu permissions. |
| `COM-005` | `ExhibitionShell` 场景化搜索 and dictionary-dependent category/scene choices | Only `COM-005`; free text remains usable where no dictionary value is needed. |
| `WB-001` | Workbench hero, 应用类型概览, 热门应用推荐, 培训课堂, 公告通知, 我的使用统计 | Only the shared `WB-001`; duplicate retry controls disable together while that operation runs. |
| `WB-002` | 热门应用推荐 query/filter result list | Only `WB-002` with latest query/filter; preserve prior readable result until a terminal outcome. |

Each row supplies normal, loading, empty, error, disabled, and permission-denied states according to the UX source. The error, empty, and permission recovery paths use the app-base helper rather than a root-absolute link.

## Evidence required before implementation can be accepted

- Automated base-path tests for root and `/test2`, safe OAuth return preservation, and session-probe failure suppression of protected operations.
- Test evidence for upstream deadline, single-flight tenant token, bounded retry, request deduplication, 12-second browser deadline, and non-blocking regional recovery.
- Concrete operation-to-workbench-region mapping in the Web handoff.
- Read-only live timing evidence containing only the approved safe diagnostic fields.

## Open implementation evidence, not scope expansion

1. Prove the non-secret `/test2` configuration source in the test deployment; this task does not authorize changing that deployment.
2. Document the actual `COM-001` and `COM-002` workbench region mapping.
3. Use an existing permission-support route only if evidence establishes one; do not create a new route.
