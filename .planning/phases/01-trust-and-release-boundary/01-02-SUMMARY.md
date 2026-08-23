---
phase: 01-trust-and-release-boundary
plan: 02
subsystem: ui
tags: [privacy-disclosure, provider-registry, zod, expo-router, react-native-testing-library, vitest, rolldown, flow, accessibility]

# Dependency graph
requires:
  - phase: 01-01 (walking skeleton)
    provides: Expo SDK 57 scaffold with routes at src/app/, green Vitest 4 + RNTL 14 + zod stack, secret-hygiene .gitignore
  - phase: 01-04 (governance docs)
    provides: six canonical provider ids, data-category vocabulary, retention-deletion-policy.md sections referenced by number
provides:
  - Versioned, schema-validated provider registry (src/data/provider-registry.json) encoding the Phase 1 truth (all providers planned, nothing active)
  - Privacy & Data disclosure screen (src/app/privacy.tsx) rendering the registry with an all-planned nothing-leaves-device banner
  - App landing on /privacy via Redirect (PRIV-07 user review capability, statically provable on web export)
  - Zero-dependency React Native test shim for Vitest (rolldown prebundle + jest-preset-parity module mocks)
affects: [01-06 (disclosure drafts + consistency tests consume the registry), 01-07 (CI runs these tests), Phase 2/7/10 (registry status flips per retention policy §7)]

# Tech tracking
tech-stack:
  added: []  # zero new packages — rolldown/babel plugins are pre-existing transitive deps
  patterns: ["registry-driven disclosure: one versioned data source feeds UI now and store drafts later (plan 01-06)", "RN-under-Vitest test shim: rolldown prebundle (Hermes flow-strip) + jest-preset-parity module mocks + lazy require-facade alias + require.cache seeding", "RNTL /pure usage in non-jest runners: render-result queries + IS_REACT_ACT_ENVIRONMENT owned by setup"]

key-files:
  created:
    - src/schemas/provider-registry.ts
    - src/schemas/registry.test.ts
    - src/data/provider-registry.json
    - src/__tests__/privacy-screen.test.tsx
    - src/app/privacy.tsx
    - src/test/setup.ts
    - scripts/vitest/react-native-shim.ts
    - scripts/vitest/rn-shim-modules.d.ts
  modified:
    - vitest.config.ts
    - src/app/index.tsx
    - src/app/_layout.tsx
  deleted:
    - src/app/explore.tsx
    - src/components/app-tabs.tsx
    - src/components/app-tabs.web.tsx
    - src/components/hint-row.tsx
    - src/components/web-badge.tsx
    - src/components/external-link.tsx
    - src/components/ui/collapsible.tsx

key-decisions:
  - "Registry fulfills the 01-04 contract: exactly the six inventory provider ids, every retention string references retention-deletion-policy.md by section number (§1/§2/§3/§4/§7), A2/A4 re-verification notes carried"
  - "Routes live at src/app/ (scaffold reality), not the plan's app/ — plan's own read_first deferred to the current template structure"
  - "React Native under Vitest solved with a zero-dependency test shim instead of a new package (vite-plugin-react-native) or a jest switch: rolldown pre-bundles RN with the Hermes flow-strip stack RN itself ships, mirroring @react-native/jest-preset@0.86.2's module mocks (ScrollView/Text/View/NativeComponentRegistry/UIManager/NativeModules/InitializeCore) jest-free"
  - "RNTL imported via /pure entry with render-result queries instead of the screen singleton (vitest CJS interop split RNTL's module state); IS_REACT_ACT_ENVIRONMENT set by setup because /pure skips the main entry's act-environment management"
  - "supabase/sentry carry dataCategories slugs beyond inventory §3's current 11 (account-identifier, synced-artifacts, crash-diagnostics) — schema requires min 1; flagged for plan 01-06 vocabulary alignment"
  - "appleLabelMapping/playDataTypes entered as drafts per RESEARCH mapping notes; finalized by plan 01-06 worksheets"

patterns-established:
  - "Registry-render pattern: disclosure components import src/data/provider-registry.json and contain zero provider strings — parity enforced by tests asserting registry-count and registry-content rendering"
  - "Component-test pattern for RN under vitest: RNTL acquired in beforeAll (post-shim), async render awaited, cleanup afterEach, role/accessible props on rows"
  - "Expo typed-routes ordering: regenerate .expo/types (dev-server boot) after route changes before tsc --noEmit — extends 01-01's expo-before-tsc CI note"

requirements-completed: [PRIV-07]

# Metrics
duration: 91 min
completed: 2026-08-23
status: complete
---

# Phase 01 Plan 02: Trust and Release Boundary — Privacy Disclosure Summary

**Registry-driven Privacy & Data screen: six provider disclosures (zod-validated, retention §-referenced) rendered from one versioned data file and landed as the app's opening surface, on a zero-dependency React Native test shim for Vitest**

## Performance

- **Duration:** 91 min
- **Started:** 2026-08-23T15:23:58Z
- **Completed:** 2026-08-23T16:54:34Z
- **Tasks:** 3 of 3
- **Files modified:** 18 (8 created, 3 modified, 7 demo files deleted)

## Accomplishments
- Provider registry as schema-enforced data: `providerRegistrySchema` (zod, closed `planned|active` enum, `introducedInPhase` int-or-null, min-1 dataCategories, every field `.describe()`-documented) + 13 gate tests — malformed registry data fails CI loudly
- Registry content fulfills the wave-1 01-04 contract: exactly the six canonical ids, retention strings reference retention-deletion-policy.md sections by number, all providers `planned` (Phase 1 truth: nothing leaves the device), A2/A4 re-verification notes carried
- Privacy & Data screen renders every provider's full disclosure facts from the imported registry (name, Planned label, categories, "When it sends" trigger, retention, purpose, notes) plus a computed all-planned banner; component contains zero provider strings
- App opens on the disclosure surface: index = Redirect to /privacy; template demo content stripped so only real routes remain; web export statically renders the disclosures in dist/privacy.html
- React Native runs under Vitest plain-Node with zero new packages: rolldown pre-bundle with Hermes flow-strip + jest-preset-parity module mocks

## Task Commits

Each task was committed atomically (TDD tasks carry RED→GREEN commits):

1. **Task 1: Provider registry schema + data** — `b6317ae` (test: RED) + `26e202e` (feat: GREEN)
2. **Task 2: Privacy & Data disclosure screen** — `4cb1595` (test: RED + test infrastructure) + `0aff928` (feat: GREEN)
3. **Task 3: Route the app to the disclosure surface** — `a354326` (feat)
4. **Post-task fix: setup/RNTL instance split** — `c58295f` (fix)

**Plan metadata:** see final docs commit below.

## TDD Gate Compliance

Both `tdd="true"` tasks followed RED→GREEN with the gate commits in order:
- Task 1: `test(01-02)` b6317ae (failed: module missing) → `feat(01-02)` 26e202e (13/13 green)
- Task 2: `test(01-02)` 4cb1595 (failed: component missing) → `feat(01-02)` 0aff928 (4/4 green)

## Files Created/Modified
- `src/schemas/provider-registry.ts` — zod schema + Provider/ProviderRegistry types, field-documented
- `src/data/provider-registry.json` — the versioned disclosure source of truth (schemaVersion 1)
- `src/schemas/registry.test.ts` — schema validation gate (ids, planned status, enums, required fields)
- `src/app/privacy.tsx` — Privacy & Data disclosure screen (registry-driven, accessible list semantics)
- `src/__tests__/privacy-screen.test.tsx` — component gate: registry-parity rendering assertions
- `scripts/vitest/react-native-shim.ts` + `scripts/vitest/rn-shim-modules.d.ts` + `src/test/setup.ts` + `vitest.config.ts` — RN-under-Vitest test infrastructure (see deviations)
- `src/app/index.tsx` — Redirect to /privacy; `src/app/_layout.tsx` — Stack layout
- Deleted: 7 template demo files (explore, app-tabs×2, hint-row, web-badge, external-link, collapsible)

## Decisions Made
- **Route location adapted to the scaffold**: Expo Router routes live at `src/app/` (create-expo-app SDK 57 default template), not the plan's `app/`. The plan's Task 3 read_first explicitly said "see current template structure", so files landed at src/app/*.tsx with identical names/roles.
- **Zero-dependency test shim over a new package or jest**: react-native ships Flow sources Node cannot parse and eagerly touches native modules. Solution layers (a) rolldown pre-bundle of react-native with the same Hermes-parser + flow-strip + flow-enums babel stack @react-native/babel-preset uses, (b) jest-free ports of @react-native/jest-preset@0.86.2's module mocks (verified against its published tarball, read-only), (c) a lazy alias-facade + require.cache seeding so the Vitest module graph and native requires (RNTL's) share one instance, (d) jest-preset globals (act environment, IS_REACT_NATIVE_TEST_ENVIRONMENT, window, ErrorUtils, nativeFabricUIManager={}). Bundle cached under node_modules/.cache keyed by RN version + shim version.
- **RNTL /pure + render-result queries**: RNTL's main entry requires jest globals (global expect); /pure skips them. Vitest's CJS interop split RNTL's `screen` singleton from the `render` instance, so queries run through each `render()` result — the identical query API. RNTL v14's `render` is async (act-wrapped) and every call is awaited.
- **Registry category vocabulary extension**: schema mandates ≥1 dataCategory per provider; supabase and sentry received `account-identifier`/`synced-artifacts` and `crash-diagnostics` — slugs not yet in inventory §3's list of 11. Flagged for plan 01-06 (its consistency tests compare provider ids; vocabulary alignment can extend the inventory there).
- **Device spot check deferred to end-of-phase UAT** (human_verify_mode: end-of-phase); automated substitute evidence: dist/privacy.html statically contains the full rendered disclosure (banner + provider names).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan route paths didn't match the scaffold structure**
- **Found during:** Task 2/3
- **Issue:** Plan specified `app/privacy.tsx`, `app/index.tsx`; the SDK 57 default template puts Expo Router routes at `src/app/` (the plan's own read_first: "see current template structure")
- **Fix:** Created/edited `src/app/privacy.tsx`, `src/app/index.tsx`, `src/app/_layout.tsx`; all key_links preserved (same import graph, one directory deeper)
- **Files modified:** src/app/*
- **Verification:** expo export web renders /privacy; vitest green
- **Committed in:** 4cb1595, 0aff928, a354326

**2. [Rule 3 - Blocking] react-native cannot load under Vitest (Flow sources + native-module access + CJS-require bypass)**
- **Found during:** Task 2 RED→GREEN (first RNTL render attempt)
- **Issue:** Three stacked blockers: (a) RN ships Flow (`import typeof`, `} as T`) that Node/vite/rolldown parsers reject; (b) 01-01's vitest config never imported react-native (zod-only smoke test), so this surfaced here; (c) even with a vite transform, RN's runtime `require()` of its internals bypasses vite to raw files, and eager native-module access (`TurboModuleRegistry.getEnforcing` for feature flags, `NativeDeviceInfo.getConstants().Dimensions` at module scope) throws without the mocks the RN jest preset provides
- **Fix:** Built the zero-dependency test shim documented under Decisions: rolldown prebundle (Hermes flow-strip, Metro-style `.ios.js`/`.native.js`/`.js` resolution, `@react-native/*` satellites bundled), jest-preset-parity module mocks verified against the published @react-native/jest-preset@0.86.2 tarball (read-only), lazy facade alias written at config time, require.cache seeding in setupFiles, act-environment + jest-preset globals. Troubleshooting artifacts of note: an "anything" proxy mock made every RN feature flag truthy and routed ScrollView through the experimental VirtualView machinery whose act promises never settle — the fix was undefined-returning no-op modules so flags fall back to `?? defaultValue`
- **Files modified:** scripts/vitest/react-native-shim.ts, scripts/vitest/rn-shim-modules.d.ts (new), src/test/setup.ts (new), vitest.config.ts
- **Verification:** `npx vitest run` = 19/19 green incl. 4 RNTL component tests; `npx tsc --noEmit` clean
- **Comitted in:** 4cb1595, 0aff928, c58295f

**3. [Rule 3 - Blocking] Expo typed routes broke tsc after route changes**
- **Found during:** Task 3 verification
- **Issue:** `.expo/types/router.d.ts` still typed only `/` and `/explore`; `Redirect href="/privacy"` failed tsc. `npx expo export` no longer regenerates the file
- **Fix:** Deleted `.expo/` and briefly booted the dev server (which regenerates typed routes), then re-ran tsc
- **Files modified:** none tracked (.expo is gitignored)
- **Verification:** tsc exit 0
- **Committed in:** a354326
- **Note for 01-07 CI:** after route changes, CI must regenerate typed routes (dev-server boot or equivalent) before `tsc --noEmit` — extends 01-01's expo-before-tsc ordering note

**4. [Rule 1 - Bug] `screen` singleton split across RNTL module instances**
- **Found during:** Task 2 GREEN
- **Issue:** "`render` function has not been called" from screen queries — vitest's CJS interop loaded a second RNTL instance when the setupFile also imported it
- **Fix:** RNTL acquired solely in each component test file's beforeAll; queries run through render() results; setupFile owns only globals. Also required awaiting RNTL v14's async render and setting IS_REACT_ACT_ENVIRONMENT (pure entry skips auto-management; without it act queues never flush and cleanup hangs)
- **Files modified:** src/test/setup.ts, src/__tests__/privacy-screen.test.tsx
- **Verification:** 4/4 component tests green; suite completes (no hang)
- **Committed in:** 0aff928, c58295f

**5. [Rule 2 - Missing Critical] supabase/sentry category slugs absent from inventory vocabulary**
- **Found during:** Task 1 GREEN
- **Issue:** Schema requires ≥1 dataCategory per provider (plan's own behavior test), but the inventory's §3 list defines no slugs for supabase's or sentry's future flows
- **Fix:** Entered `account-identifier`, `synced-artifacts`, `crash-diagnostics` derived from the inventory's own provider-row descriptions; flagged for plan 01-06 to extend inventory §3 or align
- **Files modified:** src/data/provider-registry.json
- **Verification:** schema tests green; ids unchanged
- **Committed in:** 26e202e

---

**Total deviations:** 5 auto-fixed (3× Rule 3 blocking, 1× Rule 1 bug, 1× Rule 2 missing-critical)
**Impact on plan:** Deviation 2 was the plan's largest hidden risk (01-01's "plain Node" RNTL assumption was untested); it consumed most of the plan's time budget but produced reusable test infrastructure with zero new packages. No scope creep; all plan artifacts delivered.

## Issues Encountered
- The RN-under-Vitest debugging loop required process-level diagnosis (macOS `sample` on hung workers) to distinguish a lost-RPC hang from a crash, and a read-only fetch of the official @react-native/jest-preset tarball to mirror its exact mock set — recorded here so 01-07's CI work inherits the knowledge.
- Vitest's `--pool=vm` reports "Runner vm is not supported" without an additional environment package — not pursued.

## Authentication Gates
None — no authenticated services were required.

## User Setup Required
None. Local run: `npm install && npx expo start` (opens on the Privacy & Data screen).

## Verification Evidence
- `npx vitest run` — 3 files, 19/19 tests green (2 smoke, 13 schema gate, 4 component)
- `npx tsc --noEmit` — exit 0 (after typed-routes regeneration)
- `npx expo export --platform web` — exit 0; `dist/privacy.html` statically contains the rendered disclosure (banner text "no data currently leaves your device" + provider names), i.e. the SSG export itself proves the landing surface renders the registry
- Manual spot check (`npx expo start` → app opens on Privacy & Data listing all six providers): queued for the end-of-phase UAT batch per `human_verify_mode: end-of-phase`; static export evidence above stands in for automation

## Known Stubs
None — the screen renders the complete registry; no placeholder content.

## Threat Flags
None — no security-relevant surface beyond the plan's threat model; T-01-03 (registry-only rendering, component-test parity) and T-01-04 (zod gate at test time, CI in 01-07) mitigations implemented as specified.

## Next Phase Readiness
- Registry ready for plan 01-06: provider ids match data-inventory.md exactly; consistency tests can parse via providerRegistrySchema; vocabulary alignment note (3 new slugs) recorded above
- Test stack ready for 01-05/01-07: any future component test copies the privacy-screen pattern (beforeAll RNTL acquisition, awaited render, render-result queries); RN bundle cached per version
- CI notes inherited: run an expo command + typed-routes regeneration before tsc on fresh clones (01-01 note + this plan's deviation 3)
- No blockers

## Self-Check: PASSED

All 8 created key-files exist on disk; all 6 task commits (b6317ae, 26e202e, 4cb1595, 0aff928, a354326, c58295f) present in git log; plan-level verification re-run green (vitest 19/19, tsc exit 0, expo export web exit 0 with dist/privacy.html containing the rendered disclosure).
