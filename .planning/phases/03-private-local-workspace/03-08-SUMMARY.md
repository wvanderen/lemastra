---
phase: 03-private-local-workspace
plan: 08
subsystem: privacy
tags: [react-native, expo-file-system, expo-sharing, tanstack-query, privacy, export-all, delete-all, rntl, vitest, copy-deck, data-controls]

# Dependency graph
requires:
  - phase: 03-private-local-workspace (plan 03)
    provides: WorkspaceRepository exportAllData/deleteAllData (corpus + transactional wipe), ExportedWorkspace contract, WorkspaceError vocabulary
  - phase: 03-private-local-workspace (plan 04)
    provides: workspace copy deck + ErrorCard, CHARTS_QUERY_KEY invalidation convention
  - phase: 03-private-local-workspace (plan 06)
    provides: DeleteConfirm variant=all with the exact delete-all deck copy, export.ts write-then-gate-then-share mechanics, WebUnsupported capability card, export-seam test-mock convention
provides:
  - The PRIV-05/PRIV-06 vertical slice (D-15) — "Your data" section on /privacy: export-all (one pretty lemastra-all-data.json with the complete corpus via the share sheet) and delete-all (confirm-gated transactional wipe sparing the disclosure flag), with web-disabled variants
  - DataControls component (provider-optional mount, local useMutation hooks, completion state, exact-deck error surfaces)
  - privacy/copy.ts — the privacy-surface copy deck (section strings; workspace-deck literals reused, never forked)
  - exportAllDataFile + ALL_DATA_EXPORT_FILENAME in export.ts
  - vitest expo-device-facades (crypto/file-system/sharing) + config aliases — unmodifiable test graphs load device-free
affects: [phase-04 (wheel/evidence screens link the privacy posture), phase-10 (store disclosure surfaces cite the same controls), gsd-verify-work end-of-phase UAT]

# Tech tracking
tech-stack:
  added: []  # no new packages; expo-file-system/expo-sharing consumed beside 03-06, node:crypto reused in a test facade
  patterns:
    - provider-optional section component: read QueryClientContext, supply a lazy local fallback client only when no ancestor exists — the ancestor client wins in-app so the shared ['charts'] invalidation map is preserved while bare (Phase-1) test renders keep passing unmodified
    - delete-success dismisses its own confirm modal when the section stays mounted (saved-detail redirects home instead — both keep completion content reachable under accessibilityViewIsModal)
    - vitest config-alias device facades with per-file vi.mock precedence — extends the 03-01 expo-sqlite facade to expo-crypto/file-system/sharing
    - flushMutationRender test idiom — TanStack observer commits settle on notifyManager macrotask turns; drain a few timer turns inside act before asserting rendered mutation state (extends the 03-05 act-queue law)

key-files:
  created:
    - src/components/privacy/copy.ts
    - src/components/privacy/data-controls.tsx
    - src/__tests__/data-controls.test.tsx
    - scripts/vitest/expo-device-facades/crypto.ts
    - scripts/vitest/expo-device-facades/file-system.ts
    - scripts/vitest/expo-device-facades/sharing.ts
    - scripts/vitest/expo-device-facades/README.md
  modified:
    - src/lib/workspace/export.ts
    - src/app/privacy.tsx
    - vitest.config.ts

key-decisions:
  - "DataControls mounts provider-optional (QueryClientContext read + lazy fallback client): the app's ancestor client always wins so delete-all invalidates the shared ['charts'] cache, while the Phase-1 privacy-screen tests render bare and stay unmodified"
  - "Delete-all success closes the confirm modal before the completion state renders — an open accessibilityViewIsModal modal hides everything outside it, and a dead modal over 'No personal data is stored on this device.' is wrong UX regardless"
  - "exportAllDataFile uses the fixed name lemastra-all-data.json (no user input → nothing to sanitize, T-03-18 trivially holds; re-exports overwrite, Pitfall 6 semantics) and passes the repository corpus through untouched — the user believes they have everything, so they do (T-03-25)"
  - "Web-disabled cards swap each capability helper for the approved 'Available in the LemAstra app on iOS or Android.' helper and disable the press — zero repository calls fire on web (D-03)"
  - "Mutation hooks stay LOCAL to data-controls.tsx (confirm.tsx precedent) — use-workspace.ts is 03-07's this wave and is imported, never modified; CHARTS_QUERY_KEY keeps one definition site"

patterns-established:
  - "Pattern: registry-screen extension — additive section mount below provider content, section copy in its own privacy deck module, provider rendering byte-unchanged (governance invariant survives its first extension)"
  - "Pattern: destructive section flow — card → shared DeleteConfirm(variant=all) → repository wipe → modal closes on success AND failure → ['charts'] invalidation → completion replaces the action cards"
  - "Pattern: config-alias device facades for unmodifiable test graphs (per-file vi.mocks keep precedence)"

requirements-completed: [PRIV-05, PRIV-06]

# Metrics
duration: 24 min
completed: 2026-08-27
status: complete
---

# Phase 03 Plan 08: Your-Data Controls Summary

**PRIV-05/PRIV-06 delivered as the D-15 "Your data" section on /privacy: one-file corpus export (lemastra-all-data.json, capability-gated share) and a confirm-gated transactional wipe that spares the disclosure flag — mounted additively under the registry-driven provider list with zero provider drift**

## Performance

- **Duration:** 24 min (started 2026-08-27T20:02:22Z, completed 2026-08-27T20:26:11Z)
- **Tasks:** 2 (Task 1 TDD RED→GREEN, Task 2 additive mount)
- **Files:** 10 (7 created, 3 modified)

## Accomplishments

- PRIV-05: Export all data writes ONE pretty-printed JSON file (lemastra-all-data.json, 2-space, Paths.cache via the OO File API) whose content deep-equals the repository corpus — every chart, every revision, full provenance — then hands it to the share sheet as application/json, gated on Sharing.isAvailableAsync(); pending shows the deck's single export-pending literal "Creating file…"; failure renders the exact "Couldn't create the export file." card with a working Try again
- PRIV-06: Delete all data runs behind the shared DeleteConfirm all-variant modal ("Delete all your data?" / scope + permanence + the surviving-acknowledgement sentence / "Delete everything", error-filled confirm, default Cancel), wipes via repository.deleteAllData(), invalidates ['charts'], and swaps the action cards for "No personal data is stored on this device."; cancel removes nothing; the AsyncStorage disclosure acknowledgement provably survives (mocked-store assertion)
- Governance invariant intact: privacy.tsx's diff is one import + one section element — provider rendering byte-unchanged, Phase-1 privacy-screen and disclosures-consistency tests pass unmodified
- Web (D-03): both cards render disabled with the "Available in the LemAstra app on iOS or Android." helper; disabled presses never reach the repository
- Test infra: vitest expo-device-facades (crypto/file-system/sharing) with config aliases so the unmodifiable Phase-1 privacy-screen graph loads device-free

## Task Commits

Task 1 followed TDD RED→GREEN; Task 2 (not tdd-flagged) committed after its acceptance gate:

1. **Task 1: privacy copy module + data-controls component + export-all helper** — `f238511` (test, RED: 16 rows failing on absent modules) + `7d8588a` (feat, GREEN: 16/16)
2. **Task 2: extend /privacy — one section, zero provider drift** — `0a88113` (feat: additive mount + 2 integration rows + device facades)

**Plan metadata:** (see final docs commit below)

## Verification Evidence

- Task 1: `npx vitest run src/__tests__/data-controls.test.tsx` → RED (module-absent failures) then GREEN 16/16, stable across 3 consecutive runs; neighbor suites re-run green (chart-export 12, delete-confirm 13 + wired rows, saved-chart-detail 11 — 55/55 across the four files)
- Task 2: `npx vitest run src/__tests__/data-controls.test.tsx src/__tests__/privacy-screen.test.tsx src/__tests__/disclosures-consistency.test.ts` → 27/27 with privacy-screen.test.tsx and disclosures-consistency.test.ts byte-unmodified
- Plan-level: full suite `npx vitest run` → 38 files / 405 tests pass (37 files/387 before this plan — +1 file, +18 tests, zero regressions); `npx tsc --noEmit` exit 0 (no new routes → no typed-routes regen needed); `git diff src/app/privacy.tsx` shows additive-only changes (import + section mount)
- Threat-model dispositions: T-03-25 (export deep-equals corpus, provenance included — parse-back asserted), T-03-26 (transactional wipe + counts-to-zero completion state; journal/AsyncStorage spared per Pitfall 9 — flag survival asserted), T-03-27 (provider rendering byte-unchanged; Phase-1 consistency gates green), T-03-28 (modal names scope/permanence/what-survives; cancel default; no shortcut triggers — cards are the only path)

## Files Created/Modified

- `src/components/privacy/copy.ts` — the privacy-surface copy deck: YOUR_DATA_* section strings, card labels/helpers, completion + web-disabled helpers; workspace-deck literals (EXPORT_PENDING, error classes, all-variant dialog strings) reused, never forked
- `src/components/privacy/data-controls.tsx` — the "Your data" section: provider-optional wrapper + local useMutation hooks (export-all corpus→file→share, delete-all wipe→invalidation→completion), DeleteConfirm variant=all, ErrorCard/WebUnsupported states, web-disabled variants
- `src/lib/workspace/export.ts` — ALL_DATA_EXPORT_FILENAME + exportAllDataFile (fixed name, pretty corpus write, capability-gated share) beside exportChartRevision
- `src/app/privacy.tsx` — additive DataControls mount below the provider list
- `src/__tests__/data-controls.test.tsx` — 18 rows: deck literals, section rendering, error-color law, corpus deep-equality through the REAL export module (captured writes), gated share, capability card, both error decks with working Try again, wipe + invalidation spy, flag survival, cancel no-op, web variants, and the two /privacy integration rows (document order, completion-inside-section)
- `scripts/vitest/expo-device-facades/{crypto,file-system,sharing}.ts` + README — vitest aliases for the three device modules (exact consumed surface; per-file vi.mock precedence documented)
- `vitest.config.ts` — the three new resolve aliases beside the 03-01 expo-sqlite facade

## Decisions Made

See key-decisions. Notably: the provider-optional mount (ancestor client wins, bare renders get a local fallback — the only way to honor both "local useMutation" and "Phase-1 tests pass unmodified"); delete-success dismisses its own modal; the fixed all-data filename; the helper-swap web variant; use-workspace.ts imported but never modified.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Delete-all left the confirm modal open over the completion state**
- **Found during:** Task 1 (GREEN iteration)
- **Issue:** Unlike the saved-detail (which redirects home on success), the section stays mounted — the modal stayed visible after the wipe, burying "No personal data is stored on this device." behind a dead dialog (and under accessibilityViewIsModal everything outside an open modal is a11y-hidden, so the completion state was unreachable for users and unqueryable in tests)
- **Fix:** success now also closes the modal (`useEffect` on `isError || isSuccess` → `setConfirmVisible(false)`), matching the failure-path pattern
- **Files modified:** src/components/privacy/data-controls.tsx
- **Verification:** completion renders inside the section, modal gone (asserted in 4 tests); full suite green
- **Committed in:** 7d8588a

**2. [Rule 3 - Blocking] Unmodifiable Phase-1 privacy-screen test graph crashed on device modules**
- **Found during:** Task 2 (acceptance run)
- **Issue:** mounting DataControls pulled expo-crypto/expo-file-system/expo-sharing (via repository/ids and export) into privacy-screen.test.tsx's bare render — all three package entries load expo-modules-core → `__DEV__ is not defined`; the plan requires that file to pass WITHOUT modification, and the 03-06 per-file-mock convention cannot be applied to it
- **Fix:** created scripts/vitest/expo-device-facades (exact consumed surface per module) + three vitest.config.ts aliases, extending the 03-01 expo-sqlite facade pattern; per-file vi.mocks keep precedence so existing captured-write/gated-share tests are unaffected
- **Files modified:** vitest.config.ts, scripts/vitest/expo-device-facades/* (created)
- **Verification:** 27/27 across the three-file gate (privacy-screen unmodified); full suite 38 files/405 tests green with the aliases active
- **Committed in:** 0a88113

**3. [Rule 3 - Blocking/test-infra] Mutation-state renders needed an act'd timer flush**
- **Found during:** Task 1 (GREEN iteration)
- **Issue:** TanStack schedules mutation execution AND observer commits on notifyManager's macrotask scheduler, so an act'd press's isPending/isSuccess re-render settles on later timer turns — immediate post-press UI assertions (the export-pending row) saw stale trees
- **Fix:** flushMutationRender idiom in data-controls.test.tsx — drain a few timer turns inside act before asserting rendered mutation state (external-effect waits — mock calls, captured writes — need no flush)
- **Files modified:** src/__tests__/data-controls.test.tsx
- **Verification:** pending row asserted deterministically; suite stable across 3 runs
- **Committed in:** 7d8588a

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking — one production UX, one test infrastructure)
**Impact on plan:** All fixes required for correct, provable behavior; no production scope creep (the modal fix is the plan's own completion-state semantics made reachable).

## Issues Encountered

- The mutation-commit timing investigation (modal a11y-occlusion vs notifyManager macrotask scheduling) cost the bulk of the plan's time; both laws are now documented in the component/test headers so later waves inherit them without re-derivation.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 3 is complete (8/8 plans): every WORK and PRIV requirement is implemented — save/browse/reopen/revise/rename/export/delete single + export-all/delete-all, on a registry-driven privacy surface whose governance tests never changed
- Device-only behaviors (real share-sheet presentation for both export files, cache-dir writes on device) await the end-of-phase human verification (human_verify_mode = end-of-phase)
- Symbols for later phases: DataControls ({testID}), privacy/copy.ts deck, exportAllDataFile + ALL_DATA_EXPORT_FILENAME, the expo-device-facades pattern for any future unmodifiable-graph need

## TDD Gate Compliance

Plan type is `execute` with Task 1 `tdd="true"` — committed in RED→GREEN order:
- Task 1: `test(03-08)` f238511 precedes `feat(03-08)` 7d8588a ✓
- Task 2 is `type="auto"` (not tdd) — single feat commit 0a88113 ✓

## Self-Check: PASSED

All ten created/modified files exist on disk; all three task commits verified in git log (f238511, 7d8588a, 0a88113); plan verification commands re-run green (data-controls 18/18, three-file gate 27/27, full suite 38 files/405 tests, tsc exit 0, privacy.tsx diff additive-only).

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*
