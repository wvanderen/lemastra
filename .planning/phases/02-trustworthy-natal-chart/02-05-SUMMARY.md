---
phase: 02-trustworthy-natal-chart
plan: "05"
subsystem: ui
tags: [react-native, expo, rntl, accessibility, copy-deck, zod-enums, design-tokens]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart plan 02-02
    provides: zod response contracts (errorCodeSchema, houseSystemSchema, confidenceSchema) in src/lib/api-schemas.ts
  - phase: 01 foundation
    provides: theme.ts token set, ThemedText/ThemedView primitives, RN-under-Vitest shim + RNTL /pure test pattern
provides:
  - Colors.accent + Colors.error semantic tokens (light + dark)
  - OptionCard — shared selectable card with radio accessibility semantics
  - ErrorBanner + error copy map — per-error_code CALC-04 client rendering with network fallback
  - ConfidenceControl — D-09 four-state inline confidence control
  - AssumptionsControl — D-11 collapsible ten-system house-system selector
  - src/components/birth/copy.ts + src/components/ui/copy.ts — centralized exact-string copy decks
affects: [02-trustworthy-natal-chart plans 06/08/09 (screen composition), phase 04 wheel screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Copy-deck modules keyed by closed enums: copy.ts files hold exact UI-SPEC strings, tests assert them verbatim"
    - "Schema-driven vocabularies in components: house-system list imported from houseSystemSchema.options, never a local literal list"
    - "Three-channel selected state (fill + accent border + 600-weight label) — never color alone"
    - "Graceful template fallbacks for server-supplied copy values (query/houseSystem) living in the copy module"

key-files:
  created:
    - src/components/ui/option-card.tsx
    - src/components/ui/error-banner.tsx
    - src/components/ui/copy.ts
    - src/components/birth/confidence-control.tsx
    - src/components/birth/assumptions-control.tsx
    - src/components/birth/copy.ts
    - src/__tests__/option-card.test.tsx
    - src/__tests__/error-banner.test.tsx
    - src/__tests__/confidence-control.test.tsx
    - src/__tests__/assumptions-control.test.tsx
  modified:
    - src/constants/theme.ts
    - src/components/themed-text.tsx
    - src/hooks/use-theme.ts

key-decisions:
  - "ErrorBanner props extended to { code, message?, query?, houseSystem?, onAction?, testID? } — query/houseSystem fill the copy-deck's {query}/{house_system} templates; the artifacts' three-prop summary remains compatible"
  - "Only CALC_INVALID_INPUT server messages render (T-02-18); every other banner string comes from the local copy deck, contract-tested"
  - "use-theme now resolves any non-'dark' scheme (including null) to light — fixes a crash reachable before Appearance loads"
  - "Confidence option display order follows the copy deck (Timed, Approximate, Rectified, Unknown), typed as Confidence[]; house systems use schema order"

patterns-established:
  - "RNTL v14 /pure mechanics under the RN vitest shim: userEvent.press for act-flushed state changes; structural props assertions for roles RNTL doesn't map (radiogroup); wrap-not-clip contract via absence of truncation props"

requirements-completed: [BIRTH-04, CALC-02, CALC-04]

# Metrics
duration: 10 min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 5: Shared UI Layer (Tokens, Option-Card, Error-Banner, Birth Controls) Summary

**Accent/error semantic tokens with the linkPrimary migration, the OptionCard and ErrorBanner primitives (copy-deck-driven per-error_code CALC-04 rendering), and the D-09/D-11 birth controls — all copy centralized in exact-string copy modules, 31 new tests, suite 100/100.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-25T18:54:07Z
- **Completed:** 2026-08-25T19:05:05Z
- **Tasks:** 2
- **Files modified:** 13 (6 components/copy + 4 tests + 3 modified)

## Accomplishments
- Added `accent` (#2266CC/#7AB0FF) and `error` (#B3261E/#F2B8B5) semantic tokens to both schemes; migrated `linkPrimary` from hard-coded `#3c87f7` to `theme.accent` (no hex literals remain in any component)
- Built `OptionCard` (radio semantics + checked state, three-channel selected treatment, ≥48dp target, Spacing-token insets) and `ErrorBanner` (1px error border, Label/600 heading, body/hint, recovery action, accessibilityLabel + polite live region, network fallback)
- Mapped all eleven CALC-04 error codes to exact copy-deck strings; `errorBannerCopy` is an exhaustive switch over `ErrorCode`, so adding a server code without client copy is a compile error (lockstep with api/lemastra_api/errors.py)
- Built `ConfidenceControl` (D-09: four inline option-card rows, Timed default, calculator-label callbacks, unknown-time helper constant for the 02-06 form) and `AssumptionsControl` (D-11: collapsed disclosure, ten systems from `houseSystemSchema.options`, Whole Sign pre-selected, quadrant-failure helper)
- Threat mitigations contract-tested: T-02-18 (server message renders only for CALC_INVALID_INPUT — a traceback-carrying CALC_TIMEOUT body asserts clean) and T-02-19 (selected/error states conveyed structurally)

## Task Commits

Each task followed RED → GREEN (both `tdd="true"`):

1. **Task 1: accent/error tokens + option-card + error-banner** — `b7d75ce` (test/RED), `d4cf9cf` (feat/GREEN)
2. **Task 2: confidence + assumptions controls with copy modules** — `fd70214` (test/RED), `1bd23fc` (feat/GREEN), `c2e25fa` (test mechanics fix)

**Plan metadata:** committed after this summary (docs).

## Files Created/Modified
- `src/constants/theme.ts` — added accent + error tokens to both schemes (single source of truth)
- `src/components/themed-text.tsx` — linkPrimary resolves to `theme.accent`; no hard-coded hex
- `src/hooks/use-theme.ts` — null-scheme crash fix (deviation, below)
- `src/components/ui/option-card.tsx` — shared selectable card, radio semantics
- `src/components/ui/error-banner.tsx` — per-error_code recoverable banner (CALC-04)
- `src/components/ui/copy.ts` — error-banner copy deck keyed by ErrorCode + network fallback
- `src/components/birth/confidence-control.tsx` — D-09 four-state control
- `src/components/birth/assumptions-control.tsx` — D-11 collapsible house-system selector
- `src/components/birth/copy.ts` — confidence/assumptions copy deck (heading, helpers, header/label/helper, unknown-time swap)
- `src/__tests__/{option-card,error-banner,confidence-control,assumptions-control}.test.tsx` — 31 tests total

## Decisions Made
- **ErrorBanner interpolation props:** the copy deck's `{query}` (PLACE_ZERO_RESULTS) and `{house_system}` (CALC_UNSUITABLE_HOUSE_SYSTEM) templates need caller-supplied values, so the banner accepts optional `query`/`houseSystem` props on top of the artifacts' `{ code, message?, onAction? }` signature. Graceful fallbacks ("No match found." / "This house system can't be calculated for this location.") live in the copy module and are test-covered.
- **Type-only enum import in error-banner/copy:** `ErrorCode` is imported as a type; the exhaustive switch gives compile-time lockstep with the eleven-code vocabulary, while tests iterate `errorCodeSchema.options` at runtime to prove every code maps to copy.
- **Confidence display order** follows the copy deck (Timed, Approximate, Rectified, Unknown) via a `Confidence[]`-typed array in `copy.ts`; house systems use schema order verbatim.
- **Disclosure glyph** is a text status marker (▾/▴); `accessibilityState.expanded` carries the state structurally — no icon dependency added.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] use-theme crashed on null color scheme**
- **Found during:** Task 1 (first themed-component render under the RN test shim)
- **Issue:** `useColorScheme()` returns `null` before Appearance loads (and under the test shim); `use-theme.ts` only guarded `'unspecified'`, so `Colors[null]` → `undefined` → every themed component crashes reading `theme.text`
- **Fix:** any scheme other than an explicit `'dark'` now resolves to the light palette
- **Files modified:** src/hooks/use-theme.ts
- **Verification:** all four new component test files render themed components; full suite 100/100; tsc green
- **Committed in:** d4cf9cf (Task 1 GREEN)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for the plan's own tests and for production robustness (web/native before Appearance resolves). No scope creep.

## Issues Encountered
- **RNTL v14 test mechanics (resolved in-commit):** (a) `fireEvent.press` under `/pure` dispatches handlers but does not flush state updates — presses that toggle state now go through `userEvent.press`; (b) RNTL has no role mapping for RN's `radiogroup` accessibilityRole — group semantics are asserted structurally via `container.queryAll` on props; (c) `PixelRatio.getFontScale` is not spyable through the vitest/CJS interop — the 1.3× smoke was implemented as a wrap-not-clip contract (no `numberOfLines`/`ellipsizeMode`/`adjustsFontSizeToFit`, no `allowFontScaling` opt-out) plus full-content render. Mechanics documented in the test file headers; behavior contracts unchanged.

## TDD Gate Compliance
Both tasks are `tdd="true"`: RED commits (`b7d75ce`, `fd70214`) precede GREEN commits (`d4cf9cf`, `1bd23fc`) in git log; RED phases failed on missing modules as expected. No REFACTOR commits needed — implementations landed minimal.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shared vocabulary complete for the screen plans: 02-06 (birth form composes ConfidenceControl + AssumptionsControl + place search), 02-08 (confirm/result screens consume ErrorBanner with `houseSystem` for the CALC_UNSUITABLE deep-link), 02-09
- `UNKNOWN_TIME_FIELD_HELPER` ("Not needed when the time is unknown.") is exported for the 02-06 time-field swap
- Suite 100/100 (69 baseline + 31 new); `npx tsc --noEmit` green; no routes touched (typed-routes regeneration not required)

## Self-Check: PASSED
- All 10 created files exist on disk (`[ -f ]` verified)
- All 5 task commits present in git log (`b7d75ce`, `d4cf9cf`, `fd70214`, `1bd23fc`, `c2e25fa`)
- Plan verification re-run: full vitest suite 100/100; tsc --noEmit clean
- Artifact truths verified: option-card contains accessibilityRole; error-banner keyed by ErrorCode/error_code; confidence-control exposes radiogroup; assumptions-control contains Whole Sign; house systems sourced from houseSystemSchema.options

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-25*
