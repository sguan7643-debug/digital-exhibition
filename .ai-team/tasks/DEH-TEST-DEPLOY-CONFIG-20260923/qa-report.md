# Cross-platform / Compatibility QA Report

## Input verification

- Governed task validated in `qa` state.
- Functional QA result: passed (`functional-qa-report.md`).
- Code review verdict: approved (`reviews/code-review.md`).
- Web platform check: passed (`handoffs/web.md`).
- Mobile/uni-app: not declared by `task.json` and `engineering-handoff.md`.

## Compatibility Matrix

| Platform | Environment/device | Viewport or device size | Build identifier | Scenario | Expected platform behavior | Actual behavior | Result | Evidence |
|---|---|---|---|---|---|---|---|---|
| Web test runtime | Windows/Node 20-compatible HTTP runtime | Server route probe; viewport independent | `deploy/digital-exhibition-test-package.zip` | Root redirect and SPA route | Root redirects and `/test2/` serves production bundle. | HTTP 302 and 200 observed. | passed | `handoffs/web.md` |
| Web test runtime | Windows/Node 20-compatible HTTP runtime | Server route probe; viewport independent | `deploy/digital-exhibition-test-package.zip` | API same-origin route | `/api/v1` reaches existing middleware. | Session endpoint returned expected middleware 401. | passed | `handoffs/web.md` |
| Web browsers | Existing Vue production bundle | Responsive behavior unchanged | Vite production build | Visual, keyboard, focus, semantic and resize behavior | No rendered UI or interaction change; existing bundle must remain buildable. | Production build and source audit passed; package layer adds no UI. | passed | `reviews/code-review.md`; `handoffs/web.md` |

## Re-run evidence

- `npm run test:test-deployment`: passed.
- `npm run check`: passed.
- `npm run build`: passed; 1956 modules transformed.
- `npm run package:test`: passed; directory and ZIP regenerated.

## Compatibility defects

None.

## Blocking defects

0

## Result

passed
