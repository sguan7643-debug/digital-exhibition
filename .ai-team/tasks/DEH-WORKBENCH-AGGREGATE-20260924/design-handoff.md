# Aggregate Design Handoff

## Approved Product Source

- `prd.md`

## Design Sources

- Interaction source: `design/ux-handoff.md`
- Visual source: `design/ui-handoff.md`

## Implementation Contract

### Server behavior

1. Add one homepage aggregate read that composes `COM-001`, `COM-002`, `COM-005`, `WB-001`, and `WB-002` while preserving their data contracts.
2. Aggregate requests complete within 30 seconds; the application should stop blocking near 25 seconds and return `200` with usable data or `202` with a session-bound `syncId`.
3. One in-memory single-flight task is keyed by tenant, identity, permission fingerprint, input fingerprint and contract version.
4. The sync-status endpoint reads only task/cache metadata and never calls Feishu.
5. Successful refresh replaces the snapshot. Failed refresh never overwrites the most recent successful snapshot.
6. Stale fallback is allowed only inside existing public/user stale windows and only when all security/version dimensions match.
7. Startup readiness depends on homepage public-table prewarm; user-scoped data begins after authorized identity is available.
8. Upstream request timeout defaults to approximately 20 seconds and table-read budget to approximately 35 seconds, without the former 12/15-second caps.

### Client behavior

1. Homepage load makes one aggregate request rather than five operation requests.
2. `202` starts 2-second lightweight status polling; route exit/unmount/auth loss stops it.
3. `completed` triggers exactly one aggregate refetch.
4. Polling stops after 60 seconds or on `failed`/`expired`; the bubble then offers manual retry.
5. Existing content remains visible during stale refresh and partial availability.
6. Recovery bubble closes automatically when all required sections recover; manual dismissal is remembered for the same task/failure generation.

## Observable State Mapping

| Server state | Client state | UI treatment |
| --- | --- | --- |
| `200 fresh` | normal | No data-status bubble |
| `200 stale`, refreshing | stale/loading | Existing content plus non-blocking update bubble |
| `200 partial` | partial | Available sections remain; unavailable sections use local state; recovery bubble shown |
| `202 queued/running` | initial-syncing | Stable shell plus local loading state; lightweight polling |
| status `completed` | recovering | One aggregate refetch, then normal/partial |
| status `failed`, stale exists | data-stale | Preserve data, closable warning and retry |
| status `failed`, no data | error | Existing recoverable error boundary |
| permission failure | permission-denied | Existing authorization/permission path |
| integration disabled | disabled | No aggregate call or polling |

## Responsive and Accessibility Contract

- Reuse the existing `.integration-toast-stack`, loading banner and recovery bubble styles and the 760px breakpoint.
- Bubble is non-modal, does not alter page layout and does not steal focus.
- Announce semantic state changes through a polite live region, not every polling response.
- Retry and close remain keyboard accessible with visible focus; reduced-motion preference is honored.
- Validate widths 320px, 760px, 1366px and 1920px.

## Evidence Required for Development Handoff

- Unit tests for timeout resolution, single-flight keying, task lifecycle and stale fallback.
- Integration tests proving status polling generates zero Feishu calls.
- Frontend tests proving one aggregate load, one post-completion refetch, timer cleanup and auto/manual bubble dismissal.
- Build success and existing operation-contract regression tests.
- Timing evidence that every aggregate HTTP request finishes within 30 seconds and warm p95 is within 2 seconds.

## Scope Guard

No new page, navigation item, visual system, persisted cache, deployment action or non-homepage workflow is included.
