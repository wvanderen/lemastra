---
phase: 03-private-local-workspace
plan: 10
subsystem: database
tags: [expo-sqlite, drizzle, workspace, error-handling, logging, redaction, testing]

# Dependency graph
requires:
  - phase: 03-01
    provides: the workspace DB gate (getWorkspaceDb), drizzle schema/migrations, and the node:sqlite vitest facade these changes harden and test against
  - phase: 03-02
    provides: the redact() allowlist + sanctioned logger (D-16 telemetry law) this plan extends with error_message
  - phase: 03-03
    provides: the workspace repository, WorkspaceError vocabulary, and the expo-crypto package-boundary mock convention
  - phase: 03-09
    provides: the bundled drizzle migration wiring (metro/babel) the gate depends on
provides:
  - Typed-error module src/lib/workspace/errors.ts (WorkspaceErrorCode + WorkspaceError, dependency-free; repository re-exports preserve every existing import path)
  - Sanctioned-logger observability at the storage error boundary — every newly-wrapped engine failure logs error_code + error_message before re-throwing; already-typed errors pass through unlogged
  - Hardened DB gate — typed+logged OPEN_FAILED on open/migrate/shape failure, post-migrate PRAGMA shape verification derived from the drizzle schema, dev-build-only self-heal (FK-ordered drops + re-migrate, one bounded attempt, warn-logged); production builds never wipe
  - error_message as an allowlisted log key (storage-engine failure text only — structurally guaranteed)
  - Sync-path test coverage: UUIDv4 id contract through the real save path, randomUUID-failure → typed+logged SAVE_FAILED, restart round-trip through the same gate the device runs
affects: [03-11, phase-07-telemetry, UAT re-run]

# Tech tracking
tech-stack:
  added: []  # zero new dependencies (T-03-10-SC)
  patterns:
    - "Dependency-free typed-error module breaking the repository↔db import cycle (errors.ts imports nothing; both sides re-export)"
    - "Post-migrate shape verification: PRAGMA table_info column-name sets vs drizzle getTableColumns(schema) — zero-maintenance as the schema evolves"
    - "Runtime-safe __DEV__ probe (declare const + typeof guard) for dev-only behavior that must default off under plain-Node vitest"
    - "Engine-failure logging contract: fixed compile-time message argument; engine text rides ONLY in redact()-filtered metadata keys"

key-files:
  created:
    - src/lib/workspace/errors.ts
    - src/__tests__/workspace-sync-path.test.ts
  modified:
    - src/lib/workspace/repository.ts
    - src/lib/workspace/db.ts
    - src/lib/redact.ts
    - src/__tests__/redact.test.ts
    - src/__tests__/workspace-db.test.ts

key-decisions:
  - "WorkspaceError extracted to a dependency-free errors.ts (db.ts must throw the typed error; repository imports db, so db must not import repository) — repository re-exports keep all 425-test import paths unchanged"
  - "redact allowlist gains error_message as the deliberate review-visible act the module's law requires: storage-engine failure text only, structurally guaranteed (zod/parse failures keep fixed copy and never reach the wrap boundary)"
  - "Gate hardening lives entirely in the gate (not migration SQL regeneration): shape check derives expected columns from drizzle getTableColumns, dev self-heal uses FK-ordered DROP IF EXISTS + re-migrate on the same drizzle instance"
  - "Dev self-heal is bounded to ONE attempt and production NEVER wipes (T-03-10-02); the heal spares everything outside SQLite (same sparing semantics as deleteAllData)"
  - "Heal-bounded test fixture uses an un-droppable VIEW named chart_revisions (DROP TABLE cannot remove it) — proves the bound end-to-end without stubbing the migrate module"

patterns-established:
  - "Sanctioned logging at typed-error boundaries: log only on the wrap branch (newly-wrapped engine failures), fixed compile-time message + { error_code, error_message } metadata"
  - "Gate-stage vocabulary (open → migrate → shape verification → self-heal re-migrate → self-heal shape verification) named in typed OPEN_FAILED copy and log metadata"

requirements-completed: [WORK-02, PRIV-03, PRIV-04]

# Metrics
duration: 6 min
completed: 2026-08-29
status: complete
---

# Phase 3 Plan 10: Storage-error observability + self-healing DB gate Summary

**Typed+logged storage error boundary (errors.ts + sanctioned-logger wrap in toWorkspaceError), hardened DB gate with PRAGMA shape verification and a bounded dev-build self-heal for stale device databases, plus the sync-path test coverage (UUIDv4 contract, randomUUID-failure → logged SAVE_FAILED) the 415-test suite never had — 425 tests green, tsc clean.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-08-29T21:34:34Z
- **Completed:** 2026-08-29T21:40:07Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Missing item 1 closed: every newly-wrapped engine failure at the repository error boundary is logged through the sanctioned logger with `error_code` + `error_message` (engine text) before re-throwing — one save attempt on the UAT device now names the exact exception in the Metro console; already-typed errors (NOT_FOUND etc.) stay log-quiet.
- Missing item 2 closed: `getWorkspaceDb` never lets a raw error escape — gate failures are typed+logged WorkspaceError OPEN_FAILED naming the failed stage; a post-migrate PRAGMA shape check catches device-resident DBs whose journal row makes drizzle skip re-migration over a stale shape (ranked root cause 1); dev builds self-heal once via FK-ordered drops + re-migrate (observable as saveChart succeeding against a previously-conflicting DB); production builds fail typed without wiping.
- Missing item 3 closed: sync-path coverage at every reachable seam — persisted chart/revision ids satisfy the UUIDv4 contract through the real ids module + drizzle insert path; a randomUUID throw surfaces as typed AND logged SAVE_FAILED with the transaction rolled back; full save → close → reopen round-trip through the same gate the device runs.
- The telemetry law stays build-enforced: telemetry-guard.test.ts green and untouched (no exemption file exists), repository/db log only through the imported sanctioned logger, and `error_message` joins the frozen allowlist with its documented safety invariant.

## Task Commits

Each task was committed atomically:

1. **Task 1: Typed-error extraction + sanctioned logging at the repository error boundary** - `06ab6c1` (feat)
2. **Task 2: Harden the DB gate — typed OPEN_FAILED, shape verification, dev-build self-heal** - `2a72ad0` (feat)
3. **Task 3: Gate self-heal + sync-path test coverage** - `803c14e` (test)

**Plan metadata:** (docs: complete plan — see below)

## Files Created/Modified
- `src/lib/workspace/errors.ts` - WorkspaceErrorCode + WorkspaceError, dependency-free (breaks the repository→db cycle); both re-exported from repository.ts
- `src/lib/workspace/repository.ts` - re-exports the typed errors; toWorkspaceError logs newly-wrapped engine failures via the sanctioned logger ({ error_code, error_message }) and passes already-typed errors through unlogged
- `src/lib/workspace/db.ts` - hardened gate: typed+logged OPEN_FAILED with stage names, PRAGMA table_info shape verification against drizzle getTableColumns, dev-only one-shot self-heal (FK-ordered drops + re-migrate, warn-logged), guarded client close, memo-clear retry semantics preserved
- `src/lib/redact.ts` - allowlist extended with `error_message` + review-visible rationale (storage-engine text only; structurally guaranteed)
- `src/__tests__/redact.test.ts` - new-key coverage: primitive pass-through, non-primitive default-deny, never-emits-outside-allowlist assertion includes error_message
- `src/__tests__/workspace-db.test.ts` - four gate scenarios: stale-shape+journal self-heal (saveChart succeeds after), same fixture dev-off → typed OPEN_FAILED with the missing column observable via the logger spy, partial-migration recovery, bounded heal (un-droppable VIEW fixture)
- `src/__tests__/workspace-sync-path.test.ts` - UUIDv4 contract through the real save path; randomUUID throw → typed+logged SAVE_FAILED + rollback; NOT_FOUND unlogged; restart round-trip through the gate

## Decisions Made
See key-decisions in frontmatter. Additionally:
- The thrown OPEN_FAILED message is fixed developer copy naming the failed stage; the underlying engine text rides only in the log metadata (`error_message`) — app code gets stable copy, diagnostics get the engine detail.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] redact.test.ts expectation for object-valued `error_message` corrected to the module's documented container law**
- **Found during:** Task 1 (redact.test.ts extension)
- **Issue:** The plan worded the new test as "error_message with a non-primitive value (object/array) is dropped" — but the existing (and planned-unchanged) default-deny rules shallow-filter allowlisted containers ONE level: an object value under `error_message` survives as an empty container with only allowlisted primitive leaves, rather than being dropped wholesale (arrays ARE dropped wholesale).
- **Fix:** Kept `src/lib/redact.ts` exactly as planned (the plan forbade changing the rules); corrected the test to assert the actual documented behavior — the non-allowlisted nested key and its value-echoing zod text never survive in any form, arrays are dropped entirely.
- **Files modified:** src/__tests__/redact.test.ts
- **Verification:** redact.test.ts green (43 tests across the Task 1 suites); the safety invariant (unsanctioned text never rides the key) is what the test pins.
- **Committed in:** 06ab6c1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test-wording correction only; no production behavior deviates from the plan. No scope creep.

## Issues Encountered
- None beyond the deviation above. (A relative-import depth typo in workspace-db.test.ts — `../../../` vs `../../` for the journal import — was caught by `tsc --noEmit` and fixed inline before commit; the vitest virtual-module regex matched either way.)

## User Setup Required
None - no external service configuration required.

## Device unblock path for the UAT re-run (per plan verification)

1. Rebuild the dev client onto the user's device from this branch — no manual app deletion needed.
2. On first DB access the gate either (a) self-heals the stale device-resident `lemastra.db` (dev build: drops the workspace tables + drizzle journal, re-migrates — visible as a `workspace db self-heal…` warning in the Metro console) and UAT Test 1 should pass, or (b) any remaining failure is now NAMED: one save attempt logs `workspace operation failed — underlying storage error` / `workspace db gate failed — storage engine error` with `error_code` + the exact engine message in `error_message` — that evidence is what the next UAT report must quote.

## Next Phase Readiness
- Missing items 1, 2, 3 of the UAT Test 1 gap are closed; the observability layer and self-healing gate are in place for the UAT re-run (03-11 remains: surfacing error codes in the save-error card, copy-deck permitting).
- No regression: full suite 425 tests green (was 415), `npx tsc --noEmit` clean, migration artifacts (drizzle .sql + journal) untouched, D-03/D-16 laws preserved and test-enforced.
- Blockers: none. (Pre-existing planning-dir working-tree noise — the resolved debug-doc path cleanup and the untracked diagnosis doc — predates this plan and is left for the orchestrator.)

## Self-Check: PASSED

All key-files exist on disk; all three task commits (06ab6c1, 2a72ad0, 803c14e) present in git log; full verification (`npx vitest run` → 425 passed, `npx tsc --noEmit` → clean) executed after the final task.

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-29*
