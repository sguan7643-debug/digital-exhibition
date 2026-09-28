# Web Engineering Handoff — DEH-MY-APPLICATION-ENTRY-20260927

## Result

- Platform: Web / Vue
- Result: passed
- Branch: `task/digital-exhibition-ui-0817-dev-r3-web`
- Task state at verification: `development`
- Scope and design approval: present in `task.json`
- Repair scope: only the narrow-screen timeline track in `src/pages/OnboardingPage.vue`; no route, authorization, approval, data, or submission logic changed

## Exact task-related changed files

Production implementation:

1. `server/feishu-read-only-service.mjs`
   - Changes the `todos` / “我的申请” quick-entry destination to `/apps/onboarding/status`.
   - Keeps this entry enabled to match the already-working title link behavior; no other profile quick entry is changed by this task.
2. `src/pages/OnboardingApplyPage.vue`
   - Removes the rendered and keyboard-focusable “飞书授权” heading action and its unused authorization URL computation.
   - Preserves the “返回应用中心” action and existing application form/submission behavior.
3. `src/pages/OnboardingPage.vue`
   - Separates each approval stage into `.timeline-track` and `.timeline-copy` rows.
   - Draws the wide-screen connector only in the icon track and uses the existing vertical icon-column layout at `max-width: 760px`.
   - In the code-review repair, lets the narrow-screen icon track stretch to the full stage-row height so the connector reaches the next icon even when stage copy wraps.

Behavior tests:

4. `tools/my-application-entry.test.mjs`
   - Adds focused contracts for both “我的申请” entry destinations and availability behavior.
   - Adds wide/narrow timeline structure and connector geometry assertions.
   - Launches the installed Edge/Chromium engine and measures the rendered `::after` connector, icon, and text-column rectangles at a 700px viewport for both normal and wrapping copy.
5. `tools/onboarding-apply-interaction.test.mjs`
   - Replaces the previous requirement for a visible “飞书授权” action with negative assertions proving no authorization URL, link, native-navigation marker, or keyboard-focusable authorization entry remains.
   - Confirms “返回应用中心” remains present.

`src/pages/ProfilePage.vue` was inspected but is not a task implementation change: its existing title link already targets `/apps/onboarding/status`, its quick-entry card renders as one anchor when the service supplies a safe enabled path, and its existing `:focus-visible` rule remains in effect.

## Test-first evidence

- The current diff shows the authorization-button test was changed from positive assertions (“must render 飞书授权”) to negative assertions before the production files' recorded implementation write time.
- Filesystem evidence records `tools/onboarding-apply-interaction.test.mjs` being updated and `tools/my-application-entry.test.mjs` being created at `2026-09-27 10:22:28`; the three production implementation files were written at `2026-09-27 10:24:06`.
- `tools/my-application-entry.test.mjs` was refined once more at `10:24:32`, after the implementation. Therefore the evidence supports a failing-contract-first start followed by post-implementation contract tightening; it does not support claiming that every final assertion predated every implementation edit.
- No matching command chronology was available in the inspected PowerShell history, so no stronger shell-history claim is made.

### Code-review repair cycle

- Before the production repair, the new browser-layout assertion failed in the normal-copy scenario: connector bottom `73px`, next icon top `87px`, reproducing the reviewer's `14px` gap.
- The production repair changed only the narrow-screen `.timeline-track` sizing/alignment. The same browser-layout test then passed without weakening any assertion.
- The final browser evidence also forces long copy to wrap to an `80px` stage row, proving the connector length follows real content height rather than a fixed value.

## Commands and exact results

All commands below were rerun against the current working tree on 2026-09-27.

| Command | Exit | Exact result |
| --- | ---: | --- |
| `node tools/my-application-entry.test.mjs` | 0 | `my application entry and timeline contract passed` |
| `node tools/onboarding-apply-interaction.test.mjs` | 0 | `onboarding application interaction contract passed` |
| `node tools/onboarding-status-live.test.mjs` | 0 | `onboarding status page is driven by the returned real approval instance status` |
| `node tools/mounted-profile-projection.test.mjs` | 0 | `真实 ProfilePage mounted：远程投影、安全导航与权限态零 fixture 泄露通过` |
| `npm.cmd run check` | 0 | `源码静态、确定性、零外网、语义与原子资产检查通过` |
| `npm.cmd run build` | 0 | Vite transformed 1,932 modules and completed in 3.27s. Output: `dist/index.html` 0.45 kB (gzip 0.32 kB), `dist/assets/index-C4nRjjU6.css` 282.44 kB (gzip 46.52 kB), `dist/assets/index-BTsdTOvH.js` 898.08 kB (gzip 212.30 kB). |

The successful build generated the current `dist` artifacts.

Repair-cycle verification:

| Command | Exit | Exact result |
| --- | ---: | --- |
| `node tools/my-application-entry.test.mjs` before production repair | 1 | Normal scenario failed: connector bottom `73px`; next icon top `87px`; `14px` discontinuity. |
| `node tools/my-application-entry.test.mjs` after production repair | 0 | Normal: connector `55–87px`, first icon bottom `55px`, next icon top `87px`, connector right `42px` vs. copy left `65px`. Wrapped: connector `55–125px`, next icon top `125px`, `80px` stage row, connector right `42px` vs. copy left `65px`. Final line: `my application entry and timeline contract passed`. |
| `npm.cmd run check` | 0 | `源码静态、确定性、零外网、语义与原子资产检查通过` |
| `npm.cmd run build` | 0 | Vite transformed 1,932 modules and completed in 3.34s. Output: `dist/index.html` 0.45 kB (gzip 0.32 kB), `dist/assets/index-pICDnYzY.css` 282.51 kB (gzip 46.54 kB), `dist/assets/index-CioyDdoL.js` 898.08 kB (gzip 212.30 kB). |
| `git diff --check -- src/pages/OnboardingPage.vue tools/my-application-entry.test.mjs .ai-team/tasks/DEH-MY-APPLICATION-ENTRY-20260927/handoffs/web.md` | 0 | Passed; Git emitted only the existing LF-to-CRLF working-copy warning for `OnboardingPage.vue`. |

## Responsive verification

- Focused contract coverage verifies a two-column wide timeline with a dedicated 28px icon-track row and a separate text row.
- Connector geometry is asserted as `left: calc(50% + 14px)` and `width: calc(100% - 28px)`, so the line begins and ends at adjacent icon edges rather than crossing text.
- The `max-width: 760px` source rule is asserted to switch to a 28px icon column plus independent text column; its connector is asserted to be 2px wide at `left: 13px`.
- Source inspection confirms long stage text can wrap via `min-width: 0`, `white-space: normal`, and `overflow-wrap: anywhere` without entering the icon track.
- Real Edge/Chromium geometry at a 700px viewport proves the normal connector joins `55px → 87px` exactly and the wrapped connector joins `55px → 125px` exactly. In both cases the 2px connector ends at `42px`, before the text column begins at `65px`.
- No screenshot comparison or manual 200% zoom traversal was run in this repair pass; independent QA should still perform those visual checks.

## Keyboard and accessibility verification

- Both “我的申请” entry points resolve to the same semantic destination; the quick card is one `<a>` target rather than separate icon/title/arrow controls.
- Existing profile links retain a visible `3px` `:focus-visible` outline.
- The application page test proves the removed authorization action leaves no focusable link or `data-native-navigation` residue while retaining the return link.
- The approval timeline is an ordered list with `aria-label="审批时间线"`; connector and status icons are `aria-hidden`, while stage title and `<time>` remain readable text.
- The status page retains `role="status"`, `role="alert"`, `aria-busy`, descriptive labels, and a programmatically focusable page heading.
- Source inspection confirms `forced-colors: active` focus handling and `prefers-reduced-motion: reduce` behavior remain present.
- The mounted profile projection test passed, covering rendered safe navigation and permission-state behavior without fixture leakage.

## Known risks and unrun checks

- `tools/deh-req-gap-p1-profile.test.mjs` was not rerun here. Team Lead evidence reports its only failure is a stale, unrelated expectation that `ProfilePage` defaults `integrationState` to `'mock'`, while the project already defaults to `'loading'`. No task code was changed to satisfy that assertion.
- The full repository test suite and live Feishu/OAuth/Base calls were not run; they are outside this focused evidence pass.
- The working tree contains many unrelated uncommitted changes from other governed tasks. The five files listed above are the exact implementation/test files attributed to this task; no unrelated diff was rewritten.
- The approved implementation verifies the existing two-stage timeline only. Three-or-more-stage model generalization remains explicitly out of scope.
- Automated narrow-screen browser geometry now passes. Screenshot comparison, manual 200% zoom, screen-reader testing, and manual Tab/Enter traversal remain for independent QA.
