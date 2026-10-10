# Design Review — DEH-SERVER-CACHE-RECOVERY-20261010

## Verdict

`approved`

The independent review found no blocking product, UX, visual, platform, accessibility, security, lifecycle, or traceability divergence. This verdict communicates design readiness only; it does not approve the design, change task state, authorize implementation outside the approved boundary, or grant release approval.

## Findings

### Finding: Cache, task, and homepage lifecycle is complete and cross-source consistent

- **PRD Evidence:** `prd.md` §§1.1, 3.1–3.2, 4.2, 5 and AC-01/02/03/06/07/08/09/10 require warm/stale/last-known-good HTTP 200 behavior, one cold HTTP 202 handoff, terminal-task non-reuse, one canonical six-dimension identity, atomic five-part homepage success, and cache/snapshot commit plus same-key verification before `completed`.
- **Aggregate Design Evidence:** `design-handoff.md` §§2–7 defines one immutable normalized descriptor and stable digest for single, batch, homepage, task, memory, snapshot, invalidation, recovery, and tests; separates active single-flight entries from retained terminal records; preserves serviceable last-known-good data; and fixes the order as pagination completion → schema validation → persistent atomic write → memory publish → read-back verification → `completed`.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` §§4.1–4.6 and §5 preserves warm HTTP 200, silent last-known-good recovery, one cold loading lifecycle and one `syncId`, failure-task isolation, and all-five-sections-at-once homepage presentation without manual refresh.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` §§2 and 4 maps fresh/stale/last-known-good and completed results to the same complete success surface, maps queued/running to the existing single loading surface, and forbids partial modules, proxy placeholders, cache badges, duplicate loading, or visual distinction by cache origin.
- **Impact:** The design closes the observed failed-task reuse and completed-but-not-reusable cache gaps without introducing partial homepage success, extra browser requests, module jumping, or a new user-visible cache state.
- **Recommendation:** Implement the canonical descriptor, active-index/terminal-record split, last-known-good preservation, and commit-before-completed protocol as one shared backend path; require the designed key-parity, terminal-removal, same-key read-back, five-part atomicity, and representative-operation reread tests before routing to QA.

### Finding: Status, security, deadline, recovery, and observability contracts are decision-ready

- **PRD Evidence:** `prd.md` §§3.1–3.2 and AC-04/05/13/14/15/16 require existing authorized task queries to use HTTP 200 states, zero business replay during polling, explicit 401/403 boundaries, 404 only for missing tasks, one 25-second task budget with at most three attempts and 500ms/1000ms backoff, synchronization concurrency at most three, restart-hit readiness, resource limits, sensitive-data exclusion, and trace-backed root-cause evidence.
- **Aggregate Design Evidence:** `design-handoff.md` §§5, 8–12 and 14 gives each task one creation timestamp and hard deadline; includes queueing, authorization, pagination, retry, backoff, aggregation, commit, and verification in that budget; caps Feishu synchronization at three; shares one status responder without business replay; withholds terminal payload while transient real-time authorization is unresolved; preserves 401/403/404; restores and probes snapshots before ready; and specifies structured trace fields without secrets.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` §§4.4, 5, 10 and 11.3 requires the same `syncId`, authorized HTTP 200 `queued/running/completed/failed/expired`, no original-operation replay, exact 401/403/404 semantics, no endless loading, restart warming behavior, and honest `blocked/not executed` treatment when live identities, logs, Base/counts, or resource evidence are unavailable.
- **UI Source Handoff Evidence:** not applicable to internal retry scheduling, snapshot recovery implementation, resource enforcement, or structured server trace fields; comparison performed against `design/ui-handoff.md` §§4, 6, 10 and 11.3 confirms that queued/running, failed/expired, 401/403, warming, focus, announcement, and evidence-gate outcomes do not introduce conflicting visual behavior.
- **Impact:** Task execution failures cannot leak as endpoint HTTP 500/504, status authorization cannot weaken access control, polling cannot amplify Feishu load, and restart recovery cannot claim readiness before recovered entries are usable. The 25-second, retry, concurrency, CPU, memory, disk, and evidence gates remain measurable rather than advisory.
- **Recommendation:** Preserve the exact request-order and error boundaries in both status route families; instrument every designed timing and transition field; and make the COM-001/WB-003 deadline, slow authorization, 401/403/404, no-replay, restart-hit, resource, sensitive-data, and predecessor-trace checks mandatory implementation and live-QA evidence.

### Finding: Six-state, responsive Web, accessibility, and zero-front-end-change boundaries are aligned

- **PRD Evidence:** `prd.md` §§5–6 and AC-11/12/13/17/18 distinguish normal, loading, genuine empty, error, disabled, permission-denied, authentication-required, and operational warming; forbid first-sync/data-missing/proxy substitutes and front-end or root `dist` changes; and declare Web/Vue only with no mobile or uni-app scope.
- **Aggregate Design Evidence:** `design-handoff.md` §§1, 13–16 freezes front-end source, root `dist`, components, styles, routes, copy, assets, tokens, and build output; preserves all six required user states plus separate 401 and operational warming semantics; preserves responsive, keyboard, focus, contrast, reduced-motion, forced-color, and narrow-Web behavior; and explicitly declares mobile/uni-app not applicable.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` §§1, 3, 6–10 specifies all six required states, a single polite loading announcement, no repeated focus movement or announcement during polling/retry, genuine empty-only behavior, one terminal error, preserved disabled and permission-denied behavior, desktop/narrow-Web verification, and no inferred mobile support.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` §§1–8 and 10 retains the existing six-state visual system, desktop/compact/≤760px/≤430px/≤380px and landscape Web rules, 44px narrow-Web controls, safe areas, visible focus, keyboard order, ARIA carriers, reduced motion, forced colors, contrast verification, and explicitly excludes uni-app/native mobile while requiring zero front-end and root `dist` changes.
- **Impact:** Backend lifecycle changes remain invisible except through the already-supported state transitions; users keep one loading lifecycle and automatic completion, while responsive layout, focus, announcements, genuine empty/error distinctions, and permission-denied confidentiality remain stable across declared Web widths.
- **Recommendation:** Keep the task change list empty for front-end source and root `dist`; verify existing client compatibility with `queued` and `expired` before implementation acceptance; execute the declared desktop, compact, narrow-Web, keyboard, focus, announcement, contrast, reduced-motion, forced-color, 401/403, empty, disabled, and permission-denied checks, recording unavailable live checks as `blocked/not executed` rather than passed.

### Finding: The PRD governance snapshot is stale but explicitly reconciled and non-blocking

- **PRD Evidence:** `prd.md` F-01 and §7.1 preserve the document-generation-time statement that scope was not yet approved.
- **Aggregate Design Evidence:** `design-handoff.md` §1 uses the current governed source of truth: `task.json` records explicit scope approval on 2026-10-10 and the task is now in `design_review`; §16 does not claim design approval.
- **UX Source Handoff Evidence:** `design/ux-handoff.md` §11.1 explicitly identifies the PRD statement as a document-timing difference and defers current governance to `task.json` and the user approval.
- **UI Source Handoff Evidence:** `design/ui-handoff.md` §11.1 records the same timing difference and confirms that it does not alter visual scope.
- **Impact:** There is no behavioral or platform divergence, and the review can proceed, but readers relying on the historical PRD fact alone could misread the current gate.
- **Recommendation:** The AI Team Lead should continue using `task.json` and the governed decision record as the current approval source. Do not treat this review verdict as design approval, and do not edit the approved PRD merely to rewrite its historical generation-time fact.

## Review Boundary

This independent review edits only `reviews/design-review.md`. It does not edit or approve `prd.md`, `design-handoff.md`, `design/ux-handoff.md`, `design/ui-handoff.md`, any design artifact, `task.json`, code, tests, front-end source, or `dist`; it does not change task state or route development.
