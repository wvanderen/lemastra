---
phase: 02-trustworthy-natal-chart
plan: 08
subsystem: ui
tags: [react-native, expo-router, tanstack-query, zod, dst-resolution, disclosure, provider-registry, governance]

# Dependency graph
requires:
  - phase: 02-06
    provides: /birth form with exported birthFormSchema + draft hand-off contract (and the scoped as-never cast to remove)
  - phase: 02-05
    provides: OptionCard, ErrorBanner, accent/error tokens, centralized copy modules
  - phase: 02-04
    provides: resolve-time payload (historical offset, drift note, D-08 options)
  - phase: 02-03
    provides: CALC-04 error shapes driving the recovery banners
  - phase: 02-02
    provides: parse-then-trust api client (postCalculate), useDisclosure flag, zod contracts
provides:
  - /birth/confirm route (BIRTH-02 confirmation: resolved card + D-06 offset + zone source + drift note, D-08 gating, D-04 intercept, calculate mutation, CALC-04 banners)
  - TrickyTimePicker ({ resolved, date, time, value, onChange }) consuming resolve options verbatim
  - CalculationDisclosure ({ onAcknowledge }) registry-driven one-time notice (zero own provider content)
  - Minimal /chart/result route with envelope+identity param contract (deepened by 02-09)
  - confirmDraftSchema (birthFormSchema.extend({ resolve })) for draft parsing; malformed draft redirects to /birth
  - Provider registry: lemastra-calculation + google-geocoding-timezone active (governed flip) with reconciled governance docs
  - 02-06 scoped as-never cast removed; /birth/confirm and /chart/result typecheck uncast
affects: [02-09-chart-result, phase-03-persistence, phase-10-store-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "time_resolution translation from server data only: second_pass offset_seconds = option.utc − entered wall time; shifted wall_time = Intl rendering of the server instant in the server-resolved IANA zone (T-02-31 — UI never re-derives offsets from its own DST rules)"
    - "Draft parsing downstream: zod parse of the JSON router param before render (birthFormSchema.extend), redirect-on-invalid guard shared by confirm and result"
    - "First-run intercept via useDisclosure around the mutation: CTA swaps to the disclosure card; acknowledge persists the versioned flag then fires"
    - "Governed registry flip with in-change governance-doc reconciliation (store-disclosure drafts + privacy policy + inventory posture), enforced by Phase-1 consistency tests left unmodified"
    - "RNTL disabled-state assertion via forwarded accessibilityState (Pressable consumes the raw disabled prop under the RN shim)"

key-files:
  created:
    - src/components/birth/tricky-time-picker.tsx
    - src/components/birth/calculation-disclosure.tsx
    - src/app/birth/confirm.tsx
    - src/app/chart/result.tsx
    - src/__tests__/tricky-time-picker.test.tsx
    - src/__tests__/calculation-disclosure.test.tsx
    - src/__tests__/confirm-screen.test.tsx
  modified:
    - src/components/birth/copy.ts
    - src/app/birth.tsx
    - src/app/_layout.tsx
    - src/lib/api.ts
    - src/data/provider-registry.json
    - src/schemas/registry.test.ts
    - src/__tests__/birth-form.test.tsx
    - docs/governance/disclosures/play-data-safety.csv
    - docs/governance/disclosures/apple-labels.md
    - docs/governance/privacy-policy.md
    - docs/governance/data-inventory.md

key-decisions:
  - "D-08 option cards render the SERVER labels verbatim; copy-deck helpers (Before/After the clocks changed) keyed by mode — offsets never re-derived client-side"
  - "second_pass offset_seconds derived from the server option's utc instant vs the entered wall time (server-data arithmetic); shifted wall_time via Intl.DateTimeFormat in the server-resolved zone"
  - "D-04 intercept renders the disclosure in place of the CTA; 'Got it — Calculate chart' persists @lemastra:disclosure.calculation.v1 then fires the mutation; second run fires directly"
  - "CALC_UNSUITABLE_HOUSE_SYSTEM 'Open Assumptions' deep-links /birth?openAssumptions=1 via router.navigate; birth.tsx lands the keyed AssumptionsControl expanded"
  - "Result envelope param = the CalculateResponse JSON exactly; identity (date/time/label) travels as a separate param; confidence read from chart_data.birth_time_confidence"
  - "Registry flip shipped with reconciled Play CSV (overview TRUE + two PSL_DATA_TYPES collected rows), apple-labels §1, privacy-policy posture, data-inventory §4 — disclosures-consistency/governance-docs/privacy-screen tests green unmodified except the one documented lockstep assertion"

patterns-established:
  - "Registry-content parity tests inside component tests: assertions derive from the registry data object AND a source-scan proves no provider-content literals embedded (T-02-30)"
  - "Guard-redirect routes: zod-parse the params, useEffect router.replace('/birth') on absent/malformed, render null"

requirements-completed: [BIRTH-02, BIRTH-03]

# Metrics
duration: 16 min
completed: 2026-08-26
status: complete
---

# Phase 02 Plan 08: Confirm Screen + Disclosure + Registry Flip Summary

**BIRTH-02 confirmation screen with the D-08 explicit tricky-time picker, registry-driven D-04 first-calculation disclosure, CALC-04-recovering calculate mutation into a minimal /chart/result, and the governed planned→active registry flip with lockstep tests**

## Performance

- **Duration:** 16 min
- **Started:** 2026-08-26T17:29:51Z
- **Completed:** 2026-08-26T17:46:00Z
- **Tasks:** 3 (Tasks 1–2 TDD: RED → GREEN)
- **Files modified:** 17 (7 created, 10 modified)

## Accomplishments
- TrickyTimePicker + CalculationDisclosure: server-verbatim option labels with required-choice gating (BIRTH-03 client half), and a disclosure whose every provider string traces to provider-registry.json (test-enforced parity + source scan)
- /birth/confirm: zod-parsed draft, resolved card (D-06 offset + timeZoneName, drift note only when drifting, Google/manual zone source), birth summary, confidence summary, D-08 gating before Calculate, D-04 intercept via the versioned AsyncStorage flag, POST-once mutation with "Calculating chart…" state, ErrorBanner recovery including the Open Assumptions deep-link and Try-again retry, router.back edit link
- Minimal /chart/result (guard redirect, Display title, identity line with Unknown time omission, validation status) — no 02-09 sections stubbed; both routes registered and typechecking uncast after typed-routes regeneration (the 02-06 `as never` cast and TODO marker removed)
- Governed registry activation: exactly lemastra-calculation + google-geocoding-timezone active, lockstep registry test updated, governance docs reconciled in the same change
- Verified end-to-end against the running local API: ambiguous resolve → second_pass calculate (Ascendant Virgo per the research's fold-1 expectation) → normal chart; full suite 155 green, tsc --noEmit clean

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: tricky-time picker + registry-driven calculation disclosure** — `d87709a` (test/RED) + `da22ed9` (feat/GREEN)
2. **Task 2: /birth/confirm + minimal /chart/result + 02-06 cast cleanup** — `944f748` (test/RED) + `335cf48` (feat/GREEN) + `c22269a` (feat/GREEN addendum: confirm/result copy strings + disabled-assertion fix)
3. **Task 3: governed registry activation flip + lockstep tests + governance reconciliation** — `639d39f` (feat)

**Plan metadata:** docs commit (below)

## TDD Gate Compliance

| Task | RED | GREEN | Status |
|------|-----|-------|--------|
| 1 | d87709a (11 tests failed on missing components) | da22ed9 (11/11 green) | Pass |
| 2 | 944f748 (23 tests failed on missing route modules) | 335cf48 + c22269a (23/23 green) | Pass |

## Files Created/Modified
- `src/components/birth/tricky-time-picker.tsx` - D-08 picker consuming resolve options verbatim; normal renders nothing; required-choice helper
- `src/components/birth/calculation-disclosure.tsx` - registry-driven D-04 notice (two locked ids, privacy.tsx card pattern, zero own provider content)
- `src/app/birth/confirm.tsx` - BIRTH-02 confirmation screen: draft zod-parse, resolved card, picker gating, D-04 intercept, calculate mutation, banners, back link
- `src/app/chart/result.tsx` - minimal result screen with guard redirect (02-09 deepens)
- `src/components/birth/copy.ts` - picker + disclosure + confirm + minimal-result copy-deck strings
- `src/app/birth.tsx` - scoped cast + TODO(02-08) removed; openAssumptions=1 deep-link lands the assumptions control expanded
- `src/app/_layout.tsx` - birth/confirm + chart/result Stack.Screens
- `src/lib/api.ts` - CalculateRequest.time_resolution gains offset_seconds/wall_time (server contract)
- `src/data/provider-registry.json` - exactly two providers active
- `src/schemas/registry.test.ts` - lockstep assertion: exactly the two live ids active, remaining four planned
- `src/__tests__/tricky-time-picker.test.tsx` - 6 D-08 behavior tests
- `src/__tests__/calculation-disclosure.test.tsx` - 6 registry-parity + wiring tests incl. source scan
- `src/__tests__/confirm-screen.test.tsx` - 23 confirm/result behavior tests
- `src/__tests__/birth-form.test.tsx` - expo-router mock gains useLocalSearchParams (deep-link support)
- `docs/governance/disclosures/play-data-safety.csv` - overview TRUE + two collected data-type rows
- `docs/governance/disclosures/apple-labels.md` - §1 current-release answer reconciled
- `docs/governance/privacy-policy.md` - "What stays on your device" reconciled (two live ephemeral flows)
- `docs/governance/data-inventory.md` - §4 posture reconciled

## Decisions Made
- Option-card labels are the server payload's `label` strings verbatim (T-02-31); the copy deck's short helpers ride under them keyed by mode
- second_pass offset_seconds and shifted wall_time are computed exclusively from server products (option.utc, iana_zone) + the user's entered wall time — never from client DST rules; the server revalidates the mode
- The disclosure intercept replaces the CTA while visible (intercept semantics); acknowledging persists the flag and immediately fires the pending calculation
- Result screen reads confidence from the envelope (`chart_data.birth_time_confidence`) instead of duplicating it in the identity param
- Governance reconciliation (not test weakening) when the flip invalidated the Phase-1 consistency expectations — exactly as the plan's Task 3 action prescribed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] CalculateRequest.time_resolution lacked offset_seconds**
- **Found during:** Task 2 (payload design against the server contract)
- **Issue:** The 02-02 interface typed only `{ mode, wall_time? }`, but the server's TimeResolution model requires `offset_seconds` for second_pass — the plan's "second-pass offset" behavior would have been rejected by pydantic
- **Fix:** Added optional `offset_seconds` (and documented `wall_time`) to the interface; confirm.tsx derives it from the server option's utc vs the entered wall time
- **Files modified:** src/lib/api.ts
- **Verification:** second_pass payload test asserts `{ mode: "second_pass", offset_seconds: -18000 }`; E2E walk against the live API returned 200
- **Committed in:** 335cf48

**2. [Rule 3 - Blocking] birth-form.test.tsx expo-router mock lacked useLocalSearchParams**
- **Found during:** Task 2 (birth.tsx consumes the openAssumptions param)
- **Issue:** The Open Assumptions deep-link requires birth.tsx to read local params; the existing mock would crash on the missing export
- **Fix:** Added a configurable `useLocalSearchParams` to the mock (returns {} by default) + reset in afterEach; birth.tsx uses a keyed AssumptionsControl remount to land expanded without touching form state
- **Files modified:** src/__tests__/birth-form.test.tsx, src/app/birth.tsx
- **Verification:** birth-form suite green (11/11); confirm-screen Open-Assumptions test green
- **Committed in:** 335cf48

**3. [Governance reconciliation per plan instruction] Flip invalidated Phase-1 store-disclosure expectations**
- **Found during:** Task 3 (pre-flip impact check)
- **Issue:** With any provider active, disclosures-consistency requires the Play CSV overview TRUE and active providers' data types declared collected; the drafts still said FALSE with zero type rows, and privacy-policy/apple-labels/inventory §4 still claimed nothing leaves the device
- **Fix:** Reconciled play-data-safety.csv (overview TRUE + Precise location/Other info rows mirroring registry playDataTypes), apple-labels.md §1, privacy-policy.md "What stays on your device", data-inventory.md §4 — per the plan's "reconcile the governance docs first rather than weakening the test" and the 01-04 rule that the policy updates before any handling change ships
- **Files modified:** docs/governance/disclosures/play-data-safety.csv, docs/governance/disclosures/apple-labels.md, docs/governance/privacy-policy.md, docs/governance/data-inventory.md
- **Verification:** disclosures-consistency, governance-docs, privacy-screen tests green unmodified; only the one documented registry.test.ts lockstep assertion changed
- **Committed in:** 639d39f

**4. [Note] TrickyTimePicker prop surface extended with date/time**
- **Found during:** Task 1 (copy-deck body interpolation needs "{date} … in {iana_zone}, so {time}")
- **Issue:** The artifact contract lists ({ resolved, value, onChange }); the ambiguous/nonexistent body strings additionally interpolate the entered date/time
- **Fix:** Added `date` and `time` props alongside the contract names; `resolved` is the full ResolveTimeResponse (carries iana_zone + options)
- **Committed in:** da22ed9

---

**Total deviations:** 3 auto-fixed (1 missing critical, 1 blocking, 1 plan-prescribed governance reconciliation) + 1 interface note
**Impact on plan:** All required for correct client↔server behavior and truthful disclosures. No scope creep; every plan behavior landed.

## Issues Encountered
- RNTL/shim quirk: Pressable consumes the raw `disabled` prop (undefined on the host element); disabled-state assertions go through the forwarded `accessibilityState.disabled` — solved test-side with a one-off probe, no component changes
- Typed-routes regeneration took ~4 s via `CI=1 npx expo start --port <p>` + polling router.d.ts (Phase-1 convention); tsc green immediately after

## Authentication Gates

None — no auth-gated operations in this plan.

## User Setup Required

None — no external service configuration required (backend endpoints are local-dev only per D-02).

## Next Phase Readiness
- Ready for 02-09 (result screen deepening): the envelope+identity param contract is fixed, /chart/result is registered and guarded, and placements/provenance/unavailable-factors rendering is the remaining scope
- The birth → confirm → calculate → result happy path is fully walkable (component-tested + verified against the running local API)
- D-04's disclosure now truthfully shows "Active" for both live providers
- No blockers

## Self-Check: PASSED

All 7 created files exist on disk; all 6 task commits (d87709a, da22ed9, 944f748, 335cf48, c22269a, 639d39f) present in git history; plan verification re-run: full suite 155/155 green, tsc --noEmit clean, grep '"status": "active"' = exactly 2.

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-26*
