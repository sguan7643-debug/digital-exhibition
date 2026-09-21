# Task Brief

## Objective

Repair the Web entry flow that currently permits an unauthenticated root-path render and then issues protected Feishu reads, while also bounding the first-screen Feishu data path that currently produces 15–25 second failures or responses.

## Observed evidence

- On the workbench first screen, `COM-001`, `COM-002`, and `WB-001` returned HTTP 401 within 4–7 ms.
- `WB-002` returned HTTP 502 after about 15.7 seconds.
- `COM-005` returned HTTP 200 after about 25.2 seconds.
- The current client fallback is configured at 30 seconds. This is an application-side fallback, not an accepted Feishu response target.

## Delivery boundary

- Preserve HttpOnly session handling; no browser token storage.
- Support local root (`/`) and deployed base (`/test2`) entry paths without hard-coding a one-path-only guard.
- Do not read or modify Feishu credentials, callback settings, permissions, or business data.
- Use only read-only live verification after implementation.

## Requested outcome

An unauthenticated entry redirects to Feishu OAuth before protected page reads begin. Authenticated first-screen reads use a bounded, deduplicated request plan and expose recoverable, actionable failures instead of an opaque long wait.
