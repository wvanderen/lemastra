---
phase: 04-semantic-chart-exploration
plan: 05
subsystem: ui
tags: [pinch-zoom, pan, rngh, reanimated-shared-values, skia-transform, declutter-tiers, copy-deck, vitest-facades, tdd]

# Dependency graph
requires:
  - phase: 04-semantic-chart-exploration/plan-01
    provides: pure wheel geometry (inverseTransform/hitTest/MIN_ZOOM/MAX_ZOOM) + the parameterized collision module (tierForScale/minAngularDistanceForScale/TIER_THRESHOLDS) + the skia/RNGH/reanimated/worklets vitest facades
  - phase: 04-semantic-chart-exploration/plan-03
    provides: WheelCanvas/WheelGraphics with the named identity zoom seam (scale/offsetX/offsetY shared values), the tap→inverseTransform→hitTest path, the explore copy deck law, wheel-selection test seam
  - phase: 04-semantic-chart-exploration/plan-04
    provides: the one-state-updating-act-per-test-file law + the explore surface the zoomed canvas lives inside (page ScrollView context, Pitfall 6)
provides:
  - WheelCanvas zoom/pan shell — Gesture.Simultaneous(tap, pan, pinch) with savedScale/savedOffset derivation, [1–4×] scale clamp, wheel-center-in-canvas pan clamp, origin=wheel-center Group transform, taps inverse-transforming through the live view at any zoom (WHEEL-03)
  - Tiered label declutter — React state holds the TIER (committed once per threshold crossing at the settled pinch end via runOnJS(tierForScale)); WheelGraphics renders glyphs-only at base, D° at mid, D°MM′ at high through the ONE degree split
  - WHEEL_ZOOM_HINT deck string — rendered once under the canvas
  - collision.test.ts denser-packing-at-zoom cases — the vendor algorithm under tier-shrunk min distances positions previously-bumped glyphs at lower radius levels
affects: [04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tier-in-state law: gesture onUpdate callbacks write shared values only; React state transitions happen at gesture END through a runOnJS hop (labels recompute once per tierForScale threshold crossing — never per frame)"
    - "Zoom-true taps: the tap worklet forwards the live {scale, offset} shared-value numbers with the pointer; the JS side runs the same pure inverseTransform the render chain mirrors (single math source, T-04-11)"
    - "Per-file RNGH mock surfaces grow WITH the component's gesture surface (inert builders) — facade law: capture what the file drives, stub the rest"

key-files:
  created:
    - src/__tests__/wheel-zoom.test.tsx
  modified:
    - src/components/chart/explore/wheel-canvas.tsx
    - src/components/chart/explore/copy.ts
    - src/lib/chart-wheel/collision.test.ts
    - src/__tests__/wheel-selection.test.tsx
    - src/__tests__/explore-route.test.tsx

key-decisions:
  - "04-05: collision.ts needed NO change — the 04-01 parameterization (TIER_THRESHOLDS named constants + minAngularDistanceForScale) was already behavior-complete; wheel-canvas consumes tierForScale live and the new unit cases pin the denser-packing behavior against it (A4: thresholds stay named tunables for the 04-07 on-device UAT)"
  - "04-05: tier commits at the settled pinch END (runOnJS(commitTier)(scale.value)) — onUpdate bodies contain only shared-value writes, unambiguously satisfying the no-setState-in-onUpdate source law while keeping the commit worklet-safe (no cross-module workletization of tierForScale)"
  - "04-05: tiered degree labels derive from anchor.longitude % 30 through splitDegreeMinutes/formatDegreeMinutes (the ONE split, A-UI-4) — positioning math over EMITTED absolute longitudes, never a recalculated astrological fact; labels are not hit targets so hit regions stay base-geometry (tap stability, T-04-11)"
  - "04-05: WheelGraphics takes tier as an optional prop defaulting to base — the static D-03 mini preview omits it and stays glyphs-only (no renderer fork)"
  - "04-05: RNGH activation tuning = ±6px activeOffsetX/Y on the wheel pan (small movements stay taps; page scroll outside the canvas unaffected — Pitfall 6); feel verified on-device at 04-07"

patterns-established:
  - "Pattern-4 gesture shell: saved-value derivation (onUpdate reads saved + delta, onEnd writes saved) with clamps computed from geometry, composed Gesture.Simultaneous — the verified research excerpt verbatim"
  - "Tier-label layer: label detail keyed by pure-function tier selection over the live scale, rendered through the shared primitive tree, committed only at gesture boundaries"

requirements-completed: [WHEEL-03]

# Metrics
duration: 5 min
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 5: Pinch-Zoom + Pan Wheel Inspection Summary

**Gesture.Simultaneous(tap, pan, pinch) drives Reanimated shared values into the Skia Group transform (clamped 1–4×, wheel center kept on-canvas, taps inverse-transformed through the live view) with tiered declutter labels committed once per tierForScale threshold crossing — 9 new tests, full suite 573 green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-30T17:04:20Z
- **Completed:** 2026-08-30T17:08:50Z
- **Tasks:** 2 (Task 2 TDD: RED → GREEN)
- **Files modified:** 5 (1 created, 4 modified)

## Accomplishments
- WHEEL-03's gesture shell: Pan/Pinch onUpdate derive the live view from savedScale/savedOffset exactly per the doc-verified Pattern-4 excerpt; scale clamps to [MIN_ZOOM, MAX_ZOOM] (1–4×), pan clamps so the transformed wheel center stays inside the canvas square; every worklet callback carries the 'worklet' directive
- Zoom-true selection proven at the component level: a panned (+60px) + zoomed (2×) tap selects the factor under the transformed point, and the raw base point no longer selects it — the tap path provably routes through the live inverse transform (Pitfall 5, T-04-11)
- Tiered label declutter (D-11/A4): base = glyphs only, mid = D° per placement, high = D°MM′ (the finest set) — React state holds the TIER, committed at the settled pinch end only, so labels recompute exactly once per threshold crossing (never per gesture frame); within-tier scale moves recompute nothing (test-pinned)
- The zoom hint lands in the deck (WHEEL_ZOOM_HINT) and renders exactly once under the canvas; RNGH activation (±6px) keeps taps light and page scrolling working outside the canvas (Pitfall 6 — on-device feel at 04-07)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pinch/pan gesture shell — shared values, clamps, transform origin, zoom-true taps** - `ef63955` (feat)
2. **Task 2: Tiered label declutter at zoom + zoom hint copy (TDD)** - `ba7d701` (test, RED) + `5e5557d` (feat, GREEN)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/chart/explore/wheel-canvas.tsx` — the Pattern-4 shell (saved values, clamps, Simultaneous composition, tier state + pinch-end commit) + WheelGraphics tier prop and the tiered degree-label layer + the hint render
- `src/components/chart/explore/copy.ts` — WHEEL_ZOOM_HINT deck string
- `src/lib/chart-wheel/collision.test.ts` — denser-packing-at-zoom cases: tier-shrunk min distances position previously-bumped glyphs at lower radius levels; tier entry distances strictly decrease
- `src/__tests__/wheel-zoom.test.tsx` — 7 tests: per-tier label sets, within-tier stability, deck-exact hint pin, panned+zoomed tap inverse, and the two source-structure laws (no setState in onUpdate; tier-in-state via tierForScale)
- `src/__tests__/wheel-selection.test.tsx`, `src/__tests__/explore-route.test.tsx` — per-file RNGH mocks extended with the inert Pan/Pinch/Simultaneous surface (Rule 3)

## Decisions Made
- collision.ts stayed unchanged: the 04-01 parameterization was already behavior-complete — thresholds remain named A4 tunables consumed live (no per-call-site hardcoding)
- Tier commits at pinch END rather than inside onUpdate: keeps onUpdate bodies pure shared-value writes (the source-testable D-11 law) and avoids cross-module workletization of tierForScale inside a worklet
- Degree labels derive from anchor.longitude % 30 through the ONE degree split (splitDegreeMinutes/formatDegreeMinutes) — emitted-fact positioning math, never recalculated astrology; labels are not hit targets, so hit regions stay base-geometry
- Pan activation = ±6px either axis (discretion per plan; 04-07 on-device checkpoint verifies feel)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Per-file RNGH test mocks extended with the new gesture surface**
- **Found during:** Task 1 (verification run)
- **Issue:** WheelCanvas now calls Gesture.Pan()/Gesture.Pinch()/Gesture.Simultaneous at render; the per-file RNGH mocks in wheel-selection.test.tsx and explore-route.test.tsx only exposed Gesture.Tap, so both suites would crash on the missing builders
- **Fix:** Extended both mocks with inert Pan (activeOffsetX/Y + onUpdate/onEnd passthrough), Pinch, and Simultaneous builders — the plan's files list gained two test-file modifications; wheel-zoom.test.tsx captures the real handlers where driving is needed
- **Files modified:** src/__tests__/wheel-selection.test.tsx, src/__tests__/explore-route.test.tsx
- **Verification:** wheel-selection 15/15 green; full suite 573 green
- **Committed in:** ef63955 (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking test-infrastructure surface)
**Impact on plan:** Required for the plan's own "existing suites stay green" criterion. No scope creep — the mocks stay inert except where the new file deliberately captures handlers.

## Issues Encountered
- None beyond the documented mock-surface extension. TDD RED shape was exactly as intended: the four new-behavior tests failed pre-implementation (hint, mid/high label sets, tier-state source law) while Task-1 behaviors (zoomed taps, onUpdate cleanliness) passed from the start.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — the zoom/pan shell, tiered labels, and hint are fully wired. On-device gesture FEEL (activation offsets, clamp ranges, tier thresholds as A4 starting values) is deliberately deferred to the 04-07 Task 3 checkpoint (a simulator cannot validate touch feel) — that is the plan's own success criterion, not a stub.

## Threat Surface
No new threat surface beyond the plan's model: T-04-10 mitigated — gesture frames write shared values only; React state transitions happen once per tier crossing at gesture end (asserted by the source-structure tests); T-04-11 mitigated — the tap path reads the same shared values the transform uses and inverts through the single pure inverseTransform (unit-tested at zoom ≠ 1 since 04-01, component-proven here at 2× + pan).

## Next Phase Readiness
- WheelCanvas's tier/mode seam is live for 04-06 (Simple/Technical label depth joins the same tier prop path; the a11y overlay wraps the canvas at base geometry per A3) and 04-07 (on-device UAT tunes PAN_ACTIVATION_OFFSET, the clamp range, TIER_THRESHOLDS, and DEGREE_LABEL_OFFSET — all named constants)
- Full suite: 52 files / 573 tests green; `npx tsc --noEmit` exit 0 (no new routes — no typed-routes regen needed)

## Self-Check: PASSED

- Files: wheel-zoom.test.tsx created on disk; wheel-canvas.tsx / copy.ts / collision.test.ts / wheel-selection.test.tsx / explore-route.test.tsx modified
- Commits ef63955, ba7d701, 5e5557d present on gsd/phase-04-semantic-chart-exploration
- `npx vitest run src/__tests__/wheel-zoom.test.tsx src/lib/chart-wheel/collision.test.ts src/__tests__/wheel-selection.test.tsx` → 36 passed; `npm test` → 52 files / 573 tests green; `npx tsc --noEmit` → exit 0
- Acceptance greps: wheel-canvas.tsx contains useSharedValue / Gesture.Simultaneous / Gesture.Pinch / Gesture.Pan / origin on the transform Group; tap path routes through inverseTransform with live values; 5 'worklet' directives (tap, pan×2, pinch×2); no collision.ts change needed (parameterization consumed as-is)

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
