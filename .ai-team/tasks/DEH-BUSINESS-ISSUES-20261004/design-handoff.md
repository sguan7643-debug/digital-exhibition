# Aggregate Design Handoff — 数智展厅业务问题清单整改

Owner: AI Product Team Lead

## Approved Inputs

- Approved scope and PRD: `prd.md`, `task.json`.
- UX source: `design/ux-handoff.md`.
- UI source: `design/ui-handoff.md`.
- Business evidence: `evidence/feishu-issues/01.PNG`–`13.PNG`.
- Visual source of truth: `digital-exhibition-SOURCE-20260916-165348.zip`, SHA-256 `F99F06B769F45075C34EF58E3C118E5ECB16D6F2CEA3455BE54C2BEE3C27C035`.

## Design Decision Summary

1. Preserve the existing application-center/onboarding/detail information architecture and the approved reference shell.
2. Autofill contact phone/email from the selected real directory user; keep fields editable, reapply only when the selected contact changes, and clear invalid dependents when department changes.
3. Make application-code required state visible and contract-driven. Do not infer it from the unique identifier or table rows.
4. Allow real submission only for T003/T005; surface unsupported types as unavailable before users complete the form.
5. Resubmit rejected requests through copy mode that creates a new auditable attempt and leaves the original record unchanged.
6. Explain permission scopes and make “全部组织可见” mutually exclusive with scoped department/user restrictions.
7. Retain cached real content during background refresh, show data update time, use local status/error treatment and never restore the global floating request bubble.
8. Render attachments and complex detail values as bounded user-facing structures, never raw objects.
9. Resolve application-card actions from real access and launchability: “立即使用”, “申请使用”, or disabled “暂不可用”.
10. Keep all new states inside the visual system and responsive cascade from the designated reference archive.

## End-to-End Interaction Contract

- Form entry loads real authenticated identity and directory data through the existing same-origin proxy.
- Type selection applies support and code policies before dependent sections and submit are enabled.
- Contact selection copies real contact fields; user edits remain valid until contact selection changes.
- Permission selection clears contradictory values and validates only currently active fields.
- Submit/upload writes are single-flight and never silently retried into duplicate attempts.
- Rejected-copy entry carries only editable business data and valid file references; session/audit identifiers remain authoritative.
- Read routes render cached real data first where available, share identical requests, refresh in the background and retain old data on failure.
- Permission-denied records, launch targets and files are not leaked into active presentation.

## Component and State Contract

- Reuse the reference white bordered surfaces, primary-blue actions, type scale, spacing rhythm, focus styles and responsive breakpoints specified in `design/ui-handoff.md`.
- Form helper/validation messages stay attached to their fields; disabled type and permission reasons remain perceivable without hover.
- Necessary helper, reason, timestamp, stale/error and recovery text uses the readable-muted token `#5b6e82`, which is at least 4.5:1 on the approved white, canvas and soft-blue surfaces. Disabled `#929dab` is restricted to the unavailable control label, not explanatory text.
- Copy-mode and stale/error notices are bounded inline surfaces; there is no floating global request/status bubble.
- File rows remain contained at every approved viewport and 200% zoom.
- Mobile top bar/drawer respect top and side safe areas; terminal/sticky actions and scrolling content use at least `max(12px, env(safe-area-inset-bottom))` bottom compensation. Portrait `390×844` and landscape `844×390` safe-area simulations must keep close controls, focus rings, last content and submit/re-submit actions visible.
- All affected surfaces implement `normal`, `loading`, `empty`, `error`, `disabled`, `permission-denied`; onboarding additionally implements `rejected`, and cached reads implement `stale`.

## Acceptance Traceability

| PRD criterion | UX source | UI source | Required verification |
| --- | --- | --- | --- |
| AC-1 contact autofill | New application flow; interaction rules | Application form/contact autofill | Directory mapping, edit preservation, phone/email validation tests |
| AC-2 code consistency | Type/code steps and content copy | Application type/code policy | Client/server contract and required-marker tests |
| AC-3 rejected resubmit | Rejected flow | Rejected-copy mode | Ownership, copy fields, original preservation, new-attempt tests |
| AC-4 refresh/cache | Discovery/detail flows | Cache/update-time states | IndexedDB, dedupe, cross-tab, stale failure tests |
| AC-5 real homepage | Real-data/content rules | Required state appearance | No-mock and aggregate integration tests |
| AC-6 detail/attachments | Detail flow | Attachment/overflow spec | Structured rendering, permission and viewport tests |
| AC-7 card actions | Discovery action rules | Card variants | Access + launch matrix tests |
| AC-8 permission scope | Form step 7 | Permission scope spec | Mutual exclusion, clearing and validation tests |
| AC-9 supported types | Type preflight | Disabled type spec | T003/T005 support and unsupported-type prevention tests |
| AC-10 accessibility/UI | Responsive/accessibility and safe-area sections | Readable-muted token, safe-area and responsive rules | Keyboard, screen reader, measured contrast, portrait/landscape safe areas and screenshot parity |
| AC-11 regression | All task flows | Visual acceptance mapping | Full automated suite and 13-row evidence matrix |

## Platform Boundary

- Web/Vue only. No uni-app target is declared.
- No database, new backend service, Feishu schema change, deployment, release or production configuration change is part of this design.

## Open Questions and Conflicts

- None blocking. The four product-policy assumptions were accepted with scope approval.
- A dedicated code-allocation API or additional type approval contracts require a successor scope unless provided before implementation starts.
