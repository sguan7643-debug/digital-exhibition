# Web Engineering Handoff — Test Deployment Package

## Branch and scope

- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Framework: Vue 3; Node 20 test runtime.
- Implemented only the approved complete test-package scope. No external deployment or secret value was performed.

## Changed files

- `server/test-deployment-server.mjs`
- `server/feishu-vite-plugin.mjs`
- `serverConfig.json`
- `.env.test.example`
- `nginx-test.conf`
- `README-TEST-DEPLOY.md`
- `tools/create-test-deployment-package.mjs`
- `tools/test-deployment-server.test.mjs`
- `package.json`

## Test-first evidence

- Initial `node tools/test-deployment-server.test.mjs`: failed with `ERR_MODULE_NOT_FOUND` for the intentionally absent server entry.
- After implementation, `npm run test:test-deployment`: exit 0; verified `/ -> /test2/`, `/test2/` static serving, `/assets/*`, `/api/v1/auth/feishu/session`, and traversal rejection.
- First generated-package startup: failed because two `src/integration` runtime contracts were absent. Packaging list was corrected and the generated package was regenerated.
- Generated-package startup after correction: `Digital Exhibition test server ready: http://127.0.0.1:4173/test2/`.

## Commands and exact results

- `npm run check`: exit 0, source audit passed.
- `node tools/feishu-server-proxy.test.mjs`: exit 0.
- `node tools/feishu-entry-auth-guard.test.mjs`: exit 0.
- `npm run build`: exit 0; 1956 modules transformed; bundle generated.
- `npm run package:test`: exit 0; directory and ZIP generated.
- Generated package `npm install --omit=dev`: exit 0; 1 package added, 0 vulnerabilities.
- Generated package `npm start`: started successfully.
- Live package checks: `/test2/` HTTP 200; unauthenticated session endpoint HTTP 401 with `USER_AUTH_REQUIRED`; root HTTP 302 to `/test2/`.
- `git diff --check`: exit 0; only existing LF/CRLF warnings.
- Clean package contains `.env.example`, `serverConfig.json`, `nginx-test.conf`, `dist`, `server`, runtime contracts, README and SHA manifest; `.env.local` count 0.

## Output

- Directory: `deploy/digital-exhibition-test-package/`
- ZIP: `deploy/digital-exhibition-test-package.zip`
- Final ZIP SHA-256: `1BB1E8DB812F890620B615E9D7C74C492A9B1FE9D5C8DDBE034BD81C44C0C216`

## Responsive, keyboard and accessibility

No rendered UI or interaction was changed. The normal production bundle remains the source of UI behavior. Existing entry-auth and build regression checks passed; no new visual surface exists.

## Known risks and deployment boundary

- The test host must provide Node.js 20.6+ and run `npm install --omit=dev` followed by `npm start`.
- The project owner must supply real Feishu values in server-side `.env`; the package intentionally contains no secret values.
- Nginx must forward `/test2/`, `/assets/`, and `/api/v1/` to `127.0.0.1:4173` using the included example.
- External server deployment and Nginx reload were not run because they remain outside approved scope.
