# PRD — Complete Test Deployment Package

## 1. Product goal and target user value
Create a test package that runs both the existing Vue UI and the existing Feishu proxy so the project owner does not receive a static-only package whose `/api/v1` requests fail.

## 2. Facts, assumptions, and evidence
- **Fact:** `npm run build` currently generates browser assets only; the test screenshot shows Nginx returning HTTP 405 for `POST /api/v1/operations/COM-001`.
- **Fact:** `server/README.md` states production-like hosting must mount the existing dispatcher and browsers must not call Feishu directly.
- **Fact:** Feishu upstream hosts are already fixed in server-side modules.
- **Assumption:** The test host can run Node.js 20+ or proxy to a Node process; deployment access remains with the project owner.

## 3. Scope boundaries
In scope: standalone Node entry, non-secret config, environment template, build/package/start scripts, Nginx example, tests and secret scan. Out of scope: actual deployment, credentials, production and business-operation changes.

## 4. Primary user flow
Run the package command, copy the generated directory to the test host, supply server-side environment variables, start the Node process, and configure Nginx to forward `/test2` and `/api/v1` to it. The browser loads `/test2`; API requests reach the existing proxy; the proxy calls official Feishu endpoints.

## 5. State inventory
- Success: static and API routes are served by one process.
- Loading: normal application loading behavior remains unchanged.
- Empty: missing optional config uses documented safe defaults.
- Error: missing required Feishu credentials returns the existing sanitized service error.
- Disabled: write controls remain disabled unless existing test-write gates are enabled.
- Permission-dependent: existing OAuth and permission behavior remains unchanged.

## 6. Non-goals
Do not embed secrets, bypass OAuth, make browsers call Feishu directly, deploy externally, or change existing data projections.

## 7. Acceptance criteria
1. **Given** a clean checkout, **when** the test-package command runs, **then** it builds the UI and creates a package containing static assets, server runtime, non-secret config and start instructions.
2. **Given** the package has valid server environment variables, **when** it starts, **then** `/test2/` serves the application and `/api/v1/auth/feishu/session` is handled by the existing auth middleware rather than static Nginx behavior.
3. **Given** the package is inspected, **when** secret scanning runs, **then** it contains no `.env.local`, App Secret, access token or Base Token value.
4. **Given** the package runs behind Nginx, **when** `/test2/*` or `/api/v1/*` is requested, **then** the documented forwarding rules preserve the same-origin model.

## 8. Scope decisions
The user must confirm that a Node-capable test package, excluding actual deployment and credentials, is the approved scope.
