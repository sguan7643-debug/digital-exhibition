# Design Handoff Aggregate

Owner: AI Team Lead. Sources: approved `prd.md`, `design/ux-handoff.md`, `design/ui-handoff.md`.

## Aggregate decisions

1. Frontend source and dist remain byte-for-byte unchanged; current IA, interaction and visual system are preserved.
2. The backend read lifecycle is realtime authorization → six-dimensional normalized cache key → fresh/stale/LKG 200 or bounded cold read → one 202/syncId → status-only polling → completed.result.
3. Cache publication is ordered: success schema validation → staged memory entry → durable snapshot → read-back verification → published entry → task completed. Any failure before publication leaves the prior LKG untouched.
4. Stable keys exclude volatile trace/time/request-object identity and canonicalize default/empty inputs. Single, batch and homepage consumers use the same operation-level key builder.
5. Failed/expired jobs leave the merge index before a new request can resolve; polling performs only realtime authorization and status lookup, never the business operation.
6. COM-004 mode is deterministic: directory when includeContact is false/absent; self-contact when true. Directory returns authorized safe identity fields only. Self-contact permits compatibility pagination fields but always restricts the target to the current user.
7. COM-001/WB-003 identity projection, COM-005 dictionaries and APP-001/002/003 app projections are reusable shared reads with operation result caching; APP-003 resolves APP0076 from the same valid projection as list/facets.
8. Startup readiness waits for durable restore/read-back but does not require every operation to prewarm successfully. Restored valid operation entries remain usable across restart.

## API and state contracts

- HTTP 200 success is schema-complete formal data. Cache metadata may identify fresh/stale/LKG but does not alter business data shape.
- HTTP 202 contains code, state, syncId, operationId, pollAfterMs and query location; it is never business data.
- Authorized status queries use HTTP 200 for queued/running/completed/failed/expired. Only completed carries result; failed carries structured error and is never interpreted as success.
- 401/403/404 preserve authentication, authorization and not-found meanings.
- Background refresh errors do not evict or overwrite a valid LKG.

## Verification design

- Deterministic fake-clock tests for 4.5-second handoff and 25-second task deadline.
- Same-key cold completion followed by immediate 200 cache hit for homepage and COM-003/005, APP-002/003, MAT-002, FAV-002.
- Restart restore test proves a snapshot entry is actually readable, not merely present on disk.
- COM-004 directory/self/other-user tests assert safe fields and 403 boundaries.
- COM-001 identity result, nine enabled application types plus business domains, and APP0076 formal name projection tests.
- Package excludes frontend dist changes, real `.env`, runtime cache and secrets; includes ZIP, sidecar and rollback commands.

## Platform declaration

- Web/Vue declared; implementation is Node backend only.
- Mobile/uni-app not declared.
