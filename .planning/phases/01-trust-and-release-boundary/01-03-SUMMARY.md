---
phase: 01-trust-and-release-boundary
plan: 03
subsystem: governance
tags: [swiss-ephemeris, licensing, agpl-3.0, professional-license, pyswisseph, gate-01, compliance]

# Dependency graph
requires:
  - phase: 01-trust-and-release-boundary (research + pattern mapping)
    provides: verified SE licensing facts, secont_e.pdf contract clause, posture-doc structure analog
provides:
  - docs/governance/swiss-ephemeris-posture.md — GATE-01 five-section approved-posture record (decision: Professional License option-a)
  - Narrowed STATE.md Phase 1 licensing blocker (posture recorded; contract execution + qualified review retained as pending)
affects: [02-trustworthy-natal-chart, 01-06 governance-docs structural tests, 01-07 phase approval records]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern C (explicit recorded license posture): LemAstra records its OWN position with verbatim contract citations — astrology-skill docs used as structure-only analog, its tools/-containment rationale explicitly not adopted (T-01-06)"

key-files:
  created:
    - docs/governance/swiss-ephemeris-posture.md
  modified:
    - .planning/STATE.md

key-decisions:
  - "License path = Professional License (option-a: CHF 700 one-time, 99-year, unlimited-projects tier), human-selected 2026-08-23 — AGPL-3.0 whole-project path rejected because it forecloses closed-source distribution"
  - "pyswisseph contract-coverage boundary (O5) flagged as a qualified-review item: pyswisseph 2.10.3.2 is AGPL-3.0 (PyPI classifier) regardless of ephemeris data mode"
  - "Qualified licensing review scheduled before public/commercial beta per GATE-01; licensing conclusions remain subject to that review"

patterns-established:
  - "Governance decision records live in docs/governance/ with a source table, numbered obligation inventory, and approval record section"

requirements-completed: [GATE-01]

# Metrics
duration: 4 min
completed: 2026-08-23
status: complete
---

# Phase 1 Plan 3: Swiss Ephemeris Licensing Posture Summary

**Five-section GATE-01 licensing posture recorded for the Professional License path (option-a, human-selected 2026-08-23): verbatim server-calling-app contract clause, obligations O1–O6, and qualified review scheduled before public/commercial beta**

## Performance

- **Duration:** 4 min (this continuation session; Task 1 research gate ran in the prior session)
- **Started:** 2026-08-23T15:10:35Z
- **Completed:** 2026-08-23T15:14:35Z (approx.)
- **Tasks:** 2 (1 decision checkpoint resolved + 1 auto task)
- **Files modified:** 2

## Decision Record (Task 1 checkpoint — verbatim)

**License path = Professional License (option-a)** — Swiss Ephemeris Professional License (one-time CHF 700, 99-year, unlimited-projects tier). The human selected this path on 2026-08-23. Licensing conclusions remain subject to qualified review before public/commercial beta per GATE-01.

- Decision maker: LemAstra project owner (human)
- Decision vehicle: plan 01-03 Task 1 `checkpoint:decision`, resolved with resume signal "option-a"
- Alternative considered and rejected: option-b (AGPL-3.0 whole-project path) — no fee, but requires the whole software project under AGPL or compatible, AGPL §13 source-offer duties for network use, and forecloses closed-source commercial distribution

## Accomplishments

- Recorded LemAstra's own Swiss Ephemeris licensing/distribution posture as `docs/governance/swiss-ephemeris-posture.md` with the five required sections (Decision & Rationale, Distribution Model, Obligations Inventory, Attribution & Notices, Approval Record)
- Quoted the verbatim app-calls-server clause — "Even when the distributed app contains no calculation code itself but requests calculation from a server providing it, this is considered an app containing Swiss Ephemeris." — cited to the Professional License contract, June 2026 edition (`secont_e.pdf`), establishing that LemAstra's client→FastAPI topology is in contract scope on the contract's own definition (T-01-05 mitigation)
- Inventoried every obligation of the chosen path: O1 executed contract record (pending purchase), O2 compiled-form distribution rights, O3 SE-source modifications stay AGPL-conditioned, O4 no promotional author-name use, O5 pyswisseph coverage boundary (qualified-review item), O6 astrology-skill vendoring (MIT root + AGPL `tools/` LICENSE/NOTICE/README survive packaging; skill commit hash recorded per chart, Phase 2+)
- Narrowed the STATE.md Phase 1 licensing blocker: posture RECORDED with chosen path; contract execution and qualified approval retained as pending before public/commercial beta
- Explicitly did NOT adopt astrology-skill's `tools/`-containment rationale (T-01-06 mitigation) — structure-only analog use, stated in the document header

## Task Commits

1. **Task 1: Decide the Swiss Ephemeris license path** — no commit (checkpoint task; resolved by human selection of option-a on 2026-08-23; decision recorded in this SUMMARY per the task's verify gate)
2. **Task 2: Write the Swiss Ephemeris posture document** — `a1560ac` (docs)

**Plan metadata:** committed immediately after this file (`docs(01-03): complete Swiss Ephemeris posture plan`)

## Files Created/Modified

- `docs/governance/swiss-ephemeris-posture.md` — GATE-01 posture record: decision, distribution model, obligations inventory (O1–O6), attribution/notices pattern for the Phase 2 backend NOTICE + provenance strings, approval record
- `.planning/STATE.md` — Phase 1 licensing blocker narrowed (posture recorded, contract execution + qualified approval pending until they happen)

## Decisions Made

- Professional License (option-a) selected over AGPL-3.0 (option-b) — closed-source distribution intent; one-time CHF 700 vs whole-project AGPL conversion
- pyswisseph coverage boundary (O5) recorded as an explicit qualified-review item rather than silently assumed — pyswisseph 2.10.3.2 is AGPL-3.0 by PyPI classifier independent of ephemeris data mode
- Posture satisfies GATE-01's recording requirement now, with qualified review honestly recorded as scheduled-before-beta and product-approver countersignature deferred to plan 01-07

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] gsd-tools state handlers rejected positional args and wrote malformed STATE.md lines**
- **Found during:** Task 2 close-out (state updates)
- **Issue:** `state.record-metric` and `state.add-decision` errored on positional args ("phase, plan, and duration required" / "summary required"); retrying with flags succeeded but `add-decision` rendered a doubled tag (`[Phase ?]: [Phase 01]:`), the metric landed as a stray table row outside the By Phase table, and `record-session` left the stale `stopped_at` (01-01)
- **Fix:** Retried with flag-style args, then repaired STATE.md directly (deduped the decision tag, merged the metric into the By Phase/velocity tables, corrected stopped_at/last_activity to 01-03)
- **Files modified:** .planning/STATE.md
- **Verification:** STATE.md re-read — decisions, metrics, blockers, and session fields all coherent
- **Committed in:** plan metadata commit (docs commit)

---

**Total deviations:** 1 auto-fixed (1 blocking, tooling-only)
**Impact on plan:** None on plan deliverables — posture document and blocker narrowing executed exactly as written; deviation was GSD tooling ergonomics only.

## Issues Encountered

None beyond the tooling deviation above.

## User Setup Required

None - no external service configuration required.

Business action pending (not a setup blocker for this repo): the CHF 700 Professional License must be purchased and the countersigned contract record filed (obligation O1) before the Phase 2 container is distributed or a public service is activated.

## Next Phase Readiness

- Phase 2's calculation-container licensing terms are decided and auditable (plan success criteria met)
- Blockers carried forward (tracked in STATE.md): O1 contract execution and qualified licensing review — both required before public/commercial beta (GATE-01 trigger point); O5 pyswisseph coverage to be resolved at that review; O6 astrology-skill vendoring obligations apply when Phase 2 vendors the skill
- Wave 1 continues with 01-04 (data/provider inventory, GATE-05); 01-06's structural test targets this posture document's five sections; 01-07 finalizes the approval-record countersignature

---
*Phase: 01-trust-and-release-boundary*
*Completed: 2026-08-23*

## Self-Check: PASSED

- `docs/governance/swiss-ephemeris-posture.md` exists on disk — FOUND
- `.planning/phases/01-trust-and-release-boundary/01-03-SUMMARY.md` exists on disk — FOUND
- Task commit `a1560ac` present in git log — FOUND
- Task 1 verify gate (`grep 'option-[ab]'` on this SUMMARY) — PASS
- Task 2 plan verify gate (5 numbered sections, verbatim clause, Approval Record, Astrodienst) — PASS (all 4 grep checks)
- STATE.md blocker narrowed, ROADMAP.md plan progress 2/7, REQUIREMENTS.md GATE-01 marked complete — PASS

