# UX Handoff

Source: approved `prd.md`. Platform: existing Vue Web. Frontend changes: none.

## Information architecture and flows

- Existing homepage, personal center, application form, application list/detail and material/favorite entries remain unchanged.
- Every read follows one observable lifecycle: realtime auth → stable cache lookup → HTTP 200 fresh/stale/LKG, or cold execution → direct 200 within budget, otherwise one 202 → polling one syncId → completed.result replaces the same loading state.
- Polling never calls the original business operation. Failed/expired ends loading with the existing error state; a later normal request must not receive the failed syncId.
- COM-004 keeps the existing operation endpoint but has two request modes. Directory mode is selected when `includeContact` is absent/false. Self-contact mode is selected when `includeContact=true` and requires the current user's userId. Existing page/pageSize/sort fields are accepted in both modes.

## Content behavior

- Cached and newly completed data use the same complete business response shape.
- Directory items expose displayName and departmentName with safe identifiers; mobile/email are absent or null.
- Self-contact returns the current user's mobile/email when permitted. Other-user contact remains permission-denied.
- APP detail displays only records with resolved formal owner/developer/department names; internal IDs never replace Name fields.
- Dictionary options contain only formal enabled values and preserve the operation success shape used by the application form.

## Required states

| State | Trigger and behavior | Recovery |
|---|---|---|
| normal | HTTP 200 fresh/stale/LKG or completed.result; show complete existing content | stale refresh is silent |
| loading | one cold request returned 202; retain one loading lifecycle while polling one syncId | completed updates automatically |
| empty | successful complete response proves no authorized records | existing empty presentation; no test or proxy data |
| error | terminal failed/expired or explicit upstream/data error | existing retry action creates a new task, never reuses failed task |
| disabled | material/action has an explicit unavailable business state | existing disabled behavior |
| permission-denied | realtime auth or range check returns 401/403 | existing login/access-denied behavior |

## Accessibility and Web behavior

- Existing keyboard order, focus, semantic labels and responsive layout remain unchanged because no frontend files change.
- A 202-to-completed transition updates the existing live loading region once; silent refresh must not create additional announcements or focus movement.
- Error and permission states remain distinct and do not masquerade as empty results.
- uni-app/mobile is not declared.

## Open questions

None for design. Source permissions and APP0076 existence remain live-QA evidence, not interaction decisions.
