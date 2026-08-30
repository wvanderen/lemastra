---
phase: 03-private-local-workspace
plan: 04
subsystem: ui
tags: [react-native, save-flow, modal, tanstack-query, zod, privacy, explicit-save, rntl, vitest]

# Dependency graph
requires:
  - phase: 03-private-local-workspace (plan 03)
    provides: WorkspaceRepository saveChart with (chart, input_revision) dedupe, labelSchema/smartDefaultLabel, storedCalculationInputsSchema/storedIdentitySchema
  - phase: 02-trustworthy-natal-chart
    provides: result screen skeleton + confirm screen calculate mutation/postCalculate
provides:
  - Save vertical slice on /chart/result (D-10, WORK-02) — Save chart CTA below the identity line, label-prompt modal with smart-default prefill and 1–60 validation, Saved ✓ chip, dedupe already-saved state, storage-failure recovery card
  - Explicit-save-only law (PRIV-01) test-enforced end to end — zero repository writes before the Save confirm
  - request param threading confirm → result (Pattern 5 / A6) — every save carries the stored inputs revise needs (D-08 groundwork)
  - src/components/workspace/copy.ts (save-flow + five error classes), SavePrompt, ErrorCard
  - src/hooks/use-workspace.ts — useSaveChart + CHARTS_QUERY_KEY ['charts'] invalidation convention
  - RN-vitest shim v4: Modal component mock (all three Phase-3 dialogs testable)
affects: [03-05, 03-06, 03-07, 03-08, home-workspace, data-controls, revise-flow]

# Tech tracking
tech-stack:
  added: []  # no new packages
  patterns:
    - separate-guard param parsing: untrusted secondary params (request) parse beside the redirect guard but never trigger it — degraded capability, never a crash (T-03-12)
    - controlled RN Modal dialog pattern (accessibilityViewIsModal + autofocus + per-keystroke labelSchema.safeParse gating) — the template for delete-confirm dialogs
    - repository module seam in tests: vi.mock("@/lib/workspace/repository") fakes saveChart; the hook keeps the screen ignorant of SQLite
    - mutation-driven state machine on screens: idle CTA → pending (all buttons disabled) → Saved ✓/dedupe chip or ErrorCard with Try again re-mutating save.variables

key-files:
  created:
    - src/components/workspace/copy.ts
    - src/components/workspace/save-prompt.tsx
    - src/components/workspace/error-card.tsx
    - src/hooks/use-workspace.ts
    - src/__tests__/save-prompt.test.tsx
    - src/__tests__/save-flow.test.tsx
  modified:
    - src/app/chart/result.tsx
    - src/app/birth/confirm.tsx
    - src/__tests__/result-screen.test.tsx
    - src/__tests__/confirm-screen.test.tsx
    - scripts/vitest/react-native-shim.ts

key-decisions:
  - "storedCalculationInputsSchema is the single contract for the request param — time_resolution carries the CHOSEN resolve option ({mode, label, utc}), not the request translation, and time is the display form ('' for Unknown) so 03-07's prefill maps stored inputs directly (Pattern 5 wording 'the built CalculateRequest' resolves to the stored-inputs shape the schema defines)"
  - "The request param guards SEPARATELY from the redirect guard: malformed/absent request disables the Save CTA while the screen keeps rendering — degraded capability beats a redirect the user can't explain (T-03-12)"
  - "Try again on the save-failure card re-mutates with save.variables (same label/envelope/inputs/identity) — no re-prompt; the CTA also reopens the prompt for a fresh label"
  - "Modal added to the vitest shim's component-mock list (v4): the real Modal's DEV AppContainer path silently corrupts subsequent test renders after any change event inside a modal; components still use the real RN Modal API unchanged"

patterns-established:
  - "Pattern: changeText inside the act callback + re-query after every interaction — mandatory under the RN shim (a bare fireEvent act scope followed by a separate act empties the next render)"
  - "Pattern: screens consuming workspace hooks render inside QueryClientProvider; screen tests wrap in a fresh retry-off client (confirm-screen.test.tsx law, now applied to result-screen tests)"
  - "Pattern: workspace copy deck lives in src/components/workspace/copy.ts — components never paraphrase; tests assert exact literals"

requirements-completed: [WORK-02, PRIV-01]

# Metrics
duration: 31 min
completed: 2026-08-27
status: complete
---

# Phase 03 Plan 04: Save Flow Summary

**D-10 save vertical slice on /chart/result — Save chart CTA + validated label-prompt modal (smart-default prefill), request-param threading of the stored inputs (D-08 groundwork), Saved ✓/dedupe chips, and a Try-again failure card — with explicit-save-only (PRIV-01) proven by a zero-writes-before-tap test**

## Performance

- **Duration:** 31 min
- **Started:** 2026-08-27T18:38:31Z
- **Completed:** 2026-08-27T19:10:30Z
- **Tasks:** 2 (both TDD RED→GREEN)
- **Files modified:** 11 (6 created, 5 modified)

## Accomplishments

- The result screen's first user-visible Phase-3 capability: a calculated chart becomes a saved, labeled, private local artifact — Save chart CTA sits directly below the identity line (visible without scrolling), opens the RN Modal label prompt prefilled with smartDefaultLabel(date, place), validates trimmed 1–60 per keystroke with a polite live-region error, and disables both buttons while pending
- PRIV-01 explicit-save-only is test-enforced end to end: the ONLY write trigger is the prompt's confirm (useSaveChart.mutate); the save-flow suite asserts zero repository calls through a full render of a calculated-but-unsaved chart
- Confirm → result now threads `request` (Pattern 5 / A6): the built CalculateRequest fields plus the draft's place-union branch, parsed on the result screen through storedCalculationInputsSchema as a SEPARATE guard — a malformed or absent request param never redirects, it disables saving (T-03-12)
- Post-save states exact per UI-SPEC: neutral Saved ✓ chip on backgroundSelected fill; repository `appended: false` (D-06 dedupe pair) adds "Already saved with these exact details."; storage failure renders the error card ("Couldn't save the chart." + nothing-lost body) whose Try again re-saves the exact same variables; the CTA and modal confirm both disable while the save is in flight (double-tap protection, T-03-14)
- Workspace copy deck (save-flow strings + five error classes) and the ErrorCard component (Phase-2 error-banner structure, props-fed) land as the one-place source later plans (03-05/03-06/03-07) consume

## Task Commits

Both tasks followed TDD RED→GREEN:

1. **Task 1: workspace copy deck + save-prompt modal + error card** — `04644f5` (test, RED) + `ad17ee6` (feat, GREEN)
2. **Task 2: request param threading + Save CTA on the result screen** — `100ba88` (test, RED) + `5de66f8` (feat, GREEN)

**Plan metadata:** (see final docs commit below)

## Verification Evidence

- `npx vitest run src/__tests__/save-prompt.test.tsx` → 13/13 pass (RED first failed: modules absent)
- `npx vitest run src/__tests__/save-flow.test.tsx src/__tests__/result-screen.test.tsx` → 20/20 pass (save-flow RED first failed 10/11 — the unwired slice; the PRIV-01 zero-write control passed as expected pre-implementation)
- `npx vitest run` (full suite) → 28 files / 286 tests pass (was 27/275 at plan start — +11 new, zero regressions)
- `npx tsc --noEmit` → exit 0
- Behavior-row spot re-checks: persisted envelope deep-equals the parsed screen envelope; fresh-flow save carries no chartId; Unknown-confidence threading stores `time: ""`; malformed request leaves RESULT_TITLE rendering with the CTA disabled

## Files Created/Modified

- `src/components/workspace/copy.ts` — exact UI-SPEC save-flow strings (SAVE_CTA … DEDUPE_HELPER) + five workspace error classes consumed by ErrorCard
- `src/components/workspace/save-prompt.tsx` — controlled RN Modal label prompt (D-10): smart-default prefill on every open, labelSchema gating, trimmed onSave, pending double-disable, Android back = cancel
- `src/components/workspace/error-card.tsx` — error-banner structure fed by props (alert role, 1px error border, optional recovery action)
- `src/hooks/use-workspace.ts` — useSaveChart (retry false, invalidates CHARTS_QUERY_KEY) over the repository module seam
- `src/app/chart/result.tsx` — request-param parsing (separate guard), Save CTA block below the identity line, SavePrompt + ErrorCard wiring, Saved ✓/dedupe/pending states
- `src/app/birth/confirm.tsx` — third `request` param in the /chart/result push (flat stored inputs incl. place_form union and the chosen resolve option)
- `src/__tests__/save-prompt.test.tsx` — 13 rows: copy-deck exact literals, prefill, validation bounds, emissions, pending, ErrorCard structure
- `src/__tests__/save-flow.test.tsx` — 11 rows: threading (Timed + Unknown), T-03-12 parsing, CTA position order, PRIV-01 zero-write, persistence payload equality, chip/dedupe/failure/double-tap states
- `src/__tests__/result-screen.test.tsx`, `src/__tests__/confirm-screen.test.tsx` — QueryClient wrapper + expo-crypto stand-in (all original assertions unchanged and green)
- `scripts/vitest/react-native-shim.ts` — shim v4 (see Deviations #1)

## Decisions Made

See key-decisions. Notably: the request param's `time_resolution` is the chosen resolve OPTION (the schema's own shape — the stored contract is the single source, and 03-07's prefill mapping "'' for Unknown" reads it directly); Try again re-mutates `save.variables`; the Modal test-infrastructure mock.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] RN vitest shim could not render the dialog primitive**
- **Found during:** Task 1 (GREEN)
- **Issue:** The plan mandates RN Modal (UI-SPEC dialog primitive). Under the test shim the real Modal crashed twice (missing I18nManager turbo constants; missing ScrollView.Context) and then — after any change event inside a modal — silently corrupted every subsequent test render (empty trees, no error), which no amount of component-side change could avoid
- **Fix:** shim v4 adds Modal to the established component-mock list (visible=false → null, else children under a "Modal" host), I18nManager turbo-module constants (mirroring the shim's existing MOCK_NATIVE_MODULES entry), and ScrollView.Context on the ScrollView mock. Components use the real RN Modal API unchanged — the mock is test-only, and all three Phase-3 dialogs (save prompt, both deletes) are now testable
- **Files modified:** scripts/vitest/react-native-shim.ts
- **Verification:** full suite 286/286; save-prompt suite renders/clears/types/re-opens modals across 13 tests
- **Committed in:** ad17ee6

**2. [Rule 3 - Blocking] Existing result/confirm screen tests broke when the screen gained a query hook**
- **Found during:** Task 2 (GREEN)
- **Issue:** result.tsx now consumes useSaveChart → the screen requires a QueryClientProvider, and its import graph reaches expo-crypto (native entry). The two existing screen-test files rendered bare and their beforeAll collection died
- **Fix:** added a fresh retry-off QueryClient wrapper and the 03-03 expo-crypto → node:crypto mock to result-screen.test.tsx and confirm-screen.test.tsx. Every original assertion is unchanged and green — the plan's "existing result-screen tests stay green (new CTA additive)" held at the assertion level
- **Files modified:** src/__tests__/result-screen.test.tsx, src/__tests__/confirm-screen.test.tsx
- **Verification:** 9/9 result-screen, 23/23 confirm-screen, full suite green
- **Committed in:** 5de66f8

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes are test-infrastructure only — no production behavior differs from the plan; they unblock the mandated UI-SPEC dialog primitive and the mandated hook wiring. No scope creep.

## Issues Encountered

- The RN shim's act-queue quirk (changeText outside an act callback empties the next render) was diagnosed and worked around by following the repo's own birth-form test conventions (changeText inside act; re-query after every interaction; waitFor instead of bare empty acts after presses). Documented as a pattern in both new test files so later plans inherit it.
- `userEvent.type`/`clear` do not recognize the shim's TextInput host (`RCTSinglelineTextInputView`) — `fireEvent.changeText` is the repo idiom; adopted throughout.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All plan-frontmatter symbols exist for later plans: copy.ts (save-flow + error deck), SavePrompt, ErrorCard, useSaveChart + CHARTS_QUERY_KEY, result-screen request-param contract, confirm-screen request threading
- 03-05 (home list) mounts over listCharts + CHARTS_QUERY_KEY; 03-06/03-07 consume ErrorCard + the error deck and reuse the Modal test infrastructure
- Threat-model dispositions implemented and test-enforced: T-03-12 (separate request-param parse guard), T-03-13 (zero-write-before-save test), T-03-14 (pending double-disable + dedupe chip surface; the repository backstop is 03-03-proven)
- Device-only behaviors (real modal focus trap, A6 param size on device) remain end-of-phase UAT per human_verify_mode = end-of-phase

## TDD Gate Compliance

Plan type is `execute` with per-task `tdd="true"` — both tasks committed in RED→GREEN order:
- Task 1: `test(03-04)` 04644f5 precedes `feat(03-04)` ad17ee6 ✓
- Task 2: `test(03-04)` 100ba88 precedes `feat(03-04)` 5de66f8 ✓

## Self-Check: PASSED

All eleven created/modified files exist on disk; all four task commits verified in git log (04644f5, ad17ee6, 100ba88, 5de66f8); plan verification commands re-run green (save-prompt 13/13, save-flow+result-screen 20/20, full suite 28 files/286 tests, tsc exit 0).

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*
