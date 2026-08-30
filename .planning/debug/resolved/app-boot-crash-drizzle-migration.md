---
status: resolved
trigger: "UAT Test 1 blocker: web boot crashes with Metro 'Unable to resolve module ./0000_nebulous_meggan.sql from drizzle/migrations.js'; native emulators also fail to start"
created: 2026-08-29T00:00:00Z
updated: 2026-08-29T17:30:00Z
resolved_by: 03-09-PLAN.md
goal: find_root_cause_only
---

## Current Focus

hypothesis: CONFIRMED — Metro cannot resolve `.sql` imports in drizzle-kit's generated `drizzle/migrations.js` because the repo lacks the Expo bundler wiring drizzle requires (metro.config.js `sourceExts.push('sql')` + babel.config.js `babel-plugin-inline-import` for `.sql`); every pre-UAT pipeline (vitest virtual modules, tsc companion .d.ts) masked the gap
test: DONE — reproduced with `npx expo export --platform web` → exit 1, "Unable to resolve module ./0000_nebulous_meggan.sql" with import stack from src/app entry
expecting: (met) error identifies missing .sql resolution; drizzle docs confirm mandatory metro+babel steps
next_action: none — diagnosis complete; fix routed to /gsd-plan-phase --gaps (add metro.config.js sourceExts + babel.config.js inline-import + babel-plugin-inline-indent devDep)

## Symptoms

expected: App boots on web and the saved chart reopens from the home list after force-quit/relaunch; chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
actual: "Error on booting up on web: Resolution Error — Unable to resolve module ./0000_nebulous_meggan.sql from drizzle/migrations.js (import m0000 from './0000_nebulous_meggan.sql')". Native emulators cannot start the app without errors either — everything blocked and crashing.
errors: Web: Metro resolution error — `Unable to resolve module ./0000_nebulous_meggan.sql` thrown from `drizzle/migrations.js` line 4: `import m0000 from './0000_nebulous_meggan.sql';`. Native: app fails to start on emulators (same Metro resolution failure in dev-server bundling).
reproduction: Test 1 in UAT (.planning/phases/03-private-local-workspace/03-UAT.md) — boot the app on web (expo start --web / export) or launch on iOS/Android emulator
started: Discovered during Phase 03 UAT (2026-08-29); local-persistence (expo-sqlite + drizzle) shipped in Phase 03 plans 03-01..03-08

## Eliminated

- hypothesis: Migration .sql artifact missing / gitignored on user machines
  evidence: `git ls-files drizzle/` shows all 5 artifacts committed (0000_nebulous_meggan.sql, migrations.js, migrations.d.ts, meta/_journal.json, meta/0000_snapshot.json); working tree clean; file exists on disk
- hypothesis: Wrong relative path / Metro root misconfiguration (migrations.js outside project root)
  evidence: Metro DID resolve `drizzle/migrations.js` itself (error is thrown resolving the import FROM migrations.js, and migrations.js appears in the printed import stack); `src/lib/workspace/db.ts`'s `../../../drizzle/migrations.js` resolves fine
- hypothesis: Native-only issue (New Architecture / expo-sqlite native module failure)
  evidence: Failure occurs at Metro bundle/resolution time on WEB export before any native code runs; identical graph and resolver for native dev clients
- hypothesis: drizzle-orm migrator API contract mismatch (migrations shape wrong)
  evidence: installed `node_modules/drizzle-orm/expo-sqlite/migrator.cjs` `readMigrationFiles({journal, migrations})` expects exactly the shape `drizzle/migrations.js` emits (`migrations.m0000` raw SQL string); generated file + `migrations.d.ts` match the contract

## Evidence

- timestamp: 2026-08-29 (investigation)
  checked: `drizzle/migrations.js` (drizzle-kit `driver: "expo"` output, drizzle.config.ts)
  found: line 4 `import m0000 from './0000_nebulous_meggan.sql';` — imports `.sql` as a string module alongside `import journal from './meta/_journal.json'`
  implication: the app graph contains a `.sql` module import that the bundler must support
- timestamp: 2026-08-29
  checked: repo-root config files (glob `{metro.config.*,babel.config.*}`)
  found: NEITHER metro.config.js NOR babel.config.js exists anywhere in the repo; package.json has no `babel-plugin-inline-import` dependency
  implication: no bundler support for `.sql` resolution/transformation was ever configured
- timestamp: 2026-08-29
  checked: `src/lib/workspace/db.ts` line 12 + import chain greps
  found: static chain `src/app/index.tsx` → `@/hooks/use-workspace` → `@/lib/workspace/repository` (line 9 `import { getWorkspaceDb } from "./db"`) → `db.ts` → `../../../drizzle/migrations.js`
  implication: migrations module is in the Metro graph from the home screen entry on ALL platforms; D-03 web-unavailability gating is runtime-only (typed errors), not bundle-time platform exclusion
- timestamp: 2026-08-29
  checked: `node_modules/drizzle-orm/expo-sqlite/migrator.cjs` `readMigrationFiles`
  found: expects `{ journal, migrations }` where `migrations["m0000"]` is a raw SQL string (`.split("--> statement-breakpoint")`)
  implication: the `.sql` import must resolve to a string module — precisely what Metro cannot do without the metro/babel wiring
- timestamp: 2026-08-29
  checked: REPRODUCTION — `EXPO_NO_TELEMETRY=1 npx expo export --platform web` (same bundler as `expo start --web` and CI bundle-scan)
  found: **exit code 1**; error `Unable to resolve module ./0000_nebulous_meggan.sql` with printed import stack: `src/app (require.context)` → `src/app/index.tsx` → `use-workspace.ts` → `repository.ts` → `db.ts` → `drizzle/migrations.js` → `import "./0000_nebulous_meggan.sql"`. Resolver's tried-extension list: `.web.ts|.ts|.web.tsx|.tsx|.web.js|.js|.web.jsx|.jsx|.web.json|.json|.web.cjs|.cjs|.web.mjs|.mjs|.web.scss|.scss|.web.sass|.sass|.web.css|.css` — no `.sql`
  implication: direct, repeatable confirmation of the exact user-reported web error AND the native emulator boot failure (same Metro graph/dev-server); `.sql` is simply not a resolvable extension
- timestamp: 2026-08-29
  checked: vitest.config.ts plugins + `drizzle/migrations.d.ts`
  found: `sqlAsRawString` plugin serves `.sql` as default-export string; `drizzleMigrationsIndex` plugin intercepts `drizzle/migrations` imports and serves a virtual module assembled from journal+sql; comment states the FALSE assumption "On device Metro bundles it fine — only the test pipeline needs help". Companion `migrations.d.ts` satisfies `tsc --noEmit` (generated .js outside tsconfig include)
  implication: why every pre-UAT gate (vitest, tsc) stayed green while the real bundler crashed — the test pipeline masked the missing bundler config
- timestamp: 2026-08-29
  checked: `.github/workflows/ci.yml` (bundle-scan job runs `npx expo export --platform web`, line 140) + git branch state
  found: `origin/main` is still at Phase 01 (6667e41); branch `gsd/phase-03-private-local-workspace` (and phase-02) never pushed — CI runs on push/PR only
  implication: the one CI job that WOULD have caught this (expo export exits 1) never executed against the drizzle code; on next push it will fail until fixed
- timestamp: 2026-08-29
  checked: drizzle-orm official Expo guide (https://orm.drizzle.team/docs/get-started/expo-new, Steps 6–7)
  found: after `drizzle-kit generate` (driver: expo) the guide REQUIRES (a) `metro.config.js` with `config.resolver.sourceExts.push('sql')` and (b) `babel.config.js` with `plugins: [["inline-import", { "extensions": [".sql"] }]]` (babel-plugin-inline-import)
  implication: documented, canonical fix pattern; the project executed Steps 1–5 (config/generate) and 8–9 (import + migrate) but skipped Steps 6–7 (metro + babel wiring)

## Resolution

root_cause: The app statically imports drizzle-kit's generated `drizzle/migrations.js` (via src/app/index.tsx → use-workspace → repository → db.ts), which imports `0000_nebulous_meggan.sql` as a string module. Metro (the bundler for BOTH web and native dev/release builds) cannot resolve or transform `.sql` imports by default, and the repo has NO metro.config.js (`sourceExts` lacks 'sql') and NO babel.config.js (`babel-plugin-inline-import` for `.sql` is absent — not even installed) — the two mandatory setup steps (Steps 6–7) of drizzle's Expo guide that were skipped when wiring drizzle in plan 03-01. Bundle-time resolution therefore fails on every platform: web shows the "Unable to resolve module ./0000_nebulous_meggan.sql" Resolution Error at boot, and native emulators fail to start because the same Metro dev-server graph fails to bundle. The gap went undetected because vitest serves the migrations as a virtual module (vitest.config.ts plugins) and tsc is satisfied by the companion drizzle/migrations.d.ts, while the CI job that bundles for web (`expo export --platform web`, bundle-scan) never ran — the phase-02/03 branches were never pushed (origin/main is still at Phase 01).
fix: (not applied — goal: find_root_cause_only; routed to /gsd-plan-phase --gaps)
fix_direction: 1) `npm i -D babel-plugin-inline-import`; 2) create `metro.config.js`: `const { getDefaultConfig } = require('expo/metro-config'); const config = getDefaultConfig(__dirname); config.resolver.sourceExts.push('sql'); module.exports = config;`; 3) create `babel.config.js` with `presets: ['babel-preset-expo']` + `plugins: [["inline-import", { "extensions": [".sql"] }]]`; 4) verify with `npx expo export --platform web` (exit 0) + emulator boot + vitest/tsc still green. (Source: https://orm.drizzle.team/docs/get-started/expo-new Steps 6–7.) Alternative shape if avoiding the babel dep: extend the vitest-style approach into the app graph via a metro transformer — but the drizzle-documented pattern is the two config files above.
verification: Reproduced pre-diagnosis: `npx expo export --platform web` → exit 1 with the exact user-reported resolution error + import stack. Post-fix verification belongs to the --gaps plan (export exit 0, emulator boot, UAT Test 1 re-run).
files_changed: []
uat_gap_fill_suggestion:
  artifacts: ["drizzle/migrations.js (line 4 .sql import)", "src/lib/workspace/db.ts (importer)", "vitest.config.ts (masking plugins)", "drizzle/migrations.d.ts (tsc companion)", "ci.yml bundle-scan (never ran — branch unpushed)"]
  missing: ["metro.config.js with sourceExts 'sql'", "babel.config.js with inline-import .sql plugin", "babel-plugin-inline-install devDependency"]
