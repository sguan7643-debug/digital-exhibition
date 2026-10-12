# UX Handoff

## Source

Approved PRD: `../prd.md`. Existing Web behavior and the reported authenticated browser traces are the interaction evidence.

## Information architecture and flow

No navigation or page structure changes. Workbench, application center, and onboarding apply retain their current entry points. A page issues one business request; a cache hit renders immediately, while a cold request keeps the existing loading state and polls one task until `completed.result` is available.

## Interaction rules

- Do not resubmit the original business request during polling.
- Loading ends automatically on completed or terminal error.
- Stale legal data may render immediately while refresh remains silent.
- Empty content is valid only when the formal scoped source is actually empty.
- Permission denial remains explicit and offers no cached-data bypass.

## States and accessibility

- Normal: real data is readable in existing cards/forms.
- Loading: preserve the existing loading announcement and focus position.
- Empty: show the existing legitimate empty state, never proxy/test content.
- Error: return a deterministic terminal status; do not leave indefinite loading.
- Disabled: upload/submit controls follow existing authorization and validation.
- Permission denied: existing 401/403 behavior and recovery remain unchanged.

Keyboard order, labels, visible focus, responsive reflow, and screen-reader behavior are unchanged because no frontend implementation is permitted.

## Platform differences

Web only. Mobile is not declared.
