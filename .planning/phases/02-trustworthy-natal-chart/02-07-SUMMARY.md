---
phase: 02-trustworthy-natal-chart
plan: 07
subsystem: testing
tags: [golden-fixtures, pytest, github-actions, uv, ci-gate, dst, high-latitude, gate-02]

# Dependency graph
requires:
  - phase: 02-trustworthy-natal-chart (plan 01)
    provides: vendored skill snapshot at vendor/astrology-skill (UPSTREAM.revision 660d992), calculator subprocess wrapper, app factory + TestClient conftest
  - phase: 02-trustworthy-natal-chart (plan 03)
    provides: POST /api/v1/charts/calculate with provenance envelope, D-08 time_resolution translation (second_pass → fixed-offset tz), D-10 unknown-time contract, CALC_UNSUITABLE_HOUSE_SYSTEM 422 mapping
  - phase: 02-trustworthy-natal-chart (plan 04)
    provides: the 83-test suite baseline this plan's golden module joins
provides:
  - Nine committed golden case contracts (api/tests/fixtures/golden/cases/) pinning the calculate endpoint across normal natal, DST ambiguous/nonexistent/half-hour, unknown time, and the high-latitude success/expected-failure pair
  - api/tests/test_golden.py — parametrized suite with strict digest-vocabulary whitelist, second-pass variant assertions, absent-key contract, and CI wiring drift-guards
  - ci.yml api job — the fourth CI gate: locked uv sync + full pytest (golden included) + the vendored skill's four smoke scripts
  - fixtures/golden/README.md — the deliberate regeneration protocol (digests change only on reviewed dependency promotion)
affects: [dependency promotions (tzdata/pyswisseph/skill rev must regenerate digests), phase 03 chart persistence, any future calculate-contract change, CI file conventions]

# Tech tracking
tech-stack:
  added: []  # no new dependencies — uv/pytest/actions already in the project
  patterns:
    - "Golden digest vocabulary whitelist: unknown digest keys fail the test, so version-bearing fields (source_notes/provenance) can never sneak into comparison"
    - "CI wiring drift-guards live in pytest (text-level, dependency-free): api job existence, uv sync --locked, smoke-script invocations, no continue-on-error, no submodule wiring"
    - "GitHub Actions pinned by immutable commit SHA + release-comment (upstream setup-uv dropped floating major tags after v7)"

key-files:
  created:
    - api/tests/fixtures/golden/README.md
    - api/tests/fixtures/golden/cases/natal-1990-brooklyn.json
    - api/tests/fixtures/golden/cases/natal-1992-kentucky.json
    - api/tests/fixtures/golden/cases/natal-southern-hemisphere.json
    - api/tests/fixtures/golden/cases/dst-ambiguous-ny-2024.json
    - api/tests/fixtures/golden/cases/dst-nonexistent-ny-2024.json
    - api/tests/fixtures/golden/cases/dst-half-hour-shift.json
    - api/tests/fixtures/golden/cases/unknown-time-1990-brooklyn.json
    - api/tests/fixtures/golden/cases/high-latitude-tromso-whole-sign.json
    - api/tests/fixtures/golden/cases/high-latitude-tromso-placidus.json
    - api/tests/test_golden.py
  modified:
    - .github/workflows/ci.yml

key-decisions:
  - "setup-uv pinned to the immutable commit of v10.0.1 (verified current release, 2026-08-14): upstream stopped publishing floating major tags after v7, and their README now recommends SHA pinning — stronger than T-02-27 asked (A1 resolved)"
  - "Second-pass digests are asserted through the API contract (time_resolution mode=second_pass + offset_seconds → route translates to fixed-offset tz), not by hand-building a raw tz input — the suite tests the endpoint, per D-14"
  - "dst-nonexistent-ny-2024 pins the D-08 'shifted' resolution (03:30 adjacent instant) as its primary input; the half-hour Lord Howe case carries the second_pass variant (+10:30, offset_seconds 37800)"
  - "Aspect counts recorded as an inclusive ±3 window around the observed count; absolute-degree digests pin the underlying positions (window documented in the README)"
  - "Case files follow the versioned-JSON convention (schemaVersion: 1) of src/data/provider-registry.json"

patterns-established:
  - "Golden-case JSON schema: id/category/description/input/expect with outcome success|error, digest, second_pass, absent_keys/unavailable_factors/provisional_factors, error block"
  - "Digest fields: angles + all 11 placement absolute degrees to 4 decimals (compared pytest.approx abs=1e-4), house_cusps_count, inclusive aspects_count_range, birth_time_confidence"

requirements-completed: [GATE-02, CALC-01]

# Metrics
duration: 15 min
completed: 2026-08-26
status: complete
---

# Phase 2 Plan 7: GATE-02 Golden Fixture Suite + CI API Job Summary

**Nine-case golden suite pinning POST /api/v1/charts/calculate (research anchors 149.5557°/161.3879° reproduced exactly) plus a fourth CI gate running the full pytest suite and the vendored skill's four smoke tests under `uv sync --locked`**

## Performance

- **Duration:** 15 min (17:06:44Z → 17:22:13Z)
- **Started:** 2026-08-26T17:06:44Z
- **Completed:** 2026-08-26T17:22:13Z
- **Tasks:** 2
- **Files modified:** 12 (11 created, 1 modified)

## Accomplishments
- GATE-02 closed: nine committed case contracts generated by running every input through the real endpoint (TestClient → subprocess) — never hand-copied — with both verified DST anchors asserted during generation and permanently pinned (NY 2024-11-03 01:30 first-pass ascendant 149.5557, second-pass 161.3879: a whole sign apart, proving the D-08 picker is material)
- Coverage maps to every required dimension: normal natal ×3 (CALC-01), DST ambiguous/nonexistent/half-hour with second-pass digests (BIRTH-03), unknown time with the absent-key + output-derived-factor contract (BIRTH-05), and the Tromsø success/expected-failure pair (GATE-02, CALC-04 recovery via 422 CALC_UNSUITABLE_HOUSE_SYSTEM)
- test_golden.py: glob discovery over cases/, strict digest-vocabulary whitelist (unknown keys fail so source_notes/provenance can never be compared), pytest.approx(abs=1e-4) degree comparison, second-pass variant through the API's time_resolution contract, plus a nine-count guard and four CI-wiring drift-guards
- CI api job (fourth gate, on every push): SHA-pinned setup-uv v10.0.1 + Python 3.12 + lockfile-keyed cache, `uv sync --locked`, full `uv run pytest -q` (golden included), then the vendored skill's smoke/tz/dignity/timing smoke scripts via `uv run --project api --locked` from the repo root; no continue-on-error anywhere; test/gitleaks/bundle-scan jobs byte-untouched (header rationale extended to four gates)

## Task Commits

Each task was committed atomically (Task 2 is TDD with RED→GREEN):

1. **Task 1: Generate and commit the nine golden case files** - `39245e0` (test)
2. **Task 2: test_golden.py + CI api job** - `63d9ebd` (test/RED) + `ddb8931` (feat/GREEN)

**Plan metadata:** committed after this summary (docs)

## Files Created/Modified
- `api/tests/fixtures/golden/cases/*.json` (9 files) - case contracts: input (calculate request body) + expect (digest / second_pass / absent-key / error blocks), schemaVersion 1
- `api/tests/fixtures/golden/README.md` - coverage↔requirement mapping, case shape, digest design rules, and the deliberate regeneration protocol (reviewed dependency promotion only, never CI)
- `api/tests/test_golden.py` - parametrized golden suite + CI wiring guards (14 tests)
- `.github/workflows/ci.yml` - new `api` job (+41/−1; the single removed line is the "Three gates" header comment updated to "Four gates")

## Verification

- `cd api && uv run pytest -q` → **97 passed** (83 prior + 14 golden) in ~2 s; `tests/test_golden.py` alone: 14 passed in 0.95 s (plan expected ~1 s)
- Task 1 verify: 9 valid case JSON files parse; anchors reproduced exactly during generation (generator sanity gate asserted round(asc,4) equality and would have stopped otherwise)
- `npx --yes yaml valid < .github/workflows/ci.yml` → exit 0 (ci.yml parses)
- `git diff` on ci.yml: only the header-comment line removed; test/gitleaks/bundle-scan jobs untouched; `continue-on-error` absent from the file
- All four vendored smoke scripts executed locally under the exact CI invocation (`uv run --project api --locked python vendor/astrology-skill/tools/<script>`) — all pass (exit 0)
- UPSTREAM.revision unchanged at 660d992a61139ed0286eaf0a38f4e8e0fd4f7822; working tree clean before the docs commit

## Decisions Made
- See key-decisions in frontmatter (SHA-pinned setup-uv v10.0.1; second-pass via the API contract; shifted-resolution primary input for the nonexistent case; ±3 aspect windows; versioned-JSON case files)

## Deviations from Plan

### Sanctioned deviation continuation

**0. [Pre-authorized 02-01 continuation] CI checkout without `submodules: true`**
- **Found during:** Task 2 (CI wiring)
- **Issue:** The plan/must_haves specify `actions/checkout` with `submodules: true` against the vendored skill, but 02-01's pre-authorized deviation replaced the submodule with a committed archive snapshot (GitHub refuses the pinned SHA after an upstream force-push) — the vendor tree is ordinary tracked files
- **Fix:** Plain `actions/checkout@v4` materializes the pinned tree; no submodule wiring anywhere (a test guard now asserts this). `uv sync --locked` kept exactly as planned
- **Files modified:** .github/workflows/ci.yml, api/tests/test_golden.py
- **Verification:** `uv sync --locked` step present; guard test green; UPSTREAM.revision still 660d992
- **Committed in:** ddb8931

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Research's CI sketch would run the smoke tests outside the locked env**
- **Found during:** Task 2 (CI wiring)
- **Issue:** The research/plan sketch runs `uv run python vendor/astrology-skill/tools/<script>` "from the repo root" — but the repo root has no uv project, so `uv run` has no project context and pyswisseph would be missing (job fails)
- **Fix:** `uv run --project api --locked python vendor/astrology-skill/tools/<script>` — repo-root paths as planned, api project environment, lockfile asserted
- **Files modified:** .github/workflows/ci.yml
- **Verification:** all four smoke scripts executed locally under the exact CI invocation, exit 0
- **Committed in:** ddb8931

**2. [Rule 3 - Blocking] Resolved the ASSUMED setup-uv tag (A1/T-02-27)**
- **Found during:** Task 2 (CI wiring)
- **Issue:** The plan expected "the current major tag" (`astral-sh/setup-uv@v5` was research-ASSUMED); upstream stopped publishing floating major tags after v7 — no v8/v9/v10 major tag exists to pin, and the current release is v10.0.1 (2026-08-14)
- **Fix:** Pinned the immutable commit SHA `20cfd1bf945f4377ade1205e4dbc17946fc9a30d` with a `# v10.0.1` comment (upstream's own README recommendation; satisfies T-02-27 more strongly than a floating tag)
- **Files modified:** .github/workflows/ci.yml
- **Verification:** SHA serves action.yml (HTTP 200 on raw.githubusercontent); tag/commit cross-checked via the GitHub API
- **Committed in:** ddb8931

---

**Total deviations:** 2 auto-fixed (2 blocking) + 1 sanctioned-deviation continuation
**Impact on plan:** All fixes keep the gate semantics the plan demanded (locked env, permanent enforcement, supply-chain pinning). No scope creep.

## TDD Gate Compliance

Task 2 (tdd="true") produced `test(02-07)` RED (`63d9ebd`) before `feat(02-07)` GREEN (`ddb8931`). RED failed for the right reason: the three CI-wiring guards failed (api job absent) while the 11 case-contract tests passed on RED — their implementation was Task 1 fixtures + the 02-03 endpoint by design (same partial-RED pattern 02-03 documented). GREEN added exactly the ci.yml wiring; no REFACTOR needed. Task 1 was not tdd-flagged (fixture data generation with an in-generator anchor sanity gate).

## Issues Encountered

None — the 02-01/02-03 foundations consumed this plan's contracts without friction; the anchors matching to 4 decimals on the first generation run independently confirms the pipeline matches the research environment.

## User Setup Required

None - no external service configuration required. CI needs no GOOGLE_API_KEY (geocoder tests use recorded fixtures by construction, T-02-28).

## Next Phase Readiness
- GATE-02 and CALC-01 closed; the golden suite is a permanent CI gate on every push
- Dependency promotions (tzdata, pyswisseph, skill revision) now have a defined protocol: same-commit digest regeneration + review (README)
- Phase 3 persistence can rely on the pinned digest vocabulary as the stable projection of chart_data; the provenance/input_revision fields stay out of digests by design
- The CI api job gives phases 3+ a ready-made Python gate to extend

## Self-Check: PASSED

All 11 key-files exist on disk; all 3 task commit hashes (39245e0, 63d9ebd, ddb8931) verified in git log; plan verification commands re-run green (97 passed, yaml valid exit 0, tree clean).

---
*Phase: 02-trustworthy-natal-chart*
*Completed: 2026-08-26*
