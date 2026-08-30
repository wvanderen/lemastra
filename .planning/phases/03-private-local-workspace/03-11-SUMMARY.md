---
phase: 03-private-local-workspace
plan: 11
subsystem: ui
tags: [workspace, error-handling, copy-deck, react-native, tanstack-query, uat-gap-closure]

# Dependency graph
requires:
  - phase: 03-10
    provides: the dependency-free WorkspaceError/WorkspaceErrorCode module (errors.ts) + repository re-exports, and the console observability this plan surfaces on screen
  - phase: 03-05
    provides: the home workspace screen + useWorkspaceCharts query seam and the fireEvent.press-on-accessible-host test law
  - phase: 03-04
    provides: the result-screen save flow (ErrorCard placement, renderResult/saveThroughPrompt test idioms)
provides:
  - saveErrorCodeLine(code) deck template — the only definition site of the save-error code caption ("Error code: {CODE}")
  - Save-error card code caption: WorkspaceError rejections render the failure class beneath the unchanged card (testID result-save-error-code); plain-Error rejections render no caption
  - HOME_LIST_ERROR_COPY deck class + home-list-error card with Try-again refetch — a failed boot-time listCharts is no longer pixel-identical to the empty workspace
  - Test coverage: class-reflecting caption (SAVE_FAILED vs OPEN_FAILED), engine-message-never-on-screen, refetch recovery, empty-vs-error distinctness
affects: [UAT re-run (Test 1), phase-04+, telemetry evidence quoting]

# Tech tracking
tech-stack:
  added: []  # zero new packages (T-03-11-SC)
  patterns:
    - "instanceof-gated caption: the screen discriminates the typed class from its dependency-free home (errors.ts singleton identity holds in every test mock graph)"
    - "isError-precedence branch law on query-mounted lists: a failed list NEVER half-renders (no heading over zero rows) — the error card is what carries the state"
    - "Code-only disclosure: closed machine-enum tokens may cross the storage→UI trust boundary; engine messages never do (T-03-11-01)"

key-files:
  created: []
  modified:
    - src/components/workspace/copy.ts
    - src/app/chart/result.tsx
    - src/app/index.tsx
    - src/__tests__/save-flow.test.tsx
    - src/__tests__/home-workspace.test.tsx

key-decisions:
  - "result.tsx imports the WorkspaceError CLASS from @/lib/workspace/errors (its dependency-free home) rather than the repository re-export — singleton identity makes instanceof reliable in every test graph (save-flow's partial repository mock needs no pass-through), and the component graph stays free of the full repository/db module; copy.ts takes the TYPE from @/lib/workspace/repository per the plan's stable-re-export-site instruction (type-only import is erased at runtime)"
  - "HOME_LIST_ERROR_COPY wording: couldn't-load framing + \"still saved on this device. Nothing was lost.\" reassurance + Try again — the deck's established error voice; defined once in the deck, screens never paraphrase"
  - "isError takes precedence over hasCharts in the home ternary (a background-refetch failure with cached rows would otherwise half-render); hero + calculate CTA remain while errored — calculation needs no DB"

patterns-established:
  - "Failure-class surfacing: deck template over the WorkspaceErrorCode enum renders ONLY the token; message bodies stay in redact()-filtered logs (extends 03-10's logging contract to the screen)"

requirements-completed: [WORK-01, WORK-03]

# Metrics
duration: 2 min
completed: 2026-08-29
status: complete
---

# Phase 3 Plan 11: UAT gap closure — on-screen failure classes Summary

**Save-error card now carries the WorkspaceError code (deck-templated "Error code: {CODE}") and home renders a distinct, retryable couldn't-load error card instead of rendering a failed boot-time listCharts identically to an empty workspace — 430 tests green (was 425), tsc clean.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-29T21:55:03Z
- **Completed:** 2026-08-29T21:56:49Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Missing item 4 closed: a failed save shows the WorkspaceError code beneath the unchanged save-error card — a UAT report quoting the screen now carries the failure class (e.g. SAVE_FAILED vs OPEN_FAILED) without console access. The caption reflects the actual class (test-proven with two different codes), and the engine message never reaches the screen (asserted).
- Missing item 5 closed (the diagnosis's secondary finding): a failed boot-time listCharts renders the home couldn't-load card (exact deck copy + Try again that refetches) — no saved-charts heading over zero rows, hero and calculate CTA remain. A dead DB can no longer hide as "no charts": empty, web-degradation, and error states are mutually distinct and test-pinned.
- Copy-deck law holds: both new strings are deck-defined and test-asserted (saveErrorCodeLine template + HOME_LIST_ERROR_COPY card class); SAVE_ERROR_COPY stays byte-identical — every pre-existing exact-copy assertion passes unmodified (save-prompt's toEqual shape included).

## Task Commits

Each task was committed atomically:

1. **Task 1: Save-error card carries the WorkspaceError code** - `865da55` (feat)
2. **Task 2: Distinct home chart-list error state (no longer identical to empty)** - `0e982bb` (feat)

**Plan metadata:** (docs: complete plan — see below)

## Files Created/Modified
- `src/components/workspace/copy.ts` - saveErrorCodeLine(code) template + HOME_LIST_ERROR_COPY card class — the only new copy definition sites (code token only, never engine prose)
- `src/app/chart/result.tsx` - save-error block: unchanged ErrorCard + caption rendered only when save.error instanceof WorkspaceError (testID result-save-error-code)
- `src/app/index.tsx` - charts.isError branch (native only): ErrorCard with HOME_LIST_ERROR_COPY + charts.refetch action (testID home-list-error); isError precedence over hasCharts
- `src/__tests__/save-flow.test.tsx` - real-WorkspaceError rejections: SAVE_FAILED caption present + engine message absent; OPEN_FAILED reflects the actual class; plain-Error case asserts caption absent (additive)
- `src/__tests__/home-workspace.test.tsx` - failed-list coverage: exact-copy error card, no heading/rows while errored, hero/CTA remain, Try-again refetch recovery (reject-once-then-resolve), empty-vs-error distinctness

## Decisions Made
See key-decisions in frontmatter. Additionally:
- The caption groups tightly with its card (wrapper View, gap Spacing.one) — the caption belongs to the card, not the page-level content rhythm; the ErrorCard itself keeps identical props and testID.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## UAT re-run readiness (per plan verification)
- A failed save on device now shows the failure class on screen (e.g. "Error code: SAVE_FAILED") beneath the couldn't-save card.
- A failed home list shows the couldn't-load card with a working Try again; an empty workspace shows neither.
- Combined with 03-10's console observability + self-healing gate, the UAT tester can re-run Test 1 and either pass or report a named, class-carrying failure.

## Threat Model Compliance
- T-03-11-01 (mitigated): only the closed WorkspaceErrorCode enum token renders — deck template over a machine enum; the engine message never reaches the screen (test-enforced: "sqlite: database disk image is malformed" asserted absent); no birth data, labels, or payload fragments can appear in either card.
- T-03-11-02 (accepted): refetch is user-initiated via the card action; TanStack retry posture unchanged.

## Next Phase Readiness
- All five UAT Test 1 gap items closed (03-10: items 1–3; this plan: items 4–5). The phase-03 gap-closure wave is complete; ready for the UAT re-run.
- No regressions: full suite 430 tests green, `npx tsc --noEmit` clean, zero new dependencies, zero existing assertions modified.
- Blockers: none. (Pre-existing planning-dir working-tree noise — deleted debug doc, untracked diagnosis/research-cache files — predates this plan and stays with the orchestrator.)

## Self-Check: PASSED

All five key-files exist on disk; both task commits (865da55, 0e982bb) present in git log; full verification (`npx vitest run` → 430 passed across 40 files, `npx tsc --noEmit` → clean) executed after the final task.

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-29*
