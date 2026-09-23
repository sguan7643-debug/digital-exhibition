# Task Brief

## Goal
Produce a complete test deployment package instead of a frontend-only `dist` archive.

## User
The project owner who uploads and starts Digital Exhibition in the test environment.

## Mode
Existing Vue project.

## Platforms
Web only.

## Scope
- Standalone Node server for static files and the existing Feishu proxy middleware.
- Non-secret `serverConfig`, secret environment template, package and start commands.
- Nginx forwarding example and automated package verification.

## Out of Scope
- External deployment, production release, real secrets, and changes to Feishu business behavior.

## Success Metric
One generated package can start on a Node-capable test host, serve `/test2`, route `/api/v1`, and exclude secrets.

## Deadline
2026-09-23.

## Risk
High because an incorrect package could expose credentials or leave API routes unserved. Web engineering owns mitigation through secret scanning and route tests.

## Dependencies
- Node.js 20 or later on the test host.
- Test-host environment variables supplied outside the public directory.
- Nginx access if the public domain must forward `/api/v1` to the Node process.
