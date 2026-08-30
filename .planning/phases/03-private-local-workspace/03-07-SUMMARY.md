---
phase: 03-private-local-workspace
plan: 07
subsystem: ui
tags: [react-native, expo-router, revision-history, revision-diff, revise-flow, read-only-view, tanstack-query, rntl, vitest, workspace, saved-charts]

# Dependency graph
requires:
  - phase: 03-private-local-workspace (plan 03)
    provides: WorkspaceRepository getChartDetail revisions array (inputs for diffing) + getRevisionContent + saveChart (chartId, input_revision) dedupe
  - phase: 03-private-local-workspace (plan 04)
    provides: workspace copy deck + SavePrompt/Save CTA + request-param contract (storedCalculationInputsSchema — the prefill source) + useSaveChart
  - phase: 03-private-local-workspace (plan 05)
    provides: /chart/saved detail route (id-param law, useWorkspaceChart, parse-then-trust composition)
  - phase: 03-private-local-workspace (plan 06)
    provides: saved-detail end-of-screen wiring (DataActions/DeleteConfirm placement the History section sits above)
provides:
  - revision-diff.ts — whatChangedPhrase (fixed 8-item vocabulary + "Details changed" fallback) + revisionHistoryEntries (newest-first, "Original details" first revision, YYYY-MM-DD dates) + formatHistoryDate
  - RevisionHistory — the D-07 History list (Latest chip on the newest row only, older rows emit revisionId, renders only when >1 revision)
  - /chart/revision — the read-only earlier-version route ("Earlier version — read-only" marker, stored-evidence composition with NO assumptions action, Back to History)
  - The D-08 revise flow — "Revise birth details" pushes /birth with a revise param {chartId, latest inputs}; the birth form prefills from stored inputs with the title swap; chartId threads birth → confirm → result; the result CTA reads "Save new version" and appends under the same chart with the honest dedupe state
  - AssumptionsLine optional action (actionLabel/actionHelper/onAdjust optional) — the read-only + revise variants of the Phase-2 card
  - useRevisionContent query hook (charts-tree key, sweeps with the Pitfall-10 invalidation map)
  - copy.ts additions — what-changed phrase constants, History/marker/back-link strings, revise title/action/helper, SAVE_NEW_VERSION_CTA
affects: [03-08 (delete-all/export-all — History immutability language already shipped), phase-04 wheel (revision views stay envelope-driven), UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - pure input-diff → fixed-vocabulary phrase functions (revision-diff.ts imports its phrase constants FROM the copy deck — one definition site for exact-copy tests, chart/copy.ts FACTOR_LABELS shared-idiom precedent)
    - read-only composition via optional action props on a shared Phase-2 component instead of a forked variant (AssumptionsLine renders no action when onAdjust is absent)
    - chained-repository reads on one route: revision content first, then the chart detail under the SAME query key the saved screen uses (cache-shared, invalidated together) for the derived History phrase
    - revise param = id-style JSON {chartId, inputs} parsed with a local zod schema at the destination; malformed → silent fresh-form fallback, never a crash (T-03-23)

key-files:
  created:
    - src/lib/workspace/revision-diff.ts
    - src/components/workspace/revision-history.tsx
    - src/app/chart/revision.tsx
    - src/__tests__/revision-diff.test.ts
    - src/__tests__/revision-history.test.tsx
    - src/__tests__/revise-prefill.test.tsx
  modified:
    - src/app/birth.tsx
    - src/app/birth/confirm.tsx
    - src/app/chart/result.tsx
    - src/app/chart/saved.tsx
    - src/app/_layout.tsx
    - src/hooks/use-workspace.ts
    - src/components/chart/assumptions-line.tsx
    - src/components/workspace/copy.ts

key-decisions:
  - "The what-changed phrase constants live in the workspace copy deck and revision-diff.ts imports them from there — one definition site for the exact-copy tests; the diff maps fields→phrases but never authors copy (T-03-24)"
  - "The read-only revision view derives its marker phrase from the chart detail query under the SAME key the saved screen reads (cache-shared, swept by the same invalidations) — getRevisionContent supplies the envelope, the detail supplies the diff context; both must resolve before content renders (parse-then-trust, T-03-17)"
  - "AssumptionsLine's action became optional + label/helper-overridable instead of forking a read-only variant — the revision view mounts the Phase-2 card with NO action and the saved detail overrides the label to 'Revise birth details' with the stays-in-History trust line"
  - "The Unknown-confidence revise prefill strips the stored 12:00 noon reference to the honest empty field — display never leaks the calculation artifact (D-09 disabled+cleared behavior intact)"
  - "The revise chain adds zero calculation semantics: birth's resolve mutation and confirm's buildRequest/calculate are untouched — only the chartId param rides beside the existing draft/envelope/identity/request hand-offs (D-08, no forked edit path)"

patterns-established:
  - "Pattern: History rows are navigation-only into read-only views; the newest row is marked (Latest) and non-navigational — it IS the version the detail already shows"
  - "Pattern: revise prefill maps stored inputs → BirthFormValues exactly (date, normalized time or '' for Unknown, place_form union verbatim, confidence, house_system) — the stored contract is the single prefill source (Pattern 5)"

requirements-completed: [WORK-04]

# Metrics
duration: 12 min
completed: 2026-08-27
status: complete
---

# Phase 03 Plan 07: Revision History + Revise Flow Summary

**Fixed-vocabulary "what changed" diffs over stored inputs, a read-only /chart/revision route rendering frozen evidence with zero mutating controls, and the D-08 revise flow — stored inputs prefill the unchanged Phase-2 birth form, chartId threads birth → confirm → result, and "Save new version" appends under the same chart with the honest dedupe state**

## Performance

- **Duration:** 12 min (started 2026-08-27T19:48:35Z, completed 2026-08-27T20:00:51Z)
- **Tasks:** 2 (both TDD RED→GREEN)
- **Files modified:** 14 (6 created, 8 modified)

## Accomplishments

- History (D-07): RevisionHistory renders only when >1 revision exists, rows read "{date} · {what changed}" newest-first, the newest row alone carries the "Latest" chip and is non-navigational, older rows are single-tap links emitting revisionId into the read-only view — exact copy-deck a11y template on every row
- The "what changed" derivation (A-3-UI-7/T-03-24): pure input-diff functions return exactly one of the fixed 8-item vocabulary phrases ("Birth date changed" … "House system changed") with the "Details changed" fallback for multi-field changes; the chart's first revision reads "Original details"; identical inputs stay inside the closed vocabulary (the (chart, input_revision) dedupe makes that pair unreachable)
- Read-only revision view (T-03-22): /chart/revision?id= renders the "Earlier version — read-only" marker card ("{date} · {what changed}"), the full Phase-2 composition from that revision's stored envelope with NO assumptions action, no rename, no data actions, and "Back to History"; missing id / unknown revision / unknown chart redirect home; a typed OPEN_FAILED read renders the open-failed card — never partial
- Revise flow (D-08): "Revise birth details" (with the "The current one stays in History." trust helper) pushes /birth with a revise param {chartId, latest stored inputs}; the form prefills every field (place via the place_form union, Unknown strips the noon reference), the local zod parse falls back to the fresh form on malformed params (T-03-23), and the confirm → calculate chain runs EXACTLY as Phase 2 — chartId merely rides the hand-offs
- Save new version (WORK-04): the revise-flow result CTA reads "Save new version" and calls saveChart WITH chartId → append under the same chart; identical inputs return appended:false → "Saved ✓" + "Already saved with these exact details."; the fresh flow keeps "Save chart" and creates a new chart; History rows follow the repository (append → one more row), keeping prior-revision immutability visible

## Task Commits

All tasks followed TDD RED→GREEN:

1. **Task 1: revision-diff pure functions + History component + read-only route** — `ccf6650` (test, RED) + `ccaa9ef` (feat, GREEN)
2. **Task 2: revise flow — prefill threading + Save new version** — `1bc96ef` (test, RED) + `e4e1ccf` (feat, GREEN)

**Plan metadata:** (see final docs commit below)

## Verification Evidence

- Task 1: `npx vitest run src/__tests__/revision-diff.test.ts src/__tests__/revision-history.test.tsx` → 26/26 pass (RED first failed: modules absent; two test-side fixes during GREEN — missing vitest import in the pure file, waitFor for the chained revision→detail query)
- Task 2: `npx vitest run src/__tests__/revise-prefill.test.tsx src/__tests__/revision-history.test.tsx && npx tsc --noEmit` → 26/26 pass, tsc exit 0 (RED: 11 revise-specific failures, 4 fresh-flow rows already green)
- Plan-level: targeted set 41/41 across all three files; full suite `npx vitest run` → 37 files / 387 tests pass (was 36/372 after Task 1, 34/346 at plan start — +3 files, +41 tests, zero regressions); `npx tsc --noEmit` exit 0 with chart/revision typed routes regenerated via dev-server boot (01-02 law)
- Threat-model dispositions implemented and test-enforced: T-03-22 (read-only earlier views + visible stays-in-History language + History follows repository), T-03-23 (local zod parse of the revise param, malformed → fresh-form fallback — tested), T-03-24 (fixed-vocabulary phrases from pure diffs — every phrase unit-tested)

## Files Created/Modified

- `src/lib/workspace/revision-diff.ts` — whatChangedPhrase / revisionHistoryEntries / formatHistoryDate (pure, phrase constants imported from the copy deck)
- `src/components/workspace/revision-history.tsx` — D-07 History list (Latest chip, link rows, present-only section)
- `src/app/chart/revision.tsx` — read-only earlier-revision route (marker card + stored-evidence composition + Back to History)
- `src/app/birth.tsx` — revise mode: reviseParamSchema parse, reviseDefaults mapping, title swap, chartId threading into the confirm hand-off
- `src/app/birth/confirm.tsx` — chartId param accepted beside the draft and re-emitted on the result push
- `src/app/chart/result.tsx` — chartId param → "Save new version" CTA + saveChart with chartId (append); fresh flow unchanged
- `src/app/chart/saved.tsx` — assumptions action becomes "Revise birth details" (+helper) pushing the revise param; RevisionHistory mounted between UnavailableFactors and DataActions
- `src/app/_layout.tsx` — chart/revision registered (+ typed routes regenerated)
- `src/hooks/use-workspace.ts` — useRevisionContent query (charts-tree key)
- `src/components/chart/assumptions-line.tsx` — optional action + label/helper overrides (read-only and revise variants)
- `src/components/workspace/copy.ts` — what-changed vocabulary, History/marker/back-link strings, revise title/action/helper, SAVE_NEW_VERSION_CTA
- `src/__tests__/revision-diff.test.ts` — 15 pure unit rows (vocabulary exactness, fallback, ordering, dates)
- `src/__tests__/revision-history.test.tsx` — 11 rows (component render rules + revision-route read-only/no-mutation/redirect/typed-error)
- `src/__tests__/revise-prefill.test.tsx` — 15 rows (prefill, title, T-03-23 fallback, chartId threading through both hand-offs, both save outcomes, History row-count growth)

## Decisions Made

See key-decisions. Notably: phrase constants live in the copy deck with revision-diff importing them (one exact-copy definition site); the revision view chains getRevisionContent (envelope) with the cache-shared chart detail (diff context) under the same query key; AssumptionsLine gained an optional action rather than a forked read-only variant; the Unknown prefill strips the 12:00 noon reference to the honest empty field.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] AssumptionsLine needed optional action props (file not in the plan's lists)**
- **Found during:** Task 1 (read-only composition)
- **Issue:** The plan requires the revision view to render AssumptionsLine with "the assumptions action absent" and the saved detail to swap the action to "Revise birth details" — impossible without touching assumptions-line.tsx, which appears in neither task's `<files>`
- **Fix:** Made `onAdjust` optional (absent → no action renders at all) and added optional `actionLabel`/`actionHelper` overrides — additive, Phase-2 callers (result screen) and their tests unchanged and green
- **Files modified:** src/components/chart/assumptions-line.tsx
- **Verification:** full suite green (372→387 tests), tsc exit 0; revision-history tests assert "Adjust & recalculate" absent on the revision view
- **Committed in:** ccaa9ef

**2. [Rule 3 - Blocking] useRevisionContent hook pulled forward into Task 1**
- **Found during:** Task 1 (revision route data source)
- **Issue:** revision.tsx consumes a getRevisionContent query; the hook lives in use-workspace.ts which the plan lists under Task 2's files ("Add useRevisionContent hook if the revision view needs it" — it needs it)
- **Fix:** Added the hook in Task 1's GREEN commit (charts-tree query key, retry:false, availability-gated); Task 2 needed no further hook changes
- **Files modified:** src/hooks/use-workspace.ts
- **Verification:** revision-route tests green through the hook
- **Committed in:** ccaa9ef

---

**Total deviations:** 2 auto-fixed (2 blocking — files-outside-list changes required to complete the planned behavior)
**Impact on plan:** No production behavior differs from the plan's must-haves; both fixes are additive and test-enforced. No scope creep.

## Issues Encountered

- Two test-side corrections during Task 1 GREEN (before its commit): the pure diff test file was missing its vitest imports, and the revision-route tests needed waitFor for the two-phase revision→detail query chain — both folded into the RED test files before the GREEN commit.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All plan-frontmatter symbols exist for later plans: revision-diff.ts trio (whatChangedPhrase/revisionHistoryEntries/formatHistoryDate), RevisionHistory ({revisions, onOpenRevision, testID}), /chart/revision (id param contract), birth revise-mode param contract ({chartId, inputs} via storedCalculationInputsSchema), result chartId + "Save new version" contract, confirm chartId threading, copy.ts history/revise/marker strings
- ROADMAP Success Criteria 1 + 2 close together: the full loop (save → browse → reopen → revise → append → history) is test-walkable end to end
- 03-08 (delete-all + export-all) is the last plan of the phase; DeleteConfirm's all variant and the DELETE_ALL_* copy are already in place from 03-06
- Device-only behaviors (History row taps, the revise round-trip on device) remain end-of-phase UAT per human_verify_mode = end-of-phase

## TDD Gate Compliance

Plan type is `execute` with per-task `tdd="true"` — both tasks committed in RED→GREEN order:
- Task 1: `test(03-07)` ccf6650 precedes `feat(03-07)` ccaa9ef ✓
- Task 2: `test(03-07)` 1bc96ef precedes `feat(03-07)` e4e1ccf ✓

## Self-Check: PASSED

All fourteen created/modified files exist on disk; all four task commits verified in git log (ccf6650, ccaa9ef, 1bc96ef, e4e1ccf); plan verification commands re-run green (revision-diff 15/15, revision-history 11/11, revise-prefill 15/15, full suite 37 files/387 tests, tsc exit 0).

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*
