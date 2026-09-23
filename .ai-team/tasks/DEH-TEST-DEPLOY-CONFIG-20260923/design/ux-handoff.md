# UX Handoff — Test Deployment Package

Source: approved `prd.md`.

No end-user UI changes are introduced. The operator flow is: build package → copy package → create server-side `.env` → start Node process → configure Nginx forwarding → open `/test2/`. Normal, loading, empty, error, disabled and permission-denied page behavior remains owned by the existing application. Startup/configuration errors must be explicit in the server console and must not print secret values. Web is the only declared platform; uni-app is not declared.

Evidence: `server/README.md`, `README-DEPLOY.md`, current HTTP 405 screenshot described in the PRD.
