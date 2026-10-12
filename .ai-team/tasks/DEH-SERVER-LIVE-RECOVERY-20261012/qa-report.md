# Platform Compatibility QA Report

## Governed Inputs

- Task remains in `qa`; Web/Vue is the only declared platform.
- Scope/design are approved; the current authenticated test-environment evidence is recorded in `functional-qa-report.md`.
- Prior engineering and code-review evidence cannot support a pass because the deployed runtime behavior contradicts it.

## Compatibility Matrix

| Platform/target | Environment/device | Size | Build | Scenario | Expected platform behavior | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web | Existing authenticated desktop browser on test environment | Desktop | backend version unavailable; frontend `index-B-Xjys4-.js` | Existing frontend polls homepage/APP/COM-004 tasks | One syncId advances monotonically and completes without reload | Tasks exceed 25 seconds, one failed state returns to running, and formal data remains unavailable/contaminated | failed | Functional QA `LIVE-STATE-02` |

## Compatibility Defects

- `LIVE-STATE-02`; Web; authenticated test environment; current deployed backend; reproduce by polling the supplied sync IDs and inspecting APP-002/COM-004; expected stable terminal tasks and formal data; actual non-monotonic state, deadline overrun and prohibited data; severity critical; owner Web/backend engineer; status open.

## Aggregate Blocking Defects

- `LIVE-STATE-02` — unresolved critical functional/Web defect.
- Aggregate unresolved blocking-defect count: `1`.

## Repair and Regression History

- Repair attempt 1 candidate did not meet authenticated runtime acceptance.
- Route repair attempt 2 to Web/backend. Required retest includes process/runtime audit, monotonic status polling, two consecutive service restarts, targeted cache cleanup, and all three authenticated pages.

## Governed Result Record

- Final governed result for the currently deployed candidate: failed; aggregate blocking defects: 1.
