---
phase: 02-trustworthy-natal-chart
plan: 04
subsystem: api
tags: [geocoding, google-maps, timezone, zoneinfo, tzdata, dst, fastapi, httpx, provenance]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart (plan 01)
    provides: civil_time.classify/resolve_options/format_offset (PEP 495 classification), app factory, conftest TestClient discipline
  - phase: 02-trustworthy-natal-chart (plan 03)
    provides: errors.py CALC-04 taxonomy (AppError/HTTP_STATUS/handlers), settings snapshot, router-mounting conventions
  - phase: 02-trustworthy-natal-chart (plan 02)
    provides: client zod contracts (placeSearchResponseSchema, resolveTimeResponseSchema, zonesResponseSchema) this plan's responses mirror
provides:
  - POST /api/v1/places/search — server-side Google Geocoding proxy with allowlist-parsed candidates and provider-of-record provenance (google-geocoding-timezone)
  - POST /api/v1/places/resolve-time — Google zone identity + locally-computed historical offset, DST classification, D-08 picker options, drift flag, manual tz_override path
  - GET /api/v1/meta/zones — sorted zoneinfo.available_timezones() for the D-05 manual picker
  - lemastra_api.services.geocoding — GeocodingService (search_places, resolve_timezone), GeocodeCandidate/TimezoneResult, status→AppError mapping incl. 429+Retry-After
  - conftest geocoder stub (dependency override over httpx MockTransport) + five recorded Google fixtures
affects: [02-06 client place-search + manual fallback, 02-08 client confirm screen (BIRTH-02/03 client half), 02-09 GATE-02 golden fixtures, phase 03 provenance persistence]

# Tech tracking
tech-stack:
  added: []  # httpx was already a dev/test dep from 02-01; no new dependencies
  patterns:
    - "Geocoder proxy discipline: fixed Google endpoints only, key server-side in the query string, allowlist response parsing (T-02-14), honest provider-unavailable failure when the key is unset"
    - "Identity-vs-computation split: Google supplies the IANA zone ID; the birth-instant offset/classification is ALWAYS local zoneinfo+tzdata; disagreement surfaces as drift, never substitutes"
    - "Per-endpoint-family validation codes: RequestValidationError picks PLACE_INVALID_QUERY on places/search, CALC_INVALID_INPUT elsewhere; semantic zone validity raises TIMEZONE_INVALID_ZONE from the endpoint"
    - "Recorded-fixture testing: httpx.MockTransport behind a FastAPI dependency override — requests are recorded so tests assert outbound shape or prove zero network calls"

key-files:
  created:
    - api/lemastra_api/services/geocoding.py
    - api/lemastra_api/routes/places.py
    - api/lemastra_api/routes/meta.py
    - api/tests/test_places.py
    - api/tests/fixtures/google/geocode-ok.json
    - api/tests/fixtures/google/geocode-zero-results.json
    - api/tests/fixtures/google/geocode-denied.json
    - api/tests/fixtures/google/timezone-ok.json
    - api/tests/fixtures/google/timezone-zero-results.json
  modified:
    - api/lemastra_api/main.py
    - api/lemastra_api/errors.py
    - api/tests/conftest.py

key-decisions:
  - "Google Time Zone supplies identity only (D-07); the historical birth-instant offset and DST classification are always computed locally (zoneinfo + pinned tzdata — same DB as the calculator); drift = google rawOffset+dstOffset ≠ local fold=0 offset, surfaced and never substituted (the documented Google historical caveat)"
  - "resolved.offset_seconds is the fold=0 (first-pass) representative for every classification — the option utc instants are exact fold arithmetic; the drift cross-check uses the same representative"
  - "Places models live in routes/places.py (plan file scope), not schemas.py; the google block echoes Google's camelCase field names verbatim to match the locked client googleZoneSchema, and serializes as explicit null (not omitted) on the manual path"
  - "tz_override accepts an IANA zone name (CLDR aliases resolve via zoneinfo) or a fixed ±HH:MM offset (ISO ±14:00 bound); invalid values raise TIMEZONE_INVALID_ZONE 400"
  - "errors.py extension: AppError gained a headers seam (Retry-After on 429 rate-class failures) and the RequestValidationError handler became path-aware — places/search edge rejections surface as PLACE_INVALID_QUERY per the plan behavior; charts/resolve-time keep CALC_INVALID_INPUT"
  - "Time Zone INVALID_REQUEST maps to TIMEZONE_PROVIDER_UNAVAILABLE (the API constructs its own params, so provider-side invalid-request is a contract failure, not user-fixable input)"
  - "partial_match is emitted on candidates only when true (best-match caveat); the client zod object strips unknown extras, so no lockstep break"

patterns-established:
  - "External-provider service shape: dataclass results + status→AppError mapper + optional MockTransport constructor seam, one AsyncClient per call (no shared state)"
  - "Fixture-replay testing for outbound HTTP: stub records requests; outbound-shape assertions (fixed host, key in query, zero-call proofs) live beside behavior rows"

requirements-completed: [BIRTH-02, BIRTH-03, CALC-04]

# Metrics
duration: 5 min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 4: Places Search + Resolve-Time — Server-Side Geocoding & Historical Timezone Resolution Summary

**Google Geocoding + Time Zone proxy with allowlist parsing and typed CALC-04 status mapping, plus the resolve-time contract: locally-computed historical offsets via zoneinfo/tzdata with Google identity-only, drift surfacing, D-08 picker options, and the IANA zones endpoint — 20 new tests green (83 total), live-verified without a key**

## Performance

- **Duration:** 5 min (19:10:31Z → 19:15:48Z)
- **Started:** 2026-08-25T19:10:31Z
- **Completed:** 2026-08-25T19:15:48Z
- **Tasks:** 2
- **Files modified:** 12 (9 created, 3 modified)

## Accomplishments
- D-05 server half complete: `POST /api/v1/places/search` proxies type-ahead queries through the server-side key (never the client — GATE-06), returns up to 5 allowlist-parsed candidates (label/lat/lon/location_type/place_id/partial_match) with `google-geocoding-timezone` provenance and an ISO-8601 UTC lookup instant; unset key fails honestly as 503 PLACE_PROVIDER_UNAVAILABLE before any network call
- D-06/D-07/D-08 server half complete: `POST /api/v1/places/resolve-time` resolves zone identity from Google (or a manual `tz_override` with `zone_source: manual`), then ALWAYS computes the historical birth-instant offset, classification, and D-08 options locally via `civil_time` — ambiguous (first/second pass UTC + EDT/EST labels), nonexistent (single shifted option), normal (empty options); Google offset disagreement surfaces as `drift: true` while computation stays local
- D-05 manual fallback complete: `GET /api/v1/meta/zones` serves the sorted cached `zoneinfo.available_timezones()` so client and server never disagree
- All geocoder statuses map to typed hint-bearing codes: ZERO_RESULTS → 404, OVER_DAILY_LIMIT/REQUEST_DENIED → 503, OVER_QUERY_LIMIT → 429 + Retry-After, INVALID_REQUEST → 400 (places) / provider-contract 503 (timezone), TZ ZERO_RESULTS → 404 TIMEZONE_NO_RESULTS with manual-picker hint
- Zero live network calls in tests: conftest geocoder stub (dependency override + httpx MockTransport) replays five recorded fixtures and records requests for outbound-shape/zero-call proofs

## Task Commits

Each task was committed atomically (TDD RED→GREEN pairs):

1. **Task 1: geocoding client + places/search + meta/zones with recorded-fixture tests** - `4d5671f` (test/RED) + `142b60e` (feat/GREEN)
2. **Task 2: resolve-time endpoint — Google identity, local historical offset, drift, D-08 options** - `c32d41d` (test/RED) + `2d17487` (feat/GREEN)

**Plan metadata:** committed after this summary (docs)

## Files Created/Modified
- `api/lemastra_api/services/geocoding.py` - GeocodingService (search_places, resolve_timezone), GeocodeCandidate/TimezoneResult dataclasses, status→AppError mapping, key-in-query-string discipline, optional MockTransport seam
- `api/lemastra_api/routes/places.py` - POST /search + POST /resolve-time with their pydantic models; fold=0 representative offset; drift cross-check; tz_override loader (IANA or ±HH:MM)
- `api/lemastra_api/routes/meta.py` - GET /zones, sorted cached available_timezones()
- `api/lemastra_api/main.py` - places + meta routers mounted beside charts
- `api/lemastra_api/errors.py` - AppError headers seam (Retry-After) + path-aware RequestValidationError code
- `api/tests/conftest.py` - GoogleStub (serve_geocode/serve_timezone + recorded requests), places_client / places_client_no_key fixtures, load_google_fixture helper
- `api/tests/test_places.py` - 20 behavior tests (11 search/zones + 9 resolve-time)
- `api/tests/fixtures/google/*.json` - five recorded Google response fixtures (geocode OK/ZERO_RESULTS/REQUEST_DENIED, timezone OK/ZERO_RESULTS)

## Verification

- `cd api && uv run pytest -q tests/test_places.py` → **20 passed**
- `cd api && uv run pytest -q -k "not golden"` → **83 passed** (63 prior + 20 new)
- Live uvicorn (GOOGLE_API_KEY unset): `POST /api/v1/places/search {"query":"brooklyn"}` → **503 PLACE_PROVIDER_UNAVAILABLE** with the manual-fallback hint (plan verification row, exact match); `POST /api/v1/places/resolve-time` with `tz_override: Australia/Lord_Howe` → **200** ambiguous with two options 30 minutes apart; `GET /api/v1/meta/zones` → sorted zone list
- Artifact contains-checks: geocoding.py contains `maps.googleapis.com`; places.py contains `resolve-time`; meta.py contains `available_timezones`; key_link patterns `resolve_options` (places.py) and `GOOGLE_API_KEY` (geocoding.py) present
- TDD gate sequence in git log: test→feat, test→feat, in order

## Decisions Made
- See key-decisions in frontmatter (identity-vs-computation split, fold=0 representative, camelCase google echo with explicit null, tz_override dual form, errors.py path-aware extension, TZ INVALID_REQUEST mapping, partial_match true-only emission)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] errors.py extension for the Retry-After header and places validation code**
- **Found during:** Task 1 GREEN
- **Issue:** The plan behavior requires `OVER_QUERY_LIMIT → 429 with Retry-After` and `short query → 400 PLACE_INVALID_QUERY`, but `errors.py` (not in this plan's files_modified) had no response-header seam, and its RequestValidationError handler unconditionally emitted CALC_INVALID_INPUT — the short-query pydantic rejection would have surfaced under the wrong code
- **Fix:** `AppError` gained an optional `headers` dict threaded into the handler's JSONResponse; the RequestValidationError handler now selects the code per route family (places/search → PLACE_INVALID_QUERY, everything else unchanged CALC_INVALID_INPUT — charts behavior verified regression-free)
- **Files modified:** api/lemastra_api/errors.py
- **Verification:** test_over_query_limit_maps_to_429_with_retry_after and test_short_query_rejected_without_any_network_call green; full non-golden suite 83 passed (existing test_errors rows unchanged)
- **Committed in:** 142b60e

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required to deliver the plan's own behavior rows verbatim. No scope creep — no new error codes, existing charts error surface byte-identical.

## TDD Gate Compliance

Both tdd="true" tasks produced a `test(02-04)` RED commit before their GREEN commit (`4d5671f`→`142b60e`, `c32d41d`→`2d17487`). Task 1's RED failed with the zones 404 plus the missing routes.places module (deferred conftest imports keep the failure behavioral); Task 2's RED failed cleanly on the missing endpoint (9×404) while Task 1's 11 tests stayed green. No REFACTOR commits were needed.

## Issues Encountered

None — the 02-01/02-03 foundations (civil_time, errors taxonomy, settings, conftest) consumed this plan's contracts without friction.

## User Setup Required

**External services require manual configuration for live UAT.** See [02-USER-SETUP.md](./02-USER-SETUP.md) for:
- `GOOGLE_API_KEY` in `api/.env` (GCP project with Geocoding API + Time Zone API enabled, key restricted to those two services)
- Dashboard configuration steps and verification commands

No key is needed for implementation, tests, or the manual-fallback paths — recorded fixtures cover everything.

## Known Stubs

None — every response field is wired to real computation (geocoder or zoneinfo/tzdata).

## Next Phase Readiness
- D-03's resolve step is independently testable and errorable, as locked; 02-06's client place-search consumes `placeSearchResponseSchema`/`zonesResponseSchema` exactly as implemented (snake_case candidates + camelCase google block, explicit null on the manual path)
- 02-08's confirm screen consumes `resolveTimeResponseSchema` — `resolved.offset_label` (D-06 display), `classification`/`options` (D-08 picker), and `drift` (subtle provider-note) are all present and tested
- Requirement scope note: BIRTH-02/BIRTH-03 are marked complete per the plan frontmatter, but their user-facing (client) halves land in 02-08, which re-lists both IDs — the phase verifier should re-check them after 02-08
- GOOGLE_API_KEY remains the only live-UAT gap (USER-SETUP above); the manual fallback works without it today

## Self-Check: PASSED

All 9 key-files.created exist on disk; all 4 task commit hashes verified in git log; plan verification commands re-run green (83 passed, live curl rows, artifact contains-checks, TDD gate order).

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-25*
