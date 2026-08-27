---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 03
current_phase_name: private-local-workspace
status: executing
stopped_at: Completed 03-05-PLAN.md
last_updated: "2026-08-27T19:29:58.406Z"
last_activity: 2026-08-27
last_activity_desc: Phase 03 execution started
progress:
  total_phases: 10
  completed_phases: 2
  total_plans: 24
  completed_plans: 21
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-26)

**Core value:** Users can move from an accurately calculated chart and transparent astrological evidence to a high-quality, methodical AI interpretation they can inspect, discuss, and preserve as a report.
**Current focus:** Phase 03 — private-local-workspace

## Current Position

Phase: 03 (private-local-workspace) — EXECUTING
Plan: 6 of 8
Status: Ready to execute
Last activity: 2026-08-27 — Phase 03 execution started

Progress: [████████████████████] 16/16 plans (100%)

## Performance Metrics

**Velocity:**

- Total plans completed: 18
- Average duration: 6 min
- Total execution time: 0.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 7 | - | - |
| 02 | 9 | - | - |

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
| Phase 02 P07 | 15 min | 2 tasks | 12 files |
| Phase 02 P08 | 16 min | 3 tasks | 17 files |
| Phase 02 P09 | 9 min | 2 tasks | 13 files |
| Phase 03 P01 | 18 min | 3 tasks | 15 files |
| Phase 03 P02 | 7 min | 2 tasks | 3 files |
| Phase 03 P03 | 11 min | 3 tasks | 6 files |
| Phase 03 P04 | 31 min | 2 tasks | 11 files |
| Phase 03 P05 | 16 min | 3 tasks | 11 files |

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
- [Phase ?]: [Phase 02]: 02-07 GATE-02 closed with nine golden case contracts generated through the real calculate endpoint; digests are a strict whitelist vocabulary (unknown keys fail) so version-bearing fields (source_notes/provenance) can never be compared — Digest-field design per D-14: deliberate dependency promotion shows up as a reviewable digest diff instead of silently breaking
- [Phase ?]: [Phase 02]: 02-07 setup-uv pinned to immutable commit of v10.0.1 (verified current release 2026-08-14) — upstream dropped floating major tags after v7; SHA pin exceeds T-02-27's intent and resolves research A1 — Supply-chain: job cannot silently ride a floating tag
- [Phase ?]: [Phase 02]: 02-07 CI runs the vendored skill's four smoke scripts via 'uv run --project api --locked' from the repo root — bare 'uv run' there has no project context (research sketch would miss pyswisseph) — Locked-env invariant (T-02-26) holds for the upstream regression too
- [Phase ?]: [Phase 02]: 02-07 golden second-pass digests are asserted through the API contract (time_resolution second_pass + offset_seconds); dst-nonexistent pins the D-08 shifted resolution (03:30) as its primary input — D-14: the suite regression-tests the endpoint, not the raw script
- [Phase ?]: 02-08: time_resolution translation = server-data arithmetic only (second_pass offset_seconds from option.utc vs entered wall time; shifted wall_time via Intl render of the server instant in the server-resolved zone) — UI never re-derives offsets (T-02-31) — The resolve payload carries only {mode,label,utc}; deriving the fold offset and shifted wall time from server products keeps D-08 honest while the server revalidates the mode
- [Phase ?]: 02-08: governed registry flip (lemastra-calculation + google-geocoding-timezone → active) shipped with in-change governance reconciliation (Play CSV overview TRUE + two collected type rows, apple-labels §1, privacy-policy posture, data-inventory §4) — Phase-1 consistency tests enforce truthful store drafts once any provider is active, and the 01-04 rule requires the policy to update before any handling change ships; tests were reconciled against, never weakened
- [Phase ?]: 02-08: confirm draft parsing = birthFormSchema.extend({ resolve }) and result carries envelope (CalculateResponse JSON) + identity (date/time/label) params; confidence read from chart_data.birth_time_confidence — One source of truth for the form contract downstream; 02-06's scoped as-never cast removed with both routes typechecking uncast
- [Phase ?]: 02-09: D-10 factor cards render server reasons VERBATIM; only the id→display-name mapping (ascendant_mc → 'Rising sign & Midheaven') is client copy with raw-id fallback — never invented values
- [Phase ?]: 02-09: zone_source travels in the identity param (confirm→result) for the CALC-03 place-resolution row — server provenance has no zone fields by design and the API is frozen this phase; identity without it redirects
- [Phase ?]: 02-09: one degree split (floor + rounded minutes, 60′ carry) feeds BOTH the D°MM′ visual and the spoken a11y sentence (A-UI-4/T-02-36); per-placement notes stay unrendered — the provisional_factors card is the D-10 Moon-caveat surface
- [Phase 03]: 03-01: drizzle imported from deep drizzle-orm/expo-sqlite/driver subpath (never the barrel — useLiveQuery re-export's top-level expo-sqlite import drags the native package into non-device graphs); vitest serves the generated drizzle/migrations.js as a virtual ESM module assembled from committed journal+sql artifacts; facade row getters memoize per result (expo executes once, node:sqlite re-executes)
- [Phase 03]: [Phase 03] 03-02: redact() is a default-deny ALLOWLIST whose allowlisted containers are shallow-filtered ONE level with the same allowlist (primitive-only leaves, arrays/deeper objects dropped wholesale) — satisfies the nested birth-data strip behavior without deep-merging untrusted structure — Plan behavior row requires birth-data keys stripped even when nested one level deep inside an allowlisted container object; one-level re-application of the allowlist keeps the output bounded and inspectable
- [Phase 03]: [Phase 03] 03-02: D-16 telemetry posture is build-enforced, not promised: telemetry-guard.test.ts (dependency + import + console-token scans, no exemption file) runs in the mandatory CI vitest job; logger in src/lib/redact.ts is the only sanctioned console surface and the seam Phase-7+ Sentry beforeSend must inherit — PRIV-03/PRIV-04 mapped to fail-hard tests (T-03-04/05/06); positive control mutation-verified 2026-08-27 (stray console.log tripped exit 1, reverted)
- [Phase 03-03]: Workspace dedupe matches the (chart, input_revision) PAIR, not just the latest row — re-saving any prior basis returns appended:false instead of tripping the unique index (Pitfall 4; plan's latest-row wording stays the primary path) — The unique (chart_id, input_revision) index is a backstop, not the UX path; a pair lookup keeps legitimate already-saved states typed and silent
- [Phase 03-03]: WorkspaceError adds UNAVAILABLE to the four planned codes; every repository op short-circuits with a typed error on web before touching the database (D-03 gate) — Screens need a typed, catchable unavailability to render the saved-charts-require-the-app degradation state
- [Phase 03-03]: listCharts = two summary queries (charts by updated_at desc + revision summary scan reduced per chart) — never parses envelope JSON, avoids SQLite groupwise-max bare-column quirks — Deterministic latest-per-chart at personal-workspace scale with summary-column-only reads (D-11)
- [Phase ?]: [Phase 03-04]: The request param contract = storedCalculationInputsSchema exactly — time_resolution carries the chosen resolve OPTION ({mode, label, utc}) and time is the display form ("" for Unknown) so 03-07 revise prefill maps stored inputs directly; the param guards SEPARATELY from the redirect (malformed/absent disables save, never redirects — T-03-12)
- [Phase ?]: [Phase 03-04]: vitest shim v4 mocks RN Modal (real Modal's DEV AppContainer path silently corrupts later test renders after in-modal change events) + I18nManager turbo constants + ScrollView.Context — components use the real RN Modal API; changeText-inside-act + re-query laws documented in test files
- [Phase 03]: 03-05: home list ordering is repository-owned (updated_at desc) — ChartList renders rows in the exact order received, never sorts (D-11); useWorkspaceCharts wraps platform availability (enabled false on web → WebUnsupported, no storage code path mounts, D-03)
- [Phase 03]: 03-05: /chart/saved takes the id param ONLY — useWorkspaceChart(['charts', chartId]) reads getChartDetail, never a router-param envelope (T-03-16); zero-network reopen is test-enforced via stubbed global fetch (T-03-15); failures fail closed through the typed open-failed card, never partial, never a /birth redirect
- [Phase 03]: 03-05: under the RN shim, presses on query-mounted screens go through fireEvent.press on the accessible host — userEvent's pressability sequence is torn down by live-query re-renders (extends the 03-04 act-queue law)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1 — resolved-to-scheduled]: Swiss Ephemeris posture APPROVED 2026-08-23 by human/product-owner (Professional License option-a) in docs/governance/swiss-ephemeris-posture.md; product approval does NOT replace qualified review — contract execution (CHF 700, O1) and qualified legal review remain scheduled before public or commercial beta (GATE-01).
- [Phase 1 — resolved]: Data inventory, retention/deletion policy, and secret-isolation policy approved 2026-08-23 by human/product-owner (plan 01-07 approval checkpoint); Apple/Google store disclosures drafted and consistency-tested (01-06) — store publication deferred to Phase 10.
- [Phase 1 — follow-up]: Registry category slugs `account-identifier`, `synced-artifacts`, `crash-diagnostics` (supabase/sentry) are not defined in data-inventory.md §3 vocabulary; consistency gate checks provider ids only (01-VERIFICATION.md warning). Small fix: extend inventory §3 or drop slugs + add slug-vocabulary assertion to disclosures-consistency.test.ts.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260826-tob | Fix aspect schema contract mismatch (applying/separating optional presence flags) — real calculate responses failed zod parse, rendering the network-error banner | 2026-08-27 | 9036b6b | [260826-tob-fix-aspect-schema-contract-mismatch-calc](./quick/260826-tob-fix-aspect-schema-contract-mismatch-calc/) |
| 2 | Fix PR #1 CI failures: gitleaks false-positive disposition (vendored tz_smoke_test IANA constant) + atomic RN prebundle writes for cold-cache vitest workers | 2026-08-27 | 2a24bba | — |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| v2 | Sync, web parity, raw provider keys, temporal exploration, advanced techniques, and social learning | Deferred | v1 roadmap |

## Session Continuity

Last session: 2026-08-27T19:29:58.399Z
Stopped at: Completed 03-05-PLAN.md
Resume file: None
