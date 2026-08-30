---
phase: 04-semantic-chart-exploration
plan: 01
subsystem: ui
tags: [react-native-skia, wheel-geometry, vitest-facade, golden-fixtures, gesture-handler, vendor-port]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart
    provides: calculateResponseSchema envelope contract (placements/aspects/house_cusps/ascendant/midheaven optional-key semantics per unknown-time)
  - phase: 03-private-local-workspace
    provides: frozen-natal-envelope.json golden fixture + parse-then-trust repository-edge convention
provides:
  - Pure renderer-agnostic wheel geometry (buildWheelGeometry/anchorLongitude/lonToAngle/polar/hitTest/inverseTransform + FactorRef union + z-ordered hit regions)
  - Glyph vocabularies with A1 text fallbacks + A11Y-02 aspect styles (pattern+weight, never hue-only)
  - Vendor declutter port with zoom parameterization (declutter/tierForScale/minAngularDistanceForScale)
  - @shopify/react-native-skia ~2.6.2 installed (human-approved, Expo-pinned)
  - scripts/vitest/skia-facade + gesture-handler-facade + vitest aliases (CanvasKit-free test graphs)
  - GestureHandlerRootView at the app root (all Phase-4 gestures functional)
  - src/test/fixtures/unknown-time-envelope.json (Unknown-confidence golden fixture)
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, phase-05-transits]

# Tech tracking
tech-stack:
  added: ["@shopify/react-native-skia ~2.6.2 (Expo SDK 57 pin, inExpoGo)"]
  patterns:
    - "Native-UI-package vitest facades: skia no-op component surface + RNGH passthrough, alias-level, per-file vi.mock precedence (extends 03-08 facade law)"
    - "Golden numeric fixture testing against frozen envelopes — screenshots never the sole assertion (WHEEL-01 law)"
    - "One pure geometry module consumed by canvas/preview/overlay/tests — STACK renderer split enforced"

key-files:
  created:
    - src/lib/chart-wheel/geometry.ts
    - src/lib/chart-wheel/collision.ts
    - src/lib/chart-wheel/glyphs.ts
    - src/lib/chart-wheel/geometry.test.ts
    - src/lib/chart-wheel/collision.test.ts
    - scripts/vitest/skia-facade/index.ts
    - scripts/vitest/gesture-handler-facade/index.ts
    - src/test/fixtures/unknown-time-envelope.json
  modified:
    - package.json
    - package-lock.json
    - vitest.config.ts
    - src/app/_layout.tsx

key-decisions:
  - "04-01: Skia 2.6.2 installed via npx expo install behind the human legitimacy gate (T-04-SC) — tilde-pinned ~2.6.2; npm-latest 2.11.1 would break Expo Go (Pitfall 3)"
  - "04-01: no vitest graph loads CanvasKit — @shopify/react-native-skia and react-native-gesture-handler alias to committed facades (T-04-02); the RNGH facade was a Rule 3 fix after _layout's wrapper pulled deep react-native Flow imports into the birth-form graph"
  - "04-01: wheel geometry is ONE pure module ported from vendor chart_diagram.py (anchor at 1st-house cusp → 9 o'clock, CCW longitudes, radii 330/302/252/210/130 at base 720, linear size scaling) — every Phase-4 surface consumes it"
  - "04-01: declutter port fixes the vendor's non-terminating greedy scan at MAX_LEVEL — overlap accepted at the cap, termination pinned by test"
  - "04-01: unknown-time charts emit no house/angle/lots primitives (Phase-2 D-10 honesty) and provisional bodies are flagged on their anchors (D-16 input)"

patterns-established:
  - "Facade law extension: any package whose entry pulls unparsable/native code into plain-Node workers gets an alias facade; per-file vi.mocks keep precedence"
  - "Geometry goldens: literal numeric expectations derived from frozen envelopes via zod parse (parse-then-trust inside tests)"

requirements-completed: [WHEEL-01, WHEEL-03]

# Metrics
duration: 16 min
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 1: Wheel Foundation — Skia Install + Pure Geometry Summary

**Skia 2.6.2 installed behind an approved human legitimacy gate, plus the vendored chart_diagram.py geometry ported to a pure TypeScript module with 47 golden-fixture tests (hit-testing proven at zoom ≠ 1)**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-30T15:19:56Z
- **Completed:** 2026-08-30T15:36:23Z
- **Tasks:** 3 (1 human checkpoint + 2 auto, one TDD)
- **Files modified:** 12

## Task 1 — Dependency-legitimacy gate (T-04-SC): CLEARED

Research verdict was [SUS] ("too-new" heuristic: latest publish 2026-08-23) with mitigating evidence (Expo SDK 57 official listing with `inExpoGo: true`, Shopify-maintained canonical repo, ~1.36M weekly downloads, Expo-manifest-selected version). Per house convention (03-09 precedent) the install was blocked pending human verification.

**Gate decision (recorded verbatim per plan instruction):** user **approved** the install of `@shopify/react-native-skia@2.6.2` (2026-08-30, this session) after reviewing the npm registry page (https://www.npmjs.com/package/@shopify/react-native-skia) and the Expo SDK 57 docs (https://docs.expo.dev/versions/v57.0.0/sdk/skia), with the prior agent's postinstall disclosure acknowledged: 2.6.2 declares `postinstall: node scripts/install-libs.js`, whose tarball source was read in full and confirmed to be a local file copier (prebuilt .xcframeworks/static libs from sibling npm packages into the package's own libs/ dir) — no network, no code execution, no telemetry. Binary packages `react-native-skia-apple-*/-android@147.1.0` (wcandillon) carry no lifecycle scripts of their own.

The install ran only after this approval, via `npx expo install` (Expo's bundledNativeModules.json selects 2.6.2 — verified locally before install). T-04-SC closed.

## Accomplishments
- The phase's single new native dependency installed at the Expo pin behind a recorded human approval — never npm-latest (2.11.1 breaks Expo Go)
- The authoritative wheel geometry ported from `vendor/astrology-skill/tools/chart_diagram.py` into a pure, renderer-agnostic module: anchor rotation (1st-house cusp → 9 o'clock, angle exactly π), CCW longitudes, vendor radii with linear size scaling, 12 spokes at 30°, house/angle spokes and labels, aspect chords on the r=130 circle, decluttered planet anchors
- All five FactorRef kinds hit-testable in base coordinates with z-order (planet > angle > chord > sign/house), and `inverseTransform` proves selection survives zoom 2.7 with pan offset (Pitfall 5)
- Unknown-time honesty enforced in geometry: no house lines/angle markers/lots primitives while placements + interplanetary aspects still position (Phase-2 D-10, D-16); provisional bodies flagged on anchors
- Test graphs provably CanvasKit-free: skia no-op facade + RNGH passthrough facade aliased in vitest.config.ts (full Phase 1–3 suite green: 477 tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependency-legitimacy gate (T-04-SC)** — no code commit; the gate itself was the task. Decision recorded above; verified by this SUMMARY's existence.
2. **Task 2: Expo-pinned Skia install + test facades + GestureHandlerRootView** - `85b73cd` (feat)
3. **Task 3: Pure geometry module (TDD)** - `2ced58d` (test, RED) + `a74be50` (feat, GREEN)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/lib/chart-wheel/geometry.ts` — envelope → wheel primitives: buildWheelGeometry, anchorLongitude, lonToAngle, polar, hitTest, inverseTransform, FactorRef, MIN_ZOOM/MAX_ZOOM, z-ordered hit regions
- `src/lib/chart-wheel/collision.ts` — vendor declutter port (MIN_ANGULAR_DISTANCE/RADIUS_STEP/MAX_LEVEL), tierForScale, minAngularDistanceForScale
- `src/lib/chart-wheel/glyphs.ts` — SIGN_GLYPHS/PLANET_GLYPHS vocabularies, text fallbacks (A1), ASPECT_STYLES (pattern+weight, A11Y-02)
- `src/lib/chart-wheel/geometry.test.ts` — 35 golden-fixture tests (Timed + Unknown envelopes, all factor kinds, zoom round-trip)
- `src/lib/chart-wheel/collision.test.ts` — 12 declutter/tier tests incl. the vendor-defect termination guard
- `scripts/vitest/skia-facade/index.ts` — no-op Canvas/Group/Circle/Line/Path/Text/matchFont/Skia/DashPathEffect surface
- `scripts/vitest/gesture-handler-facade/index.ts` — passthrough GestureHandlerRootView (Rule 3 fix)
- `src/test/fixtures/unknown-time-envelope.json` — schema-valid Unknown-confidence fixture (noon-reference Moon provisional)
- `vitest.config.ts` — two new resolve aliases beside the expo-device facades
- `src/app/_layout.tsx` — GestureHandlerRootView wrapping QueryProvider inside ThemeProvider (Pitfall 2)
- `package.json` / `package-lock.json` — `@shopify/react-native-skia: ~2.6.2`

## Decisions Made
- Tilde pin enforced: `npx expo install` wrote an exact `2.6.2`; adjusted to the plan-mandated `~2.6.2` and resynced the lockfile (installed version unchanged: 2.6.2)
- Lots get passive anchors on the planet ring (no declutter participation, not hit-testable this plan) — they serve the D-16/Technical-mode surfaces in later plans; FactorRef has no lot kind yet by design
- Hit precedence derived from vendor draw order: planets > angle markers > aspect chords > houses/signs (glyphs topmost)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RNGH passthrough facade + vitest alias**
- **Found during:** Task 2 (GestureHandlerRootView in `_layout.tsx`)
- **Issue:** The birth-form test renders RootLayout unmocked; adding the wrapper pulled `react-native-gesture-handler` into the vitest graph, whose entry requires deep `react-native/Libraries/...` Flow sources — `SyntaxError: Unexpected identifier 'ViewConfig'` under plain Node (full suite 1 failed file)
- **Fix:** `scripts/vitest/gesture-handler-facade/index.ts` (transparent GestureHandlerRootView passthrough) + `vitest.config.ts` alias, mirroring the 03-08 facade law; per-file vi.mocks keep precedence for 04-03+ gesture tests
- **Files modified:** scripts/vitest/gesture-handler-facade/index.ts, vitest.config.ts
- **Verification:** full suite 40 files / 430 tests green post-fix (now 477)
- **Committed in:** 85b73cd (part of Task 2 commit)

**2. [Rule 1 - Bug] Vendor declutter termination defect fixed in port**
- **Found during:** Task 3 (collision port walkthrough before writing the cap test)
- **Issue:** The vendor's `radius_level = min(radius_level + 1, max_radius_level); index = 0` restart loops forever when a glyph at MAX_LEVEL still collides with a same-level neighbor (sixth body within 12° of five others)
- **Fix:** Port accepts the overlap at MAX_LEVEL and continues the scan; the cap test (`[0..6°] → [0,1,2,3,4,4,4]`) doubles as the termination regression guard
- **Files modified:** src/lib/chart-wheel/collision.ts, src/lib/chart-wheel/collision.test.ts
- **Verification:** collision suite green; dense-invariant test passes
- **Committed in:** a74be50 (part of Task 3 GREEN commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 vendor bug)
**Impact on plan:** Both fixes essential — the RNGH facade keeps the full suite green after the planned layout change; the termination fix prevents a renderer hang the vendor still ships. No scope creep.

## Issues Encountered
- First GREEN run had 4 failures from my own first-draft sector math (bounds stored π off from atan2 space) plus two wrong golden literals in tests (Aries-spoke inner point, house-label x) — fixed implementation-side and test-side respectively; final suites 47/47 green. Normal TDD iteration, not a plan deviation.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — no placeholder surfaces; every export is consumed by tests now and by later plans by contract.

## Threat Surface
No new threat surface beyond the plan's model: T-04-SC mitigated (approved gate + Expo pin + tilde acceptance criterion), T-04-01 mitigated (`~2.6.2` pinned and asserted), T-04-02 mitigated (facade aliases; full-suite run is the evidence). The geometry module consumes only zod-parsed local data — no new input path.

## Next Phase Readiness
- `src/lib/chart-wheel/*` is the load-bearing seam for 04-02 (evidence vocabulary), 04-03 (Skia canvas), 04-04 (sync lists), 04-05 (zoom/declutter tiers), 04-06/04-07 (a11y overlay + UAT)
- Skia + RNGH + Reanimated versions all satisfy the compatibility matrix; GestureHandlerRootView in place — every gesture plan is unblocked
- Requirement traceability note: WHEEL-01/WHEEL-03 are claimed by this plan for their geometry/math halves (per plan frontmatter); the interactive-rendering halves land in 04-03/04-05

## Self-Check: PASSED

- Files: geometry.ts / collision.ts / glyphs.ts / geometry.test.ts / collision.test.ts / skia-facade / gesture-handler-facade / unknown-time fixture all exist on disk
- Commits 85b73cd, 2ced58d, a74be50 present on gsd/phase-04-semantic-chart-exploration
- `npx vitest run src/lib/chart-wheel/` → 47 passed; `npm test` → 477 passed; `npx tsc --noEmit` → exit 0
- Purity: zero react-native/@shopify imports under src/lib/chart-wheel/ (import-pattern grep)

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
