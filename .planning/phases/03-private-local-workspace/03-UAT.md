---
status: testing
phase: 03-private-local-workspace
source: [03-VERIFICATION.md]
started: 2026-08-29T17:30:00Z
updated: 2026-08-29T17:30:00Z
---

## Current Test

number: 1
name: Real restart survival
expected: |
  The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
awaiting: user response

## Tests

### 1. Real restart survival
expected: The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
result: [pending]

### 2. Native share sheet + cache-dir writes (both exports)
expected: The native share sheet opens offering lemastra-chart-<slug>-<id>.json / lemastra-all-data.json as application/json; the files exist in the app cache dir and contain pretty-printed provenance-complete JSON
result: [pending]

### 3. Revise round-trip on device
expected: History shows both revisions ('Latest' chip on the new one), the earlier version opens read-only with byte-identical evidence, and identical re-saves show 'Already saved with these exact details.'
result: [pending]

### 4. Full MVP user-flow walkthrough
expected: Every step behaves as the UI-SPEC copy deck states; delete-all ends on 'No personal data is stored on this device.' and the home list is empty
result: [pending]

### 5. Modal visual/focus quality
expected: Dialogs read as dialogs (centered card, focus capture, cancel default), the destructive confirm is the only error-filled element, empty-home renders exactly the Phase-2 hero
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps

- truth: "App boots on web and the saved chart reopens from the home list after force-quit/relaunch"
  status: resolved
  reason: "Was: Metro 'Unable to resolve module ./0000_nebulous_meggan.sql' on web + native boot failure. Closed by gap-closure plan 03-09 (commits f31a38b, add5697, 000adaf, 5e207be): metro.config.js sourceExts 'sql', babel.config.js inline-import, wasm assetExt registration + fail-hard guard test. Independently re-verified 2026-08-29: expo export web + ios exit 0 (migration SQL inlined in Hermes string table), 415 tests green, tsc clean."
  severity: blocker
  test: 1
  resolved_by: 03-09-PLAN.md
  debug_session: .planning/debug/resolved/app-boot-crash-drizzle-migration.md
