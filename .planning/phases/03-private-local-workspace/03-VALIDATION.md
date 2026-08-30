---
phase: 3
slug: private-local-workspace
status: active
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-27
updated: 2026-08-29
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Populated from 03-RESEARCH.md §"Validation Architecture"; task IDs from plans 03-01 … 03-09 (23 tasks).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4 + React Native Testing Library 14 `/pure` + zero-dependency RN shim (existing Phase-1/2 substrate); repository/integration tests run against a real SQL engine via the `node:sqlite` → `expo-sqlite` facade alias (built by 03-01-T2) |
| **Config file** | `vitest.config.ts` (existing; gains the `expo-sqlite` alias in 03-01-T2) |
| **Quick run command** | `npx vitest run src/__tests__/<file>` |
| **Full suite command** | `npx vitest run && npx tsc --noEmit` (CI parity with `.github/workflows/ci.yml` test job; gitleaks jobs run on push) |
| **Estimated runtime** | ~5–30 s per file (quick) · ~60–120 s full suite incl. `tsc` |

---

## Sampling Rate

- **After every task commit:** Run the touched-area quick command from the map below (target < 30 s)
- **After every plan wave:** Run `npx vitest run && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~30 s quick / ~120 s full — every task in the phase is sampled (Nyquist rate 1:1)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-T1 | 01 | 1 | WORK-02 | T-03-SC | Deps pinned to SDK-57 tilde ranges via `npx expo install`; no postinstall scripts on any package; per-dep legitimacy rationale recorded | dependency-gate | `npm ls expo-sqlite expo-file-system expo-sharing expo-crypto drizzle-orm drizzle-kit && node -e "for (const p of ['expo-sqlite','expo-file-system','expo-sharing','expo-crypto','drizzle-orm','drizzle-kit']) { const s=require('./node_modules/'+p+'/package.json'); if (s.scripts && s.scripts.postinstall) process.exit(1) }"` | — (command gate) | ⬜ pending |
| 03-01-T2 | 01 | 1 | WORK-02 | T-03-02 | Facade implements exactly the source-read drizzle sync surface (nothing more); contract test pins return shapes AND proves a real drizzle insert/select/transaction roundtrip | unit (contract) | `npx vitest run src/__tests__/expo-sqlite-facade.test.ts` | ❌ created by task | ⬜ pending |
| 03-01-T3 | 01 | 1 | WORK-02, WORK-03 | T-03-01, T-03-03 | Migration gate runs before any query (no unmigrated reads); open→migrate→insert→read→close→reopen proven on a file-backed DB; A5 module shape verified or fallback recorded | integration | `npx vitest run src/__tests__/workspace-db.test.ts src/__tests__/expo-sqlite-facade.test.ts && npx tsc --noEmit` | ❌ created by task | ⬜ pending |
| 03-02-T1 | 02 | 1 | PRIV-03, PRIV-04 | T-03-04 | redact() allowlist strips envelope-shaped and birth-data-shaped values (incl. one-level nesting); unknown keys dropped by default; logger is the sole sanctioned console path | unit | `npx vitest run src/__tests__/redact.test.ts` | ❌ created by task | ⬜ pending |
| 03-02-T2 | 02 | 1 | PRIV-03, PRIV-04 | T-03-05, T-03-06 | No telemetry dependency or import anywhere in the graph; no log call sites outside logger/tests; positive control proves the scan fires | source-scan | `npx vitest run src/__tests__/telemetry-guard.test.ts src/__tests__/redact.test.ts && npx vitest run && npx tsc --noEmit` | ❌ created by task | ⬜ pending |
| 03-03-T1 | 03 | 2 | WORK-02 | T-03-07 | Label bound 1–60 trimmed; slug strips path separators/emoji/spaces (40-cap, "chart" fallback); ids via expo-crypto randomUUID (never Math.random) | unit | `npx vitest run src/__tests__/workspace-label.test.ts` | ❌ created by task | ⬜ pending |
| 03-03-T2 | 03 | 2 | WORK-02, WORK-03, WORK-04 | T-03-08, T-03-09 | zod parse at save AND every read (typed WorkspaceError, never partial); (chart, input_revision) dedupe; explicit transactional cascade | integration | `npx vitest run src/__tests__/workspace-repository.test.ts` | ❌ created by task | ⬜ pending |
| 03-03-T3 | 03 | 2 | WORK-03, WORK-04, PRIV-01, regression | T-03-08, T-03-10, T-03-11 | Restart survival (close→reopen same file); byte-equality immutability across append/rename; cascade + wipe counts-to-zero; corrupted envelope → typed OPEN_FAILED; no-network scan over workspace modules; frozen-fixture schema regression | integration + source-scan + regression | `npx vitest run src/__tests__/workspace-repository.test.ts && npx vitest run && npx tsc --noEmit` | ❌ created by task | ⬜ pending |
| 03-04-T1 | 04 | 3 | WORK-02 | — | Label validation gates confirm per keystroke; polite live-region errors; buttons disable while invalid/pending | component | `npx vitest run src/__tests__/save-prompt.test.tsx` | ❌ created by task | ⬜ pending |
| 03-04-T2 | 04 | 3 | WORK-02, PRIV-01 | T-03-12, T-03-13, T-03-14 | request param zod-parsed (malformed → save disabled, never a crash); zero repository writes before explicit Save tap; dedupe state + double-tap protection | component | `npx vitest run src/__tests__/save-flow.test.tsx src/__tests__/result-screen.test.tsx && npx tsc --noEmit` | ❌/✅ (save-flow new; result-screen existing) | ⬜ pending |
| 03-05-T1 | 05 | 4 | WORK-01, WORK-03 | — | D-11 present-only chips (no placeholder rows); exact a11y row labels; component adds no ordering (repository-owned) | component | `npx vitest run src/__tests__/chart-list.test.tsx` | ❌ created by task | ⬜ pending |
| 03-05-T2 | 05 | 4 | WORK-01, WORK-03 | — | No account/sign-in surface (exact-render assertion); empty state = hero only; web renders degradation card (no storage path) | component | `npx vitest run src/__tests__/home-workspace.test.tsx` | ❌ created by task | ⬜ pending |
| 03-05-T3 | 05 | 4 | WORK-03 | T-03-15, T-03-16, T-03-17 | Reopen by id param only (never an envelope param); zero network calls asserted during reopen; typed open-failure state — never partial render, never /birth redirect | component | `npx vitest run src/__tests__/saved-chart-detail.test.tsx && npx tsc --noEmit` | ❌ created by task | ⬜ pending |
| 03-06-T1 | 06 | 5 | WORK-05, WORK-06 | T-03-19 | Confirm modal names chart + revision count + permanence; cancel performs no repository call; rename input validated 1–60 | component | `npx vitest run src/__tests__/delete-confirm.test.tsx src/__tests__/rename-control.test.tsx` | ❌ created by task | ⬜ pending |
| 03-06-T2 | 06 | 5 | WORK-07 | T-03-18, T-03-21 | Slug sanitizes emoji/spaces/slashes BEFORE File construction; capability-gated `shareAsync(file.uri, application/json)` from Paths.cache; parse-back deep-equals the stored payload | unit (mocked File/Sharing) | `npx vitest run src/__tests__/chart-export.test.ts` | ❌ created by task | ⬜ pending |
| 03-06-T3 | 06 | 5 | WORK-05, WORK-06, WORK-07 | T-03-10 | Pitfall-10 invalidation map (list + detail keys); delete dismisses detail to home; failures render exact copy and remove nothing | component | `npx vitest run src/__tests__/rename-control.test.tsx src/__tests__/delete-confirm.test.tsx src/__tests__/saved-chart-detail.test.tsx && npx tsc --noEmit` | ❌/✅ (saved-chart-detail extended from 03-05) | ⬜ pending |
| 03-07-T1 | 07 | 6 | WORK-04 | T-03-22, T-03-24 | "What changed" from the closed 8-item vocabulary + fallback (never raw diffs, never interpretation); read-only route renders zero mutating controls | unit + component | `npx vitest run src/__tests__/revision-diff.test.ts src/__tests__/revision-history.test.tsx && npx tsc --noEmit` | ❌ created by task | ⬜ pending |
| 03-07-T2 | 07 | 6 | WORK-04 | T-03-23 | Revise param zod-parsed (malformed → fresh-form fallback, never unvalidated prefill); chartId threads birth→confirm→result; same-chart append + dedupe copy; History row-count growth | component | `npx vitest run src/__tests__/revise-prefill.test.tsx src/__tests__/revision-history.test.tsx && npx tsc --noEmit` | ❌ created by task | ⬜ pending |
| 03-08-T1 | 08 | 6 | PRIV-05, PRIV-06 | T-03-25, T-03-26 | Export-all deep-equals the seeded corpus (nothing silently omitted); delete-all wipes to completion state with the disclosure AsyncStorage flag surviving; cancel no-op; web cards disabled | component | `npx vitest run src/__tests__/data-controls.test.tsx` | ❌ created by task | ⬜ pending |
| 03-08-T2 | 08 | 6 | PRIV-05, PRIV-06 | T-03-27 | /privacy extension is additive-only (provider rendering byte-unchanged, registry invariant holds); Phase-1 governance tests pass unmodified | regression (existing suites) | `npx vitest run src/__tests__/data-controls.test.tsx src/__tests__/privacy-screen.test.tsx src/__tests__/disclosures-consistency.test.ts && npx vitest run && npx tsc --noEmit` | ❌/✅ (privacy-screen + disclosures-consistency existing) | ⬜ pending |
| 03-09-T1 | 09 | 7 | WORK-02 | T-03-SC | Blocking pre-install legitimacy gate for [ASSUMED] package `babel-plugin-inline-import` — human verifies on npmjs before Task 2 may install; never auto-approvable | checkpoint (decision) | n/a — human approval via resume-signal ("approved") | — (human gate) | ⬜ pending |
| 03-09-T2 | 09 | 7 | WORK-01, WORK-02 | T-03-SC | Plugin lands in devDependencies only (build-time, never in app graph); drizzle/migrations.js and src/lib/workspace/db.ts stay byte-identical; web bundle resolves drizzle .sql imports | config-check + bundle-export | `npm ls babel-plugin-inline-import && node -e "const m=require('./metro.config.js');const b=require('./babel.config.js');if(!m.resolver.sourceExts.includes('sql'))throw new Error('sql missing from sourceExts');if(!JSON.stringify(b).includes('inline-import'))throw new Error('inline-import missing from babel config');console.log('bundler config ok')" && EXPO_NO_TELEMETRY=1 npx expo export --platform web` | ❌ created by task (metro.config.js, babel.config.js) | ⬜ pending |
| 03-09-T3 | 09 | 7 | WORK-01, WORK-02 | T-03-GC-01 | Fail-hard source-scan guard (telemetry-guard archetype) fails CI vitest job if metro.config.js, babel.config.js, or the devDependency is removed/staled — no allowlist file; mutation-verified positive control | source-scan (guard) | `npx vitest run src/__tests__/bundler-config-guard.test.ts` | ❌/✅ (guard new; vitest.config.ts comment fix) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Test-Filename Reconciliation (RESEARCH map → plan placement)

Two filenames in 03-RESEARCH.md §"Validation Architecture" were candidate names; the plans colocate those behaviors in shared files. **Where the behaviors actually live:**

| RESEARCH candidate file | Actual location | Behavior | Task |
|------------------------|-----------------|----------|------|
| `src/__tests__/privacy-local-default.test.ts` | `src/__tests__/workspace-repository.test.ts` (no-network source-scan block) + `src/__tests__/save-flow.test.tsx` (zero-writes-before-save assertion) | PRIV-01: repository layer has no network usage; nothing persists without explicit Save | 03-03-T3, 03-04-T2 |
| `src/__tests__/envelope-fixture.test.ts` | `src/__tests__/workspace-repository.test.ts` (frozen-fixture regression block) against `src/test/fixtures/frozen-natal-envelope.json` | Pitfall 1: current `calculateResponseSchema` still parses a frozen historical envelope | 03-03-T3 |

All other RESEARCH map filenames (`redact.test.ts`, `telemetry-guard.test.ts`, `workspace-repository.test.ts`, `save-flow.test.tsx`, `home-workspace.test.tsx`, `saved-chart-detail.test.tsx`, `chart-list.test.tsx`, `rename-control.test.tsx`, `delete-confirm.test.tsx`, `chart-export.test.ts`, `revision-history.test.tsx`, `revise-prefill.test.tsx`, `data-controls.test.tsx`) match plan-internal placement exactly.

---

## Wave 0 Requirements

Existing infrastructure (Vitest 4 + RNTL 14 `/pure` + RN shim + CI vitest/tsc/gitleaks jobs, Phases 1–2) covers the framework — **no separate Wave 0 stub pass is required**: every new test file is authored test-first by the first task that needs it. RESEARCH §"Wave 0 Gaps" are satisfied by plan tasks:

- [x] `scripts/vitest/expo-sqlite-facade/` + `vitest.config.ts` alias + facade contract test → **03-01-T2**
- [x] Workspace schema/db skeleton (`src/lib/workspace/`) + repository interface/fake seam → **03-01-T3** + **03-03-T1**
- [x] `src/lib/redact.ts` + logger convention → **03-02-T1**
- [x] Frozen envelope fixture (`src/test/fixtures/frozen-natal-envelope.json`) → **03-03-T3**
- [x] `drizzle.config.ts` + first `drizzle-kit generate` run (proves the A5 pipeline) → **03-01-T3**

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

*End-of-phase device UAT (`human_verify_mode: end-of-phase`) — not blocking any wave.*

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Persistence across a real app restart | WORK-03 | vitest proves close→reopen at the SQL-file level; a full app-process kill/relaunch in the OS sandbox is device-only | Save a chart on device/simulator → fully terminate the app → relaunch → chart appears in the workspace list → reopen renders full evidence |
| Native share sheet receives exports | WORK-07, PRIV-05 | `shareAsync` is mocked in tests; the actual OS share sheet is native UI | Export a chart → share sheet offers `lemastra-chart-<slug>-<id>.json`; /privacy → Export all data → `lemastra-all-data.json` |
| Web degradation states in a real browser | PRIV-01 (D-03) | `Platform.OS` branch is component-tested; the real browser render is visual | Open the web build → home shows "Saved charts are available in the app" card; /privacy data cards disabled with the app-only helper |
| Revise-flow request param on device (A6) | WORK-04 | Param-size assumption (~300B) is device-behavior | Revise a saved chart on device → /birth prefills completely (date, time, place, confidence, house system); no param truncation |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies (22/23 tasks carry automated commands; 03-09-T1 is the blocking pre-install approval checkpoint — human verification by design, gate is the action)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify (every task sampled 1:1)
- [x] Wave 0 covers all MISSING references (no MISSING references — each test file is created by its owning task, test-first)
- [x] No watch-mode flags (all commands are `vitest run` form, never watch mode)
- [x] Feedback latency < ~30 s quick / ~120 s full
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-08-27 (planner revision — populated from 03-RESEARCH.md §"Validation Architecture" with the 20 task IDs from plans 03-01…03-08)
