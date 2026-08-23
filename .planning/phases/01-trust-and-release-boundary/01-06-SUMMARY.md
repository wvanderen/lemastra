---
phase: 01-trust-and-release-boundary
plan: "06"
subsystem: governance
tags: [app-store-privacy-labels, play-data-safety, privacy-disclosure, vitest, consistency-gate, gsd]

# Dependency graph
requires:
  - phase: 01-trust-and-release-boundary plan 02
    provides: provider registry (src/data/provider-registry.json + zod schema) — single comparison source
  - phase: 01-trust-and-release-boundary plan 03
    provides: swiss-ephemeris-posture.md five-section structure asserted by the structural gate
  - phase: 01-trust-and-release-boundary plan 04
    provides: data-inventory.md, retention-deletion-policy.md, privacy-policy.md
  - phase: 01-trust-and-release-boundary plan 05
    provides: secret-isolation-policy.md
provides:
  - Apple App Store Connect privacy-label worksheet (current "Data Not Collected" answer + prepared per-provider activation answers)
  - Google Play Data-safety importable CSV draft (official template, zero-collection truth)
  - governance-docs structural test gate (five posture sections + doc existence)
  - disclosures-consistency test gate (registry ↔ apple worksheet ↔ inventory parity, CSV validity, active-provider rule)
affects: [02-calculation-service, 07-grounded-interpretation, 10-store-submission, plan 01-07 CI wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Exit-code governance gates: vitest expect/throw failures as CI fail-hard semantics (quick_validate.py analog)"
    - "Disclosure drafts derived from the provider registry only; tests pin parity so activation phases cannot skip disclosure updates"

key-files:
  created:
    - docs/governance/disclosures/apple-labels.md
    - docs/governance/disclosures/play-data-safety.csv
    - src/__tests__/governance-docs.test.ts
    - src/__tests__/disclosures-consistency.test.ts
  modified: []

key-decisions:
  - "Apple worksheet normalizes registry draft mappings to official Apple terms (hosting-platform 'Other Data' -> 'Other Data Types'); only official taxonomy terms may enter store drafts"
  - "Play CSV kept minimal (official header + 3 overview rows) — it mirrors the shipping release only; prepared activation answers live in the registry playDataTypes + the apple worksheet, never the CSV"
  - "Play CSV headers transcribed from Google's actual downloadable sample template, which names the second column 'Response ID (machine readable)' — the help article's HTML table abbreviates it"
  - "Consistency gate strengthened beyond the behavior spec: official-header equality + collect/share overview answer must match registry activation state (two-sided active-provider rule)"

patterns-established:
  - "Store disclosure drafts as in-repo reviewable artifacts (markdown worksheet for Apple, template CSV for Play), derived from the registry, enforced by tests"
  - "Mutation-verified fail-hard gates: prove a structural test trips (non-zero exit) by temporarily breaking its subject"

requirements-completed: [GATE-05, GATE-01]

# Metrics
duration: 5 min
completed: 2026-08-23
status: complete
---

# Phase 01 Plan 06: Store Disclosure Drafts & Consistency Gates Summary

**Apple privacy-label worksheet + importable Play Data-safety CSV drafted from the provider registry, locked to store taxonomies, with vitest fail-hard gates (5-mutation-verified) enforcing registry ↔ disclosure ↔ inventory parity**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-23T17:19:47Z
- **Completed:** 2026-08-23T17:25:28Z
- **Tasks:** 3
- **Files modified:** 4 (all created)

## Accomplishments

- Apple worksheet records the Phase 1 answer (**Data Not Collected**, with on-device exemption and service-and-discard notes) plus prepared activation answers for all six registry providers within Apple's fixed taxonomy — later phases update the worksheet + console instead of re-deriving.
- Play Data-safety CSV follows Google's official template column set exactly (headers transcribed from the downloadable sample template) and encodes the zero-collection truth (`PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA` = FALSE; conditional practice questions blank).
- Two test gates added (10 tests): five posture sections + four governance docs' existence (T-01-14), and registry↔worksheet/inventory id parity, CSV rectangularity + official header, overview-answer↔activation-state match, and the active-provider↔CSV rule (T-01-12/T-01-13) — drift now breaks the build.
- Full suite green: **29/29 tests across 5 files**; `npx tsc --noEmit` clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Draft Apple privacy-label worksheet** - `a639245` (docs)
2. **Task 2: Draft Play Data-safety CSV** - `8c97614` (docs)
3. **Task 3: Governance structural + consistency tests** - `97e6c75` (test)

**Plan metadata:** (recorded at final docs commit)

## Files Created/Modified

- `docs/governance/disclosures/apple-labels.md` - App Store Connect label worksheet: current-release answer, per-provider prepared answers, privacy-policy URL placeholder, taxonomy rules, Play companion note
- `docs/governance/disclosures/play-data-safety.csv` - Play Console importable draft in Google's official template format, zero-collection current truth
- `src/__tests__/governance-docs.test.ts` - structural gate: posture five-section headings + governance doc existence/non-empty
- `src/__tests__/disclosures-consistency.test.ts` - consistency gate: registry↔disclosures↔inventory parity, CSV validity + official header, overview/active-provider rules

## Decisions Made

- **Registry mapping normalization:** the registry's `appleLabelMapping` for `hosting-platform` says "Other Data"; the worksheet uses Apple's official type "Other Data Types" and documents the delta in the row's Notes cell (must-have: no invented store categories — official taxonomy terms only).
- **CSV scope:** the CSV carries only the shipping-release truth; per the plan, prepared activation answers (ephemeral declarations for Phase 2, Other user-generated content for Phase 7) live in the registry `playDataTypes` + the apple worksheet per-provider table, keeping the Play artifact importable-and-accurate at all times.
- **Authoritative header source:** Google's help article's illustrative table renders the second column as "Response (machine readable)", but the actual downloadable sample template says "Response ID (machine readable)" — the real template wins (never invent headers).
- **Sentry purpose:** worksheet uses Apple purpose "Analytics" (registry: "Analytics / Diagnostics (optional)"); activation phase makes the final Analytics-vs-App-Functionality call.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical] Strengthened consistency gate with two additional assertions**
- **Found during:** Task 3 (consistency tests)
- **Issue:** The plan's acceptance criterion "Header row follows Google's official template column set" had no automated enforcement, and the specified active-provider rule was one-sided (it would not catch an active provider while the overview row still said FALSE).
- **Fix:** Added (a) exact header-row equality with Google's official template column set, and (b) the collect/share overview answer (`PSL_DATA_COLLECTION_COLLECTS_PERSONAL_DATA`) must match the registry activation state (FALSE while all planned, TRUE the moment any provider activates).
- **Files modified:** src/__tests__/disclosures-consistency.test.ts
- **Verification:** Both suites pass (29/29 full run); mutation 5 (overview flip to TRUE) trips a non-zero exit.
- **Committed in:** 97e6c75 (Task 3 commit)

### TDD Adaptation (Task 3, tdd="true")

The system-under-test pre-exists by design — Tasks 1–2 and plans 01-03/01-04/01-05 created the
governance artifacts before the tests (the plan's own sequencing). A conventional RED phase
(failing test before implementation) was therefore impossible without performative fake
assertions. Fail-hard semantics were instead proven by **mutation testing**: 5 mutations
(posture heading removal, data-inventory deletion, apple-labels id removal, CSV column
corruption, overview answer flip) each verified to produce a non-zero vitest exit, followed by
subject restoration (git checkout of specific files) and a final green run. Single `test()`
commit since the deliverable is tests only.

---

**Total deviations:** 1 auto-fixed (1 missing critical) + 1 documented TDD adaptation
**Impact on plan:** Tightens T-01-12/T-01-13 mitigation with no scope creep; both additions are direct enforcements of the plan's own acceptance criteria and must-have truths.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GATE-05 disclosure drafts complete within official taxonomies, derived from the registry, drift-protected by tests; ready for plan 01-07 (CI wiring consumes both test files) and Phase 10 console publication.
- Activation phases (2, 7, 10) have a mechanical update path: flip registry status → update worksheet rows/CSV + console → consistency tests enforce parity automatically.
- All 29 tests green; tsc clean; no stubs (the privacy-policy URL placeholder is intentional, published Phase 10).

---
*Phase: 01-trust-and-release-boundary Plan 06*
*Completed: 2026-08-23*
