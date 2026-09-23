# Design Handoff — Complete Test Deployment Package

Sources: `prd.md`, `design/ux-handoff.md`, `design/ui-handoff.md`.

The package will use one standalone Node entry to serve `dist` at configured base `/test2` and mount the existing auth, approval, file and operation middleware at root `/api/v1`. A non-secret JSON configuration controls host, port and app base. Secrets remain process environment variables supplied from an external `.env`. The packaging command builds Vue, copies only required runtime files and production dependencies, emits an Nginx example, and scans the result to ensure `.env.local` and secret values are absent. No UI changes are permitted.
