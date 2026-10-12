# Compatibility QA Report

## Decision

Failed after repair attempt 1. Web-only back-end acceptance remains blocked by the four functional defects in `functional-qa-report.md`; mobile/uni-app is not declared.

## Web compatibility evidence

| Environment | Build | Scenario | Expected | Actual | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Chrome desktop, authenticated test environment | `20261011224534` | Homepage cold handoff and same-syncId polling | One 202 may be followed by HTTP-200 `completed.result` within 25 seconds | Same syncId terminated `failed/READ_SYNC_DEADLINE_EXCEEDED`; page remained without complete data | Failed | Browser screenshots plus trace `trace-715c5249-b6dd-4454-9fa3-bd63566db4d8` |

## Reproducible compatibility defect

- ID: `COMPAT-WEB-02`
- Platform: Web
- Steps: authenticate, open `/test2/`, observe one homepage POST and status polling.
- Expected: loading ends automatically with complete homepage data.
- Actual: the task fails after shared read-slot queueing and impossible late retries; no composite cache is published.
- Owner: Web backend engineer.
- Status: open.

## Release impact

The deployed repair-attempt-1 package is not releasable. Repair attempt 2 now has local evidence for startup/public cache reuse, bounded homepage scheduling, remaining-budget retry behavior, persistent restore and silent browser recovery without frontend changes. Compatibility remains pending until this new candidate is deployed and the same authenticated Web flow passes in the test environment.
