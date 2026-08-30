---
phase: 04-semantic-chart-exploration
plan: 04
subsystem: ui
tags: [evidence-lists, selection-sync, auto-scroll, loop-guard, a11y, copy-deck, vitest, trust-sections]

# Dependency graph
requires:
  - phase: 04-semantic-chart-exploration/plan-01
    provides: pure wheel geometry + the FactorRef selection union every row emits
  - phase: 04-semantic-chart-exploration/plan-02
    provides: evidence-vocabulary uncertainty phrasing (unavailable/provisional cards consumed as-is)
  - phase: 04-semantic-chart-exploration/plan-03
    provides: /chart/explore route shell, WheelCanvas, FactPanel, explore copy deck, repository query seams
  - phase: 03-private-local-workspace
    provides: frozen Timed + Unknown-time envelope fixtures, useWorkspaceChart/useRevisionContent hooks
provides:
  - EvidenceLists ({ envelope, selection, onSelect, onRowLayout }) — five pressable/full-depth evidence sections emitting the wheel's FactorRef union
  - scroll-target.ts — pure scrollTargetFor + rowKeyFor + RowTopsRegistry types + createScrollLoopGuard (Pitfall 9 contract) + the programmaticScrollTo module-boundary test seam
  - explore/copy.ts deck extensions — HOUSES/ASPECTS/LOTS/SECT headings, house/aspect/lot/sect row sentence templates, orb visual/spoken phrases
  - the extended explore surface — final D-02/D-13 order (wheel → panel → placements → houses → aspects → lots → sect → assumptions → unavailable) with two-way selection and wheel-origin-only loop-guarded auto-scroll
affects: [04-05, 04-06, 04-07, phase-06-grounded-interpretation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scroll-target seam law: all auto-scroll computation lives in a pure zero-RN module; the surface only measures rows (onLayout) and invokes a module-boundary programmaticScrollTo whose payload tests spy"
    - "Registry composition at scroll time: row-within-list + list-within-root + wrapper page offsets compose when a selection fires, so measurement arrival order never matters"
    - "One state-updating interaction per test FILE: the RN shim's facade swaps ScrollView identities per commit, so vitest per-file isolation — not in-file test ordering — is the reliability boundary"

key-files:
  created:
    - src/components/chart/explore/evidence-lists.tsx
    - src/components/chart/explore/scroll-target.ts
    - src/__tests__/evidence-lists.test.tsx
    - src/__tests__/explore-surface.test.tsx
    - src/__tests__/explore-surface-row-press.test.tsx
  modified:
    - src/components/chart/explore/copy.ts
    - src/app/chart/explore.tsx

key-decisions:
  - "04-04: the scroll assertion seam is scroll-target.ts's programmaticScrollTo — a module-boundary function with a structural ScrollViewLike handle (zero react-native imports); instance/prototype spying on the shim's ScrollView is impossible because the facade swaps component identities per commit (remount storm), so the payload is the contract"
  - "04-04: auto-scroll is WHEEL-origin only — a pressed row is already visible under the finger (D-10's auto-scroll clause names the wheel→list direction); row and wheel presses feed the SAME setSelection through distinct origin-marked wrappers"
  - "04-04: rows report y-within-list, lists report y-within-root, and the wrapper reports its page offset — all three compose at scroll time into the RowTopsRegistry, with buffered re-emit when a list's offset lands after its rows"
  - "04-04: AssumptionsLine mounts read-only on the explore surface (03-07 optional action) — revise flows through the saved detail, keeping exploration chrome separate per D-01"
  - "04-04: the row-press test direction lives in its own file — the shim's identity churn drops later state-updating acts within one file, so vitest per-file isolation restores reliability (documented as a test-order law in both files)"

patterns-established:
  - "Pressable evidence rows: role=listitem + accessibilityState.selected + accent border + 600 label weight (three channels, never color alone) while press targets emit the wheel's FactorRef union"
  - "Document-order assertion: DFS over the rendered root collecting testIDs + text strings, then strictly-increasing index checks — order is testable without layout coordinates"

requirements-completed: [WHEEL-04, EVID-01]

# Metrics
duration: 30 min
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 4: Synchronized Evidence Lists + Trust Sections Summary

**Five pressable evidence tables (placements/houses/aspects/lots/sect) synchronized two-ways with the wheel through one shared FactorRef selection, wheel-origin auto-scroll computed by a pure scroll-target module with a loop-guard contract, and the D-13 trust sections closing /chart/explore — 15 new tests, full suite 564 green**

## Performance

- **Duration:** 30 min
- **Started:** 2026-08-30T16:24:00Z
- **Completed:** 2026-08-30T16:53:35Z
- **Tasks:** 2 (Task 1 TDD: RED → GREEN)
- **Files modified:** 7 (5 created, 2 modified)

## Accomplishments
- EvidenceLists renders every envelope fact as structured, pressable, a11y-labeled rows — placements keep the unchanged placementA11yLabel sentence contract; houses/aspects/lots/sect get new deck sentence templates; lots + sect render at FULL envelope depth (formula, luminary, sect mates, notes verbatim) as the D-06 Technical-only sections 04-06 will hide in Simple mode
- Unknown-time honesty end to end: absent envelope keys render NO sections (not empty shells), placements + aspects still render, and the unavailable cards carry the server reasons verbatim with the provisional noon-Moon card intact
- Two-way sync (D-10): row press and wheel tap feed the SAME selection — the wheel's selection prop, the fact panel's exact sentences, and the matching row's selected state all agree; auto-scroll fires only for wheel-origin selections with the composed target (wrapper + list + row offsets, asserted end-to-end at 484)
- Loop-freedom is structural (Pitfall 9): scroll-target.ts documents the guard contract, the surface's ONLY scroll handler releases the guard and can never select, and the test proves a programmatic scroll event neither re-scrolls nor disturbs selection
- The explore surface's final D-02/D-13 order — wheel hero → fact panel → five evidence sections → assumptions (read-only) → unavailable — is pinned by a document-order walk test

## Task Commits

Each task was committed atomically:

1. **Task 1: EvidenceLists component — five sections, pressable rows, full envelope depth (TDD)** - `7121172` (test, RED) + `0baeb9b` (feat, GREEN)
2. **Task 2: Mount on explore surface + two-way sync + loop-guarded auto-scroll + trust sections** - `bf69614` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/chart/explore/evidence-lists.tsx` — the five evidence sections: pressable planet/house/aspect rows (FactorRef onSelect, three-channel selected state, layout measurement emission), full-depth lots/sect
- `src/components/chart/explore/scroll-target.ts` — pure scrollTargetFor/rowKeyFor/registry types + createScrollLoopGuard + the programmaticScrollTo module-boundary seam (zero RN imports)
- `src/components/chart/explore/copy.ts` — deck additions: HOUSES/ASPECTS/LOTS/SECT headings, house/aspect/lot/sect row sentence templates, sect labels, orb visual/spoken phrases
- `src/app/chart/explore.tsx` — extended surface: D-02/D-13 order, origin-marked selection wrappers, registry composition at scroll time, guard + onScroll release, AssumptionsLine (read-only) + UnavailableFactors mounted as-is
- `src/__tests__/evidence-lists.test.tsx` — 7 tests: exact-field pins from both fixtures, FactorRef press emissions, deck sentence pins, presence-flag law, three-channel selection, unknown-time omissions
- `src/__tests__/explore-surface.test.tsx` — 7 tests: pure scroll-target units + guard, section-order walk, wheel→row scroll (composed 484 target) + loop-freedom, unknown-time reasons verbatim
- `src/__tests__/explore-surface-row-press.test.tsx` — 1 test: the row→wheel direction + no auto-scroll for pressed rows

## Decisions Made
- The scroll assertion seam lives in scroll-target.ts, not the route: vi.mock at a module boundary intercepts the route's import (internal same-module calls bypass export mocks), and the structural ScrollViewLike handle keeps the module pure — the spied payload is the contract because the RN shim's facade swaps ScrollView identities per commit, making instance/ref spying untestable
- Registry entries compose at scroll time rather than at measurement time — the wrapper's page offset, each list's offset, and each row's offset can arrive in any order without flush-ordering bugs; rows re-emit when their list's offset lands late
- Wheel-origin selections set a one-shot scroll flag consumed by the effect; row presses share setSelection without the flag (D-10 names auto-scroll as the wheel→list direction — scrolling to a row under the user's finger would be noise)
- Selected rows bump the degree/orb text to fontWeight 600 (the body label is already 600 by the placement-list convention), giving the weight channel a distinct target per row shape

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Row-press direction isolated into its own test file**
- **Found during:** Task 2 (explore-surface suite)
- **Issue:** The RN vitest shim's facade swaps ScrollView component identities per commit, remounting the content subtree on every render; a second state-updating act within the SAME test file is silently dropped, so the plan's single explore-surface.test.tsx could not hold both interaction directions reliably
- **Fix:** Split the row-press direction into `explore-surface-row-press.test.tsx` (vitest isolates per file); both files document the one-interaction-per-file law; the plan's file list gains one test file, all planned assertions retained
- **Files modified:** src/__tests__/explore-surface.test.tsx, src/__tests__/explore-surface-row-press.test.tsx
- **Verification:** `npx vitest run src/__tests__/explore-surface*.test.tsx` → 8 passed; full suite 564 green
- **Committed in:** bf69614

**2. [Rule 3 - Blocking] Scroll spy moved to a module-boundary seam**
- **Found during:** Task 2 (spied scroll seam)
- **Issue:** Instance-level spying on the shim's ScrollView (prototype accessor or fiber walk) either destabilized rendering (133-instance remount storm) or pointed at a stale instance after the identity churn; a route-module export mock was bypassed by internal calls
- **Fix:** `programmaticScrollTo(ref, y)` lives in scroll-target.ts (structural ScrollViewLike handle — the module keeps ZERO react-native imports) and the test mocks that module with importOriginal spread, asserting the exact `{ref, target}` payload
- **Files modified:** src/components/chart/explore/scroll-target.ts, src/app/chart/explore.tsx, src/__tests__/explore-surface.test.tsx
- **Verification:** scroll spy asserted with the composed 484 target; loop-freedom asserted (no second call after the scroll event)
- **Committed in:** bf69614

**3. [Rule 1 - Bug] EvidenceLists tests: bare fireEvent.press poisoned later renders**
- **Found during:** Task 1 (GREEN iteration)
- **Issue:** fireEvent.press on Pressable rows left pending pressability state that corrupted subsequent renders in the same file (the 03-05 documented behavior)
- **Fix:** The press test uses `userEvent.press` (the repo's plain-component law; fireEvent.press remains the query-mounted-screen law used in Task 2's route tests)
- **Files modified:** src/__tests__/evidence-lists.test.tsx
- **Verification:** 7/7 evidence-lists tests green in one run
- **Committed in:** 0baeb9b

---

**Total deviations:** 3 auto-fixed (2 blocking test-infrastructure seams, 1 press-mechanics correction)
**Impact on plan:** All three preserve the plan's asserted behaviors exactly — the splits/seams respond to the RN shim's documented facade behavior. No scope creep; scroll-target.ts stays pure per the acceptance criteria.

## Issues Encountered
- The RN shim's ScrollView identity churn per commit was discovered and characterized empirically (instance fiber walking, prototype accessors, and CJS-namespace mock spreads each failed differently); the resolution — a module-boundary invocation seam + per-file interaction isolation — is documented as a test-order law in both new test files so 04-05/04-06/04-07 inherit the knowledge
- tsc caught two type-level details during Task 1 GREEN: LayoutChangeEvent imports from react-native (not react), and `listitem` being an ARIA `role` (placement-list precedent), not an `accessibilityRole` — normal TDD iteration

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — every surface renders real envelope facts through the decks. Simple-mode hiding of lots/sect/orb/applying (D-06) is 04-06's assignment, not a stub here; this plan deliberately renders the Technical-only sections at full depth.

## Threat Surface
No new threat surface beyond the plan's model: T-04-08 mitigated — EvidenceLists renders emitted fields only (rows pin fixture values verbatim; the only client math is layout-position offsets, never astrological facts), T-04-09 mitigated — the loop-guard contract is documented in scroll-target.ts, wired through the surface's only scroll handler, and pinned by the loop-freedom test (programmatic scroll events never re-trigger selection or scrolling).

## Next Phase Readiness
- EvidenceLists/scroll-target/explore-surface order are the seams 04-05 (zoom never touches the lists), 04-06 (Simple mode hides lots/sect/orb/applying from the SAME data path; the a11y overlay joins the lists' FactorRef vocabulary), and 04-07 (the lists are the canonical non-visual path the parity tests lean on; web evidence renders them on /chart/result) consume
- Full suite: 51 files / 564 tests green; `tsc --noEmit` exit 0 (no new routes — no typed-routes regen needed)

## Self-Check: PASSED

- Files: evidence-lists.tsx / scroll-target.ts / explore-surface.test.tsx / explore-surface-row-press.test.tsx / evidence-lists.test.tsx all exist on disk; copy.ts + explore.tsx modified
- Commits 7121172, 0baeb9b, bf69614 present on gsd/phase-04-semantic-chart-exploration
- `npx vitest run src/__tests__/evidence-lists.test.tsx src/__tests__/explore-surface.test.tsx src/__tests__/explore-surface-row-press.test.tsx` → 15 passed; `npm test` → 51 files / 564 tests green; `npx tsc --noEmit` → exit 0
- Acceptance greps: evidence-lists.tsx contains `accessibilityState={{ selected` + imports placementA11yLabel/splitDegreeMinutes (488 lines ≥ 100 min); scroll-target.ts contains scrollTargetFor with zero react-native imports; explore.tsx renders AssumptionsLine + UnavailableFactors + EvidenceLists in the pinned D-02/D-13 order

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
