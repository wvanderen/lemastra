---
phase: 04-semantic-chart-exploration
plan: 02
subsystem: ui
tags: [evidence-vocabulary, trust-labeling, a11y, asyncstorage, vitest, copy-deck]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart
    provides: AssumptionsLine/UnavailableFactors sectional card treatments + the chart copy deck (labels, factor display names) the vocabulary extends
  - phase: 04-semantic-chart-exploration/plan-01
    provides: chart-wheel glyph/aspect-style vocabulary the tokens mirror for visual consistency
provides:
  - EvidenceKind four-kind union + renderableEvidenceKinds (interpretation excluded — the Phase-6 seam) + isRenderableEvidenceKind guard
  - Per-kind semantic-role tokens (calculated plain / judgment labeled-section / uncertainty card + dashed outline / interpretation not-rendered)
  - ASPECT_STYLE strokePattern+strokeWidth map for the five envelope aspect families (pairwise distinct, A11Y-02) + DEFAULT fallback + PROVISIONAL_MARKER dashed-outline marker
  - Kind phrasing functions + INTERPRETATION_NOT_RENDERED marker (copy-deck law: deck definition sites reused, server values verbatim)
  - useExploreMode() hook — versioned-key @lemastra:explore.mode.v1 Simple/Technical preference with safe-persist + union-parse fallback
affects: [04-03, 04-04, 04-05, 04-06, 04-07, phase-06-grounded-interpretation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Vocabulary-module law: one definition site for evidence kinds — surfaces consume kinds/tokens/phrases; Phase 6 joins rather than forks"
    - "Semantic color-role tokens (mirror ThemeColor keys) keep the vocabulary module React-free while renderers own WCAG resolution"
    - "Deck-join over deck-duplicate: phrases re-export deck constants (ASSUMPTIONS_LABEL etc.) so vocabulary and deck can never drift"

key-files:
  created:
    - src/components/chart/evidence-vocabulary/kinds.ts
    - src/components/chart/evidence-vocabulary/tokens.ts
    - src/components/chart/evidence-vocabulary/phrases.ts
    - src/__tests__/evidence-vocabulary.test.ts
    - src/hooks/use-explore-mode.ts
    - src/__tests__/use-explore-mode.test.ts
  modified: []

key-decisions:
  - "04-02: tokens.ASPECT_STYLE is the vocabulary-side contract under strokePattern/strokeWidth naming; values deliberately mirror chart-wheel/glyphs.ts ASPECT_STYLES so wheel and evidence surfaces stay visually consistent — two maps, one law, pinned by both suites"
  - "04-02: phrases.ts imports the deck's definition sites (ASSUMPTIONS_LABEL, UNAVAILABLE_HEADING, PROVISIONAL_LABEL, factorLabel) instead of duplicating strings — copy.ts is type-only-import pure so the module stays plain-Node testable"
  - "04-02: parseStoredMode accepts only exact union literals — corrupted AsyncStorage values fall back to 'simple' silently (T-04-03 mitigated by test)"
  - "04-02: setMode is fire-and-forget (optimistic flip + swallowed persist failure) — storage never blocks the toggle (D-07 best-effort)"

patterns-established:
  - "Not-rendered-kind seam: define vocabulary for future surfaces now, exclude from renderable lists, pin with both runtime and type-level tests"
  - "Source purity scan as a test: readFileSync + import-regex assertion keeps the vocabulary module React/RN/Skia-free forever"

requirements-completed: [EVID-01, EVID-02, A11Y-02]

# Metrics
duration: 4 min
completed: 2026-08-30
status: complete
---

# Phase 4 Plan 2: Evidence Vocabulary + Mode Preference Summary

**Four-kind evidence vocabulary (calculated/judgment/interpretation/uncertainty) with the interpretation kind testably unrenderable until Phase 6, plus the versioned-key useExploreMode hook with safe-persist semantics — 25 new tests, full suite 502 green**

## Performance

- **Duration:** 4 min
- **Started:** 2026-08-30T15:41:52Z
- **Completed:** 2026-08-30T15:45:58Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 6

## Accomplishments
- The shared evidence-vocabulary module (D-14/D-15) defines all four evidence kinds ONCE — EvidenceKind union + renderableEvidenceKinds where interpretation is provably excluded (the Phase-6 seam, enforced by runtime AND type-level assertions)
- Per-kind tokens carry the A11Y-02 law: every aspect-family style has BOTH strokePattern and strokeWidth (pairwise distinct across conjunction/sextile/square/trine/opposition), and provisional factors get the D-16 dashed-outline marker with a textRedundant contract
- Phrases join the copy-deck law — deck definition sites reused (Assumptions/Not-available/Provisional labels, factorLabel), server values embedded verbatim, filter-idiom segment composition, and the interpretation kind's phrasing defined with the explicit INTERPRETATION_NOT_RENDERED marker
- useExploreMode (D-07) persists the Simple ↔ Technical preference under @lemastra:explore.mode.v1 with best-effort read, optimistic flip, safe-persist write, and union-parse fallback for corrupted values (T-04-03) — ready for 04-06 to wire the explore surface

## Task Commits

Each task was committed atomically (TDD: RED then GREEN):

1. **Task 1: Evidence-vocabulary module — kinds, tokens, phrases** - `21672e6` (test, RED) + `3d1c80a` (feat, GREEN)
2. **Task 2: useExploreMode hook — versioned-key preference** - `0655f02` (test, RED) + `3ee6d8c` (feat, GREEN)

**Plan metadata:** this commit (docs: complete plan)

## Files Created/Modified
- `src/components/chart/evidence-vocabulary/kinds.ts` — EvidenceKind union, EVIDENCE_KINDS, renderableEvidenceKinds (interpretation excluded), RenderableEvidenceKind, isRenderableEvidenceKind guard
- `src/components/chart/evidence-vocabulary/tokens.ts` — semantic-role tokens per kind, ASPECT_STYLE (strokePattern+strokeWidth, five families), DEFAULT_ASPECT_STYLE, PROVISIONAL_MARKER (dashed outline + text redundancy), VocabularyColorRole mirroring ThemeColor keys
- `src/components/chart/evidence-vocabulary/phrases.ts` — calculatedFactPhrase, judgmentSectionA11yLabel, unavailable/provisionalFactorPhrase, provisionalMarkerA11yPhrase (filter idiom), INTERPRETATION_NOT_RENDERED + interpretation phrasing (Phase-6 only)
- `src/__tests__/evidence-vocabulary.test.ts` — 18 tests: kind membership + D-15 seam, token completeness/distinctness, exact-string phrase pins, verbatim server-value embedding, module purity scan
- `src/hooks/use-explore-mode.ts` — EXPLORE_MODE_KEY, ExploreMode, DEFAULT_EXPLORE_MODE, useExploreMode (mirrors use-disclosure.ts)
- `src/__tests__/use-explore-mode.test.ts` — 7 tests: default simple, technical hydration, key pin + round-trip, write-failure no-crash, read-failure fallback, corrupted-value parse

## Decisions Made
- tokens.ASPECT_STYLE mirrors chart-wheel/glyphs.ts values under its own strokePattern/strokeWidth naming (the plan's field contract) — the vocabulary map is the evidence-surface contract; the canvas map serves the wheel; both suites pin their laws so they cannot silently diverge
- phrases.ts imports (never re-declares) the deck's existing strings and factorLabel — copy.ts imports only types, so the vocabulary module stays plain-Node testable while joining the single definition sites
- Semantic color roles instead of resolved hex: the vocabulary describes intent ("textSecondary", "accent"), renderers resolve against the themed Colors with the theme's documented WCAG contrast budgets — keeps the module React-free (purity is test-enforced)
- setMode is void (fire-and-forget) rather than async — the optimistic flip is the contract; awaiting storage would imply the UI depends on it

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — the interpretation kind is intentionally DEFINED-but-unrendered (D-15, by plan), not a stub: its phrasing and tokens exist, renderableEvidenceKinds excludes it, and both facts are pinned by tests. Phase 6 will light it up by joining this vocabulary.

## Threat Surface
No new threat surface beyond the plan's model: T-04-03 (tampered preference value) mitigated — parseStoredMode accepts only exact union literals, corrupted values fall back to 'simple', covered by a dedicated test. T-04-04 (vocabulary info disclosure) accepted as planned — static copy + tokens only, no user data.

## Next Phase Readiness
- `src/components/chart/evidence-vocabulary/*` is the consumption seam for 04-03 (wheel canvas markers), 04-04 (sync lists), 04-05 (zoom tiers), 04-06 (explore surface + mode toggle), 04-07 (a11y overlay + UAT), and Phase 6's interpretation surfaces
- `useExploreMode` is ready for 04-06 to wire through the explore surface as a plain prop (D-06 same-data-path law documented in the hook header)
- Requirement traceability note: EVID-01/EVID-02/A11Y-02 foundations land here per plan frontmatter; their surface-level halves land in 04-03..04-07

## Self-Check: PASSED

- Files: kinds.ts / tokens.ts / phrases.ts / evidence-vocabulary.test.ts / use-explore-mode.ts / use-explore-mode.test.ts all exist on disk
- Commits 21672e6, 3d1c80a, 0655f02, 3ee6d8c present on gsd/phase-04-semantic-chart-exploration
- `npx vitest run src/__tests__/evidence-vocabulary.test.ts src/__tests__/use-explore-mode.test.ts` → 25 passed; `npm test` → 44 files / 502 tests green; `npx tsc --noEmit` → exit 0
- Purity: zero react/react-native/@shopify imports in the vocabulary module (test-enforced purity scan)

---
*Phase: 04-semantic-chart-exploration*
*Completed: 2026-08-30*
