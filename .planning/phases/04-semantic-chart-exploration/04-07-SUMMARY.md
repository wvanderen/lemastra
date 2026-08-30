---
phase: 04-semantic-chart-exploration
plan: 07
subsystem: ui
tags: [accessibility, screen-reader, a11y-overlay, skia, web-degradation, platform-gating, vitest, tdd, on-device-uat, glyph-fallback]

# Dependency graph
requires:
  - phase: 04-semantic-chart-exploration/plan-01
    provides: pure geometry module (hitRegions + FactorRef) the overlay positions from; glyphs.ts vocabulary
  - phase: 04-semantic-chart-exploration/plan-03
    provides: explore route + WheelCanvas tap-selection + zoom seam the overlay wraps
  - phase: 04-semantic-chart-exploration/plan-04
    provides: EvidenceLists/FactPanel/scroll-target FactorRef selection space the parity suite asserts against
  - phase: 04-semantic-chart-exploration/plan-06
    provides: useExploreMode + ModeToggle + mode prop contracts the web branch mounts unchanged
provides:
  - WheelA11yOverlay ({ regions, selection, onSelect, sentences }) — invisible Pressable per geometry hit region, base-coordinate positioning per A3
  - Canvas-hiding wrapper law (importantForAccessibility="no-hide-descendants" + accessibilityElementsHidden) around the Skia canvas
  - The D-04 web evidence experience on /chart/result — ModeToggle + FactPanel + EvidenceLists from the in-memory envelope, zero canvas
  - Metro .web.tsx platform stubs (wheel-canvas.web.tsx, mini-wheel-card.web.tsx) keeping CanvasKit out of the web bundle — the WEB-01 v2 seam
  - Android glyph-text fallback (signGlyphText/bodyGlyphText in glyphs.ts) — A1 resolved on-device
  - Parity + web conformance suites (wheel-a11y-parity, explore-web, explore-web-mode, wheel-display-transform, web-skia-isolation)
affects: [phase-05-transits, phase-06-grounded-interpretation, phase-10-release, v2-WEB-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Overlay-from-geometry law: the a11y overlay consumes the SAME hitRegions/FactorRef module the canvas hit-tests with (D-12) — one source of truth means overlay drift is structurally impossible (T-04-14)"
    - "Label-sourcing law (A-UI-4): overlay accessibilityLabels ARE the deck sentence functions the panel/list compose — zero second formatters, string-equality test-pinned (T-04-15)"
    - "Platform-gated Skia family: Expo Router eagerly evaluates route modules, so static Skia imports crash web at module-eval time — .web.tsx Metro stubs with value-export parity + a guard test are the isolation mechanism (extends to any future native-only family)"
    - "Display-scale origin law: mapping a base square onto a canvas square uses a top-LEFT Group origin; a base-center origin pins content at base-center coordinates on smaller canvases and offsets every tap by origin·(1/displayScale−1)"

key-files:
  created:
    - src/components/chart/explore/wheel-a11y-overlay.tsx
    - src/components/chart/explore/wheel-canvas.web.tsx
    - src/components/chart/explore/mini-wheel-card.web.tsx
    - src/__tests__/wheel-a11y-parity.test.tsx
    - src/__tests__/explore-web-mode.test.tsx
    - src/__tests__/wheel-display-transform.test.tsx
    - src/__tests__/web-skia-isolation.test.ts
  modified:
    - src/app/chart/explore.tsx
    - src/app/chart/result.tsx
    - src/components/chart/explore/wheel-canvas.tsx
    - src/components/chart/explore/mini-wheel-card.tsx
    - src/components/chart/explore/fact-panel.tsx
    - src/lib/chart-wheel/glyphs.ts
    - src/lib/chart-wheel/geometry.test.ts
    - src/__tests__/explore-web.test.tsx
    - src/__tests__/explore-mode.test.tsx
    - src/__tests__/explore-route.test.tsx
    - src/__tests__/explore-surface.test.tsx
    - src/__tests__/explore-surface-row-press.test.tsx
    - src/__tests__/mini-wheel-card.test.tsx

key-decisions:
  - "04-07: overlay labels are the panel sentence functions passed in — WheelA11yOverlay takes a sentences map and never composes its own strings (A-UI-4/T-04-15 made structural)"
  - "04-07: A1 resolved on-device — Android system fonts lack several sign/node/Chiron/Lilith glyphs (tofu confirmed); classical planets + AC/IC/MC/DC confirmed present and stay symbolic; the at-risk slots render pre-built text abbreviations via pure signGlyphText/bodyGlyphText (glyphs.ts stays react-native-free); bundling an OFL symbol font remains the documented follow-up option, not taken (new-dependency gate)"
  - "04-07: display-scale Group maps base→canvas about the top-LEFT (no origin) — a base-center origin pinned the wheel at (360,360) on phone canvases and shifted taps; same fix applied to the mini-wheel card"
  - "04-07: the Skia wheel family is platform-gated via Metro .web.tsx stubs because Expo Router eagerly evaluates route modules — static imports crashed web with 'TypefaceFontProvider' before any render; expo export --platform web verified zero CanvasKit traces"
  - "04-07: web /chart/result supersedes the plain PlacementList with EvidenceLists' placements section (no duplicate placements table); AssumptionsLine/ProvenanceDetails/UnavailableFactors + SavePrompt untouched; MiniWheelCard native-only"

patterns-established:
  - "Checkpoint fix-back loop: on-device verification failures came back as RED→GREEN commit pairs with regression tests (display-transform, glyph fallback, web isolation) before re-verification"
  - "web-skia-isolation guard: stub presence, skia-free content, VALUE-export parity, and no direct screen imports are pinned by test so the platform gate cannot silently rot"

requirements-completed: [WHEEL-05, EVID-02, A11Y-01, A11Y-02, A11Y-03]

# Metrics
duration: 2h 50m (wall-clock incl. two on-device checkpoint waits; ~1h 45m active)
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 7: Accessible Overlay + Web Evidence + On-Device Verification Summary

**Invisible a11y overlay over every wheel hit region with canvas hiding and label-parity proofs, the D-04 web evidence experience on /chart/result with CanvasKit platform-gated out of the web bundle, and the A1 Android glyph assumption resolved on-device via a text-abbreviation fallback after a two-round verification loop**

## Performance

- **Duration:** ≈2h 50m wall-clock (12:37–15:30 UTC-5, including two on-device checkpoint waits; ~1h 45m active commits)
- **Started:** 2026-08-30T12:37:36-05:00 (first RED commit)
- **Completed:** 2026-08-30T15:30:00-05:00 (re-verification passed, plan closed)
- **Tasks:** 3 (Task 1 TDD, Task 2 TDD, Task 3 on-device checkpoint — two verification rounds + three fix-backs)
- **Files modified:** 20 source/test files (7 created, 13 modified) + planning state

## Accomplishments
- WHEEL-05 + A11Y-01 complete: every wheel factor exists as an invisible Pressable positioned from the same geometry hitRegions the canvas hit-tests with — role button, selected state, labels from the panel's own sentence functions; the raw canvas is hidden from screen readers (no-hide-descendants + accessibilityElementsHidden) while overlay Pressables stay reachable; parity tests prove count parity, string-equal labels across overlay ↔ lists ↔ panel, selected-state conveyance, and unknown-time omissions (no house/angle overlay elements)
- D-04 shipped as written: web /chart/result renders the full evidence experience — ModeToggle + FactPanel + EvidenceLists from the in-memory envelope with selection via pressable rows (the D-10 list-half; the wheel half simply does not exist on web), zero Canvas; web /chart/explore deep-link keeps the honest WebUnsupported capability card; the native layout is unchanged (MiniWheelCard native-only, SavePrompt untouched)
- A11Y-02/A11Y-03 proven in-suite: aspect style tokens carry strokePattern + strokeWidth at render level (no hue-only pairs), provisional factors render dashed + text redundancy, no explore-family text surface disables font scaling (Pitfall 8), and all exact facts are reachable without interpreting the graphical wheel
- A1 resolved with on-device evidence: Android renders sign + Node/Chiron/Lilith glyph slots as pre-built text abbreviations (pure signGlyphText/bodyGlyphText in glyphs.ts); classical planets + AC/IC/MC/DC confirmed on-device and stay symbolic; an OFL symbol font bundle is the documented future option, not taken (new-dependency gate)
- On-device verification PASSED on both platforms after a fix-back loop: wheel centered at open, tap-alignment correct while zoomed, gestures clamp correctly with page scroll preserved, no tofu on Android, screen-reader overlay navigation confirmed, web /chart/result loads without error

## Task Commits

Each task was committed atomically (TDD tasks: RED then GREEN; fix-backs likewise):

1. **Task 1: Accessible overlay + canvas hiding on the explore surface** - `dfc307e` (test, RED) + `f2e18ba` (feat, GREEN)
2. **Task 2: D-04 web evidence experience on /chart/result + web/A11Y-02 conformance proofs** - `d77bfbc` (test, RED) + `ed1fe51` (feat, GREEN)
3. **Task 3: On-device verification checkpoint** - Round 1 failures → three fix-backs:
   - Fix-back 1 (wheel centering + tap alignment): `2a18846` (test, RED) + `0000485` (fix, GREEN)
   - Fix-back 2 (Android glyph fallback): `9edb43c` (test, RED) + `040b7f1` (feat, GREEN)
   - Fix-back 3 (web Skia isolation): `7186696` (test, RED) + `322c670` (fix, GREEN)
   - Checkpoint state records: `87ea5d9`, `a99e94a`, `0d1ce86`
   - Round 2: **"pass"** — checkpoint approved, no further fixes

**Plan metadata:** this commit (docs: complete plan)

## On-Device Verification Record (Task 3)

### Round 1 — user feedback, verbatim

> "iOS: chart wheel opens uncentered - far in bottom right most off screen until panned. Difficult to pan/zoom in emulator mode but I can confirm the pan. The click/go to info seems to be misaligned with the actualy glyph. / android seems to have the same issues. seeing a lot of tofu. standard planetary and AC IC MC DC are only symbols that made it. / Web crashes on server error: Server Error — Cannot read properties of undefined (reading 'TypefaceFontProvider')"

Three failures, each fixed as a RED→GREEN fix-back pair:

1. **Wheel uncentered + tap misalignment (iOS + Android)** — the display-scale Skia Group carried a base-center origin that pinned the wheel at canvas (360,360) on phone-sized canvases (bottom-right, mostly off-screen) and offset every tap by origin·(1/displayScale−1). Fix: drop the origin — the Group maps the base square onto the canvas square about the top-left; the same fix applied to the mini-wheel card. Pinned by wheel-display-transform.test.tsx (projects the captured Group chain, taps the RENDERED position). (`2a18846` + `0000485`)
2. **Android glyph tofu (A1)** — Android system fonts render tofu (□) for several zodiac sign glyphs and Node ☊☋/Chiron ⚳/Lilith ⚸; only classical planets + AC/IC/MC/DC survived. Fix: at-risk slots render pre-built text abbreviations via pure signGlyphText/bodyGlyphText helpers (glyphs.ts stays react-native-free); confirmed-present glyphs stay symbolic. Pinned by the glyph-fallback suite. (`9edb43c` + `040b7f1`)
3. **Web crash: "Cannot read properties of undefined (reading 'TypefaceFontProvider')"** — Expo Router eagerly evaluates route modules, so static Skia imports crashed web at module-eval time before any render. Fix: platform-gate the Skia wheel family via Metro .web.tsx stubs (wheel-canvas, mini-wheel-card) so CanvasKit never enters the web module graph; expo export --platform web verified zero CanvasKit traces; web-skia-isolation.test.ts pins stub presence, skia-free content, VALUE-export parity, and no direct screen imports. (`7186696` + `322c670`)

### Round 2 — user decision, verbatim

> "pass"

Re-verification passed on both platforms after a fresh JS reload: wheel centered at open, tap alignment correct, Android abbreviations render (no tofu), pinch/pan clamps correctly with page scroll preserved outside the canvas, screen-reader navigation of the overlay works (announced label + selected state, canvas not focusable), web /chart/result loads without error and mounts the D-04 evidence experience (mode flip + row press → panel facts), /chart/explore deep-link shows the capability card.

### A1 glyph assumption — resolution

04-RESEARCH assumption A1 (Android glyph coverage) is resolved with on-device evidence: coverage is CONFIRMED LIMITED — tofu on sign ring + Node/Chiron/Lilith; classical planets + AC/IC/MC/DC confirmed present. The pre-authorized fallback path (abbreviations) shipped; bundling an OFL symbol font remains the documented follow-up option, not taken this phase (new-dependency legitimacy gate).

## Files Created/Modified
- `src/components/chart/explore/wheel-a11y-overlay.tsx` — invisible Pressable per hit region: role button, selected state, deck-sentence labels, base-coordinate rects (A3)
- `src/app/chart/explore.tsx` — overlay mounted over the canvas container; wrapper View carries importantForAccessibility="no-hide-descendants" + accessibilityElementsHidden
- `src/app/chart/result.tsx` — Platform.OS === "web" branch mounting useExploreMode + ModeToggle + FactPanel + EvidenceLists from the in-memory envelope (D-04); native path unchanged
- `src/components/chart/explore/wheel-canvas.tsx` + `wheel-canvas.web.tsx` — top-left display-scale origin fix (native); value-parity Metro stub (web)
- `src/components/chart/explore/mini-wheel-card.tsx` + `mini-wheel-card.web.tsx` — same centering fix; value-parity Metro stub (web)
- `src/components/chart/explore/fact-panel.tsx` — polite live-region announce contract carried through the web mount
- `src/lib/chart-wheel/glyphs.ts` — signGlyphText/bodyGlyphText pure abbreviation helpers (Android fallback; no react-native imports)
- `src/lib/chart-wheel/geometry.test.ts` — tap-at-rendered-position regression coverage alongside the display-transform suite
- `src/__tests__/wheel-a11y-parity.test.tsx` — count parity, string-equal labels overlay↔lists↔panel, selected conveyance, unknown-time omissions, A11Y-02 render-level conformance (non-hue-only tokens, dashed+text provisional, default font-scaling)
- `src/__tests__/explore-web.test.tsx` — web /chart/result evidence experience with zero Canvas, row press → panel facts; /chart/explore capability card
- `src/__tests__/explore-web-mode.test.tsx` — web mode flip changes vocabulary/depth from the same envelope
- `src/__tests__/wheel-display-transform.test.tsx` — Group-chain projection + rendered-position tap alignment (fix-back 1 regression)
- `src/__tests__/web-skia-isolation.test.ts` — stub presence, skia-free content, value-export parity, no direct screen imports (fix-back 3 guard)
- `src/__tests__/{explore-mode,explore-route,explore-surface,explore-surface-row-press,mini-wheel-card}.test.tsx` — contract updates for the stub seams and abbreviation fallback (assertions updated, not weakened)

## Decisions Made
- Overlay receives the sentence functions as props (a sentences map) — the component structurally cannot invent a second formatter (T-04-15)
- A1 fallback scope is minimal: only glyphs confirmed missing on Android abbreviate; everything confirmed present stays symbolic (verified per-symbol on-device)
- Web isolation chose Metro .web.tsx stubs over dynamic import() because the crash was at route-module evaluation time — lazy loading would still drag CanvasKit into the web graph via resolution; the stub is also the seam WEB-01 (v2) swaps back in
- Web placements table: EvidenceLists' placements section supersedes the plain PlacementList on web (one placements table, same data path)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wheel pinned bottom-right on device + tap misalignment while zoomed**
- **Found during:** Task 3 (Round-1 on-device verification)
- **Issue:** Base-center origin on the display-scale Group placed the wheel at canvas (360,360) on phone-sized canvases and offset taps by origin·(1/displayScale−1)
- **Fix:** Origin removed — base square maps to canvas square about the top-left; same fix in the mini-wheel card
- **Files modified:** src/components/chart/explore/wheel-canvas.tsx, src/components/chart/explore/mini-wheel-card.tsx, src/lib/chart-wheel/geometry.test.ts
- **Verification:** wheel-display-transform.test.tsx (RED→GREEN); Round-2 on-device "pass"
- **Committed in:** 2a18846 + 0000485

**2. [Rule 1 - Bug] Android glyph tofu (A1 assumption failure)**
- **Found during:** Task 3 (Round-1 on-device verification)
- **Issue:** Android system fonts lack several sign/Node/Chiron/Lilith glyphs — tofu rendered on the wheel
- **Fix:** Pre-built text abbreviations via pure signGlyphText/bodyGlyphText for the at-risk slots; confirmed glyphs stay symbolic
- **Files modified:** src/lib/chart-wheel/glyphs.ts, src/components/chart/explore/wheel-canvas.tsx, src/components/chart/explore/mini-wheel-card.tsx
- **Verification:** glyph-fallback suite (RED→GREEN); Round-2 on-device "pass" (no tofu)
- **Committed in:** 9edb43c + 040b7f1

**3. [Rule 1 - Bug] Web crash at module-eval (TypefaceFontProvider)**
- **Found during:** Task 3 (Round-1 on-device/web verification)
- **Issue:** Expo Router eagerly evaluates route modules; static Skia imports crashed web before render
- **Fix:** .web.tsx Metro stubs platform-gate the Skia wheel family out of the web module graph; value-export parity keeps contracts typed
- **Files modified:** src/components/chart/explore/wheel-canvas.web.tsx, src/components/chart/explore/mini-wheel-card.web.tsx, src/app/chart/explore.tsx, src/app/chart/result.tsx
- **Verification:** web-skia-isolation.test.ts (RED→GREEN); expo export --platform web zero CanvasKit traces; Round-2 web "pass"
- **Committed in:** 7186696 + 322c670

---

**Total deviations:** 3 auto-fixed (3 × Rule 1 on-device bugs surfaced by the checkpoint — exactly the verification loop the plan's Task 3 was designed to run)
**Impact on plan:** All three were correctness fixes inside the plan's own surface, each landed as a RED→GREEN pair with regression tests. No scope creep; A1's fallback path was pre-authorized in the plan.

## Issues Encountered
- The on-device checkpoint worked as designed: Round 1 surfaced three real-device failures no CI could catch (Skia display math on real canvas sizes, Android font coverage, web module-graph evaluation order); all three closed with pinned regressions and Round 2 passed. OFL symbol-font bundling is the documented (not taken) future option for full glyph fidelity on Android.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — the .web.tsx files are deliberate platform gates (the D-04 zero-canvas decision), not stubs of missing functionality; their value-export parity and isolation are test-enforced.

## Threat Surface
No new threat surface beyond the plan's model: T-04-14 mitigated (overlay consumes the same geometry module — count parity test-pinned), T-04-15 mitigated (string-equality label parity vs panel/list sentences), T-04-16 mitigated (web branch mounts the SAME components and deck; explore-web-mode.test.tsx asserts the identical fixture values render on web across a flip).

## Next Phase Readiness
- Phase 4 is COMPLETE — all seven plans closed and all ten requirements (WHEEL-01..05, EVID-01/02, A11Y-01/02/03) green; the phase is ready for /gsd-verify-work
- The parity-suite pattern and the evidence-vocabulary module are the Phase-6 interpretation integration seams; the .web.tsx stubs are the WEB-01 (v2) canvas seam
- Full suite at close: 58 files / 621 tests green; `npx tsc --noEmit` exit 0; plan suites (parity + web + web-mode + display-transform + web-skia-isolation) 23/23 green

## Self-Check: PASSED

- Files: wheel-a11y-overlay.tsx / wheel-canvas.web.tsx / mini-wheel-card.web.tsx / wheel-a11y-parity.test.tsx / explore-web-mode.test.tsx / wheel-display-transform.test.tsx / web-skia-isolation.test.ts created on disk; explore.tsx / result.tsx / wheel-canvas.tsx / mini-wheel-card.tsx / fact-panel.tsx / glyphs.ts / geometry.test.ts + 6 test files modified
- Commits dfc307e, f2e18ba, d77bfbc, ed1fe51, 2a18846, 0000485, 9edb43c, 040b7f1, 7186696, 322c670 present on gsd/phase-04-semantic-chart-exploration
- `npm test` → 58 files / 621 tests green; `npx tsc --noEmit` → exit 0; plan suites → 23/23 green (verified this session)
- Task 3 checkpoint decision recorded verbatim (Round 1 failures + Round 2 "pass") — satisfies the plan's `grep -q -i 'approved\|checkpoint'` gate

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
