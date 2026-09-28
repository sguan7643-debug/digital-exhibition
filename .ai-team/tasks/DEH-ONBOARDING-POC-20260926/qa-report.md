# Cross-platform / Compatibility QA Report

- **Task:** `DEH-ONBOARDING-POC-20260926`
- **Role:** Independent Cross-platform / Compatibility QA
- **Fresh run:** after Web repair attempt `1`
- **Compatibility result:** `failed`
- **Unresolved blocking compatibility defects:** `1`
- **Unresolved non-blocking compatibility defects:** `1`
- **Build identifier:** Git `766b33b`, branch `task/digital-exhibition-ui-0817-dev-r3-web`; production assets `index-CTRi2Lu9.css` / `index-BbfOCpMh.js`
- **Environment:** Windows; Node `v20.14.0`; npm `10.7.0`; Microsoft Edge/Chromium via Playwright; local service `http://127.0.0.1:4173`; public application base `/test2/`; API base `/api/v1/`
- **Declared platforms:** Web only. `mobile_targets=[]`; no uni-app or native-mobile result is claimed.

## Entry Gate and Input Integrity

- `task.json` is in `qa`, scope/design approvals are present, Web platform evidence is recorded, repair attempt `1` is recorded, and mobile is not declared.
- `validate-task.ps1 -TaskFile <task.json> -EnforceLocation` returned `VALID`.
- The current independent code review verdict is `approved` with no open findings. Its two repair-edge findings are recorded as resolved.
- The fresh `functional-qa-report.md` result is `blocked` solely by missing real-environment prerequisites. It reports no implementation defect and independently confirms the original `QA-DEF-01` routing defect is closed.
- The aggregate `engineering-handoff.md` was the only engineering worker evidence consumed. It declares `/test2/` application routes, root `/api/v1/` APIs, Web-only responsive behavior, and the commands rerun below.
- Functional QA's blocked result prevents a passing final QA result even if all compatibility rows were green. This run did not reinterpret missing OAuth/Base/approval evidence as a defect.

## Fresh Aggregate Command Re-run

| Command | Exact result | Compatibility interpretation |
| --- | --- | --- |
| `npm run build` | exit `0`; Vite `6.4.1`; `1932` modules; `3.25s` | Fresh production build passed; emitted the build identifiers above. |
| `npm run test:onboarding-poc` | exit `0`; all `11` stages passed | Onboarding manifest/gates, API/security, responsive, keyboard/screen-reader contracts, `/test2/` verifier routing and status projection passed. |
| `node tools/onboarding-apply-interaction.test.mjs` | exit `0` | Apply-form interaction contract passed. |
| `npm run test:test-deployment` | exit `0` | `/test2/` assets/pages and root `/api/v1/` coexist; root redirect and traversal protection passed. |
| `npm run check` | exit `0` | Static, deterministic, semantic and asset audit passed. |
| `npm run test:ui-source-sync` | exit `0`; all `10` current entries passed | Shared shell, narrow overflow/accessibility and onboarding UI contracts passed. |
| `npm run test:integration` | exit `1` after the first `10` stages passed | Existing Favorites-page wording assertion still fails at `feishu-authenticated-page-entry.test.mjs:40` (`只可清理 TEST_ 联调收藏`). It is outside this onboarding repair and is preserved as a non-onboarding repository risk, not counted in this task's blocking defect total. |

## QA-DEF-01 Repair Closure

`QA-DEF-01` is **closed by fresh independent evidence**.

1. `node tools/onboarding-verifier-origin-http.test.mjs`, included in the 11-stage suite, passed legacy `/test2/`, explicit application/API bases, raw `?/#` rejection, one authoritative case-insensitive Origin, malicious-Origin `403`, and cross-origin configuration rejection.
2. `npm run test:test-deployment` proved `/test2/apps/...` and root `/api/v1/...` coexist in the declared deployment.
3. The fresh Edge/Chromium run captured these actual request paths: `/api/v1/auth/feishu/session`, `/api/v1/operations/COM-003`, `/api/v1/operations/COM-004`, `/api/v1/operations/COM-005`, `/api/v1/onboarding/applications`, `/api/v1/onboarding/applications/TEST_APP_QA`, and `/api/v1/onboarding/applications/TEST_APP_QA/sync`.
4. The captured misrouted-request set for `/test2/api/...` was empty.

No engineer assertion alone was used to close the defect.

## Platform Compatibility Matrix

The browser rows use contract-shaped intercepted data only to isolate Web compatibility behavior. They do not claim real Feishu business acceptance and do not replace Functional QA's required live POC.

| Environment / device | Viewport / mode | Build | Scenario | Expected platform behavior | Actual behavior | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Edge/Chromium desktop | `1440×1000` | `766b33b` / current assets | Apply, list and detail | Four-column apply grid; semantic table; horizontal timeline; visible focus; no document overflow | Apply grid had 4 columns and 25 labels; first keyboard target matched `:focus-visible`; list/attachment rendered as tables; route heading received focus; timeline was horizontal; no page errors or overflow | passed | Fresh Playwright compatibility run against `/test2/apps/onboarding/...` |
| Edge/Chromium compact desktop | `900×900` | same | Resize apply/list/detail | Two-column apply grid; list becomes labeled cards at 900px; detail remains readable | Apply grid had 2 columns; list table changed to block/card layout; caption and route-title focus remained; no page error or document overflow | passed | Fresh Playwright run |
| Edge/Chromium tablet-width Web | `760×900` | same | Single-column layout, card tables, vertical detail content | One-column form; card list/attachments; vertical timeline; mobile-Web primary actions at least 44px; visible focus | Grid/list/timeline/attachment transformation, focus, labels and overflow passed. The `飞书授权` action measured `42.390625px` high while other primary/form actions measured 44px or more | failed, non-blocking observation | Fresh Playwright run; `QA-DEF-03` |
| Edge/Chromium narrow Web | `320×800` | same | Long identifiers, icon hash, filename wrapping and narrow actions | Single-column content; all long ID/hash/file text readable within viewport; primary actions at least 44px; no horizontal overflow | Page-level width remained 320px and form/list/table transformations passed, but the icon SHA-256 `<code>` measured beyond its 130px content container and beyond the 320px viewport; the document exposed no horizontal scroll, so the tail was not reachable. `飞书授权` remained `42.390625px` high | **failed** | Fresh Playwright run and focused DOM geometry reproduction; `QA-DEF-02`, `QA-DEF-03` |
| Edge/Chromium zoom/accessibility representative | `720×500` CSS px, representative of 1440px at 200%; forced colors; reduced motion | same | Reachability and focus indication | No horizontal overflow; system-visible focus; reduced nonessential motion | No document overflow; focused target matched `:focus-visible` with solid outline; no page errors | passed | Fresh Playwright forced-colors/reduced-motion run |
| Edge/Chromium deployment/navigation | application `/test2/`, API `/api/v1/` | same | Application page and root API routing after repair | SPA routes retain `/test2/`; all API traffic remains at root `/api/v1/` and same-origin | Application pages loaded under `/test2/`; every captured API path began `/api/v1/`; zero `/test2/api/...` requests | passed | Fresh browser request capture plus deployment and verifier HTTP tests |

No Firefox, Safari, WebKit, native mobile, mini-program or app target is declared; no result is inferred for them.

## Keyboard, Focus, Semantics, Input and Navigation

- Keyboard traversal produced visible `:focus-visible` indication at every representative width. List and detail route headings received programmatic focus after load.
- The list retained a semantic caption (`当前用户的海能Work上线申请，按提交时间倒序`); source/static checks cover header scopes, labels, ordered timeline semantics, `role=status/alert`, `aria-live`, `aria-busy`, disabled reasons, forced colors and reduced motion.
- At 900px and below, the application list became labeled cards. At 760px and below, the approval timeline and attachment table became narrow-layout blocks. Document-level horizontal overflow did not occur.
- Pointer/touch-native behavior is not claimed because there is no native/mobile target. Narrow Web target-size evidence is reported explicitly, including the one undersized authorization action.

## Compatibility Defects

| ID | Platform | Environment / build | Reproduction steps | Expected | Actual | Evidence | Severity | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `QA-DEF-02` | Web | Edge/Chromium `320×800`; Git `766b33b`; current assets | 1. Open `/test2/apps/onboarding/status?applicationId=TEST_APP_QA` with a detail containing a 64-character icon SHA-256. 2. Wait for detail and automatic sync. 3. Inspect `.icon-file code`, its parent and viewport geometry. | Approved design requires long IDs, hashes and filenames to force-wrap and remain readable at 320px. | The code element extended beyond its 130px parent and viewport (`right` reproduced at `337.09375px`, and with the full labeled sample at `483.25px`); `documentElement.scrollWidth` stayed `320px`, so clipped content had no reachable horizontal-scroll fallback. | Fresh compatibility matrix plus focused DOM-geometry reproduction; `.icon-file code` / `.icon-file > div` | **high / blocking** | Web Engineer — onboarding detail responsive styles | open |
| `QA-DEF-03` | Web | Edge/Chromium `760×900` and `320×800`; same build | 1. Open `/test2/apps/onboarding/apply`. 2. Measure visible heading/form actions. | Approved mobile-Web primary actions are at least `44×44px`. | `飞书授权` measured `42.390625px` high at both narrow widths; return/form actions measured `44px` or more. | Fresh action-target geometry capture | low / non-blocking | Web Engineer — onboarding apply responsive styles | open |

Aggregate unresolved blocking-defect count is `1`; `QA-DEF-03` is not included in that count.

## Functional Evidence Gaps Still Open

Functional QA remains `blocked` by unavailable real-environment prerequisites, not by an implementation defect: authenticated Feishu browser session, matching `FEISHU_POC_BASE_FINGERPRINT`, real approver credentials, executable external restart command, structured cross-eight-day artifact, live run ledger/cleanup evidence, and the complete real upload → submit → list/detail → sync → grant → restart → cleanup flow. No remote Feishu write was attempted in this compatibility run.

Those gaps independently prevent `Result=passed`. They are not fabricated as compatibility defects and are not added to the blocking-defect count.

## QA Gate Decision

- Code review: `approved`, no open finding.
- Functional QA: `blocked` solely by missing real-environment evidence; therefore a passing governed result is prohibited.
- Original repair defect `QA-DEF-01`: independently closed.
- Fresh compatibility: one new reproducible blocking Web defect (`QA-DEF-02`) and one non-blocking target-size defect (`QA-DEF-03`).
- Governed QA result: `failed`, `blocking_defects=1`.
- Task remains in `qa`. This report does not start repair attempt `2`; the AI Team Lead must route the bounded Web repair and record the attempt before implementation. There must be fresh engineering, Functional QA and Compatibility QA evidence afterward.

## Boundary

This role replaced only this `qa-report.md` and invoked the governed QA recorder because complete defect evidence supports a failed result. It did not modify implementation, tests, approved requirements/design, engineering handoff, Functional QA report, approvals, platform-check fields or repair history. It performed no deployment, publication, GitHub push, merge, remote Feishu write or risk acceptance.
