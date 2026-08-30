---
phase: 03-private-local-workspace
plan: 06
subsystem: ui
tags: [react-native, expo-file-system, expo-sharing, tanstack-query, workspace, saved-charts, rename, delete-confirm, export, share-sheet, rntl, vitest, privacy]

# Dependency graph
requires:
  - phase: 03-private-local-workspace (plan 03)
    provides: WorkspaceRepository renameChart/deleteChart/getRevisionContent, explicit transactional cascade, labelSchema + slugify, WorkspaceError vocabulary
  - phase: 03-private-local-workspace (plan 04)
    provides: workspace copy deck + ErrorCard, use-workspace hook module + CHARTS_QUERY_KEY invalidation convention, RN Modal dialog pattern (save-prompt)
  - phase: 03-private-local-workspace (plan 05)
    provides: /chart/saved detail route (useWorkspaceChart, id-param law), saved-detail copy deck, fireEvent-on-query-mounted-screens test law
provides:
  - The chart-control slice — inline rename (D-12/WORK-05), confirmation-gated delete with explicit cascade scope (D-14/WORK-06), and single-chart JSON export with slug-sanitized filename + capability-gated native share (D-13/WORK-07), all wired into /chart/saved
  - DeleteConfirm — the ONE shared destructive-confirm modal (variant chart|all) whose all variant carries the exact 03-08 delete-all copy
  - export.ts — buildExportPayload / buildExportFilename / exportChartRevision (lemastra-chart-<slug>-<revision-id>.json, 2-space pretty provenance-complete JSON under Paths.cache, isAvailableAsync-gated shareAsync with application/json, typed unavailable result)
  - DataActions end-of-screen card (export row with pending state + error-toned delete row with {n} revision helper)
  - useRenameChart / useDeleteChart mutations with the Pitfall-10 invalidation map (['charts'] sweeps list + detail)
  - copy.ts additions — rename/delete dialog strings with {label}/{n} interpolation helpers + data-actions strings
affects: [03-07 (revise flow consumes detail wiring), 03-08 (delete-all reuses DeleteConfirm all variant + delete-all copy), privacy-data-controls]

# Tech tracking
tech-stack:
  added: []  # expo-file-system ~57.0.6 + expo-sharing ~57.0.16 were pre-installed; first consumption
  patterns:
    - variant-driven shared destructive dialog: one RN Modal component pulls chart|all strings from the copy deck via props — 03-08 mounts the all variant unchanged
    - capability-gated egress: write-then-gate-then-share (File under Paths.cache → isAvailableAsync → shareAsync(file.uri, application/json)) with a typed unavailable result the caller renders as the capability state
    - pure-builder + device-adapter split in export.ts (buildExportFilename/buildExportPayload unit-testable without device APIs; exportChartRevision is the only device-touching function)
    - export-module seam mocked in screen tests (identity buildExportPayload passthrough) — the expo-file-system/expo-sharing import graph never loads in vitest

key-files:
  created:
    - src/components/workspace/delete-confirm.tsx
    - src/components/workspace/rename-control.tsx
    - src/components/workspace/data-actions.tsx
    - src/lib/workspace/export.ts
    - src/__tests__/delete-confirm.test.tsx
    - src/__tests__/rename-control.test.tsx
    - src/__tests__/chart-export.test.ts
  modified:
    - src/app/chart/saved.tsx
    - src/hooks/use-workspace.ts
    - src/components/workspace/copy.ts
    - src/__tests__/saved-chart-detail.test.tsx

key-decisions:
  - "DeleteConfirm is variant-driven (chart | all) with copy pulled from the deck — one dialog pattern serves D-14 now and D-15 in 03-08 unchanged; confirm is the only error-filled element and pending swaps its label to 'Deleting…'"
  - "Export shares a typed result contract ({status: shared|unavailable}) — unavailable is a capability state rendered as the existing WebUnsupported card (the deck's only approved capability copy), never an error"
  - "EXPORT_PENDING reuses the deck's export-pending literal 'Creating file…' (approved in UI-SPEC §Your data) for the single-chart trigger — one export-pending vocabulary"
  - "Rename failure has no invented copy: after commit the editing UI closes and the title follows the invalidated detail query (no approved rename-error string exists; nothing is lost on failure)"
  - "Delete 'Try again' retries the already-confirmed delete directly (confirmation was given; the retry re-runs the same cascade) — export 'Try again' re-runs the export"

patterns-established:
  - "Pattern: destructive actions = row → shared DeleteConfirm modal → repository mutation → ['charts'] invalidation + explicit dismiss-on-success; failure closes the modal and renders the exact error deck with Try again"
  - "Pattern: screen tests mock the export module seam with an identity buildExportPayload — device-API modules stay out of the vitest graph (extends the D-03 repository-seam convention)"
  - "Pattern: share-unavailable renders the WebUnsupported capability card — capability states never masquerade as errors"

requirements-completed: [WORK-05, WORK-06, WORK-07]

# Metrics
duration: 12 min
completed: 2026-08-27
status: complete
---

# Phase 03 Plan 06: Chart Controls Summary

**D-12 inline rename, D-14 confirmation-gated cascade delete, and D-13 slug-sanitized JSON export with capability-gated native share — all wired into the saved-chart detail through the Pitfall-10 invalidation map, with the one shared destructive dialog 03-08 reuses**

## Performance

- **Duration:** 12 min (started 2026-08-27T19:30:45Z, completed 2026-08-27T19:42:37Z)
- **Tasks:** 3 (all TDD RED→GREEN)
- **Files modified:** 11 (7 created, 4 modified)

## Accomplishments

- Rename (WORK-05): the Display title swaps to a labelSchema-gated TextInput (birth.tsx validated-input idiom) — "Save name" disabled until the trimmed 1–60 bound passes, the exact copy-deck error in a polite live region, commit emits the trimmed label through repository.renameChart(chartId, label), and the ['charts'] invalidation refreshes both the title and the home list; revisions are never touched
- Delete (WORK-06): the shared DeleteConfirm modal names the chart ('Delete "{label}"?'), its revision count, permanence, and can't-undo; confirm runs the explicit transactional cascade and dismisses the detail home; cancel removes nothing; failure closes the modal and renders "Couldn't delete this chart." with a working Try again — nothing silently retried (retry: false)
- Export (WORK-07): lemastra-chart-<slug>-<revision-id>.json written as 2-space pretty provenance-complete JSON of {chartId, revisionId, label, identity, envelope} under Paths.cache via the OO File API (overwrite on re-export), then shareAsync(file.uri, application/json) gated on Sharing.isAvailableAsync() — slug sanitization (emoji/spaces/separators, 40-cap, "chart" fallback) is unit-tested BEFORE any File construction (T-03-18)
- The one dialog pattern: DeleteConfirm's variant prop (chart | all) renders the exact 03-08 delete-all copy from the deck — delete-all in 03-08 mounts this component unchanged
- Failure states are exact-deck and honest: export failure renders "Couldn't create the export file." + Try again; share-unavailable renders the capability card (a state, not an error)

## Task Commits

All tasks followed TDD RED→GREEN:

1. **Task 1: shared destructive confirm modal + inline rename control** — `570c400` (test, RED) + `db95700` (feat, GREEN)
2. **Task 2: export module — slug filename, cache write, capability-gated share** — `f3f5e2f` (test, RED) + `4988315` (feat, GREEN)
3. **Task 3: wire rename/export/delete into the saved-chart detail** — `62fa7a3` (test, RED) + `96f4720` (feat, GREEN)

**Plan metadata:** (see final docs commit below)

## Verification Evidence

- Task 1: `npx vitest run src/__tests__/delete-confirm.test.tsx src/__tests__/rename-control.test.tsx` → 22/22 pass (RED first failed: modules absent)
- Task 2: `npx vitest run src/__tests__/chart-export.test.ts` → 12/12 pass (RED first failed: module absent; one slug-cap expectation corrected pre-commit during RED review)
- Task 3: `npx vitest run src/__tests__/rename-control.test.tsx src/__tests__/delete-confirm.test.tsx src/__tests__/saved-chart-detail.test.tsx && npx tsc --noEmit` → 37/37 pass, tsc exit 0 (RED: 8 wired-flow failures, 29 pre-existing green)
- Plan-level: targeted set 38/38; full suite `npx vitest run` → 34 files / 346 tests pass (was 31/304 at plan start — +3 files, +42 tests, zero regressions); `npx tsc --noEmit` exit 0 (no new routes → no typed-routes regen needed)
- Threat-model dispositions implemented and test-enforced: T-03-18 (slug sanitization before File construction, emoji/slash/traversal labels tested), T-03-19 (modal names scope + permanence; cancel default; cascade proven in 03-03), T-03-21 (capability gate + cache-dir file uri share)

## Files Created/Modified

- `src/components/workspace/delete-confirm.tsx` — the shared destructive-confirm RN Modal (chart|all variants, error-only confirm fill, pending "Deleting…", accessibilityViewIsModal)
- `src/components/workspace/rename-control.tsx` — D-12 inline title swap with labelSchema-gated Save name, polite live-region error, trimmed commit, cancel restores
- `src/components/workspace/data-actions.tsx` — end-of-screen card: export row (pending "Creating file…") + error-toned delete row with the {n} revision helper
- `src/lib/workspace/export.ts` — buildExportFilename (T-03-18 slug gate), buildExportPayload, exportChartRevision (Paths.cache OO write + isAvailableAsync gate + shareAsync application/json)
- `src/app/chart/saved.tsx` — RenameControl at the title, DataActions + DeleteConfirm mounting, export flow with pending/unavailable/failed states, delete success-dismiss-home and failure-error-card effects
- `src/hooks/use-workspace.ts` — useRenameChart / useDeleteChart (retry false, ['charts'] invalidation map)
- `src/components/workspace/copy.ts` — rename + delete-dialog strings with deleteChartHeading/deleteChartBody interpolation helpers, DELETING, DELETE_ALL_* (03-08 copy), EXPORT_CHART_DATA/HELPER/PENDING, deleteChartActionHelper
- `src/__tests__/delete-confirm.test.tsx` — 10 component rows (exact copy, error-only fill, pending, variants, cancel no-op) + 3 wired delete flows
- `src/__tests__/rename-control.test.tsx` — 8 component rows (swap, prefill, bounds, trimmed commit, cancel restores) + 1 wired rename flow (invalidation + title refresh asserted)
- `src/__tests__/chart-export.test.ts` — 12 rows (slug sanitization/cap/fallback/uniqueness, key order, pretty parse-back deep-equality, gated share invocation, typed unavailable, overwrite)
- `src/__tests__/saved-chart-detail.test.tsx` — export-module seam mock + 4 export wiring rows (payload of latest revision, pending, capability card, failure + Try again)

## Decisions Made

See key-decisions. Notably: share-unavailable renders the existing capability card (no invented copy); EXPORT_PENDING reuses the deck's approved export-pending literal; rename failure surfaces through the query (no approved rename-error string exists); both Try again actions re-run their confirmed operation directly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] saved-chart-detail.test.tsx needed the export-module seam mock**
- **Found during:** Task 3 (RED)
- **Issue:** saved.tsx now imports @/lib/workspace/export → expo-file-system/expo-sharing have no vitest alias; the pre-existing detail suite (in the plan's verify command) would fail on import of the real module (expo-modules-core `__DEV__` crash)
- **Fix:** mocked the export seam in that file (identity buildExportPayload passthrough + captured exportChartRevision), extending the D-03 repository-seam convention; the export wiring tests live in this file
- **Files modified:** src/__tests__/saved-chart-detail.test.tsx
- **Verification:** 11/11 detail tests pass; full suite green
- **Committed in:** 62fa7a3 + 96f4720

**2. [Rule 1 - Bug] Wired-flow fixtures widened Confidence/HouseSystem to string**
- **Found during:** Task 3 (tsc gate)
- **Issue:** the two new wired fixtures' `inputs` literals type-widened (`confidence: string`) and failed tsc against StoredCalculationInputs; rename-control.tsx also referenced a removed styles.trigger
- **Fix:** `as const` on both fixtures (the saved-chart-detail fixture precedent); trigger reuses the 44dp action style
- **Files modified:** src/__tests__/rename-control.test.tsx, src/__tests__/delete-confirm.test.tsx, src/components/workspace/rename-control.tsx
- **Verification:** tsc --noEmit exit 0; all suites green
- **Committed in:** 96f4720

---

**Total deviations:** 2 auto-fixed (1 blocking test-infrastructure, 1 type/lint fix)
**Impact on plan:** No production behavior differs from the plan; both fixes keep mandated verifications runnable. No scope creep.

## Issues Encountered

- The export mock's first draft used `importOriginal` for the pure builder — loading the real module drags expo-modules-core into the node graph (`__DEV__` ReferenceError). Replaced with the identity-passthrough factory (documented as a pattern for 03-08's export-all wiring).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All plan-frontmatter symbols exist for later plans: DeleteConfirm ({variant: chart|all, label, revisionCount, pending, onConfirm, onCancel}), RenameControl ({label, onCommit}), DataActions ({revisionCount, onExport, exportPending, onDelete}), export.ts trio (buildExportFilename/buildExportPayload/exportChartRevision), useRenameChart/useDeleteChart, copy.ts rename/delete/export/data-actions strings (DELETE_ALL_* ready for 03-08)
- 03-07 (revise flow) mounts onto the detail's stored inputs (detail.latest.inputs already carried by useWorkspaceChart); 03-08 (delete-all + export-all) reuses the all-variant dialog and follows the export seam-mock pattern
- Device-only behaviors (real share sheet presentation, cache-dir file creation on device) remain end-of-phase UAT per human_verify_mode = end-of-phase

## TDD Gate Compliance

Plan type is `execute` with per-task `tdd="true"` — all three tasks committed in RED→GREEN order:
- Task 1: `test(03-06)` 570c400 precedes `feat(03-06)` db95700 ✓
- Task 2: `test(03-06)` f3f5e2f precedes `feat(03-06)` 4988315 ✓
- Task 3: `test(03-06)` 62fa7a3 precedes `feat(03-06)` 96f4720 ✓

## Self-Check: PASSED

All eleven created/modified files exist on disk; all six task commits verified in git log (570c400, db95700, f3f5e2f, 4988315, 62fa7a3, 96f4720); plan verification commands re-run green (delete-confirm 13/13 within its file, rename-control 16/16, chart-export 12/12, saved-chart-detail 11/11, full suite 34 files/346 tests, tsc exit 0).

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*
