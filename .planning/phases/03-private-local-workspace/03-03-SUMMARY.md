---
phase: 03-private-local-workspace
plan: 03
subsystem: database
tags: [sqlite, drizzle-orm, workspace, repository, zod, vitest, privacy, expo-crypto]

# Dependency graph
requires:
  - phase: 03-private-local-workspace (plan 01)
    provides: charts/chart_revisions Drizzle schema + stored zod contracts, getWorkspaceDb() migration-gated singleton, node:sqlite expo-sqlite test facade
  - phase: 02-trustworthy-natal-chart
    provides: calculateResponseSchema parse-then-trust contract (api-schemas.ts)
provides:
  - WorkspaceRepository interface (D-03 adapter seam) + full SQLite implementation — saveChart w/ (chart, input_revision) dedupe, listCharts (updated_at desc), getChartDetail, getRevisionContent, renameChart, deleteChart (explicit cascade), exportAllData, deleteAllData, isWorkspaceStorageAvailable
  - WorkspaceError typed-error vocabulary (OPEN_FAILED/SAVE_FAILED/NOT_FOUND/VALIDATION/UNAVAILABLE)
  - labelSchema (trimmed 1–60), slugify (Pattern-6 sanitization), smartDefaultLabel (date · place)
  - newChartId/newRevisionId via expo-crypto randomUUID (single UUIDv7 swap point)
  - frozen-natal-envelope.json fixture + schema-drift regression (Pitfall 1)
  - PRIV-01 no-network source-scan test over src/lib/workspace (the stored envelope IS the evidence)
affects: [03-04, 03-05, 03-06, 03-07, 03-08, save-flow, home-workspace, data-controls]

# Tech tracking
tech-stack:
  added: []  # no new packages — built entirely on 03-01's installed set
  patterns:
    - function-per-operation repository exports over the migration-gated singleton (no class, no leaked singleton)
    - parse-then-trust at save AND read — zod gate before any transaction, re-parse on every read path, typed OPEN_FAILED on corruption
    - dedupe key = (chart, input_revision) pair lookup inside the transaction so the unique index stays a backstop
    - two-query summary-column list reduction (deterministic latest-per-chart without groupwise-max SQL quirks)

key-files:
  created:
    - src/lib/workspace/repository.ts
    - src/lib/workspace/label.ts
    - src/lib/workspace/ids.ts
    - src/test/fixtures/frozen-natal-envelope.json
    - src/__tests__/workspace-label.test.ts
    - src/__tests__/workspace-repository.test.ts
  modified: []

key-decisions:
  - "Dedupe lookup matches the (chart, input_revision) PAIR, not only the latest row — a re-save of ANY prior basis returns appended:false instead of tripping the unique index (Pitfall 4 semantics; the plan's latest-row wording stays satisfied as the primary path)"
  - "WorkspaceError adds UNAVAILABLE to the four planned codes — the D-03 web gate throws a typed error from every operation before touching the database"
  - "listCharts = two summary queries (charts by updated_at desc + revision summary scan reduced in JS) — reads only summary columns, never envelope JSON, and avoids SQLite bare-column groupwise-max quirks"
  - "The denormalized confidence column comes from the parsed envelope's birth_time_confidence — the envelope IS the evidence; label/inputs/identity columns come from their parsed stored contracts"

patterns-established:
  - "Pattern: repository ops are plain named exports; screens/hooks/tests depend on the WorkspaceRepository interface only (fake-injection seam)"
  - "Pattern: byte-equality immutability assertions read the raw json-mode column text through the facade (rawEnvelopeText helper)"
  - "Pattern: privacy source-scans forbid the exact API-client specifier + network-call tokens while whitelisting @/lib/api-schemas (the D-02 dependency)"

requirements-completed: [WORK-02, WORK-03, WORK-04, PRIV-01]

# Metrics
duration: 11 min
completed: 2026-08-27
status: complete
---

# Phase 03 Plan 03: Workspace Repository Summary

**Full persistence vocabulary over the 03-01 SQLite engine — save with (chart, input_revision) dedupe, updated_at-desc listing, parse-then-trust reads, metadata-only rename, explicit cascade delete, export-all/delete-all — proven by a 24-test integration matrix incl. restart survival, byte-level revision immutability, typed reopen failures, a no-network source scan, and a frozen-envelope schema-drift regression**

## Performance

- **Duration:** 11 min
- **Started:** 2026-08-27T18:25:41Z
- **Completed:** 2026-08-27T18:37:11Z
- **Tasks:** 3
- **Files modified:** 6 (all new)

## Accomplishments

- Complete WorkspaceRepository implementation (D-03 seam): saveChart validates envelope/label/inputs/identity through their zod contracts BEFORE any transaction (D-02), commits chart+revision atomically (Pattern 4), dedupes on the server-computed digest (D-06), and bumps charts.updated_at on every append
- Every read path re-parses stored data: getChartDetail/getRevisionContent/exportAllData run envelope AND inputs AND identity through the stored contracts; a hand-corrupted row throws WorkspaceError OPEN_FAILED on all three paths — never a crash, never partial data (Pitfall 1, T-03-09)
- Mutations honor the revision law: renameChart touches chart label/updated_at only; deleteChart cascades revisions→chart in one transaction (Pitfall 2 — FK pragma never trusted); deleteAllData wipes personal tables only (Pitfall 9)
- PRIV-01 is code-enforced: a fail-hard source scan asserts src/lib/workspace/*.ts imports no API client and contains no global-network call token — reopen provably never re-calls the API (T-03-11)
- frozen-natal-envelope.json: a full real-shaped Placidus Timed CalculateResponse (12 cusps, 8 distinct-house placements, applying/separating aspects, sect, lots) that still parses through calculateResponseSchema and round-trips save→read — schema drift cannot silently brick saved charts

## Task Commits

Tasks 1 and 2 followed TDD RED→GREEN; Task 3 was test-matrix completion:

1. **Task 1: ids + label/slug utilities + WorkspaceError + repository interface** — `fa8deed` (test, RED) + `56123eb` (feat, GREEN)
2. **Task 2: SQLite repository implementation** — `bf7568c` (test, RED) + `5efd1d7` (feat, GREEN)
3. **Task 3: Integration matrix — restart, immutability, guards, frozen fixture** — `bc3e2df` (test)

**Plan metadata:** (see final docs commit below)

## Verification Evidence

- `npx vitest run src/__tests__/workspace-label.test.ts` → 16/16 pass (RED run first failed: modules absent)
- `npx vitest run src/__tests__/workspace-repository.test.ts` → 24/24 pass (RED run first failed 15/15: functions unimplemented)
- `npx vitest run src/__tests__/workspace-repository.test.ts src/__tests__/workspace-label.test.ts` → 40/40
- `npx vitest run` (full suite) → 26 files / 262 tests pass (was 23/246 at plan start — 03-02 telemetry guards still green, zero regressions)
- `npx tsc --noEmit` → exit 0
- Acceptance criteria re-verified per block: restart (updated_at desc + re-parse after close→reopen from the same temp file), immutability (raw column bytes identical; identical digest appends nothing), mutation (rename byte-equality; delete/cascade/wipe counts 0), export (deep-equal corpus), typed failure (OPEN_FAILED on corrupted row), privacy (source scan clean), frozen fixture (parses + round-trips)

## Files Created/Modified

- `src/lib/workspace/repository.ts` — D-03/D-02 module-doc law, WorkspaceError, full vocabulary types + WorkspaceRepository interface, and the SQLite implementation (function-per-operation over getWorkspaceDb())
- `src/lib/workspace/label.ts` — labelSchema (trimmed 1–60), slugify (lowercase, collapse, 40-cap, "chart" fallback), smartDefaultLabel (result-identity vocabulary)
- `src/lib/workspace/ids.ts` — newChartId/newRevisionId via expo-crypto randomUUID (A3)
- `src/test/fixtures/frozen-natal-envelope.json` — frozen real-shaped CalculateResponse (Pitfall 1 regression artifact)
- `src/__tests__/workspace-label.test.ts` — pure-unit rows for label/slug/smart-default/id distinctness
- `src/__tests__/workspace-repository.test.ts` — full integration matrix against the node:sqlite facade (per-test resets, raw-SQL byte/corruption helpers, privacy source-scan, frozen-fixture regression)

## Decisions Made

See key-decisions above. Notably: the dedupe pair-lookup superset (never lets the unique index throw for a legitimate "already saved" state), the UNAVAILABLE code extension for the D-03 web gate, the two-query list reduction, and envelope-sourced confidence for the denormalized column.

## Deviations from Plan

None - plan executed exactly as written.

Minor within-task iteration (not a deviation): tsc rejected the intentionally-invalid `confidence: "guessed"` test literal during Task 2 GREEN; the fixture now constructs that payload through a JSON boundary so it reaches zod at runtime (the boundary invalid data actually crosses) instead of failing tsc.

## Issues Encountered

None beyond the tsc typing iteration above — both TDD cycles went RED→GREEN on the first implementation attempt.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All plan-frontmatter symbols now exist for later plans: WorkspaceRepository + WorkspaceError + ChartListItem/ChartDetail/RevisionContent types, labelSchema/slugify/smartDefaultLabel, newChartId/newRevisionId, frozen-natal-envelope.json
- 03-04 (save flow UI) mounts the label prompt + Save CTA over saveChart; 03-05 (home list) over listCharts; hooks inject fakes through the interface seam
- Threat-model dispositions implemented and test-enforced: T-03-07 (drizzle query builder only — no string-concatenated SQL anywhere in the repository), T-03-08 (append-only + byte-equality tests), T-03-09 (zod at read + frozen fixture), T-03-10 (explicit cascade + personal-tables-only wipe), T-03-11 (no-network scan)
- Device-only behaviors (real restart, real share sheet) remain end-of-phase UAT per human_verify_mode

## Self-Check: PASSED

All six created files exist on disk; all five task commits verified in git log (fa8deed, 56123eb, bf7568c, 5efd1d7, bc3e2df); plan verification commands re-run green (label 16/16, repository 24/24, full suite 26 files/262 tests, tsc exit 0).

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*
