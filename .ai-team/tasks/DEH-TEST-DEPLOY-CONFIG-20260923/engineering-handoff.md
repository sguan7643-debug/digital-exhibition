# Engineering Handoff — Complete Test Deployment Package

## Declared platforms

- Web: declared; Vue 3 frontend plus Node 20 test deployment runtime.
- uni-app/mobile: not declared, as recorded in `task.json`.

## Implementation and evidence

The Web implementation packages the existing Vue bundle and existing server-side Feishu middleware into a single test-deployable Node application. Detailed file changes, test-first evidence, exact commands, and output hashes are recorded in `handoffs/web.md`.

All implementation gates passed: static checks, focused Feishu proxy/auth checks, deployment-server tests, production build, package creation, dependency installation, generated-package startup, live static routing, live API routing, root redirect, secret exclusion, and diff whitespace validation.

## Output

- Package directory: `deploy/digital-exhibition-test-package/`
- Deployment ZIP: `deploy/digital-exhibition-test-package.zip`
- Final ZIP SHA-256: `1BB1E8DB812F890620B615E9D7C74C492A9B1FE9D5C8DDBE034BD81C44C0C216`

## Known risks

- Risk: target server must provide Node.js 20.6+ and Nginx forwarding. Owner: project owner/test-environment operator. Status: governed by the included README and Nginx example.
- Risk: real Feishu credentials are intentionally absent. Owner: project owner/test-environment operator. Status: governed by `.env.example`; values must be supplied only on the server.
- External deployment and Nginx reload were not executed because they are outside approved scope.

## Rollback readiness

- Status: ready.
- Owner: project owner/test-environment operator.
- Trigger: package fails health checks, `/test2/` cannot load, or `/api/v1/auth/feishu/session` is not handled by the Node runtime after deployment.
- Procedure: stop the new Node process, restore the previously deployed directory or archive, restore the prior Nginx configuration, reload Nginx, and verify the previous `/test2/` entry and API behavior.
- Verification evidence: the new package is isolated in `deploy/digital-exhibition-test-package/`, has a SHA-256 manifest, and no source deployment was overwritten during validation; local package startup and route probes passed as recorded in `handoffs/web.md`.
