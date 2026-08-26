---
phase: 02-trustworthy-natal-chart
plan: 09
subsystem: ui
tags: [react-native, d-13-structured-view, d-10-factor-cards, calc-03-provenance, a11y, zod, rntl, degree-formatting]

# Dependency graph
requires:
  - phase: 02-08
    provides: minimal /chart/result with envelope+identity param contract, /birth?openAssumptions deep-link landing, calculateResponseSchema parse-then-trust guard
  - phase: 02-02
    provides: calculateResponseSchema zod contract (placements, provenance, unavailable/provisional factors)
  - phase: 02-03
    provides: server-side derive_unavailable_factors doctrine (output-key absence, server-verbatim reasons)
provides:
  - Full D-13 structured result screen — placement rows (D°MM′ degrees, present-only house/dignity slots, copy-deck a11y sentences), D-12 compact assumptions card + collapsed CALC-03 provenance disclosure, D-10 unavailable/provisional factor cards
  - PlacementList + exported formatDegreeMinutes/splitDegreeMinutes (pure, unit-tested incl. 60′ carry)
  - AssumptionsLine ({ provenance, confidence, onAdjust }) with the Approximate caveat
  - ProvenanceDetails ({ provenance, placeResolution }) — seven mono rows incl. composed place resolution
  - UnavailableFactors ({ unavailable, provisional }) — reason-bearing cards, nothing invented
  - chart/copy.ts — the result-screen copy deck (exact-string tested)
affects: [phase-04-chart-wheel, phase-03-persistence, phase-06-interpretation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Degree display D°MM′ from a single split (floor + rounded minutes with 60′ carry) that feeds BOTH the visual string and the spoken a11y sentence — visual and spoken facts cannot diverge (A-UI-4 + T-02-36)"
    - "Factor display-name mapping in copy.ts (server ids → copy-deck names, raw-id fallback) with reasons rendered VERBATIM from the payload — D-10 never invents values"
    - "Document-order layout assertions via toJSON text flattening (expectInOrder) — section order is test-enforced without brittle element walking"
    - "Identity param as the place-resolution carrier: zone_source travels confirm→result for the CALC-03 row (the envelope's provenance block has no zone fields by server design)"

key-files:
  created:
    - src/components/chart/placement-list.tsx
    - src/components/chart/assumptions-line.tsx
    - src/components/chart/provenance-details.tsx
    - src/components/chart/unavailable-factors.tsx
    - src/components/chart/copy.ts
    - src/__tests__/placement-list.test.tsx
    - src/__tests__/provenance-details.test.tsx
    - src/__tests__/unavailable-factors.test.tsx
    - src/__tests__/result-screen.test.tsx
  modified:
    - src/app/chart/result.tsx
    - src/app/birth/confirm.tsx
    - src/lib/api-schemas.ts
    - src/__tests__/confirm-screen.test.tsx

key-decisions:
  - "D-10 card text renders server reasons VERBATIM ('Houses — Requires a birth time'); only the factor id→display-name mapping (ascendant_mc → 'Rising sign & Midheaven') is client copy, with raw-id fallback for future server factors"
  - "Place-resolution provenance travels via the identity param (zone_source), not the envelope — the server provenance block deliberately has no zone fields; confirm.tsx pushes it, result.tsx requires it (redirect-on-missing keeps parse-then-trust strict)"
  - "The place-resolution row value composes zone source + the locked registry provider id ('google · google-geocoding-timezone') — a machine identifier row in mono, not disclosure prose (registry-driven disclosure invariant untouched)"
  - "AssumptionsLine navigation stays a callback (onAdjust); the screen wires the /birth?openAssumptions=1 deep-link — same landing the CALC_UNSUITABLE_HOUSE_SYSTEM banner uses"
  - "Placement rows omit the calculator's per-placement notes field — D-13 enumerates body/sign/degree/house/motion/dignity only; the Moon caveat renders via the server provisional_factors card, not row prose"

patterns-established:
  - "expectInOrder(view.toJSON(), [texts]) — document-order section assertions for composed screens"
  - "Chart copy deck in src/components/chart/copy.ts mirroring birth/copy.ts: exact copy-deck strings + template functions over server data, zero interpretation strings (T-02-34 by construction)"

requirements-completed: [CALC-02, CALC-03, BIRTH-05]

# Metrics
duration: 9 min
completed: 2026-08-26
status: complete
---

# Phase 02 Plan 09: Full Result Screen (D-12/D-13/D-10) Summary

**D-13 structured result screen: placement rows with D°MM′ degree formatting and per-row a11y sentences, the D-12 assumptions card plus collapsed seven-row CALC-03 provenance disclosure, and D-10 reason-bearing unavailable/provisional factor cards — strictly no wheel, no interpretation**

## Performance

- **Duration:** 9 min
- **Started:** 2026-08-26T17:49:31Z
- **Completed:** 2026-08-26T17:58:41Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 13 (9 created, 4 modified)

## Accomplishments
- PlacementList: D-13 rows rendering body, "{sign} D°MM′", "House {n}", capitalized motion, dignity only where present — one degree split (floor + rounded minutes with 60′ carry) feeding both the visual format and the spoken a11y sentence ("Sun in Gemini, 0 degrees 26 minutes, House 10, Direct motion")
- AssumptionsLine (D-12 compact): "{house_system} houses · {zodiac_mode} zodiac · {ephemeris_mode} ephemeris · {orb_policy}" with the "Adjust & recalculate" action deep-linking /birth?openAssumptions=1, plus the Approximate provisional-angles caveat
- ProvenanceDetails (D-12/CALC-03): collapsed-by-default disclosure expanding to the seven mono rows — skill revision, Swiss Ephemeris version, tzdata, schema, input revision, place resolution (zone source + provider), calculator command
- UnavailableFactors (D-10): Unknown-mode section "Not available without a birth time" with one reason-bearing card per server factor (display-name mapping, reasons verbatim) + Provisional-labeled cards (noon Moon, approximate angles/houses) — never blank rows or dashes
- Deepened /chart/result composing everything in UI-SPEC order behind the parse-then-trust guard; verified E2E against the running local API (Timed + Unknown envelopes return exactly the rendered surface; 189/189 client tests, tsc clean, 97/97 API tests)

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: placement list + assumptions card with copy module** — `c7bc480` (test/RED) + `11aee9b` (feat/GREEN)
2. **Task 2: provenance details + unavailable factors + full result screen** — `973c28f` (test/RED) + `8f4e877` (feat/GREEN)

**Plan metadata:** docs commit (below)

## TDD Gate Compliance

| Task | RED | GREEN | Status |
|------|-----|-------|--------|
| 1 | c7bc480 (suite failed on missing chart/copy module) | 11aee9b (14/14 green) | Pass |
| 2 | 973c28f (7 failing on missing components/strings) | 8f4e877 (all green, 189 total) | Pass |

## Files Created/Modified
- `src/components/chart/placement-list.tsx` - D-13 rows + exported formatDegreeMinutes/splitDegreeMinutes (pure, 60′-carry-safe)
- `src/components/chart/assumptions-line.tsx` - D-12 compact assumptions card with onAdjust action and Approximate caveat
- `src/components/chart/provenance-details.tsx` - collapsed CALC-03 disclosure, seven mono rows incl. composed place resolution
- `src/components/chart/unavailable-factors.tsx` - D-10 unavailable + provisional cards from the envelope arrays
- `src/components/chart/copy.ts` - result-screen copy deck (placements/assumptions/provenance/factor strings + templates)
- `src/app/chart/result.tsx` - full composition in UI-SPEC order; identity schema gains zone_source
- `src/app/birth/confirm.tsx` - identity push carries zone_source (place-resolution carrier)
- `src/lib/api-schemas.ts` - exported CalculateProvenance/FactorAvailability/ProvisionalFactor inferred types
- `src/__tests__/placement-list.test.tsx` - 14 tests: degree table, present-only slots, a11y sentences, assumptions card
- `src/__tests__/provenance-details.test.tsx` - 4 tests: collapsed default, seven rows, manual zone, re-collapse
- `src/__tests__/unavailable-factors.test.tsx` - 5 tests: D-10 cards, provisional cards, empty-render, a11y labels
- `src/__tests__/result-screen.test.tsx` - 8 tests: guard, Timed/Unknown order (toJSON walker), Adjust deep-link, trust boundary
- `src/__tests__/confirm-screen.test.tsx` - lockstep: pushed identity + result fixtures gain zone_source

## Decisions Made
- Server factor reasons render verbatim; only the id→display-name mapping is client copy (raw-id fallback keeps D-10 honest for future server factors)
- zone_source travels in the identity param (confirm → result) rather than extending the server provenance block — the plan forbids API changes this plan, and the resolve payload already carries the fact
- The place-resolution mono row composes the locked registry provider id for google resolution; manual resolution records the user entry (no external provider)
- Per-placement `notes` (provisional Moon prose) intentionally not rendered in rows — the structured provisional_factors card is the D-10 surface for that caveat
- Followed plan as specified otherwise

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] identity param lacked the zone source the place-resolution row needs**
- **Found during:** Task 2 (ProvenanceDetails payload design)
- **Issue:** The plan's behavior requires the "Place resolution (zone source + provider)" row, but the envelope's provenance block has no zone fields and the 02-08 identity param ({date, time, label}) didn't carry them — the row would have had no data source
- **Fix:** Extended the identity contract with zone_source ("google"|"manual", required — absent value redirects per parse-then-trust); confirm.tsx pushes draft.resolve.zone_source; the 02-08 pushed-identity assertion and result fixtures updated in lockstep
- **Files modified:** src/app/birth/confirm.tsx, src/app/chart/result.tsx, src/__tests__/confirm-screen.test.tsx
- **Verification:** result-screen guard test (identity without zone_source redirects); confirm-screen navigation test asserts the extended identity; full suite green
- **Committed in:** 8f4e877

**2. [Rule 2 - Missing Critical] api-schemas.ts lacked inferred-type exports for the provenance/factor schemas**
- **Found during:** Task 1 (component prop contracts)
- **Issue:** Every other schema in the file exports its z.infer type (file convention), but calculateProvenanceSchema/factorAvailabilitySchema/provisionalFactorSchema did not — the new components' typed props had no clean import
- **Fix:** Added the three type exports (no schema changes)
- **Files modified:** src/lib/api-schemas.ts
- **Verification:** tsc --noEmit clean; full suite green
- **Committed in:** 11aee9b

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both required for the plan's own behavior (the seven-row provenance chain) and repo convention. No scope creep; no server changes (API suite untouched and green).

## Issues Encountered
- Test-refinement during GREEN (normal TDD iteration, no component churn): scoped row queries after duplicate "Direct" text across rows; the Unknown-mode no-house-slot assertion tightened to /^House \d+$/ because the unavailable card "Houses — …" legitimately contains the word; the placement-list assumptions fixture completed to the full provenance shape for tsc
- Live-API E2E: no GOOGLE_API_KEY in this environment — the walk used the D-05 manual tz_override fallback (Europe/Lisbon, zone_source "manual"), a first-class product path that also exercised the manual place-resolution row value

## Authentication Gates
None — no auth-gated operations in this plan.

## User Setup Required
None — no external service configuration required (backend endpoints are local-dev only per D-02).

## Next Phase Readiness
- Phase 2 complete: all ten plans executed; every requirement surface (BIRTH-01..05, CALC-01..04, GATE-02) is verifiable end-to-end — entry → confirm → validated, provenance-rich result with explicit D-10 factor cards
- The birth → confirm → calculate → result happy path walks against the local API (component-tested + live-envelope verified)
- Ready for Phase 3 (persistence): the result screen is the state to save; envelope + identity params are the natural save payload
- D-13 held: no wheel, no preview graphic, no interpretation anywhere on the result screen
- No blockers

## Self-Check: PASSED

All 9 created files exist on disk; all 4 task commits (c7bc480, 11aee9b, 973c28f, 8f4e877) present in git history; plan verification re-run: 189/189 client tests green, tsc --noEmit clean, API suite 97 passed, must-have artifact greps (accessibilityLabel / Assumptions / input_revision / unavailable / calculateResponseSchema) all found.

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-26*
