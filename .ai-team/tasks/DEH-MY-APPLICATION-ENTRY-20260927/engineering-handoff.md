# Engineering Handoff — DEH-MY-APPLICATION-ENTRY-20260927

## Outcome

- Declared platform: Web / Vue
- Engineering result: passed
- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Source handoff: `handoffs/web.md`
- Mobile / uni-app: not declared by `task.json`; no mobile implementation or compatibility claim is made.

## Implemented scope

1. The profile quick-entry card for “我的申请” now resolves to `/apps/onboarding/status`, matching the existing text entry.
2. The application-detail approval timeline separates its icon/connector track from stage copy, including a narrow-screen vertical layout.
3. The visible and keyboard-focusable “飞书授权” action is removed from the onboarding application page while existing OAuth session, callback, submission, and return-navigation behavior remain untouched.

## Attributed files

Production:

- `server/feishu-read-only-service.mjs`
- `src/pages/OnboardingApplyPage.vue`
- `src/pages/OnboardingPage.vue`

Focused contracts:

- `tools/my-application-entry.test.mjs`
- `tools/onboarding-apply-interaction.test.mjs`

`src/pages/ProfilePage.vue` was inspected but is not attributed as an implementation change for this task.

## Verification evidence

| Command | Result |
| --- | --- |
| `node tools/my-application-entry.test.mjs` | Passed — `my application entry and timeline contract passed` |
| `node tools/onboarding-apply-interaction.test.mjs` | Passed — `onboarding application interaction contract passed` |
| `node tools/onboarding-status-live.test.mjs` | Passed — real returned approval status drives the page |
| `node tools/mounted-profile-projection.test.mjs` | Passed — mounted profile safe navigation and permission projection |
| `npm.cmd run check` | Passed — static, deterministic, zero-external-network, semantic and atomic-asset checks |
| `npm.cmd run build` | Passed — 1,932 modules transformed; current `dist` generated |

Generated build artifacts include:

- `dist/index.html`
- `dist/assets/index-C4nRjjU6.css`
- `dist/assets/index-BTsdTOvH.js`

## Test-first note

The authorization-action contract was changed to negative assertions and the new focused entry/timeline contract was created before the production files' recorded implementation write time. The focused contract was tightened once after implementation, so this handoff does not claim that every final assertion predated every implementation edit.

## Accessibility and responsive evidence

- Both profile entries are semantic links to the same destination; the card remains one link target and retains the existing visible focus treatment.
- The removed authorization action leaves no focusable or native-navigation residue; the return link remains.
- The approval timeline remains an ordered list with readable stage titles and `<time>` values; visual track elements are hidden from assistive technology.
- Source contracts cover wide and `max-width: 760px` timeline geometry, wrapping, forced-colors focus behavior, and reduced-motion behavior.
- After first code review identified a 14px narrow-screen connector gap, the mobile track was changed to stretch with the stage row. A real Microsoft Edge layout test at a 700px viewport now verifies exact icon-edge continuity and confinement to the icon column for both normal copy and long wrapped copy. Measured connector/next-icon edges are 87/87px and 125/125px respectively.
- Independent QA must still perform desktop, 200% zoom, and keyboard interaction checks in a real browser.

## Known risks

- `tools/deh-req-gap-p1-profile.test.mjs` has an existing stale expectation that `ProfilePage` defaults `integrationState` to `mock`; current product code already defaults it to `loading`. This task did not alter product behavior to satisfy that unrelated assertion.
- The full repository suite, live Feishu/OAuth/Base calls, screen-reader testing, and manual browser traversal were not run in engineering verification.
- The working tree includes unrelated changes from other governed tasks. Only the five attributed files above may be considered part of this task.
- Timeline acceptance covers the current two-stage model. Generalizing to three or more stages is outside the approved scope.

## Repair cycle

- First independent code review verdict: `changes_required` because the narrow connector was fixed to a 28px track and stopped 14px before the next icon.
- Repair: the narrow `.timeline-track` now uses automatic height, a 28px minimum, and stretches with the full stage row; the connector keeps `top: 28px` and extends through the 18px stage gap.
- Added regression evidence: `tools/my-application-entry.test.mjs` executes a real Edge layout measurement for normal and wrapped stage copy, rather than relying only on CSS text matching.
- Post-repair focused test, static check, and production build all pass according to the updated Web handoff.

## Rollback readiness

- Status: ready
- Owner: AI Team Lead with Web Engineer review
- Trigger: regression in profile entry routing, onboarding form submission/session behavior, or application-detail timeline rendering.
- Procedure: apply a reviewed inverse patch limited to this task's attributed hunks in the five files above. Preserve all unrelated working-tree changes; do not use broad checkout/reset operations.
- Verification after rollback: rerun the four focused Node contracts, `npm.cmd run check`, and `npm.cmd run build`; confirm both profile entry points and the onboarding application page manually.

## Release boundary

No deployment, release, external push, merge, or production data mutation is included. Release approval remains absent.
