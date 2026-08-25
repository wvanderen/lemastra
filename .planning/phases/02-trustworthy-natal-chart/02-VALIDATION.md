---
phase: 2
slug: trustworthy-natal-chart
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-25
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (uv-run) + httpx TestClient (API) · Vitest 4 + RNTL 14 `/pure` (client, existing) |
| **Config file** | `api/pyproject.toml` `[tool.pytest.ini_options]` (Wave 0) · `vitest.config.ts` (existing) |
| **Quick run command** | `cd api && uv run pytest -q -k "not golden"` (+ `npx vitest run` for client) |
| **Full suite command** | `cd api && uv run pytest -q` + `npx vitest run && npx tsc --noEmit` |
| **Estimated runtime** | ~20 s quick · ~90 s full |

---

## Sampling Rate

- **After every task commit:** Run quick suites (pytest non-golden + vitest)
- **After every plan wave:** Run full suites (pytest incl. golden + vitest + tsc)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(filled by planner)* | | | BIRTH-01 | — | N/A | unit (client) | `npx vitest run` (birth-form test) | ❌ W0 | ⬜ pending |
| | | | BIRTH-02 | T-2-geo | geocode server-side only | unit + integration | vitest confirm-screen; `uv run pytest tests/test_places.py -q` | ❌ W0 | ⬜ pending |
| | | | BIRTH-03 | — | N/A | unit (API civil_time) + unit (client picker) | `uv run pytest tests/test_civil_time.py -q` | ❌ W0 | ⬜ pending |
| | | | BIRTH-04 | — | N/A | unit (client) | vitest confidence-control test | ❌ W0 | ⬜ pending |
| | | | BIRTH-05 | — | N/A | integration | `uv run pytest tests/test_calculate.py -k unknown -q` | ❌ W0 | ⬜ pending |
| | | | CALC-01 | — | N/A | integration (golden) | `uv run pytest tests/test_golden.py -q` | ❌ W0 | ⬜ pending |
| | | | CALC-02 | — | N/A | unit (client) | vitest assumptions-line test | ❌ W0 | ⬜ pending |
| | | | CALC-03 | — | N/A | integration | `uv run pytest tests/test_calculate.py -k provenance -q` | ❌ W0 | ⬜ pending |
| | | | CALC-04 | — | N/A | integration | `uv run pytest tests/test_errors.py -q` | ❌ W0 | ⬜ pending |
| | | | GATE-02 | — | N/A | CI | `api` GitHub Actions job | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Dense Sampling Dimensions (per-commit)

- DST edge dates — ambiguous + nonexistent in ≥2 zones (NY + `Australia/Lord_Howe`); fold-choice equivalence
- Tricky-time classification table — parametrized normal/ambiguous/nonexistent × before/at/after transition
- Calculator exit-code mapping — exit 0/2/1 + timeout → error_code matrix
- Unknown-time omission contract — absent-key assertions (no `ascendant`/`house` keys), no invented time
- High-latitude pair — Whole-Sign success digest + Placidus expected-failure at 69.6°N
- Schema gate — every calculate response passes vendored `chart_input_schema.json`

---

## Wave 0 Requirements

- [ ] `api/pyproject.toml` + `uv.lock` + pytest config — uv project bootstrap
- [ ] `api/tests/conftest.py` — temp skill-input helper, geocoder stub, TestClient fixture
- [ ] `api/tests/test_civil_time.py` — dense classification table (BIRTH-03)
- [ ] `api/tests/test_calculator_client.py` — exit-code/timeout mapping (CALC-04)
- [ ] `api/tests/fixtures/golden/cases/*` — GATE-02 cases
- [ ] `src/lib/api-schemas.ts` + tests — client-side response contracts
- [ ] Client component tests listed in the requirements→test map

*(Client vitest/RNTL infrastructure already exists — no framework install needed there.)*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Form layout, helper-text copy, accessibility phrasing | BIRTH-01/04 | Visual/aesthetic | UAT via `/gsd-verify-work` |
| CORS behavior in real iOS/Android simulator | CALC-04 | Needs real device runtime | Launch app against local uvicorn; calculate a chart |
| Type-ahead debounce feel | BIRTH-01 | Interaction feel | Manual typing in simulator |
| Live Google Geocoding (needs `GOOGLE_API_KEY`) | BIRTH-02 | External paid service | Set key in `api/.env`; search a birthplace |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
