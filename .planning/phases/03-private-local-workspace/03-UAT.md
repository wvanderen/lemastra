---
status: diagnosed
phase: 03-private-local-workspace
source: [03-VERIFICATION.md]
started: 2026-08-29T17:30:00Z
updated: 2026-08-29T18:05:00Z
---

## Current Test

[testing paused — 4 items outstanding]

## Tests

### 1. Real restart survival
expected: The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
result: issue
reported: "BLOCKED: chart unable to save and getting this error: Couldn't save the chart. Your chart is still open on this screen — nothing was lost. Try saving again. Not seeing any output in either console that's related"
severity: blocker

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
issues: 1
pending: 4
skipped: 0
blocked: 0

## Gaps

- truth: "The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call"
  status: failed
  reason: "User reported: chart unable to save; tapping save shows 'Couldn't save the chart. Your chart is still open on this screen — nothing was lost. Try saving again.' and no related output appears in either console"
  severity: blocker
  test: 1
  root_cause: "CONFIRMED (observability layer): save failures are structurally silent — toWorkspaceError (src/lib/workspace/repository.ts:253) preserves the underlying message but nothing logs it; useSaveChart (src/hooks/use-workspace.ts:34) runs TanStack retry:false so the rejection is captured into isError (no unhandled rejection → no Metro/redbox output); UI renders static SAVE_ERROR_COPY (src/components/workspace/copy.ts:128). The exact underlying save exception is therefore unobservable in the current build. Ranked remaining causes: (1) device-resident lemastra.db from earlier Phase-03 dev builds conflicting with current migration — fresh-sandbox experiment opened+migrated correctly, and drizzle/0000_nebulous_meggan.sql CREATE UNIQUE INDEX lacks IF NOT EXISTS; (2) dev-client sync-path failure never exercised by tests (expo-crypto randomUUID has no dev fallback; expo-sqlite executeSync insert path); (3) other device-specific write failure. Eliminated with direct evidence: zod validation/serialization (result screen pre-parses with same schemas), babel inline-import migration loading (transformed output byte-correct through readMigrationFiles), repository/SQL/driver logic (415-test suite), missing native modules (requireNativeModule at module load; app boots), runtime DB open/migrate on fresh sandbox (live dev-build experiment created lemastra.db with all tables + journal). Also found: home chart list renders a failed boot-time listCharts identically to an empty workspace (charts.data ?? [], no error state) — hides DB failures."
  artifacts:
    - path: "src/lib/workspace/repository.ts"
      issue: "toWorkspaceError wraps but never logs; SAVE_FAILED thrown at 332/475 with underlying error invisible"
    - path: "src/hooks/use-workspace.ts"
      issue: "useSaveChart retry:false swallows rejection into isError; no logging of the failure"
    - path: "src/components/workspace/copy.ts"
      issue: "SAVE_ERROR_COPY is static — no failure class surfaced to user or UAT"
    - path: "drizzle/0000_nebulous_meggan.sql"
      issue: "CREATE UNIQUE INDEX without IF NOT EXISTS — fails against pre-existing device DBs from earlier dev builds"
    - path: "src/app/chart/result.tsx"
      issue: "save error card renders static copy only"
  missing:
    - "Log WorkspaceError code+message through the sanctioned logger seam (src/lib/redact.ts logger, per 03-02 telemetry law) at toWorkspaceError / saveChart catch — one device save attempt then names the exact exception"
    - "Migration/schema robustness for device-resident DBs from earlier dev builds (IF NOT EXISTS, versioned handling, or dev-time wipe/migration guard)"
    - "Dev fallback or test coverage for sync-path primitives (expo-crypto randomUUID, expo-sqlite executeSync insert path)"
    - "Surface WorkspaceError code in the save-error card so UAT reports carry the failure class"
    - "Distinct error state for home chart list instead of rendering identical to empty workspace"
  debug_session: .planning/debug/chart-save-fails.md

- truth: "App boots on web and the saved chart reopens from the home list after force-quit/relaunch"
  status: resolved
  reason: "Was: Metro 'Unable to resolve module ./0000_nebulous_meggan.sql' on web + native boot failure. Closed by gap-closure plan 03-09 (commits f31a38b, add5697, 000adaf, 5e207be): metro.config.js sourceExts 'sql', babel.config.js inline-import, wasm assetExt registration + fail-hard guard test. Independently re-verified 2026-08-29: expo export web + ios exit 0 (migration SQL inlined in Hermes string table), 415 tests green, tsc clean."
  severity: blocker
  test: 1
  resolved_by: 03-09-PLAN.md
  debug_session: .planning/debug/resolved/app-boot-crash-drizzle-migration.md
