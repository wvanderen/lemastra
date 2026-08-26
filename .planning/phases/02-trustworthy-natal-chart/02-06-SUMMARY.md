---
phase: 02-trustworthy-natal-chart
plan: 06
subsystem: ui
tags: [react-native, expo-router, react-hook-form, zod, tanstack-query, birth-form, type-ahead]

# Dependency graph
requires:
  - phase: 02-05
    provides: ConfidenceControl (D-09), AssumptionsControl (D-11), ErrorBanner/OptionCard, accent/error theme tokens, centralized copy modules
  - phase: 02-02
    provides: typed parse-then-trust api client (postPlaceSearch/postResolveTime/fetchZones), zod contracts, QueryProvider
  - phase: 02-04
    provides: POST /api/v1/places/search, POST /api/v1/places/resolve-time, GET /api/v1/meta/zones
provides:
  - PlaceSearch component (D-05 debounced type-ahead + always-available manual fallback) emitting the discriminated place union
  - /birth route (BIRTH-01 entry form) with exported birthFormSchema + BirthFormValues for 02-08 draft parsing
  - BIRTH-04 client behavior (Unknown disables + clears the time field, helper swap)
  - Resolve-then-navigate transition to /birth/confirm carrying the JSON-stringified draft (one scoped `as never` cast, TODO(02-08))
  - Home screen contract (heading, sub-line, CTA → /birth, privacy link)
  - QueryProvider mounted in _layout; birth Stack.Screen registered
affects: [02-08-confirm-screen, 02-09-chart-result, phase-03-persistence]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RHF + zodResolver over a discriminated-union place field with superRefine interdependency (time required unless confidence=Unknown)"
    - "Resolve-then-navigate: server response parsed through zod before the draft is built (T-02-24), draft travels as a JSON router param (T-02-23 accepted, in-memory only)"
    - "Controlled component branch prop for error-banner deep-links (ErrorBanner onAction → PlaceSearch manual branch)"
    - "Calendar-accurate date validation via UTC round-trip (JS Date rolls 1990-02-31 over, so toISOString must reproduce the input)"

key-files:
  created:
    - src/components/birth/place-search.tsx
    - src/app/birth.tsx
    - src/__tests__/place-search.test.tsx
    - src/__tests__/birth-form.test.tsx
  modified:
    - src/components/birth/copy.ts
    - src/lib/api-schemas.ts
    - src/app/index.tsx
    - src/app/_layout.tsx

key-decisions:
  - "PLACE_SEARCH_DEBOUNCE_MS=300 real-timer contract; TanStack Query with a deferred-timer debounce state (no loop) — T-02-22 enforced by tests against real timers"
  - "Colon-less 24-hour times (\"1430\") accepted client-side per the copy-deck error string and normalized to HH:MM before the resolve call — the server pattern is HH:MM-only"
  - "Unknown confidence resolves at the documented noon reference (12:00) — D-10-compliant invocation, never a silently guessed time"
  - "No form-level place error string invented: PlaceSearch's empty-state copy is the inline guidance; the schema still blocks submit until a place exists"
  - "CTA label color = theme.background token (white-on-accent light, near-black-on-accent dark) — no new token, matches the 02-UI-SPEC accent contrast basis"
  - "Exactly one scoped `as never` cast on the /birth/confirm push, marked TODO(02-08); 02-08 Task 2 removes cast and marker when the route registers"

patterns-established:
  - "Controlled-branch deep-linking: banners receive onAction and drive child component branch props instead of owning child state"
  - "Draft-in-params hand-off: JSON.stringify(form + resolve response), parsed downstream by the exported birthFormSchema"

requirements-completed: [BIRTH-01, BIRTH-04]

# Metrics
duration: 2h 45m
completed: 2026-08-26
status: complete
---

# Phase 02 Plan 06: Birth Entry Form + Place Search Summary

**Debounced place type-ahead with manual fallback (D-05) plus the RHF+zod /birth form with unknown-time interdependency and resolve-then-navigate hand-off to the confirm screen (BIRTH-01, BIRTH-04 client half)**

## Performance

- **Duration:** 2h 45m wall (includes an interrupted prior session: Task 1 committed 09:14–09:22; resumed and completed 11:01–16:59 UTC-equivalent local)
- **Started:** 2026-08-26T09:14:21 (first Task 1 commit)
- **Completed:** 2026-08-26T16:59:05Z
- **Tasks:** 2 (both TDD: RED → GREEN)
- **Files modified:** 7 unique (4 created, 3 modified + copy.ts shared across tasks)

## Accomplishments
- D-05 place type-ahead: ≥300 ms debounce, ≥3-char guard, 5-candidate cap, keyboard-dismiss-on-select, zero/unavailable inline states from the error-banner vocabulary, and the always-reachable manual branch (bounded lat/lon validation, searchable IANA-zone picker from /api/v1/meta/zones, branch toggle that preserves both branches' state)
- /birth birth entry form composing the 02-05 controls: discriminated place union, calendar-accurate date validation, unknown-time disable/clear/helper swap, and the "Review birth details" resolve-then-navigate transition carrying the JSON draft to /birth/confirm (one sanctioned `as never` cast, TODO(02-08))
- Home screen with the "Calculate your first chart" CTA (replacing the Phase-1 redirect-to-privacy landing) and the 02-02 QueryProvider mounted in _layout with the birth route registered
- Full suite 121 tests green; tsc --noEmit clean after dev-server typed-routes regeneration

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: place-search component — debounced type-ahead with manual fallback** - `f432e0b` (test/RED) + `6dfa0e2` (feat/GREEN)
2. **Task 2: /birth route (RHF + zod form) + home CTA + route registration** - `1eee277` (test/RED) + `7132efa` (feat/GREEN)

**Plan metadata:** docs commit (below)

## Files Created/Modified
- `src/components/birth/place-search.tsx` - D-05 debounced type-ahead + manual fallback emitting the discriminated place union
- `src/app/birth.tsx` - /birth screen: RHF + zodResolver, exported birthFormSchema/BirthFormValues, resolve-then-navigate
- `src/app/index.tsx` - Home: heading, sub-line, CTA → /birth, privacy link
- `src/app/_layout.tsx` - QueryProvider wrap + birth Stack.Screen (confirm/result deferred to 02-08/02-09)
- `src/components/birth/copy.ts` - place + home (Task 1) and birth-form (Task 2) copy-deck constants
- `src/lib/api-schemas.ts` - placeCandidateSchema gains optional partial_match
- `src/__tests__/place-search.test.tsx` - 8 D-05 behavior tests (debounce/cap/states/manual validation)
- `src/__tests__/birth-form.test.tsx` - 11 tests (validation, unknown interdependency, resolve/navigate, failure banner deep-link, home contract, layout provider probe)

## Decisions Made
- Deferred-timer debounce state pattern (one timeout re-armed per keystroke) instead of a polling loop; asserted against real 300 ms timers
- "1430"-style times accepted (the copy-deck error names both forms) and normalized to "14:30" before any network call — the server's pydantic pattern is HH:MM-only
- Unknown confidence sends the documented noon reference time (12:00) to resolve-time; the form's time field stays disabled+cleared
- Missing-place submit fails silently at the schema gate with PlaceSearch's own empty-state copy as the visible guidance — no copy-deck string exists for a form-level place error, and none was invented
- Root-layout provider wiring proven by a QueryClient context probe rendered inside a mocked expo-router Stack (useQueryClient throws without a provider)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] placeCandidateSchema `partial_match` field**
- **Found during:** Task 1 (prior session, commit `6dfa0e2`)
- **Issue:** The plan's behavior requires the approximate-match note when `partial_match` is set, but the 02-02 zod contract lacked the optional field — parse-then-trust would have rejected live backend payloads that emit it
- **Fix:** Added `partial_match: z.boolean().optional()` with `.describe()` documentation
- **Files modified:** src/lib/api-schemas.ts
- **Verification:** place-search partial_match test green
- **Committed in:** 6dfa0e2

**2. [Rule 2 - Missing Critical] Colon-less 24-hour time normalization**
- **Found during:** Task 2 (GREEN iteration)
- **Issue:** The copy-deck time error names "09:30 or 1430" as valid exemplars, but the server's resolve-time pattern (`api/lemastra_api/schemas.py` TIME_PATTERN) accepts HH:MM only — accepting "1430" client-side without normalizing would surface a RequestValidationError banner
- **Fix:** Client schema accepts both forms (`^([01]\d|2[0-3]):?[0-5]\d$`); `normalizeTimeInput` inserts the colon before any network call; asserted by a dedicated test
- **Files modified:** src/app/birth.tsx
- **Verification:** "normalizes a colon-less 24-hour time (1430)" test green; server pattern verified by reading api/lemastra_api/schemas.py
- **Committed in:** 7132efa

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes required for correct client↔server behavior per the approved copy deck. No scope creep.

## Issues Encountered
- Typed-routes regeneration: `npx expo start --no-open` is not a valid flag on this Expo line — regenerating via `CI=1 npx expo start --port <p>` and polling `.expo/types/router.d.ts` for the new route worked in ~6 s (`.expo/` is gitignored; CI regenerates per the Phase-1 convention)
- RNTL v14 under the repo shim, two quirks solved test-side (no component changes): captured TestInstance `props` are render snapshots, so assertions after interactions re-query; `getByRole("alert")` cannot match a plain (non-`accessible`) banner View, so the banner is located structurally via the heading text's parent
- One test-file type error caught by tsc (`selectLisbon` helper's structural view type missing `getByText`) — fixed before the GREEN commit

## User Setup Required

None - no external service configuration required (backend endpoints are local-dev only per D-02).

## Next Phase Readiness
- Ready for 02-08 (confirm screen): the draft contract is fixed (`{ ...formValues, resolve: ResolveTimeResponse }` JSON), `birthFormSchema` is exported for draft parsing, and 02-08 Task 2 removes the single `as never` cast + TODO(02-08) marker on the push
- Ready for 02-09 (result screen): /birth → confirm → result chain has its entry links; home CTA walkable
- No blockers. Deferred by design: persistence (Phase 3), wheel (Phase 4), interpretation (Phase 6+)

## TDD Gate Compliance

| Task | RED | GREEN | Status |
|------|-----|-------|--------|
| 1 | f432e0b (11 tests failed on missing component) | 6dfa0e2 (8/8 green) | Pass |
| 2 | 1eee277 (11 tests failed on missing /birth module) | 7132efa (11/11 green) | Pass |

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-26*

## Self-Check: PASSED

All key files exist on disk; all four task commits (f432e0b, 6dfa0e2, 1eee277, 7132efa) present in git history.
