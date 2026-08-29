---
status: diagnosed
phase: 03-private-local-workspace
source: [03-VERIFICATION.md]
started: 2026-08-27T15:50:00Z
updated: 2026-08-29T16:03:37Z
---

## Current Test

[testing paused — 4 items outstanding (blocked by Test 1 boot-crash blocker)]

## Tests

### 1. Real restart survival
expected: The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
result: issue
reported: "Error on booting up on web: Resolution Error — Unable to resolve module ./0000_nebulous_meggan.sql from drizzle/migrations.js (import m0000 from './0000_nebulous_meggan.sql')"
severity: blocker

### 2. Native share sheet + cache-dir writes (both exports)
expected: The native share sheet opens offering lemastra-chart-<slug>-<id>.json / lemastra-all-data.json as application/json; the files exist in the app cache dir and contain pretty-printed provenance-complete JSON
result: blocked
blocked_by: other
reason: "App crashes on boot — web fails on drizzle migration resolution error, native emulators cannot start app without errors either"

### 3. Revise round-trip on device
expected: History shows both revisions ('Latest' chip on the new one), the earlier version opens read-only with byte-identical evidence, and identical re-saves show 'Already saved with these exact details.'
result: blocked
blocked_by: other
reason: "App crashes on boot — web fails on drizzle migration resolution error, native emulators cannot start app without errors either"

### 4. Full MVP user-flow walkthrough
expected: Every step behaves as the UI-SPEC copy deck states; delete-all ends on 'No personal data is stored on this device.' and the home list is empty
result: blocked
blocked_by: other
reason: "App crashes on boot — web fails on drizzle migration resolution error, native emulators cannot start app without errors either"

### 5. Modal visual/focus quality
expected: Dialogs read as dialogs (centered card, focus capture, cancel default), the destructive confirm is the only error-filled element, empty-home renders exactly the Phase-2 hero
result: blocked
blocked_by: other
reason: "App crashes on boot — web fails on drizzle migration resolution error, native emulators cannot start app without errors either"

## Summary

total: 5
passed: 0
issues: 1
pending: 0
skipped: 0
blocked: 4

## Gaps

- truth: "App boots on web and the saved chart reopens from the home list after force-quit/relaunch"
  status: failed
  reason: "User reported: Error on booting up on web: Resolution Error — Unable to resolve module ./0000_nebulous_meggan.sql from drizzle/migrations.js (import m0000 from './0000_nebulous_meggan.sql'). Additionally: native emulators not able to start app without errors either — everything blocked and crashing."
  severity: blocker
  test: 1
  root_cause: "App statically imports drizzle-kit's generated drizzle/migrations.js (import chain: src/app/index.tsx → @/hooks/use-workspace → @/lib/workspace/repository → src/lib/workspace/db.ts → drizzle/migrations.js), whose line 4 does `import m0000 from './0000_nebulous_meggan.sql'`. Metro (the bundler for BOTH web and native) cannot resolve/transform .sql imports by default, and the repo is missing metro.config.js (sourceExts 'sql'), babel.config.js (inline-import for .sql), and the babel-plugin-inline-import devDependency — Steps 6–7 of drizzle's official Expo setup guide were skipped when drizzle was wired in plan 03-01. Bundle-time resolution fails on every platform: web 'Unable to resolve module' Resolution Error at boot and the identical native emulator boot failure. Reproduced directly via `npx expo export --platform web` (exit 1)."
  artifacts:
    - path: "drizzle/migrations.js"
      issue: "generated index whose line-4 .sql import is unresolvable by the current bundler config (file itself is correct drizzle-kit output)"
    - path: "src/lib/workspace/db.ts"
      issue: "importer that puts drizzle/migrations.js into the app's static module graph on all platforms (web gating is runtime-only, not bundle-time)"
    - path: "vitest.config.ts"
      issue: "sqlAsRawString/drizzleMigrationsIndex plugins serve migrations as virtual modules in tests, masking the bundler gap (config comment recorded the false assumption 'On device Metro bundles it fine')"
    - path: ".github/workflows/ci.yml"
      issue: "bundle-scan job (expo export --platform web, would exit 1) never executed — phase 02/03 branches never pushed; latent gate"
  missing:
    - "metro.config.js with getDefaultConfig(__dirname) + config.resolver.sourceExts.push('sql')"
    - "babel.config.js with babel-preset-expo + inline-import plugin for .sql extensions"
    - "babel-plugin-inline-import devDependency (npm i -D)"
  debug_session: .planning/debug/app-boot-crash-drizzle-migration.md
