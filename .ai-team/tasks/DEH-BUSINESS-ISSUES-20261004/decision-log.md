# Decision Log

## 2026-10-04 — Intake

- User supplied the Feishu “测试问题登记” sheet and requested remediation.
- User confirmed the visual standard remains `digital-exhibition-SOURCE-20260916-165348`.
- This is a successor scope because it adds business-flow changes beyond `DEH-UI-PARITY-20260930`.
- Scope, design, and release approvals are not yet recorded.

## 2026-10-04 — Scope Approved

- User explicitly approved the scope with: `批准任务 DEH-BUSINESS-ISSUES-20261004 的范围`.
- Scope approval is recorded in `task.json`; the task entered `design`.
- The approval confirms the four safe defaults in the PRD:
  1. Application code remains a visibly required user-entered field only where the current real contract requires it; the unique identifier is not treated as an application code.
  2. A rejected request is resubmitted as a new auditable attempt copied from the original; the rejected record is preserved.
  3. Only T003 and T005 are available for real submission; unsupported types are identified before form completion.
  4. Application-card actions are derived from real authorization and launchability rather than a hard-coded route.
- No implementation, merge, deployment, publication, or production configuration change is authorized by this approval.

## 2026-10-04 — Design Review Ready

- UX, visual and aggregate design handoffs were completed against the approved PRD and the designated reference archive.
- The first independent review requested two corrections: readable contrast for necessary small text and mobile Web safe-area behavior.
- Both corrections were added to the UX, UI and aggregate handoffs, including measured contrast combinations and portrait/landscape safe-area acceptance rules.
- Independent re-review verdict is `approved` with no blocking findings.
- The task remains at `design_review`; implementation cannot start until the user explicitly approves the design.

## 2026-10-05 — Design Approved

- User explicitly approved the design with: `批准任务 DEH-BUSINESS-ISSUES-20261004 的设计`.
- Design approval is recorded in `task.json`; the task entered `development`.
- Implementation is limited to the approved PRD and aggregate design handoff.
- This approval does not authorize merge, deployment, publication, release, production configuration changes, or risk acceptance.

## 2026-10-06 — Release Approved

- User explicitly approved the release gate with: `批准任务 DEH-BUSINESS-ISSUES-20261004 的发布`.
- Release approval is recorded in `task.json` after the release-readiness verdict `ready`, Web checks passed, QA passed, blocking defects were zero, and rollback readiness was `ready`.
- This approval authorizes completion of the governed task only; no GitHub push, merge, deployment, publication, production configuration change, or external release action was performed.
