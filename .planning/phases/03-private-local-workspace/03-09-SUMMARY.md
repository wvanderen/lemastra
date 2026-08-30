---
phase: 03-private-local-workspace
plan: 09
subsystem: infra
tags: [metro, babel, babel-plugin-inline-import, drizzle, expo-sqlite, wasm, bundler-config, ci-guard]

# Dependency graph
requires:
  - phase: 03-private-local-workspace (plan 01)
    provides: the drizzle migration artifacts (drizzle/migrations.js + .sql) and src/lib/workspace/db.ts importer whose bundling this plan fixes
provides:
  - metro.config.js (Expo default + sql sourceExt + wasm assetExt) — Metro can bundle drizzle .sql migrations AND expo-sqlite's web wasm asset on every platform
  - babel.config.js (babel-preset-expo + inline-import for .sql) — .sql imports become raw string modules the drizzle migrator consumes
  - src/__tests__/bundler-config-guard.test.ts — CI vitest job fails on deletion/staleness of either config or the devDependency
  - Corrected vitest.config.ts comment stating the real bundler wiring (no more false "Metro bundles it fine on device" assumption)
affects: [03-UAT Tests 1-5 (boot unblocked), CI bundle-scan job, all future web/native bundling, Phase 04+]

# Tech tracking
tech-stack:
  added: [babel-plugin-inline-import ^3.0.0 (devDependency, human-approved)]
  patterns: [idempotent includes-guarded sourceExts/assetExts registration in metro.config.js, config-presence guard extended with semantic load assertions]

key-files:
  created:
    - metro.config.js
    - babel.config.js
    - src/__tests__/bundler-config-guard.test.ts
  modified:
    - package.json
    - package-lock.json
    - vitest.config.ts

key-decisions:
  - "babel-plugin-inline-import installed as a root devDependency only after a blocking-human package-legitimacy gate (never auto-approvable); executor independently re-verified live registry metadata before presenting: 3.0.0 unchanged since 2018, MIT, Quadric ApS, 6 files, single dep require-resolve@0.0.2, no postinstall/preinstall scripts, not deprecated"
  - "wasm registered on resolver.assetExts (idempotent guard) because expo-sqlite's web worker imports wa-sqlite.wasm and Metro's defaults cannot resolve it — expo-sqlite's documented web setup; LemAstra never opens the database on web (D-03 typed UNAVAILABLE), so only bundle-time resolution is needed and the documented COOP/COEP SharedArrayBuffer headers are deliberately NOT added (the wa-sqlite worker never executes)"
  - "Guard test asserts source text AND semantically requires both configs — a config that exists but is broken (not just misformatted) still fails the suite; no allowlist file (same guard-erosion stance as telemetry-guard)"

patterns-established:
  - "Pattern: bundler wiring is guarded, not assumed — the mandatory CI vitest job source-scans + semantically loads metro.config.js/babel.config.js and checks the devDependency, so a silent removal fails tests before it can crash boot again"
  - "Pattern: metro resolver extensions are registered behind includes-guards so re-requiring the config never duplicates entries"

requirements-completed: [WORK-01, WORK-02]

# Metrics
duration: 15 min
completed: 2026-08-29
status: complete
---

# Phase 03 Plan 09: Bundler Wiring for drizzle .sql Migrations (Gap Closure) Summary

**Metro sql-sourceExt + wasm-assetExt wiring, babel inline-import, and a mutation-verified config guard that together close the all-platform UAT Test 1 boot crash — web and ios `expo export` now exit 0 with drizzle migrations resolved inline**

## Performance

- **Duration:** 15 min (2026-08-29T17:01:56Z → 2026-08-29T17:17:06Z)
- **Tasks:** 3 (1 blocking-human gate + 2 auto)
- **Files modified:** 6

## Accomplishments

- Task 1 blocking-human package-legitimacy gate completed: `babel-plugin-inline-import` human-APPROVED (2026-08-29) as a root devDependency; executor corroborated the planner's registry audit against the live registry before presenting the gate (version/license/author/repo/size/integrity/deps/scripts/deprecation all matched)
- Drizzle Expo guide Steps 6–7 wired: `metro.config.js` extends Expo SDK 57's default config with an idempotent `sql` sourceExt registration; `babel.config.js` pairs `babel-preset-expo` with `inline-import` for `.sql` — the exact canonical fix for the diagnosed blocker
- Guard suite `bundler-config-guard.test.ts` (telemetry-guard fail-hard archetype, 10 tests): existence + source-scan + semantic-load assertions over metro.config.js, babel.config.js, and the devDependency placement (devDependencies yes, dependencies no); mutation-verified positive control recorded below
- vitest.config.ts's false assumption ("On device Metro bundles it fine — only the test pipeline needs help") replaced with the truthful wiring statement; plugin behavior byte-identical
- Plan-level verification: `EXPO_NO_TELEMETRY=1 npx expo export --platform web` exit 0 (the exact debug-session reproduction command), `npx expo export --platform ios` exit 0 (4.9 MB Hermes bundle), full vitest suite 39 files / 415 tests green, `npx tsc --noEmit` green — UAT Tests 1–5 are unblocked for re-run

## Task Commits

Each task was committed atomically:

1. **Task 1: Approve babel-plugin-inline-import install (blocking-human legitimacy gate)** — no code commit (decision gate; approval recorded here and in STATE decisions)
2. **Task 2: Install plugin + create metro/babel bundler wiring (Steps 6–7)** — `f31a38b` (feat)
3. **Task 3: Bundler-config guard test + correct the masking vitest comment** — `add5697` (test)
4. **Deviation fix: wasm assetExt for expo-sqlite web bundling** — `000adaf` (fix, Rule 3)

**Plan metadata:** (docs commit follows at end of this summary)

## Verification Evidence

- `npm ls babel-plugin-inline-import` → `babel-plugin-inline-import@3.0.0` clean, in devDependencies only (`dependencies` confirmed absent)
- Plan Task 2 verify command → `bundler config ok`; double-require idempotency → exactly 1 `sql` entry
- Guard suite → 10/10 pass; **mutation control**: `metro.config.js` renamed to `metro.config.js.bak` → suite exit **1** (4 failures: existence + both metro source-scans + semantic load), file restored → 10/10 green
- `EXPO_NO_TELEMETRY=1 npx expo export --platform web` → **exit 0**; all routes exported to dist (previously exit 1: "Unable to resolve module ./0000_nebulous_meggan.sql"; the resolver's tried-extension list now includes `.web.sql|.sql`)
- `EXPO_NO_TELEMETRY=1 npx expo export --platform ios` → **exit 0** (`_expo/static/js/ios/entry-*.hbc`, 4.9 MB)
- `npm test` → 39 files / 415 tests pass (was 38 files pre-plan; +1 guard file, zero regressions)
- `npx tsc --noEmit` → exit 0 (root `.js` configs sit outside tsconfig's `**/*.ts(x)` include, as predicted)
- `drizzle/migrations.js` and `src/lib/workspace/db.ts` byte-identical (empty `git diff` across the plan)

## Files Created/Modified

- `metro.config.js` — Expo default Metro config + idempotent `sql` sourceExt (drizzle Step 6) + idempotent `wasm` assetExt (expo-sqlite web setup)
- `babel.config.js` — babel-preset-expo + inline-import plugin for `.sql` (drizzle Step 7)
- `src/__tests__/bundler-config-guard.test.ts` — fail-hard config-presence + semantic-load guard (T-03-GC-01)
- `vitest.config.ts` — one comment sentence corrected (plugins untouched)
- `package.json` / `package-lock.json` — babel-plugin-inline-import ^3.0.0 devDependency

## Decisions Made

- Package legitimacy resolved the mandated way: [ASSUMED] package promoted to human-verified via the blocking gate (never auto-approved); registry metadata independently re-checked by the executor before the gate was presented
- wasm registration added but COOP/COEP headers deliberately not: D-03 keeps web from ever opening the database, so the wa-sqlite worker never executes — bundle-time resolution is the entire requirement
- Guard strength doubled with semantic `require()` assertions: source-scans alone can be satisfied by text that no longer functions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] expo-sqlite web implementation's .wasm import broke the web bundle after the .sql fix landed**
- **Found during:** Plan-level verification (`expo export --platform web`)
- **Issue:** With `.sql` resolving, Metro walked deeper and failed on `import wasmModule from './wa-sqlite/wa-sqlite.wasm'` in `expo-sqlite/web/worker.ts` — Metro's default sourceExts AND assetExts have no `wasm` (the file itself exists, 621 KB). The web degradation path (D-03) is runtime-only, so the static `import * as SQLite from "expo-sqlite"` in db.ts drags the web implementation into every web bundle
- **Fix:** `metro.config.js` registers `wasm` on `resolver.assetExts` behind an includes-guard — per expo-sqlite's documented web setup ("configure Metro bundler to support wasm files"); guard test extended with a wasm source-scan + semantic assertion (suite 9 → 10 tests)
- **Files modified:** metro.config.js, src/__tests__/bundler-config-guard.test.ts
- **Verification:** web export exit 0 (all routes), ios export exit 0, guard 10/10, full suite 415/415, tsc green
- **Committed in:** 000adaf

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Same class of missing bundler wiring as the diagnosed gap; fixed minimally per upstream docs with the guard extended to cover it. No scope creep — drizzle/migrations.js, src/lib/workspace/db.ts, and all app source untouched.

## Human Gates

- Task 1 (blocking-human, package legitimacy): human APPROVED babel-plugin-inline-import@3.0.0 as root devDependency on 2026-08-29 after reviewing npmjs.com against the planner's registry audit (executor had re-verified the live metadata: MIT, Quadric ApS, no install scripts, not deprecated). Normal gate flow, not a deviation.

## Issues Encountered

None beyond the deviation above — resolved inside the verification step within the fix-attempt budget.

## User Setup Required

None — no external service configuration introduced.

## Next Phase Readiness

- The diagnosed UAT Test 1 blocker is closed at the bundler level; all 5 blocked UAT tests (restart survival, share-sheet exports, revise round-trip, MVP walkthrough, modal quality) are re-runnable via /gsd-verify-work
- The latent CI bundle-scan failure is cleared before the branch is ever pushed (`expo export --platform web` is that job's exact command)
- Phase 03 is now 9/9 plans complete; structural prevention in place: deleting/staling metro.config.js, babel.config.js, the wasm registration, or the devDependency fails the mandatory CI vitest job

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-29*

## Self-Check: PASSED

All key-files exist on disk; all three production commits verified in git log; all plan-level verification commands re-run green during execution (web export exit 0, ios export exit 0, full suite 39 files / 415 tests, tsc --noEmit exit 0, guard mutation control trip + restore recorded).
