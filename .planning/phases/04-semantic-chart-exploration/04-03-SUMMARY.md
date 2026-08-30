---
phase: 04-semantic-chart-exploration
plan: 03
subsystem: ui
tags: [skia-canvas, tap-selection, fact-panel, expo-router, mini-wheel-preview, a11y, vitest-facades]

# Dependency graph
requires:
  - phase: 04-semantic-chart-exploration/plan-01
    provides: pure wheel geometry (buildWheelGeometry/hitTest/inverseTransform/FactorRef), glyph + aspect-style vocabularies, skia/RNGH test facades, GestureHandlerRootView
  - phase: 04-semantic-chart-exploration/plan-02
    provides: evidence-vocabulary uncertainty phrasing (provisionalMarkerA11yPhrase) + PROVISIONAL_MARKER token consumed by panel and canvas
  - phase: 03-private-local-workspace
    provides: useWorkspaceChart/useRevisionContent query hooks, id-param route law, frozen envelope fixtures, SavePrompt (PRIV-01)
provides:
  - /chart/explore route — id/revision params, repository-only data, saved.tsx-mirrored state screens, native wheel-hero + fact-panel composition, D-04 web capability card
  - WheelCanvas ({ geometry, selection, onSelect, size }) — first Skia surface, tap selection via inverseTransform→hitTest, accent-outline highlight, per-family chord styling, D-16 dashed provisional outlines, named identity zoom seam for 04-05
  - WheelGraphics — the shared presentational primitive tree (hero + static mini preview render the same deterministic wheel)
  - FactPanel ({ selection, envelope }) — per-kind exact-fact sentences, live-region polite, a11y label equals the visible sentence
  - MiniWheelCard ({ envelope, onPressExplore }) — D-03 static non-interactive preview card pushing the explore route
  - explore/copy.ts deck — per-kind sentence templates, ANGLE_NAMES/ANGLE_MARKERS, EXPLORE_CARD_* strings
  - reanimated + worklets committed vitest facades (extends the 04-01 facade law)
affects: [04-04, 04-05, 04-06, 04-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tap worklet forwards only numbers via runOnJS — hitTest/inverseTransform run JS-side through the pure module (no duplicated math, worklet-safe by construction)"
    - "One primitive tree (WheelGraphics) feeds the interactive hero and the static mini preview — a preview can never fork from the wheel (D-03 law)"
    - "Facade-recording skia surface: components push {type, props} into __getRendered so tests assert deterministic primitives without rasterization"

key-files:
  created:
    - src/app/chart/explore.tsx
    - src/components/chart/explore/wheel-canvas.tsx
    - src/components/chart/explore/fact-panel.tsx
    - src/components/chart/explore/mini-wheel-card.tsx
    - src/components/chart/explore/copy.ts
    - src/__tests__/wheel-selection.test.tsx
    - src/__tests__/fact-panel.test.tsx
    - src/__tests__/explore-route.test.tsx
    - src/__tests__/mini-wheel-card.test.tsx
    - scripts/vitest/reanimated-facade/index.ts
    - scripts/vitest/worklets-facade/index.ts
  modified:
    - src/app/_layout.tsx
    - src/app/chart/result.tsx
    - src/app/chart/saved.tsx
    - src/lib/chart-wheel/geometry.ts
    - src/components/chart/evidence-vocabulary/tokens.ts (none — consumed as-is)
    - scripts/vitest/skia-facade/index.ts
    - vitest.config.ts
    - src/__tests__/result-screen.test.tsx

key-decisions:
  - "04-03: AspectChord gained aspectName (Rule 3) — the geometry module already reads the aspect name at chord construction; chords need the family for A11Y-02 pattern+weight styling (additive, goldens unaffected)"
  - "04-03: reanimated + worklets got committed facades + vitest aliases (Rule 3) — the D-03 card drags the wheel canvas into every result/saved test graph and the real entries are ESM-directory-imports + native runtimes plain Node cannot load (extends 04-01 facade law)"
  - "04-03: WheelCanvas taps forward only numbers through runOnJS from the worklet — inverseTransform + hitTest run JS-side through the pure module, so no math is duplicated and the identity zoom seam (scale/offsetX/offsetY shared values) is named and live for 04-05"
  - "04-03: dsc/ic fact-panel facts derive sign+degree at the same +180° longitudes the wheel draws them at — positioning math over EMITTED absolute longitudes, never a recalculated astrological fact"
  - "04-03: the 02-09 result-screen 'no wheel or preview' trust-boundary test was reconciled with Phase-4 D-03 — the static preview card is now intended; the test still asserts zero interpretation strings and NO interactive canvas (mini-wheel-card.test.tsx pins the non-interactive law)"

patterns-established:
  - "Static preview law: a non-interactive render of the same geometry goes through WheelGraphics with pointerEvents none — no GestureDetector, no forked renderer"
  - "Explore-intent save flow: an unsaved entry into a repository-backed route opens the existing SavePrompt and pushes only on save success (dedupe included) — the prompt confirm stays the only write trigger"
  - "Recording facade: extend the no-op component surface to pass children through + record props — nested primitives become assertable while staying renderless"

requirements-completed: [WHEEL-01, WHEEL-02]

# Metrics
duration: 24 min
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 3: Exploration Route — Wheel Hero, Tap Selection, Fact Panel Summary

**The walkable WHEEL-01/WHEEL-02 slice: /chart/explore renders the repo's first Skia wheel (tap → inverseTransform → hitTest → exact facts in an adjacent live-region panel), entered through static mini-wheel cards on /chart/result and /chart/saved — 47 new tests, full suite 549 green**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-30T15:48:50Z
- **Completed:** 2026-08-30T16:12:21Z
- **Tasks:** 3 (Tasks 1–2 TDD: RED → GREEN)
- **Files modified:** 19 (11 created, 8 modified)

## Accomplishments
- The dedicated exploration route (D-01) with id-style params only: content = `?revision=` ? useRevisionContent : useWorkspaceChart (the inactive query disabled), loading → typed OPEN_FAILED card → unknown/missing redirect home — never partial, never /birth, zero network
- Native D-02 composition: the wheel hero at top (responsive square, 720-base geometry scaled about the center) with the FactPanel adjacent below, one shared `FactorRef | null` selection feeding both (D-09/D-10); web renders the WebUnsupported capability card with zero canvas mounted (D-04 deep-link posture)
- WheelCanvas — the repo's first Skia surface: deterministic primitives from buildWheelGeometry, Tap selection proven for planet/sign/house-sector/angle-marker at golden points plus responsive size mapping (size 360 = half base), accent outline highlight per factor kind (circle/annular-sector path/chord underlay — stroke+weight, never hue-only), per-family chord pattern+weight (A11Y-02), D-16 dashed provisional outlines, zoom seam (shared values, identity) named and live for 04-05
- FactPanel: every factor kind's exact envelope facts through deck sentence templates — present-only fields (never a dash), D°MM′ via the ONE split (a11y label equals the composed visible sentence), dsc/ic derived at drawn longitudes, provisional reason via the 04-02 uncertainty phrasing, unknown-time house/angle honesty
- D-03 entry cards: saved pushes by chartId; result's unsaved path opens the existing SavePrompt under an explore intent and pushes only on save success (dedupe appended:false included; cancel stays) — tests assert ZERO repository writes before confirm (PRIV-01, T-04-07 mitigated)

## Task Commits

Each task was committed atomically:

1. **Task 1: Explore copy deck + fact panel (TDD)** - `001c6cc` (test, RED) + `c12f697` (feat, GREEN)
2. **Task 2: Wheel canvas — static Skia render + tap selection (TDD)** - `e5ba759` (test, RED) + `3a63b68` (feat, GREEN)
3. **Task 3: /chart/explore route + layout registration + mini-wheel entry cards** - `caa9446` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/app/chart/explore.tsx` — the route: id/revision params, repository queries, state screens, web branch, wheel hero + panel + shared selection
- `src/components/chart/explore/wheel-canvas.tsx` — WheelCanvas (gesture + display-scale + zoom-seam groups) and the extracted WheelGraphics primitive tree
- `src/components/chart/explore/fact-panel.tsx` — controlled pure-render exact-facts panel (live region, per-kind resolver, provisional D-16 note)
- `src/components/chart/explore/mini-wheel-card.tsx` — D-03 static preview card (pointerEvents none, no gesture)
- `src/components/chart/explore/copy.ts` — explore deck: sentence templates, ANGLE_NAMES/ANGLE_MARKERS, EXPLORE_CARD_TITLE/HELPER/SAVE_HINT, factPanelA11yLabel
- `src/app/_layout.tsx` — chart/explore Stack registration
- `src/app/chart/saved.tsx` — card above PlacementList, push by chartId
- `src/app/chart/result.tsx` — native-only card, explore intent flow through SavePrompt, save-hint caption
- `src/lib/chart-wheel/geometry.ts` — AspectChord.aspectName (Rule 3 addition)
- `scripts/vitest/skia-facade/index.ts` — recording surface + XYWHRect/arcToOval
- `scripts/vitest/reanimated-facade/index.ts`, `scripts/vitest/worklets-facade/index.ts` — new committed facades (Rule 3)
- `vitest.config.ts` — two facade aliases
- `src/__tests__/result-screen.test.tsx` — trust-boundary test reconciled with D-03
- `src/__tests__/{fact-panel,wheel-selection,explore-route,mini-wheel-card}.test.tsx` — 47 new tests

## Decisions Made
- dsc/ic panel facts derive from the asc/mc +180° longitudes (the same values geometry draws) via the zodiac coordinate partition — positioning math over emitted facts, not recalculation
- The tap worklet forwards only numbers (x, y, live view values) through runOnJS; all hit-testing math stays JS-side in the pure module — worklet-safe without polluting geometry.ts with worklet directives
- The web explore branch renders the capability card even while the repository read stays pending (web repository unavailable ⇒ never resolves) — the honest deep-link landing per the planner's param-design decision; the full web evidence experience is assigned to /chart/result's web branch in 04-07 Task 2
- Unknown-time angle/house selections resolve to null and the panel falls back to the idle hint — unsupported kinds render nothing rather than invented facts

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AspectChord gained `aspectName`**
- **Found during:** Task 2 (chord rendering)
- **Issue:** A11Y-02 requires per-family pattern+weight chord styling, but AspectChord carried only the envelope index — the canvas has no aspect name to style with (the artifact contract's props exclude the envelope)
- **Fix:** Added `aspectName: string` to AspectChord, populated from the aspect the geometry module already reads at chord construction (additive; geometry goldens assert field-level, unaffected — all 47 re-run green)
- **Files modified:** src/lib/chart-wheel/geometry.ts
- **Verification:** `npx vitest run src/lib/chart-wheel/` → 47 passed; full suite green
- **Committed in:** 3a63b68 (part of Task 2 GREEN commit)

**2. [Rule 3 - Blocking] reanimated + worklets committed vitest facades**
- **Found during:** Task 3 (first saved/result render in mini-wheel-card.test.tsx)
- **Issue:** MiniWheelCard imports WheelGraphics from wheel-canvas, whose module imports react-native-reanimated/react-native-worklets — mounting the card on /chart/result and /chart/saved drags both packages into every existing result/saved test graph, and the real entries fail plain Node ("Directory import … not supported resolving ES modules")
- **Fix:** `scripts/vitest/reanimated-facade/index.ts` (useSharedValue → plain { value } box) + `scripts/vitest/worklets-facade/index.ts` (runOnJS/scheduleOnRN → immediate call) + two vitest aliases — the exact 04-01 RNGH facade pattern; per-file vi.mocks keep precedence (wheel-selection/explore-route mocks override)
- **Files modified:** scripts/vitest/reanimated-facade/index.ts, scripts/vitest/worklets-facade/index.ts, vitest.config.ts
- **Verification:** full suite 48 files / 549 tests green (previously-existing saved/result/save-flow suites included)
- **Committed in:** caa9446 (part of Task 3 commit)

**3. [Rule 1 - Bug] 02-09 result-screen trust-boundary test reconciled with D-03**
- **Found during:** Task 3 full-suite run
- **Issue:** The Phase-2 test asserted "no wheel or preview graphic" on /chart/result — a rule that Phase-4's approved D-03 decision explicitly supersedes (the mini-wheel preview card is now the intended first-screen wheel); the plan requires existing suites to stay green, so the stale assertion had to be updated, not the feature
- **Fix:** The test now asserts zero interpretation strings and NO interactive canvas (testIDs wheel-canvas/chart-wheel absent); the static preview's non-interactive law is pinned by mini-wheel-card.test.tsx
- **Files modified:** src/__tests__/result-screen.test.tsx
- **Verification:** result-screen suite green; full suite 549 green
- **Committed in:** caa9446 (part of Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 stale-test reconciliation)
**Impact on plan:** All three were required for the plan's own success criteria (A11Y-02 styling, green existing suites, the D-03 card). No scope creep; the geometry change is additive and the facades follow the established law.

## Issues Encountered
- The skia facade's no-op components initially returned null, so nested primitives never mounted and never recorded — fixed by passing children through (still renderless; only recording changed). Normal TDD iteration, not a plan deviation.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — every surface renders real envelope facts through the deck. The zoom shared values are identity BY PLAN (04-05 wires pinch/pan); the a11y overlay (04-06) and web evidence experience (04-07 Task 2) are future plans' assignments, not stubs here.

## Threat Surface
No new threat surface beyond the plan's model: T-04-05 mitigated (id-style params consumed as repository lookup keys only; unknown id → typed redirect home — test-pinned), T-04-06 mitigated (zero logging of envelope/fact content added; telemetry guard untouched), T-04-07 mitigated (tests assert zero repository writes before the SavePrompt confirm — the prompt remains the only persistence trigger).

## Next Phase Readiness
- The explore surface's selection-state contract (`FactorRef | null` shared selection) and WheelCanvas/WheelGraphics/FactPanel/MiniWheelCard are the seams 04-04 (sync lists + auto-scroll), 04-05 (pinch/pan through the named shared-value zoom seam + declutter tiers), 04-06 (a11y overlay + mode toggle), and 04-07 (web evidence on /chart/result Task 2, on-device UAT Task 3) consume
- Typed routes regenerated (dev-server watcher confirmed chart/explore in router.d.ts); `tsc --noEmit` exit 0
- Full suite: 48 files / 549 tests green

## Self-Check: PASSED

- Files: explore.tsx / wheel-canvas.tsx / fact-panel.tsx / mini-wheel-card.tsx / copy.ts / 4 test files / 2 new facades all exist on disk
- Commits 001c6cc, c12f697, e5ba759, 3a63b68, caa9446 present on gsd/phase-04-semantic-chart-exploration
- `npx vitest run src/__tests__/fact-panel.test.tsx src/__tests__/wheel-selection.test.tsx src/__tests__/explore-route.test.tsx src/__tests__/mini-wheel-card.test.tsx` → 47 passed; `npm test` → 48 files / 549 tests green; `npx tsc --noEmit` → exit 0
- Acceptance greps: explore.tsx contains useWorkspaceChart/useRevisionContent/Platform web branch; _layout registers chart/explore; router.d.ts regenerated before the passing tsc

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
