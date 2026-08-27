---
phase: 02-trustworthy-natal-chart
plan: 03
subsystem: api
tags: [fastapi, pydantic, jsonschema, error-taxonomy, provenance, unknown-time, dst]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart (plan 01)
    provides: calculator subprocess wrapper with typed CALC-04 exceptions, provenance.read_versions, civil_time.format_offset, app factory + conftest fixtures
  - phase: 02-trustworthy-natal-chart (plan 02)
    provides: client zod contracts (src/lib/api-schemas.ts) whose eleven errorCodeSchema values this plan's errors.py matches verbatim
provides:
  - POST /api/v1/charts/calculate with CALC-03 provenance envelope, derived unavailable/provisional factors, and vendored-schema double gate
  - lemastra_api.errors — ErrorCode (11 codes), AppError, HTTP_STATUS map, register_error_handlers(app) with RequestValidationError override
  - lemastra_api.schemas — CalculateRequest/TimeResolution/PlaceInput/CalculateResponse/ProvenanceBlock edge models
  - lemastra_api.routes.charts — build_calculator_input / derive_unavailable_factors / build_provenance / validate_chart_envelope
affects: [02-04 places routes + geocoding, 02-05 client birth form, 02-07 error surface wiring, 02-08 client confirm screen, 02-09 GATE-02 golden fixtures, phase 03 persistence of chart envelopes]

# Tech tracking
tech-stack:
  added: []  # jsonschema was already locked in 02-01; no new dependencies
  patterns:
    - "Server/client error-enum lockstep: errors.py ErrorCode values must equal src/lib/api-schemas.ts errorCodeSchema verbatim (order included)"
    - "Derive-don't-hardcode factor availability: unavailable_factors read from calculator output-key absence, never a static list"
    - "Response-side schema double gate: every successful chart envelope re-validated against the vendored chart_input_schema.json before returning"
    - "input_revision = sha256[:12] of json-normalized (sort_keys, tight separators) calculator input — STACK.md revision concept, formalized Phase 3"

key-files:
  created:
    - api/lemastra_api/errors.py
    - api/lemastra_api/schemas.py
    - api/lemastra_api/routes/__init__.py
    - api/lemastra_api/routes/charts.py
    - api/tests/test_calculate.py
    - api/tests/test_errors.py
  modified:
    - api/lemastra_api/main.py

key-decisions:
  - "Engine errors carry a fixed client-safe message; the original exception is logged server-side with exc_info plus the input_revision digest (never birth payload content) — T-02-11"
  - "A missing time for known-confidence charts is NOT rejected by pydantic: the calculator's exit-2 'No birth time supplied' copy is verified field-naming messaging and surfaces as CALC_INVALID_INPUT (double validation)"
  - "Pydantic RequestValidationError is overridden to CALC_INVALID_INPUT 400 with field-naming messages so the client sees one error surface, not two"
  - "PLACE_PROVIDER_UNAVAILABLE maps to 503 in the static table; rate-limit call sites (02-04) pass status_override=429 — one code, two statuses per the research table"
  - "The response body itself is schema-validated (root additionalProperties: true lets provenance/factor fields ride along) — the double gate checks exactly what the client receives"

patterns-established:
  - "Closed-enum + per-field-description pydantic models mirroring the .describe() zod convention (vocabularies trace verbatim to the calculator)"
  - "D-08 mode translation table: first_pass → wall time + IANA zone; second_pass → wall time + fixed-offset tz string via civil_time.format_offset; shifted → shifted wall time + IANA zone"
  - "TDD in the api/: every tdd=true task lands test(02-03) RED before its GREEN feat/fix commit"

requirements-completed: [CALC-02, CALC-03, CALC-04, BIRTH-05]

# Metrics
duration: 7 min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 3: Charts Calculate Endpoint — Provenance Envelope, Unknown-Time Contract, CALC-04 Matrix Summary

**POST /api/v1/charts/calculate delivering the calculator's chart through a CALC-03 provenance envelope (pinned skill SHA, version chain, sha256 input_revision), output-derived unavailable factors for unknown times (D-10), D-08 time-resolution translation, a vendored-schema double gate, and the full eleven-code CALC-04 error matrix — 17 new tests green (63 total), live-verified over curl**

## Performance

- **Duration:** 7 min (18:42:11Z → 18:49:30Z)
- **Started:** 2026-08-25T18:42:11Z
- **Completed:** 2026-08-25T18:49:30Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- CALC-04 taxonomy complete: eleven-code `ErrorCode` enum locked verbatim to the client zod enum (programmatically diffed — identical, same order), `AppError` with recoverable/hint, research-table HTTP mapping (404/400/429-override/503/504/500/422), and FastAPI handlers that turn pydantic 422s into CALC_INVALID_INPUT 400s with field-naming copy
- Calculate endpoint mounts at `/api/v1/charts`: Brooklyn happy path returns 11 placements, ascendant, 12 cusps, sect, aspects with a complete provenance block (skill_revision = pinned `660d992a…`, Moshier ephemeris, 12-hex input_revision recomputable from the captured calculator input)
- Unknown-time D-10 contract honored through the real subprocess: time-dependent keys absent (not empty), `unavailable_factors` derived from output-key absence with exact reasons, provisional noon-reference Moon, placements without house keys, `--noon-for-unknown` never used
- Error matrix end-to-end: real exit-2 did-you-mean passthrough, real Tromsø+Placidus → 422 with Whole Sign/Equal hint, real timeout kill → 504, monkeypatched engine crash → 500 with the traceback marker proven present in caplog and absent from the body, broken envelope → CALC_VALIDATION_FAILED

## Task Commits

Each task was committed atomically (TDD tasks have RED→GREEN pairs):

1. **Task 1: errors.py + schemas.py — CALC-04 taxonomy and pydantic edge models** - `cdc3a9d` (feat)
2. **Task 2: charts calculate route — translation, unknown-time contract, provenance envelope, double gate** - `ed96edc` (test/RED) + `832a7c4` (feat/GREEN)
3. **Task 3: CALC-04 error matrix through the endpoint** - `a0015dc` (test/RED) + `06af0de` (fix/GREEN)

**Plan metadata:** committed after this summary (docs)

## Files Created/Modified
- `api/lemastra_api/errors.py` - ErrorCode/AppError/HTTP_STATUS/DEFAULT_HINTS/register_error_handlers with RequestValidationError override
- `api/lemastra_api/schemas.py` - CalculateRequest (lat/lon bounds, date/time patterns, ten-label house-system enum defaulting Whole Sign, confidence/zone enums, time_resolution cross-field rules), CalculateResponse/ProvenanceBlock/factor models
- `api/lemastra_api/routes/__init__.py` - route package marker
- `api/lemastra_api/routes/charts.py` - build_calculator_input, derive_unavailable_factors, build_provenance, validate_chart_envelope, calculate_chart endpoint
- `api/lemastra_api/main.py` - create_app now registers CALC-04 handlers and mounts the charts router
- `api/tests/test_calculate.py` - 10 behavior tests (real subprocess + captured-input translation rows)
- `api/tests/test_errors.py` - 7 error-matrix tests with body-shape gate helper

## Verification

- `cd api && uv run pytest -q -k "not golden"` → **63 passed** (46 prior + 17 new)
- Live uvicorn boot: `curl -s localhost:8000/api/v1/health` → pinned SHA `660d992a…`; `curl -X POST …/charts/calculate` (Brooklyn payload) → envelope with full provenance block (11 placements, 12 cusps); live Placidus/Tromsø error row → HTTP 422 with recoverable body + Whole Sign/Equal hint
- Server/client enum lockstep: regex-extracted both sides → eleven identical codes in identical order
- `grep -c 'shell=True'` across calculator.py + charts.py → 0; TDD gate sequence in git log: test→feat, test→fix, in order

## Decisions Made
- See key-decisions in frontmatter (client-safe engine messages, calculator-owned missing-time copy, single error surface for pydantic rejections, 429 override seam, response-body double gate)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Over-strict validation] Dropped the "time required unless confidence Unknown" pydantic rule**
- **Found during:** Task 1 (the plan's own verify command)
- **Issue:** My first model validator rejected a Timed request without `time`, but the plan's `<verify>` constructs exactly that — the contract leaves missing-time detection to the calculator, whose exit-2 "No birth time supplied…" copy is verified field-naming messaging
- **Fix:** Removed the cross-field time rule (kept the genuinely-needed time_resolution rules: second_pass needs offset_seconds, shifted needs wall_time, resolution requires a known time); documented the calculator-owned path in the field description
- **Files modified:** api/lemastra_api/schemas.py
- **Verification:** plan verify command passes; calculator-path covered by test_errors exit-2 row pattern
- **Committed in:** cdc3a9d

**2. [Rule 2 - Missing critical] Engine-branch server-side logging implemented in Task 3 GREEN**
- **Found during:** Task 3 RED run
- **Issue:** Task 3's matrix (and threat T-02-11) demands engine tracebacks be captured server-side via caplog, but no task's `<files>` assigned the implementation — Task 2's route mapped engine errors without logging
- **Fix:** Added `logger.error(..., exc_info=True)` with the input_revision digest (no birth payload content, retention §1) to the engine branch in charts.py; Task 3's RED failed exactly on this row, GREEN closed it
- **Files modified:** api/lemastra_api/routes/charts.py
- **Verification:** test_engine_error_logged_server_side_never_in_body green; full suite 63 passed
- **Committed in:** 06af0de

---

**Total deviations:** 2 auto-fixed (1 validation alignment, 1 missing critical logging)
**Impact on plan:** Both fixes keep the client contract exactly as planned. No scope creep.

## TDD Gate Compliance

Both tdd="true" tasks produced a `test(02-03)` RED commit before their GREEN commit (`ed96edc`→`832a7c4`, `a0015dc`→`06af0de`); each RED failed for the right reason (404 missing endpoint; caplog assertion). Task 3's matrix rows 1–2 and 4–6 passed on RED because their implementation was Task 1/2 scope by design — the genuinely new Task 3 behavior (engine logging) drove the RED→GREEN cycle. No REFACTOR commits were needed.

## Issues Encountered

None — the 02-01 wrapper/provenance foundation consumed this plan's contracts without friction.

## User Setup Required

None - no external service configuration required. `GOOGLE_API_KEY` stays empty until the geocoding plans (02-04) need live UAT.

## Next Phase Readiness
- D-03's calculate step is independently testable and errorable, as locked; 02-04 (places routes + Google geocoding service) mounts beside the charts router and reuses errors.py's PLACE_*/TIMEZONE_* codes — only PLACE_PROVIDER_UNAVAILABLE needs its 429 status_override seam at the rate-limit call site
- 02-05/02-06 client plans can parse calculate responses with the existing zod contracts (field names and enum values verified in lockstep this plan)
- 02-09 GATE-02 golden fixtures pin digests against the same provenance block (input_revision gives them a stable per-case id)
- Phase 3 persistence can store the envelope as-is: chart_data passthrough + provenance + factor lists are the auditable unit

## Self-Check: PASSED

All 7 key-files exist on disk; all 5 task commit hashes verified in git log; plan verification commands re-run green (63 passed, live curl, enum lockstep).
