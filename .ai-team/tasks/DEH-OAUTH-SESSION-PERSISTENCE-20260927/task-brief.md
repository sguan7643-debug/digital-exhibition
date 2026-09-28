# Task Brief

## Goal

Persist the server-side Feishu OAuth session for the local Web application so a development-server restart does not force an already authorized browser through a new authorization flow.

## User

An authorized POC tester who must restart the local development service while completing the application-onboarding journey.

## Mode

Existing Vue Web project.

## Platforms

Web only. Mobile is not declared.

## Scope

- Persist only the server-side authorization-session material required to restore an existing browser session after restart.
- Preserve callback state validation, expiry handling, and logout semantics.
- Provide a clear reauthorization state only if a session cannot be safely restored.
- Verify the restart-and-refresh journey without exposing credentials, tokens, or cookies.

## Out of Scope

- Changes to Feishu application permissions, approval submission, Base schema, POC data, or business pages beyond their authorization-state behavior.
- Any production deployment, external publishing, or mobile implementation.

## Success Metric

After a single successful browser authorization, a local service restart followed by a page refresh restores access for the same browser when the Feishu session is still valid. Invalid or expired sessions require a deliberate reauthorization and never leak sensitive material.

## Deadline

Resolve the repeated-authorization blocker as soon as the governed design is approved.

## Risk

High: authorization artifacts are sensitive. The Web engineer must use local protected storage, avoid browser-token exposure, avoid repository persistence, and prove redacted behavior through tests.

## Dependencies

- Existing local Feishu OAuth application configuration and callback route.
- A browser that can complete the current Feishu authorization flow.
- Local filesystem permissions for a runtime-only, ignored session store.
