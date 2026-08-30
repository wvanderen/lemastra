---
phase: 04-semantic-chart-exploration
plan: 06
subsystem: ui
tags: [dual-view, mode-toggle, glossary, progressive-disclosure, copy-deck, a11y, asyncstorage, vitest, tdd]

# Dependency graph
requires:
  - phase: 04-semantic-chart-exploration/plan-02
    provides: useExploreMode hook (versioned-key persistence) + the copy-deck/evidence-vocabulary laws this plan extends
  - phase: 04-semantic-chart-exploration/plan-04
    provides: EvidenceLists five-section surface + scroll-target FactorRef row-key space selection must survive mode flips within
  - phase: 04-semantic-chart-exploration/plan-05
    provides: WheelCanvas tiered declutter seam (tier prop) the mode filter composes with
provides:
  - ModeToggle ({ mode, onChange }) — compact horizontal segmented radiogroup with three-channel selected state (D-05)
  - Glossary ({ term }) — per-term expandable disclosure rendering deck definitions inline, structural expanded state (D-08)
  - explore/copy.ts mode deck — MODE_LABEL/MODE_TOGGLE_HEADING/MODE_OPTIONS constants, GLOSSARY eight-term static inventory, mode-keyed Simple sentence template pairs (panel + rows)
  - mode: ExploreMode prop contracts on WheelCanvas/WheelGraphics, EvidenceLists, and FactPanel + the wired explore surface (useExploreMode + ModeToggle above the wheel hero) — EVID-02 complete
affects: [04-07, phase-06-grounded-interpretation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mode-as-filter law: the mode gates VISIBILITY and picks a deck template over the SAME resolved facts — no mode branch ever recomputes, rewords, or invents an astrological value (T-04-12 same-data-path, test-pinned across a live flip)"
    - "Mode × tier composition on the wheel: the tier governs label density, the mode governs whether the label set exists — both must allow (Simple stays glyphs-only at any zoom)"
    - "Static-content glossary law: definitions are plain strings in the deck asserted free of interpolation markers — they can structurally never become interpretation (T-04-13/T-02-34 extension)"

key-files:
  created:
    - src/components/chart/explore/mode-toggle.tsx
    - src/components/chart/explore/glossary.tsx
    - src/__tests__/explore-mode.test.tsx
  modified:
    - src/components/chart/explore/copy.ts
    - src/components/chart/explore/evidence-lists.tsx
    - src/components/chart/explore/fact-panel.tsx
    - src/components/chart/explore/wheel-canvas.tsx
    - src/app/chart/explore.tsx
    - src/__tests__/fact-panel.test.tsx
    - src/__tests__/evidence-lists.test.tsx
    - src/__tests__/wheel-selection.test.tsx
    - src/__tests__/wheel-zoom.test.tsx
    - src/__tests__/explore-surface.test.tsx
    - src/__tests__/explore-surface-row-press.test.tsx

key-decisions:
  - "04-06: Simple sentence templates reuse the SAME input interfaces as the Technical ones (PlanetFactInput etc.) — one resolved-facts object feeds either template, making the same-data-path law structural rather than conventional"
  - "04-06: aspect names stay VERBATIM in Simple rows/sentences (rewording 'square' would be interpretation-adjacent and break T-04-12) — the glossary chip explains the term instead of the surface paraphrasing it"
  - "04-06: the exact state stays visible in Simple (only lots, sect, orb, applying/separating are the D-06 hidden list); dignities render bare values in Simple (vocabulary simplification, values verbatim)"
  - "04-06: WheelGraphics mode defaults to 'technical' (mini preview unchanged) while WheelCanvas requires it — static consumers keep the full label path, the interactive surface's contract is explicit"
  - "04-06: the surface suites that pin full-depth behavior pre-seed an in-memory AsyncStorage to 'technical' rather than weakening their assertions to Simple strings"

patterns-established:
  - "Route-mounted toggle press: fireEvent.press + immediate `await act` flush (the persist write resolves on a microtask); one press per file, run last (the 04-04 test-order law)"
  - "Deck-owned term keys (GLOSSARY_TERM_RETROGRADE): components never hardcode glossary terms — the deck names the terms its surfaces chip"

requirements-completed: [EVID-02]

# Metrics
duration: 10 min
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 6: Beginner ↔ Technical Dual View Summary

**Global Simple ↔ Technical segmented toggle flipping wheel labels, list rows, and the fact panel together from one envelope (lots/sect/orb/applying hidden in Simple, plain-language deck templates, persisted preference, tap-to-explain glossary) — 19 mode tests, full suite 592 green**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-30T17:14:40Z
- **Completed:** 2026-08-30T17:25:33Z
- **Tasks:** 2 (Task 1 TDD: RED → GREEN)
- **Files modified:** 13 (3 created, 10 modified)

## Accomplishments
- EVID-02 complete: one ModeToggle flip above the wheel hero changes the whole experience at once — useExploreMode's ONE state passes as a plain prop to WheelCanvas, EvidenceLists, and FactPanel (D-05/D-06: one state, prop-passed — not context, not two trees); the preference persists under @lemastra:explore.mode.v1 and first-run defaults to Simple (D-07)
- Simple mode hides exactly the D-06 list (lots + sect sections, orb columns, applying/separating state) and swaps vocabulary through mode-keyed deck templates; Technical shows every field at full precision — both modes provably render the same fixture values across a live flip (T-04-12 same-data-path test), and selection/scroll state share the same FactorRef space so a flip never disturbs them
- D-08 glossary affordance: Simple rows chip the covered terms (aspect names from the envelope, retrograde motion) — each chip expands inline to its exact deck definition with structural expanded state; definitions are static strings test-asserted free of interpolation markers (T-04-13 — they can never become interpretation)
- WheelCanvas composes mode with the 04-05 zoom tiers: Simple renders glyphs only at ANY tier, Technical renders the tiered degree labels (mode filters the label set, tier governs density); the D-03 mini preview keeps its unchanged default path

## Task Commits

Each task was committed atomically (Task 1 TDD: RED then GREEN):

1. **Task 1: ModeToggle + Glossary components + mode/glossary copy deck** - `1fa0a1b` (test, RED) + `7b37b26` (feat, GREEN)
2. **Task 2: Wire mode through the explore surface — one flip changes everything together** - `fa5b300` (feat)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/chart/explore/mode-toggle.tsx` — D-05 segmented radiogroup: two deck options, accessibilityState checked, fill + 2px accent border + 600 weight (A11Y-02), controlled value/onChange
- `src/components/chart/explore/glossary.tsx` — D-08 per-term disclosure (provenance-details analog): structural expanded state, exact deck definitions, unknown terms render null
- `src/components/chart/explore/copy.ts` — deck additions: MODE_TOGGLE_HEADING/MODE_LABEL_*/MODE_OPTIONS, GLOSSARY eight-term static inventory + GLOSSARY_TERM_RETROGRADE, Simple sentence templates (planet/angle/house/sign/aspect panels + house/aspect rows)
- `src/components/chart/explore/evidence-lists.tsx` — mode prop: Simple hides lots/sect sections + orb/applying/separating, Simple row sentences, glossary chips; Technical full depth — same envelope
- `src/components/chart/explore/fact-panel.tsx` — mode prop: resolveFact keys the template pair per kind (same facts, same degree split)
- `src/components/chart/explore/wheel-canvas.tsx` — mode on WheelCanvasProps (required) + optional on WheelGraphics (default technical for the mini preview); degree labels render only when mode AND tier allow
- `src/app/chart/explore.tsx` — useExploreMode wiring, ModeToggle above the wheel hero, mode threaded to the three consumers
- `src/__tests__/explore-mode.test.tsx` — 19 tests: deck pins, glossary static-content law, ModeToggle radiogroup/three-channel/onChange, Glossary expand-collapse, FactPanel mode-keyed sentences, WheelGraphics mode filter, persistence round-trip, source wiring, route first-run Simple / technical hydration / the one-flip test (T-04-12 + D-07)
- `src/__tests__/{fact-panel,evidence-lists,wheel-selection,wheel-zoom}.test.tsx` — prop-contract updates (explicit mode="technical" where full-depth behavior is pinned)
- `src/__tests__/{explore-surface,explore-surface-row-press}.test.tsx` — in-memory AsyncStorage pre-seeded to technical (full-depth assertions keep their meaning)

## Decisions Made
- Simple templates reuse the Technical templates' input interfaces — one resolved-facts object feeds either mode-keyed template, so the same-data-path law is structural (a second data path would require a second input shape)
- Aspect names render verbatim in both modes; the glossary explains terms rather than the surface paraphrasing them (rewording an envelope value would be interpretation-adjacent and break T-04-12)
- The D-06 hidden list is exhaustive: exact state and dignities stay visible in Simple (dignities as bare verbatim values — vocabulary simplification, not fact removal)
- WheelGraphics' mode prop defaults to "technical" so the static mini-wheel preview (which omits tier anyway) is untouched; WheelCanvas requires mode so the interactive surface's contract is explicit

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] 04-04 surface suites needed a technical-mode pre-seed**
- **Found during:** Task 2 (full regression run)
- **Issue:** explore-surface.test.tsx and explore-surface-row-press.test.tsx pin full-depth behavior (lots/sect sections in the D-13 order walk, Technical panel sentences); with mode wired, their previously-unmocked AsyncStorage read rejects and useExploreMode correctly falls back to the Simple default — hiding those sections and swapping the sentences, failing three tests
- **Fix:** Both files gained an in-memory AsyncStorage mock pre-seeded to "technical" (documented in-file); the four direct-render suites gained explicit mode="technical" props for the required contract. No assertion was weakened — the mode behavior itself is covered by the new explore-mode.test.tsx
- **Files modified:** src/__tests__/explore-surface.test.tsx, src/__tests__/explore-surface-row-press.test.tsx, src/__tests__/fact-panel.test.tsx, src/__tests__/evidence-lists.test.tsx, src/__tests__/wheel-selection.test.tsx, src/__tests__/wheel-zoom.test.tsx
- **Verification:** npm test → 53 files / 592 tests green; tsc --noEmit exit 0
- **Committed in:** fa5b300

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The plan itself anticipated suite updates ("04-03/04-04 surface suites updated where prop contracts changed, not weakened"); the pre-seed extends that to the persistence seam so the pinned assertions keep their full-depth meaning. No scope creep.

## Issues Encountered
- Normal TDD iteration in the surface suite: the fixture carries TWO square aspects, TWO applying aspects, and TWO retrograde planets — chip/label assertions scope via getAllByTestId/within(row); the route-mounted toggle press needs fireEvent.press followed by an `await act` flush (the persist write resolves on a microtask — the row-press precedent), with the flip test running last per the 04-04 one-state-updating-interaction-per-file law

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — the toggle, glossary, mode-aware surfaces, and persistence are fully wired and test-proven.

## Threat Surface
No new threat surface beyond the plan's model: T-04-12 mitigated — the one-flip test asserts identical fixture values across the flip (same-data-path) and every mode branch only changes deck vocabulary/field visibility; T-04-13 mitigated — glossary definitions are deck-only static strings, test-asserted free of interpolation markers.

## Next Phase Readiness
- EVID-02 is complete end to end; 04-07 (a11y overlay + UAT) is the final slice — the overlay wraps the wheel canvas at base geometry (A3), the lists remain the canonical non-visual path, and the on-device checkpoint tunes the 04-05 A4 constants (PAN_ACTIVATION_OFFSET, clamp range, TIER_THRESHOLDS, DEGREE_LABEL_OFFSET)
- Full suite: 53 files / 592 tests green; `npx tsc --noEmit` exit 0 (no new routes — no typed-routes regen needed)

## Self-Check: PASSED

- Files: mode-toggle.tsx / glossary.tsx / explore-mode.test.tsx created on disk; copy.ts / evidence-lists.tsx / fact-panel.tsx / wheel-canvas.tsx / explore.tsx + 6 test files modified
- Commits 1fa0a1b, 7b37b26, fa5b300 present on gsd/phase-04-semantic-chart-exploration
- `npx vitest run src/__tests__/explore-mode.test.tsx` → 19 passed; `npm test` → 53 files / 592 tests green; `npx tsc --noEmit` → exit 0
- Acceptance greps: mode-toggle.tsx contains View-level `accessibilityRole="radiogroup"` + both option branches; glossary.tsx contains `accessibilityState={{ expanded`; copy.ts contains MODE_LABEL constants + the eight-term GLOSSARY; explore.tsx contains `useExploreMode()` with 4 `mode={mode}` sites (ModeToggle + three consumers); all three surface components carry `mode: ExploreMode`

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
