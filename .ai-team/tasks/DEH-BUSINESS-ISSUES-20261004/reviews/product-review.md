# Product Scope Review

## Verdict

`approved`

The proposal is decision-ready if the user’s scope approval explicitly accepts the four safe defaults in `prd.md` section 7. This reviewer verdict does not approve scope or authorize design/development.

## Findings

### Finding: The user problem is supported by direct business evidence

- **Evidence:** `task-brief.md` records the accessible Feishu sheet, object/sheet identifiers, snapshot revision and a 13-row issue matrix; `evidence/feishu-issues/01.PNG`–`13.PNG` preserve the submitted screenshots.
- **Impact:** The task can be verified against specific reported failures instead of relying on general impressions or a second redesign.
- **Recommendation:** Keep the 13-row matrix as the acceptance ledger and require one final status plus code/test evidence for every row.

### Finding: Application-code ownership is bounded without inventing a source

- **Evidence:** `prd.md` distinguishes the unique-identifier endpoint from application-code allocation and notes that no dedicated code generator is evidenced. Current code requires a code for T005 while the UI label does not disclose it.
- **Impact:** Generating a value from the wrong endpoint or by scanning Feishu rows would create collisions and silently change a business identifier.
- **Recommendation:** Approve the proposed interim policy: make current required behavior visible and consistent, retain user input for supported contracts, and treat a future authoritative code-allocation API as successor scope.

### Finding: Unsupported approval types have a safe preflight boundary

- **Evidence:** `src/integration/onboarding-approval.js` implements T003 and T005 only; the current application-type list includes T001–T009; screenshot `13.PNG` shows the late “真实审批未配置” failure.
- **Impact:** Allowing an unsupported type through a long required form wastes user effort, while guessing an endpoint could create unauthorized or untracked writes.
- **Recommendation:** Approve the proposed behavior: T003/T005 remain selectable, other types are shown as unavailable with a reason before submission, and new approval contracts require new authoritative evidence.

### Finding: Rejected resubmission preserves audit integrity

- **Evidence:** `prd.md` proposes creating a new attempt from a rejected record; current status flow has no edit action and screenshot `03.PNG` confirms the user gap.
- **Impact:** Updating the original rejected record could erase the historical decision and make approval/audit records inconsistent.
- **Recommendation:** Approve copy-to-new-attempt behavior with current-user ownership checks and preserve the original record unchanged.

### Finding: Authorization and privacy controls are explicit

- **Evidence:** Acceptance criteria require current-user ownership for resubmission, real directory data for contact autofill, permission-based card actions, same-origin submission contracts, and no raw authorization identifiers in display text.
- **Impact:** Contact data, application details, launch links, and historical applications can contain sensitive organizational information.
- **Recommendation:** Preserve existing session/origin/permission gates, do not persist contact data outside current form/authoritative records, and include negative tests for unauthorized resubmission and launch actions.

### Finding: Visual consistency is a regression requirement, not a new design expansion

- **Evidence:** `task.json`, `task-brief.md`, and `prd.md` pin the reference archive and hash; the predecessor UI task has passed QA and release-readiness review.
- **Impact:** Business fixes can otherwise reintroduce the visual differences already corrected or copy old mock behavior with the reference styles.
- **Recommendation:** Limit UI changes to issue-resolution surfaces and re-run the predecessor parity suite on affected routes and viewports.

### Finding: Dependencies and release boundaries are visible

- **Evidence:** The task packet identifies `DEH-UI-PARITY-20260930` as an un-released predecessor and excludes merge, deployment, publication, schema changes, data deletion and production changes.
- **Impact:** Mixing an unapproved release with new production actions would obscure rollback and approval ownership.
- **Recommendation:** Keep this task as a successor scope, preserve the current worktree, and require its own scope, design and release decisions before any release action.

## Review Boundary

This artifact is an independent review. It does not edit `prd.md`, record approval, alter `task.json`, change task state, modify application code, merge, deploy, publish, or release.

