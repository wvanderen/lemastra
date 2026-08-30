---
phase: 03-private-local-workspace
plan: 01
subsystem: database
tags: [expo-sqlite, drizzle-orm, drizzle-kit, node-sqlite, sqlite, migrations, vitest, storage]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart
    provides: CalculateResponse contract (calculateResponseSchema, api-schemas.ts) + the vitest/RNTL zero-dependency test substrate the facade alias slots into
provides:
  - charts + chart_revisions Drizzle schema with json-mode envelope/inputs/identity columns and D-06 dedupe unique index
  - storedCalculationInputsSchema + storedIdentitySchema (stored zod contracts, D-01/D-02/D-08)
  - getWorkspaceDb() lazy singleton with imperative migration gate (Pitfall 3) + test-only reset
  - Committed drizzle/ migrations (journal + modules) + drizzle.config.ts + npm run db:generate
  - node:sqlite expo-sqlite test facade + vitest alias + contract test (the phase's test engine)
affects: [03-02, 03-03, 03-04, 03-05, 03-06, 03-07, 03-08, workspace-repository, save-flow]

# Tech tracking
tech-stack:
  added: [expo-sqlite ~57.0.2, expo-file-system ~57.0.6, expo-sharing ~57.0.16, expo-crypto ~57.0.2, drizzle-orm ^0.45.2, drizzle-kit ^0.31.10 (dev)]
  patterns: [lazy memoized-promise db singleton with migration gate, versioned JSON envelope + indexed summary columns, node:sqlite facade alias for real-SQL integration tests, virtual-module serving of generated migration index]

key-files:
  created:
    - src/lib/workspace/schema.ts
    - src/lib/workspace/db.ts
    - scripts/vitest/expo-sqlite-facade/index.ts
    - scripts/vitest/expo-sqlite-facade/README.md
    - drizzle.config.ts
    - drizzle/migrations.js
    - drizzle/migrations.d.ts
    - drizzle/0000_nebulous_meggan.sql
    - drizzle/meta/_journal.json
    - src/test/expo-sqlite-facade.d.ts
    - src/__tests__/expo-sqlite-facade.test.ts
    - src/__tests__/workspace-db.test.ts
  modified:
    - package.json
    - package-lock.json
    - app.json
    - vitest.config.ts

key-decisions:
  - "Import drizzle from the deep drizzle-orm/expo-sqlite/driver subpath, never the barrel — the barrel re-exports useLiveQuery whose top-level expo-sqlite import drags the real native package into every non-device graph"
  - "Serve the generated drizzle/migrations.js to vitest as a virtual ESM module assembled from the committed journal + .sql artifacts — the generated index is ESM in a CJS-context package and vite-node interop for it is order-fragile next to externalized CJS deps"
  - "Facade row getters memoize per result object (expo executes once and caches); naive delegation to node:sqlite re-executed the statement on every getter call"
  - "expo install resolved the SDK-57 tilde pins to the newest in-range patches (57.0.2/57.0.6/57.0.16/57.0.2) — all within the bundledNativeModules ranges; this is the convention's canonical output"

patterns-established:
  - "Pattern: file-backed node:sqlite facade aliased over expo-sqlite — repository tests run real SQL with zero new dev dependencies"
  - "Pattern: imperative migrate() inside a lazy memoized-promise singleton; every repository call awaits the same promise (Pitfall 3 gate)"
  - "Pattern: json-mode text columns typed via .$type<T>() against the API contract + .describe()-ed stored zod contracts"

requirements-completed: [WORK-02]

# Metrics
duration: 18 min
completed: 2026-08-27
status: complete
---

# Phase 03 Plan 01: Workspace Storage Engine Summary

**Repo's first SQLite layer: expo-sqlite + Drizzle charts/chart_revisions schema with generated committed migrations behind a lazy migration-gated singleton, proven end-to-end against a real SQL engine via a zero-dependency node:sqlite test facade**

## Performance

- **Duration:** 18 min
- **Started:** 2026-08-27T17:56:49Z
- **Completed:** 2026-08-27T18:15:17Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Installed the storage/export dependency set per the legitimacy audit (expo-sqlite/file-system/sharing/crypto via `npx expo install` tilde pins, drizzle-orm ^0.45.2 + drizzle-kit devDep); verified clean `npm ls`, zero postinstall scripts, config plugins registered in app.json, no analytics/crash package (D-16)
- Built the node:sqlite test facade implementing exactly the source-read drizzle 0.45.2 expo-sqlite session call surface, wired as the `expo-sqlite` vitest alias; the contract test pins every return shape AND proves the real drizzle() driver (insert/select/delete-with-where, transaction commit + rollback) runs over a file-backed engine
- Defined charts + chart_revisions with denormalized summary columns (D-11), json-mode envelope/inputs/identity columns (D-02), the (chart_id, input_revision) unique index (D-06), and the stored zod contracts (google/manual place_form union, optional time_resolution, .describe() discipline)
- Generated and committed the first drizzle migration (journal + modules) and proved the open→migrate→insert→read→singleton-reset→close→reopen pipeline: rows survive with migrations not re-applied destructively, unique index intact, timestamp_ms Date symmetry (A4) pinned
- A5 RESOLVED: the generated `migrations.js` default export (`{ journal, migrations }`) is importable by the imperative migrator in-app — no `useMigrations` fallback needed

## Task Commits

Each task was committed atomically (Tasks 2 and 3 followed TDD RED→GREEN):

1. **Task 1: Install storage/export dependencies with legitimacy rationale** — `c48b1ea` (feat)
2. **Task 2: node:sqlite test facade + vitest alias + facade contract test** — `3357bdc` (test, RED) + `b600da1` (feat, GREEN)
3. **Task 3: Drizzle schema + generated migrations + lazy db gate** — `1e5a352` (test, RED) + `ea4202d` (feat, GREEN)

## Verification Evidence

- `npm ls expo-sqlite drizzle-orm drizzle-kit expo-file-system expo-sharing expo-crypto` → exit 0, no missing/invalid
- postinstall-scan across all six packages → exit 0 (none)
- `npx vitest run src/__tests__/expo-sqlite-facade.test.ts src/__tests__/workspace-db.test.ts` → 14/14 pass
- `npx vitest run` (full suite, no regression) → 22 files / 205 tests pass (was 21/199 at phase start)
- `npx tsc --noEmit` → exit 0
- `ls drizzle/` → committed journal + migration modules; `db:generate` script present

## Legitimacy Rationale (Task 1, per acceptance criteria)

- **drizzle-orm / drizzle-kit:** OK — ~20.2M / ~16.8M weekly downloads, github.com/drizzle-team/drizzle-orm org
- **expo-sqlite / expo-file-system / expo-sharing / expo-crypto:** first-party expo/expo monorepo packages (1M–9M weekly); SUS "too-new" verdicts are publish recency only on the active SDK-57 release cadence — resolved by the Phase-1 `npx expo install` tilde-pin convention. `npx expo install` wrote the tilde pins from bundledNativeModules ranges and resolved them to the newest in-range patches (expo-sqlite ~57.0.2, expo-file-system ~57.0.6, expo-sharing ~57.0.16, expo-crypto ~57.0.2 — the registry latests recorded in the research audit), all satisfying the ~57.0.1/~57.0.5/~57.0.14/~57.0.1 ranges

## Files Created/Modified

- `src/lib/workspace/schema.ts` — Drizzle tables + stored zod contracts (D-01/D-02 storage shapes)
- `src/lib/workspace/db.ts` — getWorkspaceDb() lazy singleton + migration gate + test-only reset
- `scripts/vitest/expo-sqlite-facade/index.ts` — node:sqlite-backed expo-sqlite test alias (exact drizzle sync surface)
- `scripts/vitest/expo-sqlite-facade/README.md` — surface-discipline contract (Pitfall 8)
- `drizzle.config.ts` + `drizzle/` — drizzle-kit codegen config + committed journal/migration modules (+ migrations.d.ts type companion)
- `vitest.config.ts` — expo-sqlite alias + .sql raw-string loader + virtual drizzle-migrations module
- `src/test/expo-sqlite-facade.d.ts` — module augmentation exposing the facade's test-only reset() to tsc
- `src/__tests__/expo-sqlite-facade.test.ts` — facade contract + driver-compatibility proof (T-03-02)
- `src/__tests__/workspace-db.test.ts` — migration-gate + stored-contract tests (T-03-01/03)
- `package.json` / `package-lock.json` / `app.json` — deps, db:generate script, expo config plugins

## Decisions Made

- Deep-subpath drizzle import (see key-decisions) — keeps the facade surface minimal and the module graph native-free under vitest
- Virtual-module serving of the generated migrations index in vitest — deterministic, auto-follows new migrations, keeps db.ts's device-safe relative import
- Facade memoized row getters — expo's execute-once-and-cache semantics over node:sqlite's re-executing getters
- Reopen simulation in tests: singleton reset + closing the memoized handle by name (SQLite.reset() deletes the per-run temp dir and is the per-test world reset, not a restart simulation)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Barrel import drags the real native package into the test graph**
- **Found during:** Task 2 (facade contract test GREEN)
- **Issue:** `import { drizzle } from "drizzle-orm/expo-sqlite"` loads the barrel, which re-exports `query.js` (useLiveQuery) whose top-level `import { addDatabaseChangeListener } from "expo-sqlite"` loads the real native package — crashing under vitest
- **Fix:** Import from the first-class `drizzle-orm/expo-sqlite/driver` subpath (own exports-map entry) in the test and in db.ts
- **Files modified:** src/__tests__/expo-sqlite-facade.test.ts, src/lib/workspace/db.ts
- **Verification:** contract + workspace suites green
- **Committed in:** b600da1, ea4202d

**2. [Rule 1 - Bug] Facade row getters re-executed the statement on every call**
- **Found during:** Task 2 (GREEN run — triple-inserted fixture row exposed it)
- **Issue:** expo-sqlite's executeSync runs once and the result caches rows; delegating getAllSync/getFirstSync straight to node:sqlite's stmt.all()/get() re-executes the statement per call (side effects on mutations, unstable reads)
- **Fix:** Memoize rows lazily per result object; pinned by repeated-call assertions in the contract test
- **Files modified:** scripts/vitest/expo-sqlite-facade/index.ts
- **Verification:** contract test 8/8
- **Committed in:** b600da1

**3. [Rule 3 - Blocking] vite-node could not load the generated drizzle/migrations.js**
- **Found during:** Task 3 (GREEN run)
- **Issue:** The generated index is ESM syntax inside a CJS-context package (repo package.json has no "type") and imports .sql files as raw strings (Metro asset semantics); vite has no .sql loader, and vite-node's CJS interop for the .js index is order-fragile when the migrator's react dependency externalizes first (default export surfaced as undefined)
- **Fix:** Two small vitest plugins — .sql raw-string loader, and a virtual `\0lemastra:drizzle-migrations` module assembled at load time from the committed journal + .sql artifacts (auto-follows new migrations; nothing hardcoded); db.ts keeps the device-safe relative import
- **Files modified:** vitest.config.ts
- **Verification:** workspace-db migration-gate test green
- **Committed in:** ea4202d

**4. [Rule 3 - Blocking] tsc could not see the alias runtime or the generated index**
- **Found during:** Task 3 (verify `tsc --noEmit`)
- **Issue:** tsc resolves "expo-sqlite" to the real package (no vitest alias), so the facade's test-only reset() was a type error; the generated migrations.js is outside tsconfig include patterns; db.ts's relative path was one level short (masked at runtime by the virtual-module plugin's specifier interception, caught by tsc)
- **Fix:** src/test/expo-sqlite-facade.d.ts module augmentation (merges reset() into the package types without leaking it into app code); drizzle/migrations.d.ts companion declaration; corrected relative path to ../../../drizzle/migrations.js
- **Files modified:** src/test/expo-sqlite-facade.d.ts, drizzle/migrations.d.ts, src/lib/workspace/db.ts
- **Verification:** tsc --noEmit exit 0
- **Committed in:** ea4202d

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 blocking)
**Impact on plan:** All fixes required to make the documented architecture run under the existing vitest substrate with zero new dev dependencies. No scope creep; threat-model dispositions intact (T-03-SC install checks green, T-03-01/02/03 test-enforced).

## Issues Encountered

None beyond the deviations above — each was resolved inside its task with the 3-attempt budget untouched.

## User Setup Required

None — no external service configuration introduced.

## Next Phase Readiness

- Symbols later plans consume (per plan frontmatter): `src/lib/workspace/schema.ts` (tables + stored zod contracts), `src/lib/workspace/db.ts` (getWorkspaceDb + reset), `scripts/vitest/expo-sqlite-facade/` (test alias), committed `drizzle/` migrations, `db:generate` script
- Ready for 03-02/03-03 (repository interface + implementation over this engine); repository tests run real SQL through the facade with `afterEach` = `resetWorkspaceDbForTests()` + `SQLite.reset()`
- A5 resolved (no useMigrations fallback); A4 verified (timestamp_ms Date symmetry); node:sqlite experimental-stability awareness pinned in the facade README

## TDD Gate Compliance

Tasks 2 and 3 executed RED→GREEN with separate commits: `test(03-01)` commits (3357bdc, 1e5a352) precede their `feat(03-01)` GREEN commits (b600da1, ea4202d); RED runs were verified failing before implementation. Task 1 (dependency install) is not testable RED-first by nature.

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*

## Self-Check: PASSED

All key-files exist on disk; all five task commits verified in git log; all task acceptance criteria and plan-level verification commands re-run green (facade 8/8, workspace-db 6/6, full suite 22 files / 205 tests, tsc --noEmit exit 0, drizzle artifacts + db:generate present).
