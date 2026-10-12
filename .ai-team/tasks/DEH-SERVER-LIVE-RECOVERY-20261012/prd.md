# Product Requirements

## 1. Goal and value

Authorized users must obtain real homepage, application, and onboarding reference data without manual refresh. A five-second foreground budget may hand off to one background task, but that task must preserve the validated request and complete within 25 seconds.

## 2. Facts, assumptions, and evidence

- **Fact:** The browser COM-004 directory input is `{page,pageSize,sort}` and self-contact input is `{userId,includeContact,page,pageSize,sort}`.
- **Fact:** A queued COM-004 task rejected an unapproved field, proving the replayed input differed from the validated browser input.
- **Fact:** U003/U004/U005 historical users appeared in completed results and are prohibited from the formal read channel.
- **Fact:** Homepage authorization timed out and APP-001/APP-002 remained running past 35 seconds.
- **Assumption:** The supplied task IDs describe the currently deployed candidate; exact server logs are available only on the test host.

## 3. Scope

In scope is the backend queue envelope, worker replay input, COM-004 source filtering/cache invalidation, user-bound homepage authorization, APP task completion/cache commit, targeted cache cleanup tooling, tests, and a backend-only archive. Frontend source/dist, mock substitutions, security relaxation, and direct deployment are excluded.

## 4. Primary flow

1. An authenticated browser submits a published operation input.
2. The backend validates and normalizes only the business input.
3. A hot legal cache returns immediately; otherwise the request waits at most five seconds.
4. On handoff, the queue stores business input separately from identity and task metadata.
5. The worker revalidates/replays only the stored business input under the bound current-user authorization context.
6. Completion atomically commits memory and persistent cache, and polling returns `completed.result`.

## 5. State inventory

- Success: complete formal data and reusable cache.
- Loading: one queued/running task and stable HTTP 200 status polling.
- Empty: only a legitimate empty formal source, never a fixture substitute.
- Error: explicit terminal error; failed tasks leave the merge index.
- Disabled: write/upload controls remain governed by existing contracts.
- Permission denied: real 401/403 is preserved and never converted to cached success.

## 6. Non-goals

No frontend change, schema migration, security bypass, test-person cleanup in the upstream production source, or direct server deployment.

## 7. Acceptance criteria

- Given an accepted COM-004 request, when it is handed to a worker, then only normalized published fields reach operation validation and execution.
- Given formal COM-004 directory mode, when results are projected or restored, then initialization/test people including U003/U004/U005 are absent.
- Given an authenticated homepage request, when authorization is evaluated, then the current user context is retained and unrelated full-table authorization work does not consume the task deadline.
- Given APP-001 or APP-002 exceeds five seconds, when its task continues, then it reaches completed within 25 seconds and commits a reusable result.
- Given targeted bad cache entries exist, when the cleanup command runs during deployment, then only the named operation namespaces are invalidated and unrelated legal caches remain.
- Given the backend package is produced, when inspected, then it contains no frontend dist/assets or runtime secrets.
