---
phase: 02-trustworthy-natal-chart
plan: "02"
subsystem: api
tags: [zod, tanstack-query, react-hook-form, async-storage, fetch-client, expo, tdd]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: vitest RN shim + RNTL /pure pattern, provider-registry.ts zod conventions, .env.example EXPO_PUBLIC_API_URL
provides:
  - Zod response contracts (places/search, places/resolve-time, charts/calculate, meta/zones, error body) with closed CALC-04/house-system/confidence/classification/mode vocabularies
  - Typed parse-then-trust fetch client (apiClient base-URL resolver, postPlaceSearch, postResolveTime, postCalculate, fetchZones, ApiError)
  - QueryProvider with focusManager↔AppState wiring (TanStack v5)
  - useDisclosure one-time D-04 flag under @lemastra:disclosure.calculation.v1
  - Installed client deps react-hook-form, @hookform/resolvers, @tanstack/react-query, async-storage
affects: [02-03-error-taxonomy, 02-04-places-routes, 02-05-ui-components, 02-06-birth-form, 02-07-golden-fixtures, 02-08-disclosure, 02-09-result-view]

# Tech tracking
tech-stack:
  added: [react-hook-form ^7.86.0, "@hookform/resolvers ^5.9.1", "@tanstack/react-query ^5.102.3", "@react-native-async-storage/async-storage 2.2.0 (expo-selected)"]
  patterns: [parse-then-trust (zod parse before return at the API boundary), closed-enum response contracts mirroring api errors.py, platform-default base-URL resolution, vi.hoisted in-memory AsyncStorage mock, RNTL /pure renderHook acquisition]

key-files:
  created:
    - src/lib/api-schemas.ts
    - src/lib/api.ts
    - src/lib/api-schemas.test.ts
    - src/lib/query-client.tsx
    - src/hooks/use-disclosure.ts
    - src/__tests__/use-disclosure.test.tsx
  modified:
    - package.json
    - package-lock.json
    - scripts/vitest/react-native-shim.ts

key-decisions:
  - "Response contracts use snake_case field names matching the documented API envelope (research endpoint table); only the Google passthrough block keeps Google's camelCase"
  - "TanStack v5 focus API is focusManager.setFocused(status === 'active') — the v4 setEnabled no longer exists (verified against installed @tanstack/query-core)"
  - "AsyncStorage resolved to 2.2.0 (expo install's authoritative SDK-57-compatible pick), not research's 3.1.1"
  - "RN shim gained an AppState turbo-module case (initialAppState/getCurrentAppState/addListener/removeListeners) so the real AppState JS works under vitest"

patterns-established:
  - "Parse-then-trust client: every API response (success and error) passes its zod schema before reaching calling code; malformed 2xx bodies throw loudly"
  - "Pure resolveBaseUrl(envUrl, platformOs) with EXPO_PUBLIC_API_URL ?? platform default (10.0.2.2:8000 on android, localhost:8000 otherwise)"
  - "Versioned AsyncStorage disclosure keys (@lemastra:disclosure.<topic>.vN) with safe-persist catch"
  - "looseObject for calculator-controlled chart_data sub-objects (validate consumed fields, preserve unknown passthrough); strict z.object for API-service-controlled envelopes"

requirements-completed: [BIRTH-01]

# Metrics
duration: 7 min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 02: Client Data Layer (Libraries + Contracts) Summary

**Four approved client deps installed, zod response contracts with a parse-then-trust typed fetch client, TanStack v5 QueryProvider wired to AppState, and the AsyncStorage-backed D-04 disclosure hook — all TDD with green suites**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-25T18:32:43Z
- **Completed:** 2026-08-25T18:39:40Z
- **Tasks:** 3
- **Files modified:** 9 (6 created, 3 modified)

## Accomplishments

- Package-legitimacy checkpoint (T-02-SC, blocking-human) satisfied by explicit user approval of all four packages, then installed via `npx expo install` — versions expo-selected and authoritative, existing ~57 tilde pins untouched
- `src/lib/api-schemas.ts`: response contracts mirroring the verified RESEARCH.md §3 endpoint table — closed vocabularies for the ten calculator house systems, four confidence labels, PEP 495 classifications, D-08 resolution modes, and the eleven CALC-04 error codes; unknown-time calculate contract omits house/angle/sect/lot keys and carries derived unavailable/provisional factor arrays
- `src/lib/api.ts`: parse-then-trust fetch client — every response parsed through its schema before returning; non-2xx bodies parse via errorSchema and throw typed `ApiError` (code/message/hint/recoverable); base URL from `EXPO_PUBLIC_API_URL ??` platform default
- `src/lib/query-client.tsx` + `src/hooks/use-disclosure.ts`: QueryProvider (client created once, focusManager↔AppState per current TanStack v5 guidance) and the one-time disclosure flag under the exact key `@lemastra:disclosure.calculation.v1`

## Task Commits

Each task was committed atomically (TDD: RED test → GREEN implementation):

1. **Task 1: Package approval + install** — `214f070` (chore)
2. **Task 2: Zod contracts + fetch client** — `4b421a5` (test/RED) + `25a2508` (feat/GREEN)
3. **Task 3: Query provider + disclosure hook** — `3ee7f33` (test/RED) + `b993404` (feat/GREEN), plus `4d09142` (test infra, Rule 3 deviation)

**Plan metadata:** see final docs commit below.

## TDD Gate Compliance

| Task | RED | GREEN | Status |
|------|-----|-------|--------|
| 2 | `4b421a5` (35 tests, failed on missing modules) | `25a2508` (35/35) | Pass |
| 3 | `3ee7f33` (5 tests, failed on missing modules) | `b993404` (5/5) | Pass |

## Files Created/Modified

- `src/lib/api-schemas.ts` — zod response contracts + closed vocabularies + z.infer types (PlaceSearchResponse, ResolveTimeResponse, CalculateResponse, ZonesResponse, ApiErrorBody, …)
- `src/lib/api.ts` — resolveBaseUrl, ApiError, postPlaceSearch, postResolveTime, postCalculate, fetchZones
- `src/lib/api-schemas.test.ts` — success-envelope fixtures (incl. DST-ambiguous, nonexistent, unknown-time) + mutation matrix + base-URL matrix + fetch-mocked parse-then-trust behavior
- `src/lib/query-client.tsx` — QueryProvider with focusManager.setFocused ↔ AppState
- `src/hooks/use-disclosure.ts` — useDisclosure() → { acknowledged, acknowledge } + CALCULATION_DISCLOSURE_KEY
- `src/__tests__/use-disclosure.test.tsx` — RNTL /pure renderHook tests + provider wiring tests
- `package.json` / `package-lock.json` — the four approved deps
- `scripts/vitest/react-native-shim.ts` — AppState turbo-module mock case

## Decisions Made

- snake_case contract field names (the documented API envelope is snake_case end-to-end; only the Google passthrough block keeps Google's camelCase `timeZoneId`/`rawOffset`/`dstOffset`/`timeZoneName`)
- TanStack v5 `focusManager.setFocused` (not the removed v4 `setEnabled`) — verified against the installed `@tanstack/query-core` surface before fixing
- async-storage at 2.2.0: expo install's authoritative SDK-57 pick (research suggested 3.1.1; plan forbids hand-pinning)
- `looseObject` for calculator-emitted chart_data sub-objects so unknown calculator fields pass through; strict objects for API-service-controlled envelopes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Response fields initially camelCased against the snake_case contract**
- **Found during:** Task 2 (GREEN phase — fixtures parsed, schemas didn't)
- **Issue:** First implementation used `locationType`/`placeId`/`lookupTimestamp`; the documented endpoint contract (and the rest of the envelope) is snake_case
- **Fix:** Renamed to `location_type`/`place_id`/`lookup_timestamp`; Google passthrough block intentionally remains camelCase
- **Files modified:** src/lib/api-schemas.ts
- **Verification:** 35/35 schema tests green
- **Committed in:** `25a2508`

**2. [Rule 3 - Blocking] RN shim could not construct react-native AppState**
- **Found during:** Task 3 preparation (probed before writing the provider)
- **Issue:** The shim's default no-op turbo module returns `undefined` from `getConstants()` — `AppState` construction throws `Cannot read properties of undefined (reading 'initialAppState')`; query-client.tsx is the repo's first AppState consumer
- **Fix:** Added an `AppState` case to `turboModuleMock` (initialAppState/getCurrentAppState + the addListener/removeListeners surface NativeEventEmitter requires on iOS); verified by probe (construction + DeviceEventEmitter delivery + unsubscribe) before writing tests
- **Files modified:** scripts/vitest/react-native-shim.ts
- **Verification:** Provider wiring test drives real AppState JS through the public DeviceEventEmitter singleton; full suite green
- **Committed in:** `4d09142`

**3. [Rule 1 - Bug] Used removed TanStack v4 focus API**
- **Found during:** Task 3 (GREEN phase — spyOn failed: `setEnabled` not defined)
- **Issue:** Provider draft wired `focusManager.setEnabled`; v5's focusManager exposes `setFocused` (setEnabled was v4)
- **Fix:** Switched provider + test to `focusManager.setFocused(status === "active")` per current v5 React Native guidance, verified against the installed package surface
- **Files modified:** src/lib/query-client.tsx, src/__tests__/use-disclosure.test.tsx
- **Verification:** 5/5 hook+provider tests green; tsc clean
- **Committed in:** `b993404`

**4. [Note] Test file extension .tsx instead of the plan's .ts**
- **Found during:** Task 3 (RED)
- **Issue:** Plan listed `src/__tests__/use-disclosure.test.ts`, but the provider tests render JSX — .ts cannot compile JSX
- **Fix:** Named the file .tsx (same vitest include pattern; privacy-screen.test.tsx precedent)
- **Committed in:** `3ee7f33`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocker) + 1 extension note
**Impact on plan:** All fixes were correctness necessities discovered by the TDD loop or pre-implementation probes. No scope creep; every plan requirement landed.

## Authentication Gates

None — the package-legitimacy checkpoint (T-02-SC) was the only human gate and was resolved ("approved") before this continuation started.

## Issues Encountered

None beyond the deviations above. Async-storage resolved to 2.2.0 rather than the research-noted 3.1.1 — expected behavior: `npx expo install` selects the SDK-57-compatible version and its choice is authoritative per the plan.

## User Setup Required

None — no external service configuration in this plan.

## Next Phase Readiness

- Screen plans (02-05..02-09) can import typed clients/contracts (`@/lib/api`, `@/lib/api-schemas`) and the provider/hook without touching package.json
- Plan 02-03's `api/lemastra_api/errors.py` must keep the eleven-code enum identical to `errorCodeSchema` (client vocabulary locked)
- 02-06 mounts QueryProvider in `_layout.tsx` (provider-wrap pattern already established)
- Threat mitigations landed: T-02-SC checkpoint honored; T-02-06 parse-then-trust implemented and mutation-tested

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-25*

## Self-Check: PASSED

- All 6 created files exist on disk (FOUND × 6)
- All 6 task commits present in git log (214f070, 4b421a5, 25a2508, 4d09142, 3ee7f33, b993404)
- TDD gates: `test(02-02)` commits precede `feat(02-02)` commits for both TDD tasks
- Plan verification re-run: `npx vitest run` 69/69 green (7 files); `npx tsc --noEmit` clean; node require-check confirms all four deps in package.json
