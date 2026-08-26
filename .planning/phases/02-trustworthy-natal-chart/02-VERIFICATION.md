---
phase: 02-trustworthy-natal-chart
verified: 2026-08-26T18:05:33Z
status: human_needed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
deferred:
  - truth: "GATE-02 golden transit fixtures (the transit half of the gate requirement)"
    addressed_in: "Phase 5"
    evidence: "ROADMAP Phase 2 SC5 note: 'Per D-14, Phase 2's GATE-02 scope is natal-only — the transit fixture half completes in Phase 5'; Phase 5 requirements TRAN-01..06 cover transit calculation."
human_verification:
  - test: "Live Google place search and timezone-identity resolution (type-ahead candidates, zone identity, drift behavior against real Google responses) with GOOGLE_API_KEY set in api/.env and the API + client running"
    expected: "Place type-ahead returns real labeled candidates with coordinates; confirm card shows the Google-resolved IANA zone and locally-computed historical offset; drift note appears only on genuine disagreement"
    why_human: "Requires a live external service credential (GOOGLE_API_KEY) and a running stack; all code paths are fixture-tested (5 recorded Google fixtures, zero-network proofs) but live-provider behavior cannot be exercised automatically without the key"
  - test: "On-device/emulator walk of the full flow: home CTA → /birth (enter date/time, search or manually enter a place, pick confidence incl. Unknown, open Assumptions) → /birth/confirm (resolved card, ambiguous-DST picker on a fall-back time) → first-run disclosure → Calculate → /chart/result (placements, assumptions card, expandable provenance, unavailable factors for Unknown)"
    expected: "Every screen renders per the UI-SPEC; the tricky-time picker blocks Calculate until an explicit first/second-pass choice; the disclosure appears exactly once; the result screen shows calculated facts only — no wheel, no interpretation"
    why_human: "Interactive multi-screen flow with visual layout, real keyboard/gesture input, and cross-screen navigation; component-level behavior is vitest-covered but the composed flow on a real runtime is not machine-checkable here"
  - test: "Disclosure persistence across an app restart: acknowledge the first-run calculation disclosure, kill and relaunch the app, calculate again"
    expected: "The disclosure does not reappear after restart (the @lemastra:disclosure.calculation.v1 flag persisted via AsyncStorage)"
    why_human: "Requires a real app restart cycle with device-backed storage; the in-memory mock in vitest cannot prove on-device persistence"
---

# Phase 2: Trustworthy Natal Chart — Verification Report

**Phase Goal:** Users can resolve birth details and calculate a validated, provenance-rich natal chart.
**Verified:** 2026-08-26T18:05:33Z
**Status:** human_needed
**Re-verification:** No — initial verification

> **MVP-mode goal-format discrepancy (surfaced, non-blocking):** ROADMAP marks this phase `Mode: mvp`, and `user-story.validate` returns `false` — the goal is a "Users can …" capability statement, not the strict "As a [role], I want …, so that …" user-story format set by `/gsd mvp-phase`. Because the goal is still a coherent user capability, this report substitutes a User Flow Coverage section built from the goal's natural flow rather than refusing verification. Recommend running `/gsd mvp-phase 2` at the next planning touch to normalize the goal format.

## Goal Achievement

### User Flow Coverage (MVP-mode framing)

Flow derived from the goal — *resolve birth details → calculate → receive a validated, provenance-rich chart*:

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Enter birth details | Form with date, time, place type-ahead (≥3 chars, debounced ≥300 ms, ≤5 cards) + manual coordinate/zone fallback; confidence control (Timed/Approximate/Rectified/Unknown) | `src/app/birth.tsx` (RHF+zod, 401 lines), `src/components/birth/place-search.tsx` (428 lines), tests: `birth-form.test.tsx`, `place-search.test.tsx` | ✓ |
| Confirm coordinates & historical timezone | Resolved card: place label, lat/lon, IANA zone, locally-computed historical offset, drift note only when drift, zone-source note | `src/app/birth/confirm.tsx:209-249`; server `routes/places.py` (identity-vs-computation split, drift flag); tests: `confirm-screen.test.tsx`, `test_places.py` (drift true/false rows) | ✓ |
| Explicitly resolve tricky civil times | Ambiguous → two option cards (first/second pass w/ offsets); nonexistent → single shifted card; Calculate disabled until a choice | `src/components/birth/tricky-time-picker.tsx` + `confirm.tsx:178-187` (blockedByChoice); server labels consumed verbatim; tests: `tricky-time-picker.test.tsx`, `confirm-screen.test.tsx:339` | ✓ |
| First-run disclosure → Calculate | Registry-driven disclosure intercepts first Calculate; "Got it — Calculate chart" persists the versioned flag and proceeds | `confirm.tsx:181-193`, `calculation-disclosure.tsx` (zero own provider content), `use-disclosure.ts` (`@lemastra:disclosure.calculation.v1`); tests: `confirm-screen.test.tsx:368-398`, `calculation-disclosure.test.tsx` | ✓ |
| Receive validated, provenance-rich chart | Result screen: placement rows (D°MM′), assumptions card, expandable 7-row provenance, validation status, unavailable/provisional factor cards for Unknown; no wheel, no interpretation | `src/app/chart/result.tsx` + 4 chart components; server double gate (`routes/charts.py:204-223`); tests: `result-screen.test.tsx`, `placement-list.test.tsx`, `provenance-details.test.tsx`, `unavailable-factors.test.tsx` | ✓ |
| Outcome: "validated, provenance-rich natal chart" | Every response schema-validated twice (calculator `--validate` + response-side vendored-schema gate) and carries skill/swisseph/tzdata/schema/input-revision provenance | `charts.py:261` (validate_chart_envelope), `build_provenance` with sha256 input_revision; provenance rendered on-screen | ✓ |

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can enter birth data, confirm coordinates and historical timezone, and explicitly resolve ambiguous or nonexistent civil times | ✓ VERIFIED | Server: `civil_time.classify` PEP 495 round-trip algorithm + `resolve_options` (D-08 payloads) — `test_civil_time.py`, golden DST cases pass through the real endpoint. Client: birth form (validated entry, Unknown clears/disables time), confirm card (coords/zone/offset/drift), TrickyTimePicker (explicit choice gates Calculate). Behavioral: `birth-form`, `place-search`, `confirm-screen`, `tricky-time-picker` test suites all passing (189 vitest total). Live-flow UAT → Human item 2 |
| 2 | User can record birth-time confidence, and an unknown time produces only supported factors without an invented time | ✓ VERIFIED | ConfidenceControl 4 states (schema-driven, radiogroup) wired in form; Unknown disables+clears time (`birth.tsx:202-209`, tested). Server: `unknown_time_payload` (explicit 12:00 + confidence=unknown, never `--noon-for-unknown`); `derive_unavailable_factors` reads OUTPUT KEY ABSENCE; golden case `unknown-time-1990-brooklyn` **behaviorally asserts** absent_keys [house_system, ascendant, midheaven, house_cusps, sect, lots], absent per-placement house keys, unavailable_factors [ascendant_mc, houses, lots, sect], provisional [moon] — PASSED in this verification run. Result screen renders the unavailable section + provisional Moon card (tested) |
| 3 | User receives a validated natal chart with visible assumptions and complete calculation/input version provenance | ✓ VERIFIED | Double gate: calculator `--validate` argv + response-side `chart_input_schema.json` re-validation (`validate_chart_envelope`, T-02-10, tested). Assumptions card renders house system/zodiac/ephemeris/orb policy (`assumptions-line.tsx`, tested incl. approximate caveat). Provenance block: skill_revision (from `UPSTREAM.revision` 660d992…), swisseph, tzdata, schema identity, ephemeris_mode, input_revision (sha256[:12]), calculator_cmd — rendered as 7 mono rows (`provenance-details.tsx`, tested). CALC-03 complete |
| 4 | User receives specific recovery guidance when resolution, calculation, or schema validation fails | ✓ VERIFIED | 11-code taxonomy (`errors.py`) with per-code HTTP status, recoverable flag, and default hints; RequestValidationError → field-naming 400; engine tracebacks never reach the client (T-02-11). Client `ErrorBanner` renders copy-deck heading/body/hint per code with recovery actions (manual-coords deep-link, Open Assumptions → `/birth?openAssumptions=1`, retry) — `test_errors.py`, `test_calculate.py`, `test_places.py`, `error-banner.test.tsx`, `confirm-screen.test.tsx:518-565` all passing |
| 5 | Supported natal math, civil-time ambiguity, unknown times, and representative high-latitude cases pass published reference fixtures (natal-only per D-14) | ✓ VERIFIED (behavioral) | **Ran in this verification:** `uv run pytest tests/test_golden.py -v` → 14 passed: 9 golden cases (natal ×3, DST ambiguous incl. second_pass digest, DST nonexistent, half-hour Lord Howe shift, unknown time, Tromsø Whole Sign success + Placidus expected-failure 422) through `POST /api/v1/charts/calculate` with the real vendored subprocess, digest whitelist (unknown keys fail), plus the nine-case count guard and 4 CI-wiring drift-guards. Transit half → deferred to Phase 5 |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Deferred Items

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | GATE-02 golden transit fixtures (transit half of the gate) | Phase 5 | ROADMAP Phase 2 SC5 note (D-14: "Phase 2's GATE-02 scope is natal-only — the transit fixture half completes in Phase 5"); Phase 5 requirements TRAN-01..06 |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `api/lemastra_api/services/calculator.py` | Subprocess wrapper, timeout, exit-code taxonomy | ✓ VERIFIED | 201 lines; `create_subprocess_exec`, DEVNULL stdin, secret-stripped child env, wait_for+kill (timeout tested with real kill at 0.001 s), exit 2→InvalidInput, `swisseph.houses`→Unsuitable |
| `api/lemastra_api/services/civil_time.py` | PEP 495 classification + D-08 options | ✓ VERIFIED | 145 lines; `classify` fold round-trip, `resolve_options`, `format_offset`; half-hour zones handled (`_gap_boundaries`) |
| `api/lemastra_api/provenance.py` | Version reader incl. skill revision | ✓ VERIFIED | 103 lines; git-checkout detection guard, `UPSTREAM.revision` line-1 fallback with 40-SHA validation; lru_cached |
| `vendor/astrology-skill` | Pinned skill at 660d992 | ✓ VERIFIED | Committed snapshot + `UPSTREAM.revision` = `660d992a61139ed0286eaf0a38f4e8e0fd4f7822` (see Deviations below — submodule mechanism replaced, pin integrity intact and provenance-read) |
| `api/lemastra_api/errors.py` | CALC-04 taxonomy | ✓ VERIFIED | 194 lines; 11 codes, HTTP map, hints, AppError, path-aware validation handler |
| `api/lemastra_api/schemas.py` | Pydantic request/response models | ✓ VERIFIED | TimeResolution mode-conditional validation (second_pass↔offset_seconds, shifted↔wall_time) enforced model-side |
| `api/lemastra_api/routes/charts.py` | Calculate endpoint + provenance + derivation | ✓ VERIFIED | 273 lines; double gate, derive-from-key-absence, sha256 input_revision |
| `api/lemastra_api/services/geocoding.py` | Google client with status→AppError mapping | ✓ VERIFIED | Fixed endpoints, server-side key, 429+Retry-After via `status_override`, unset-key → honest PLACE_PROVIDER_UNAVAILABLE |
| `api/lemastra_api/routes/places.py` | search + resolve-time | ✓ VERIFIED | 338 lines; identity-vs-computation split, drift never substituted, manual tz_override with same treatment |
| `api/lemastra_api/routes/meta.py` | GET /api/v1/meta/zones | ✓ VERIFIED | `available_timezones()` sorted + cached |
| `api/tests/test_golden.py` + 9 case files | Golden suite | ✓ VERIFIED | Parametrized discovery over case JSON; ran: 14 passed |
| `.github/workflows/ci.yml` | api job: pytest + upstream smoke tests | ✓ VERIFIED (wired) | `uv sync --locked`, full pytest, 4 vendored smoke scripts; text-level drift-guards in test_golden.py. Live CI run pending push (see Info) |
| `src/lib/api-schemas.ts` | Zod contracts | ✓ VERIFIED | 402 lines; 5 endpoint schemas + error body; closed enums matching errors.py verbatim (11 codes, same order) |
| `src/lib/api.ts` | Typed fetch client | ✓ VERIFIED | 159 lines; parse-then-trust on success AND error paths; `resolveBaseUrl` platform defaults |
| `src/lib/query-client.tsx` | Query provider | ✓ VERIFIED | focusManager↔AppState; mounted in `_layout` (test-asserted `birth-form.test.tsx:433`) |
| `src/hooks/use-disclosure.ts` | One-time disclosure flag | ✓ VERIFIED | Key `@lemastra:disclosure.calculation.v1`, safe-persist catch |
| `src/components/ui/option-card.tsx` / `error-banner.tsx` | Shared UI | ✓ VERIFIED | radio semantics + three-channel selected state; per-code banner with a11y label |
| `src/components/birth/*` (confidence, assumptions, place-search, tricky-time-picker, calculation-disclosure) | Birth flow components | ✓ VERIFIED | 57–428 lines each; house systems from `houseSystemSchema.options` (never local literals); disclosure renders registry data only |
| `src/app/birth.tsx` / `birth/confirm.tsx` / `chart/result.tsx` / `index.tsx` | Screens | ✓ VERIFIED | All routes registered in `_layout.tsx:27-31`; guard-redirect on malformed params; no remaining `as never` casts (02-06 marker removed as promised) |
| `src/components/chart/*` (placement-list, assumptions-line, provenance-details, unavailable-factors) | Result components | ✓ VERIFIED | D°MM′ split feeds visual + a11y sentence; server reasons rendered verbatim; collapsed-by-default provenance |
| `src/data/provider-registry.json` | Exactly two active providers | ✓ VERIFIED | `lemastra-calculation` + `google-geocoding-timezone` status=active; other four planned; `registry.test.ts:59` asserts exactly this set |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `routes/charts.py` | `services/calculator.py` | awaited `run_chart()` with D-08/D-10-translated input | ✓ WIRED |
| `routes/charts.py` | `provenance.py` | `read_versions()` per-request provenance block | ✓ WIRED |
| `errors.py` | `main.py` | `register_error_handlers(app)` in `create_app()` | ✓ WIRED |
| `routes/places.py` | `services/civil_time.py` | `classify` + `resolve_options` build the resolved block | ✓ WIRED |
| `services/geocoding.py` | Google Maps APIs | httpx GET, server-side GOOGLE_API_KEY | ✓ WIRED |
| `services/calculator.py` | `vendor/.../birth_to_chart.py` | asyncio subprocess exec, `--input` temp JSON + `--validate` | ✓ WIRED |
| `src/lib/api.ts` | `src/lib/api-schemas.ts` | every response zod-parsed before return | ✓ WIRED |
| `src/app/birth.tsx` | `/birth/confirm` | `router.push` with JSON-stringified draft (uncast, route registered) | ✓ WIRED |
| `place-search.tsx` | `src/lib/api.ts` | debounced `postPlaceSearch` + `fetchZones` | ✓ WIRED |
| `confirm.tsx` | `use-disclosure.ts` | acknowledged gate around first Calculate | ✓ WIRED |
| `confirm.tsx` | `/chart/result` | success push carrying envelope + identity params | ✓ WIRED |
| `chart/result.tsx` | `api-schemas.ts` | `calculateResponseSchema.parse` before render | ✓ WIRED |
| `tricky-time-picker.tsx` | resolve payload | options consumed verbatim; UI never re-derives offsets | ✓ WIRED |
| `calculation-disclosure.tsx` | `provider-registry.json` | renders the two locked entries; no own provider strings | ✓ WIRED |
| `assumptions-line.tsx` | `/birth?openAssumptions=1` | Adjust & recalculate deep-link (screen-wired callback) | ✓ WIRED |
| `test_golden.py` | `fixtures/golden/cases/` | parametrized glob discovery | ✓ WIRED |
| CI api job | `vendor/astrology-skill` | `uv sync --locked` + smoke scripts (no submodule wiring — sanctioned) | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `chart/result.tsx` | `envelope` (params) | confirm-screen `postCalculate` mutation response | Yes — real calculator subprocess output (golden-proven shapes) | ✓ FLOWING |
| `birth/confirm.tsx` | `draft.resolve` (params) | `/birth` `postResolveTime` response | Yes — real geocoder stub/fixtures + local tzdata in tests; live Google at UAT | ✓ FLOWING (live provider → human item 1) |
| `place-search.tsx` | candidates/zones state | `postPlaceSearch` / `fetchZones` queries | Yes | ✓ FLOWING |
| `placement-list.tsx` | `placements` prop | envelope.chart_data.placements | Yes — min-1 array schema-enforced | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| API suite (full, once) | `cd api && uv run pytest -q` | 97 passed | ✓ PASS |
| Golden fixtures individually | `uv run pytest tests/test_golden.py -v` | 14 passed (incl. 9 cases + second_pass digest + Tromsø 422 expectation) | ✓ PASS |
| Client suite (full, once) | `npx vitest run` | 20 files, 189 passed | ✓ PASS |
| Strict typecheck | `npx tsc --noEmit` | clean, no output | ✓ PASS |
| Unknown-time absent-factor invariant | golden `unknown-time-1990-brooklyn` | asserts 6 absent keys + derived unavailable/provisional lists | ✓ PASS |
| Subprocess timeout kill | `test_timeout_kills_subprocess_and_raises_typed_error` | real kill at 0.001 s → CALC_TIMEOUT | ✓ PASS |

### Probe Execution

Step 7c: SKIPPED — no `probe-*.sh` scripts declared in PLANs/SUMMARYs and none under `scripts/`; this phase's runnable checks are the pytest/vitest suites above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|---------------------|----------|
| BIRTH-01 | 02-02, 02-06 | Enter birth date/time/place to start a chart | ✓ SATISFIED | `birth.tsx` form + `place-search.tsx`; tests passing |
| BIRTH-02 | 02-04, 02-08 | Review/confirm resolved lat/lon/IANA zone before calculation | ✓ SATISFIED | `resolve-time` endpoint (server) + confirm resolved card (client); drift + zone-source surfaced; tests passing |
| BIRTH-03 | 02-01, 02-04, 02-08 | Explicit resolution of ambiguous/nonexistent civil times | ✓ SATISFIED | Server classification + D-08 options; TrickyTimePicker blocks Calculate until choice; golden DST cases pass |
| BIRTH-04 | 02-05, 02-06 | Mark time as timed/approximate/rectified/unknown | ✓ SATISFIED | ConfidenceControl 4 states wired; Unknown disables+clears field (tested) |
| BIRTH-05 | 02-03, 02-09 | Unknown time → only supported factors, no invented noon chart | ✓ SATISFIED | Golden unknown-time case (absent keys + derived factors) passes; unavailable/provisional cards rendered (tested) |
| CALC-01 | 02-07 | Placements/angles/houses/aspects pass reference fixtures | ✓ SATISFIED | 9 golden cases through the real endpoint — ran and passed |
| CALC-02 | 02-03, 02-05, 02-09 | Visible calculation assumptions (house system, zodiac, ephemeris, orbs) | ✓ SATISFIED | Provenance block fields + assumptions card rendered; tested |
| CALC-03 | 02-01, 02-03, 02-09 | Input revision + calculator/ephemeris/tzdata/schema versions recorded | ✓ SATISFIED | `build_provenance` + `read_versions` (skill 660d992… via UPSTREAM.revision); rendered in provenance-details |
| CALC-04 | 02-01, 02-03, 02-04, 02-05 | Specific recoverable errors on resolution/calculation/schema failure | ✓ SATISFIED | 11-code taxonomy with hints + client banners + recovery actions; tested both layers |
| GATE-02 | 02-07 | Golden natal and transit fixtures (ambiguity, unknown time, high latitude) | ✓ SATISFIED (natal half) | 9 natal cases pass; transit half explicitly deferred to Phase 5 per D-14 (ROADMAP SC5 note) — listed under Deferred |

Orphan check: all 10 phase-mapped requirement IDs appear in plan frontmatter — no orphans. REQUIREMENTS.md traceability rows for all 10 read "Complete", consistent with evidence.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/birth.tsx`, `place-search.tsx`, `birth/copy.ts` | various | "PLACEHOLDER" matches | ℹ️ Info | All are legitimate TextInput `placeholder` props / copy-deck constants — not stubs |
| — | — | TBD/FIXME/XXX/TODO/HACK | ℹ️ Info | Zero matches across all phase-modified `api/` and `src/` files; 02-06's scoped `as never`+TODO(02-08) marker removed as promised |

No blockers, no stubs, no orphaned artifacts.

### Human Verification Required

1. **Live Google geocoding & timezone resolution** — set `GOOGLE_API_KEY` in `api/.env`, run the API + client, search a real birthplace.
   **Expected:** Real labeled candidates with coordinates; confirm card shows the Google-resolved IANA zone plus the locally-computed historical offset; drift note only on genuine disagreement. Manual fallback path needs no key (already fixture- and walk-verified).
   **Why human:** External paid service with a server-side credential; code paths are fully fixture-tested (5 recorded Google fixtures incl. denied/zero-results, plus zero-network proofs).

2. **Full-flow walk on device/emulator** — home → birth entry (search + manual + Unknown) → confirm (ambiguous DST picker) → disclosure → Calculate → result.
   **Expected:** Screens render per UI-SPEC; picker gates Calculate; disclosure once; result screen shows calculated facts only.
   **Why human:** Interactive multi-screen flow with visual layout and real input; component behavior is vitest-covered but the composed on-device flow is not machine-checkable here.

3. **Disclosure persistence across restart** — acknowledge, kill, relaunch, recalculate.
   **Expected:** Disclosure does not reappear (AsyncStorage flag persisted).
   **Why human:** Requires a real restart cycle with device-backed storage.

### Gaps Summary

No gaps. All five roadmap success criteria are verified against the actual codebase with behavioral test evidence (97 api + 189 client tests re-run in this verification, tsc clean; golden fixtures individually re-run: 14 passed). All 22+ artifacts exist, are substantive, and are wired; all key links hold; the data flow from real calculator output through parse-then-trust to rendered rows is intact.

**Documented deviations (verified as sanctioned, not gaps):**
- **Vendored skill is a committed archive snapshot, not a git submodule** (02-01/02-07 chain): upstream force-pushed past the pin; `vendor/astrology-skill/UPSTREAM.revision` carries the full 40-char SHA `660d992a…`, documents the rationale and invariants, and `provenance.py` reads it into every health/chart provenance payload. CI deliberately has no submodule wiring, and `test_no_soft_gates_and_no_submodule_wiring` drift-guards that choice. Pin integrity: VERIFIED. If the literal "git submodule gitlink" wording of 02-01's plan artifact should be formally excused, add an `overrides:` entry — otherwise no action.
- **CI live runs pending:** the phase branch (`gsd/phase-02-trustworthy-natal-chart`) is 83 commits ahead of `origin/main` and unpushed, so GitHub Actions has not yet executed the api job on this code. The workflow wiring is complete and text-level drift-guarded by tests; the first push/PR will exercise it. INFO only — the GATE-02/CALC-01 contract is proven by the locally re-run suite, not by CI status.
- **REQUIREMENTS.md marks GATE-02 fully `[x]`** while its transit half is Phase-5 scope per D-14 — traceability nuance only; the ROADMAP SC (the contract) scopes Phase 2 correctly, and the transit half is tracked under Deferred.

**Status rationale:** All truths VERIFIED, no gaps — but three human-verification items remain (live external provider, on-device flow, restart persistence), so the phase routes to `human_needed` rather than `passed`.

---

_Verified: 2026-08-26T18:05:33Z_
_Verifier: the agent (gsd-verifier)_
