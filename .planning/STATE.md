---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 02
current_phase_name: trustworthy-natal-chart
status: executing
stopped_at: Completed 02-06-PLAN.md (birth entry form + place search)
last_updated: "2026-08-26T17:00:06.025Z"
last_activity: 2026-08-25
last_activity_desc: Phase 02 execution started
progress:
  total_phases: 10
  completed_phases: 1
  total_plans: 16
  completed_plans: 13
  percent: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-24)

**Core value:** Users can move from an accurately calculated chart and transparent astrological evidence to a high-quality, methodical AI interpretation they can inspect, discuss, and preserve as a report.
**Current focus:** Phase 02 — trustworthy-natal-chart

## Current Position

Phase: 02 (trustworthy-natal-chart) — EXECUTING
Plan: 7 of 9
Status: Ready to execute
Last activity: 2026-08-25 — Phase 02 execution started

Progress: [███░░░░░░░] 29%

## Performance Metrics

**Velocity:**

- Total plans completed: 9
- Average duration: 6 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |

**Recent Trend:**

- Last 5 plans: 01-01 (8 min), 01-03 (4 min)
- Trend: —

| Phase 01 P04 | 2min | 3 tasks | 3 files |
| Phase 01 P02 | 91 min | 3 tasks | 18 files |
| Phase 01 P05 | 3 min | 3 tasks | 3 files |
| Phase 01 P06 | 5 min | 3 tasks | 4 files |
| Phase 01 P07 | 1min | 3 tasks | 6 files |
| Phase 02 P01 | 10 min | 4 tasks | 225 files |
| Phase 02 P02 | 7 min | 3 tasks | 9 files |
| Phase 02 P03 | 7 min | 3 tasks | 7 files |
| Phase 02 P05 | 10 min | 2 tasks | 13 files |
| Phase 02 P04 | 5 min | 2 tasks | 12 files |
| Phase 02 P06 | 2h 45m | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

- [Roadmap]: Use ten vertical MVP phases with fine granularity.
- [Roadmap]: Keep licensing, privacy, quality, and secret-isolation requirements as blocking gates at their earliest relevant slice.
- [Roadmap]: Defer accounts/sync, web parity, raw provider keys, advanced techniques, temporal exploration, and social features beyond v1.
- [Phase 01]: Kept create-expo-app tilde pinning (expo ~57.0.15) per threat model T-01-SC — scaffolder-selected SDK-57 versions are authoritative
- [Phase 01]: RNTL v14 peer is test-renderer (replaces deprecated react-test-renderer); v14 ships no Vitest guide, so vitest.config.ts follows Vitest 4 official config
- [Phase 01]: .gitignore uses .env* blanket ignore with !.env.example negation — non-secret template stays tracked, no real env file can enter history
- [Phase 01]: Swiss Ephemeris license path = Professional License (option-a: CHF 700 one-time, 99-year, unlimited projects), human-selected 2026-08-23 — posture recorded in docs/governance/swiss-ephemeris-posture.md; qualified review scheduled before public/commercial beta per GATE-01
- [Phase ?]: [Phase 01] Retention defaults fixed before any server exists: calculation/geocoding requests ephemeral compute-and-discard; charts device-side only in v1; hosting logs 14 days, access-restricted, redaction excludes birth data/chart payloads/questions/prose
- [Phase ?]: [Phase 01] Privacy-policy hosting = GitHub Pages from repo content, published before Phase 10 store submission; policy content derives from data-inventory + retention-deletion-policy and must update before any handling change ships (01-04)
- [Phase ?]: [Phase 01] Provider vocabulary locked to six registry ids (lemastra-calculation, google-geocoding-timezone, hosting-platform, openai-responses, supabase, sentry); inventory ids must equal registry ids, enforced by plan 01-06 tests
- [Phase ?]: [Phase 01]: Provider registry is the single disclosure source (six canonical ids, retention strings reference policy section numbers) — rendered by the /privacy landing screen; registry-driven rendering is test-enforced (01-02) — Prevents UI/governance drift per T-01-03; plan 01-06 consistency tests consume the same registry (01-02)
- [Phase ?]: [Phase 01]: RN-under-Vitest solved zero-dependency: rolldown prebundle (Hermes flow-strip) + jest-preset-parity module mocks + lazy facade/require.cache seeding; component tests use RNTL /pure with render-result queries and IS_REACT_ACT_ENVIRONMENT (01-02) — Avoided new packages (vite-plugin-react-native) and a jest switch; mirrors @react-native/jest-preset@0.86.2 verified read-only (01-02)
- [Phase ?]: [Phase 01]: Expo typed-routes must be regenerated (dev-server boot) after route changes before tsc --noEmit — CI ordering note for 01-07 (01-02) — Stale .expo/types/router.d.ts rejects new routes under tsc; expo export alone no longer regenerates it (01-02)
- [Phase ?]: [Phase 01]: GATE-06 secret gate = gitleaks (default rules + custom expo-public-secret-name rule firing on the NAME EXPO_PUBLIC_*KEY|SECRET|TOKEN|PASSWORD, not the value) with empty rationale-contract .gitleaksignore; bundle scan (gitleaks dir dist/) is the authoritative check since EXPO_PUBLIC_ inlining happens at bundle time (01-05) — Every future gitleaks finding gets a classification (secret-isolation-policy.md §1) and only publishable-identifier entries may be allowlisted, each with class + rationale comment lines — prevents allowlist abuse (T-01-11) and keeps scanner signal meaningful
- [Phase ?]: [Phase 01]: Governance set (SE posture, data inventory, retention/deletion, secret isolation) approved by human/product-owner 2026-08-23, no named approver supplied — product approval explicitly does NOT replace qualified legal review, which remains scheduled before public/commercial beta (GATE-01/05) — Honest closure of GATE-01/05 requires recorded product approval without overstating legal status
- [Phase ?]: [Phase 01]: GATE-06 CI = three mandatory jobs (vitest+tsc, gitleaks full-history, gitleaks bundle scan of expo web export), zero continue-on-error; bundle-scan covers web export only until platform-conditional code appears, then extends to ios/android exports — GATE-06 requires automated enforcement at commit/build time on every push, not review time
- [Phase 02]: [Phase 02] Engine errors: fixed client-safe message; tracebacks server-side with input_revision digest only (T-02-11, 02-03) — Threat-model info-disclosure guard: response bodies never carry engine tracebacks
- [Phase 02]: [Phase 02] Missing birth time for known confidence is calculator-owned: exit-2 field-naming copy surfaces as CALC_INVALID_INPUT; pydantic stays pattern-only (02-03) — Plan verify command constructs a Timed request without time - calculator copy keeps one error surface
- [Phase 02]: [Phase 02] input_revision = sha256[:12] of json-normalized calculator input (02-03) — STACK.md revision concept: changed inputs yield new revision ids, formalized in Phase 3
- [Phase 02]: ErrorBanner interpolates copy-deck templates via optional query/houseSystem props; only CALC_INVALID_INPUT server messages render (T-02-18), all other banner strings come from the local copy deck keyed by an exhaustive ErrorCode switch (02-05)
- [Phase 02]: House-system selector vocabulary is schema-driven (houseSystemSchema.options) and confidence options are copy-deck-ordered Confidence[]; selected state = fill + accent border + 600 label, never color alone (02-05)
- [Phase 02]: use-theme resolves any non-dark scheme (incl. null) to light — fixes themed-component crash before Appearance loads (02-05)
- [Phase ?]: [Phase 02] resolve-time: Google Time Zone supplies zone identity only (D-07); the historical birth-instant offset/classification/D-08 options are always computed locally via zoneinfo+pinned tzdata; drift = google rawOffset+dstOffset != local fold=0 — surfaced, never substituted (02-04)
- [Phase ?]: [Phase 02] Geocoder errors map per endpoint family (search -> PLACE_*, resolve-time -> TIMEZONE_*); OVER_QUERY_LIMIT -> 429 + Retry-After via the new AppError.headers seam; unset key fails honestly as provider-unavailable pre-network (02-04)
- [Phase ?]: [Phase 02] RequestValidationError is path-aware: places/search edge rejections surface as PLACE_INVALID_QUERY, other routes keep CALC_INVALID_INPUT; tz_override accepts IANA names (CLDR aliases resolve) or fixed offsets, invalid -> TIMEZONE_INVALID_ZONE 400 (02-04)
- [Phase 02]: 02-06: D-05 type-ahead = deferred-timer debounce (300 ms real-timer contract) + TanStack Query; colon-less times (1430) accepted per copy deck and normalized to HH:MM before any network call — T-02-22 enforced by tests against real timers; server pydantic pattern is HH:MM-only
- [Phase 02]: 02-06: Unknown confidence resolves at the documented noon reference (12:00); the time field stays disabled+cleared and no form-level place error was invented (PlaceSearch empty state is the guidance) — D-10-compliant invocation; copy deck has no place-missing string
- [Phase 02]: 02-06: draft hand-off contract = JSON.stringify({...formValues, resolve}) router param to /birth/confirm via exactly one scoped as-never cast marked TODO(02-08); birthFormSchema exported for 02-08 draft parsing — typedRoutes cannot type-check an unregistered route; 02-08 Task 2 removes the cast

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1 — resolved-to-scheduled]: Swiss Ephemeris posture APPROVED 2026-08-23 by human/product-owner (Professional License option-a) in docs/governance/swiss-ephemeris-posture.md; product approval does NOT replace qualified review — contract execution (CHF 700, O1) and qualified legal review remain scheduled before public or commercial beta (GATE-01).
- [Phase 1 — resolved]: Data inventory, retention/deletion policy, and secret-isolation policy approved 2026-08-23 by human/product-owner (plan 01-07 approval checkpoint); Apple/Google store disclosures drafted and consistency-tested (01-06) — store publication deferred to Phase 10.
- [Phase 1 — follow-up]: Registry category slugs `account-identifier`, `synced-artifacts`, `crash-diagnostics` (supabase/sentry) are not defined in data-inventory.md §3 vocabulary; consistency gate checks provider ids only (01-VERIFICATION.md warning). Small fix: extend inventory §3 or drop slugs + add slug-vocabulary assertion to disclosures-consistency.test.ts.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Sync, web parity, raw provider keys, temporal exploration, advanced techniques, and social learning | Deferred | v1 roadmap |

## Session Continuity

Last session: 2026-08-26T17:00:06.019Z
Stopped at: Completed 02-06-PLAN.md (birth entry form + place search)
Resume file: None
