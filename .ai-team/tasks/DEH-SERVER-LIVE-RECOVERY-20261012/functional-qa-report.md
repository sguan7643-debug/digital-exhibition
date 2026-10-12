# Functional QA Report

- **Task:** `DEH-SERVER-LIVE-RECOVERY-20261012`
- **Result:** `failed`
- **Environment:** `https://test-pre-demo-seaoil.xdata.work/test2/`, authenticated test session, 2026-10-12
- **Build:** backend runtime version unavailable from current health response; frontend assets `index-B-Xjys4-.js` and `index-Bg7TF1Sb.css`
- **Evidence:** Product Owner test-environment report containing the sync IDs below; unauthenticated edge probe confirms nginx Basic authentication remains active.

## Acceptance-Criterion Checks

| Check Reference | Criterion | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AC-INPUT | COM-004 worker replays only normalized published input. | executed | Submit both published COM-004 modes and poll their task IDs. | Valid input completes. | Tasks remain running or return unusable empty results despite valid frontend input. | `read-ed8f505c-0493-4377-adca-0d12c8ecc46c`, `read-b82e2157-ba58-4203-9ebe-eced6fa3293b` | critical | failed | LIVE-STATE-02 |
| AC-PEOPLE | Formal directory excludes initialization/test identities. | executed | Read COM-004 and APP-002 after deployment. | Only formal Feishu people/departments. | APP-002 still contains U001/张三丰, U004/赵六 and D004/物资采购中心. | Product Owner runtime report | critical | failed | LIVE-STATE-02 |
| AC-HOME-AUTH | Homepage retains current-user authorization and completes inside deadline. | executed | Submit homepage and poll one syncId. | Stable terminal state within 25 seconds. | `sync-f110802c-43ec-4726-a790-5149e4a68af3` remains running beyond 25 seconds. | trace `trace-8c7c7b2e-c022-4ba5-8811-f45dff5168af` | critical | failed | LIVE-STATE-02 |
| AC-APP-COMPLETE | APP-001/APP-002 original tasks complete within 25 seconds and cache results. | executed | Poll original APP task IDs. | `completed` plus reusable cache. | Original tasks timeout/fail; a task was observed `failed` and later `running`. | `read-31955326-9961-40fd-a8bd-453e417b0a33`, `read-140e9b9d-4369-4cd6-be86-7efd30d2bc8e` | critical | failed | LIVE-STATE-02 |
| AC-CLEANUP | Targeted cleanup prevents bad namespaces from being restored. | executed | Restart and repeat APP/COM reads after cleanup. | Bad entries do not return. | Prohibited people/departments reappear, proving a live source or remaining cache can republish contamination. | Product Owner runtime report | high | failed | LIVE-STATE-02 |
| AC-PACKAGE | Backend package excludes frontend and secrets. | executed | Inspect the delivered backend archive. | Backend-only package. | Prior package inspection passed. | `engineering-handoff.md` | none | passed | none |

## Validation Checks

| Check Reference | Validation Rule | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VAL-MONOTONIC | A syncId never transitions from completed/failed back to running. | executed | Poll one APP task repeatedly. | Monotonic terminal state. | The same task returned failed and later running. | Product Owner runtime report | critical | failed | LIVE-STATE-02 |
| VAL-VERSION | Runtime identifies release, commit, PID, cache schema and cache directory. | executed | Inspect current health payload. | All fields present. | Current endpoint does not expose the backend build identity. | unauthenticated edge probe plus current implementation | high | failed | LIVE-STATE-02 |

## State Coverage

| Check Reference | State | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STATE-SUCCESS | Success | executed | Open homepage/apps/apply. | Real data appears. | Homepage/app list/person directory remain unavailable or contaminated. | Product Owner runtime report | critical | failed | LIVE-STATE-02 |
| STATE-LOADING | Loading | executed | Follow returned sync IDs. | Loading ends within 25 seconds. | Loading persists beyond deadline. | listed sync IDs | critical | failed | LIVE-STATE-02 |
| STATE-EMPTY | Empty | executed | Inspect COM-004 empty response. | Empty only when authoritative source is legitimately empty. | `count:0` is returned while the authenticated user and formal organization exist. | Product Owner runtime report | high | failed | LIVE-STATE-02 |
| STATE-ERROR | Error | executed | Continue polling after failed. | Terminal error remains terminal. | Failed later appears running. | Product Owner runtime report | critical | failed | LIVE-STATE-02 |
| STATE-DISABLED | Disabled | executed | Inspect unchanged write governance. | Existing controls retained. | No contrary evidence; prior contract regression passed. | `engineering-handoff.md` | none | passed | none |
| STATE-PERMISSION | Permission denied | executed | Probe unauthenticated public endpoint. | Authentication denial retained. | nginx returns HTTP 401. | 2026-10-12 direct edge probe | none | passed | none |

## Regression Coverage

| Check Reference | Adjacent Flow | Execution status | Steps | Expected | Actual | Evidence | Severity | Result | Defect Reference |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| REG-RESTART | Cache/task behavior after deployment restart. | executed | Restart then read affected operations. | No prohibited snapshot is restored or republished. | Prohibited APP projection data reappears. | Product Owner runtime report | critical | failed | LIVE-STATE-02 |

## Defects

| ID | Failed Check Reference | Criterion or Scope | Environment | Preconditions and Steps | Expected | Actual | Evidence | Severity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LIVE-STATE-02 | AC-INPUT, AC-PEOPLE, AC-HOME-AUTH, AC-APP-COMPLETE, AC-CLEANUP, VAL-MONOTONIC, VAL-VERSION, STATE-SUCCESS, STATE-LOADING, STATE-EMPTY, STATE-ERROR, REG-RESTART | Runtime task monotonicity, formal data projection, cache recovery and observability | Test environment, authenticated current frontend | 1. Open homepage/apps/apply. 2. Keep one syncId and poll it. 3. Restart/read again. 4. Inspect APP-002/COM-004 data. | Each task reaches one stable terminal state within 25 seconds; only formal data is cached; runtime build is identifiable. | Tasks overrun, one terminal regresses to running, COM-004 is empty/stuck, APP-002 republishes prohibited records, and runtime version is not observable. | IDs and trace above | critical |

## Unresolved Blockers

- Repair-attempt-2 candidate `DEH-SERVER-LIVE-RECOVERY-20261012-20261011194033` (`90db9985...`) has not been deployed to the test server.
- No server execution channel or authenticated 关胜 browser session is available to QA, so the required runtime audit, two restarts, three-page verification, upload and submission cannot be executed from this workspace.

## QA Boundary

This failed report routes a bounded backend repair. It does not authorize release or claim that the authenticated environment has passed.
