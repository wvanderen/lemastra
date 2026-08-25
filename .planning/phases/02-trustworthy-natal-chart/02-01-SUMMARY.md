---
phase: 02-trustworthy-natal-chart
plan: 01
subsystem: api
tags: [fastapi, python, uv, pyswisseph, zoneinfo, dst, subprocess, provenance]

# Dependency graph
requires:
  - phase: 01-governance-foundation
    provides: provider registry vocabulary, secret-isolation and retention posture, .env.example conventions
provides:
  - uv-managed Python 3.12 api/ project with committed uv.lock (reproducible resolution)
  - Vendored astrology-skill pinned at 660d992 (snapshot + UPSTREAM.revision)
  - lemastra_api app factory (create_app, CORS, lifespan skill check) + GET /api/v1/health with versions object
  - provenance.read_versions() — skill_revision / swisseph / tzdata / schema / api
  - services.civil_time — classify / resolve_options / format_offset (BIRTH-03 server half, D-08 picker payloads)
  - services.calculator — run_chart / unknown_time_payload + typed CALC-04 exception taxonomy
  - pytest Wave-0 infrastructure (TestClient fixture, temp skill-input helper)
affects: [02-03 places+charts routes, 02-04 geocoding service, 02-07 error surface, 02-08 client picker, GATE-02 golden fixtures]

# Tech tracking
tech-stack:
  added: [uv 0.12.5, Python 3.12.14 (uv-managed), fastapi 0.141.1, uvicorn 0.52.4, pydantic 2.13.4, jsonschema (locked), pyswisseph 2.10.3.2, tzdata 2026.3, pytest 9.1.1, httpx]
  patterns:
    - "Typed subprocess wrapper: --input tempfile JSON + --validate flag, DEVNULL stdin, secret-stripped child env, wait_for+kill timeout, exit-code taxonomy"
    - "PEP 495 fold classification (round-trip algorithm) before any calculate call; D-08 picker payloads from pure functions"
    - "Provenance snapshot cached at startup; skill revision from git checkout OR committed UPSTREAM.revision pin"
    - "Dense parametrized pytest tables ported from the registry.test.ts mutation/rejection discipline"

key-files:
  created:
    - api/pyproject.toml
    - api/uv.lock
    - api/.env.example
    - api/README.md
    - api/lemastra_api/main.py
    - api/lemastra_api/settings.py
    - api/lemastra_api/provenance.py
    - api/lemastra_api/services/civil_time.py
    - api/lemastra_api/services/calculator.py
    - api/tests/conftest.py
    - api/tests/test_health.py
    - api/tests/test_civil_time.py
    - api/tests/test_calculator_client.py
    - vendor/astrology-skill/UPSTREAM.revision
  modified:
    - .gitignore

key-decisions:
  - "Vendoring fallback executed: upstream force-pushed main past the 660d992 pin (GitHub refuses the SHA), so the submodule was replaced by the research-sanctioned pinned snapshot + committed UPSTREAM.revision — same pin, same provenance guarantees, fresh-clone-safe"
  - "Wrapper passes the --validate flag in addition to validate:true in the JSON — the script lets the flag override the file value (main() L1577-1586), so JSON-only would silently disable the schema gate"
  - "Explicit confidence is enforced wrapper-side (closed set timed/approximate/rectified/unknown): an explicit value short-circuits the calculator's wording-hint inference, so place-label wording can never force an Approximate downgrade"
  - "provenance reads git rev-parse only when the skill path is itself a git checkout root (git -C on a plain directory silently resolves the parent repo); otherwise UPSTREAM.revision line 1"

patterns-established:
  - "Calculator isolation contract: one subprocess per request, never a shell, never data flags, temp input file per request, secrets stripped from child env"
  - "Same-venv provenance invariant (A4): swisseph/tzdata versions reported from the running venv equal the subprocess's"
  - "TDD in the api/: RED test commit precedes every GREEN feat commit (3 cycles this plan)"

requirements-completed: [CALC-03, CALC-04, BIRTH-03]

# Metrics
duration: 10 min
completed: 2026-08-25
status: complete
---

# Phase 2 Plan 1: API Wave 0 — uv Bootstrap, Vendored Skill, Health, Civil Time, Calculator Wrapper Summary

**uv-managed Python 3.12 FastAPI service wrapping the astrology-skill calculator (pinned at 660d992 via committed snapshot) with PEP 495 civil-time classification and the full CALC-04 subprocess error taxonomy — 46 pytest cases green including real-subprocess runs**

## Performance

- **Duration:** 10 min
- **Started:** 2026-08-25T18:08:59Z
- **Completed:** 2026-08-25T18:19:16Z
- **Tasks:** 4
- **Files modified:** 225 (16 project files + 209 vendored skill tree files)

## Accomplishments
- First backend in the repo: `api/` uv project on uv-managed CPython 3.12.14 with committed `uv.lock`; the pyswisseph 2.10.3.2 sdist build verified locally (no cp312 wheels exist)
- `GET /api/v1/health` live-verified returning the full version chain — skill_revision `660d992a61139ed0286eaf0a38f4e8e0fd4f7822`, swisseph `2.10.03`, tzdata `2026.3`, schema identity, api `0.1.0`
- `civil_time.classify` dense table green: normal/ambiguous/nonexistent × before/at/after transition over America/New_York and Australia/Lord_Howe (30-min DST), plus the D-08 picker payload contract (first/second pass distinct UTC instants; shifted option = fold=0 conversion)
- Calculator wrapper green against the real vendored subprocess: Brooklyn 1990 happy path, bad-zone did-you-mean passthrough, Tromsø+Placidus → unsuitable-house-system, 0.001 s timeout kill, unknown-time D-10 contract (no ascendant/houses, placements retained)

## Task Commits

Each task was committed atomically (TDD tasks have RED→GREEN pairs):

1. **Task 1: Toolchain bootstrap — uv + Python 3.12, vendored skill, uv project config** - `1d9772a` (feat)
2. **Task 2: App factory, settings, provenance reader, health endpoint** - `e3738d0` (test/RED) + `74045c9` (feat/GREEN)
3. **Task 3: civil_time service — PEP 495 classification + D-08 payloads** - `3c10b26` (test/RED) + `5b81f83` (feat/GREEN)
4. **Task 4: calculator subprocess wrapper — taxonomy + timeout** - `4efd4da` (test/RED) + `dc5d42d` (feat/GREEN)

**Plan metadata:** committed after this summary (docs)

## Files Created/Modified
- `api/pyproject.toml` + `api/uv.lock` - uv project (requires-python >=3.12,<3.13; exact pyswisseph/tzdata pins; pytest pythonpath config)
- `vendor/astrology-skill/` (209 files) - pinned snapshot of upstream @ 660d992 + `UPSTREAM.revision` pin record
- `api/lemastra_api/main.py` - create_app() factory, CORS allowlist, lifespan skill check, /api/v1/health, module-level `app`
- `api/lemastra_api/settings.py` - frozen dataclass from os.environ (GOOGLE_API_KEY, LEMASTRA_CALC_TIMEOUT_S, LEMASTRA_ALLOW_ORIGINS, LEMASTRA_SKILL_PATH)
- `api/lemastra_api/provenance.py` - cached version-chain reader (checkout-root-guarded git rev-parse → UPSTREAM.revision fallback)
- `api/lemastra_api/services/civil_time.py` - classify / resolve_options / format_offset (pure)
- `api/lemastra_api/services/calculator.py` - run_chart / unknown_time_payload / build_child_env + typed exceptions
- `api/tests/` - conftest (TestClient + temp-input helper), test_health (7), test_civil_time (28), test_calculator_client (11)
- `api/.env.example`, `api/README.md`, `.gitignore` (Python ignores)

## Verification

- `cd api && uv run pytest -q` → **46 passed** (health 7, civil_time 28, calculator 11 — subprocess included)
- Vendored pin: `UPSTREAM.revision` = `660d992a61139ed0286eaf0a38f4e8e0fd4f7822`; tree byte-identical to `git archive 660d992` (208 files matched)
- `grep -c 'shell=True' api/lemastra_api/services/calculator.py` → 0
- `uv run uvicorn lemastra_api.main:app --port 8000` boots; `curl -s localhost:8000/api/v1/health` returns the versions object (pinned SHA verified live)
- TDD gate sequence in git log: test→feat × 3, in order

## Decisions Made
- See key-decisions in frontmatter (vendoring fallback, --validate flag override, wrapper-enforced explicit confidence, checkout-root-guarded provenance)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Submodule → pinned snapshot fallback (upstream force-push)**
- **Found during:** Task 1 (submodule checkout)
- **Issue:** Upstream `main` was force-pushed past the pin; `git ls-remote` shows `6667e41` and GitHub refuses the pinned SHA (`upload-pack: not our ref`). A gitlink at 660d992 would fail every fresh clone + CI `submodules: true`
- **Fix:** Executed the research's pre-authorized fallback: unwound the submodule, extracted the pristine tree via `git archive 660d992` from the sibling checkout into `vendor/astrology-skill/`, committed `UPSTREAM.revision` with the SHA as line 1. Pin unchanged (660d992); `.gitmodules` does not exist; README documents the snapshot reality
- **Files modified:** vendor/astrology-skill/** , api/README.md, api/lemastra_api/provenance.py
- **Verification:** tree file list == upstream archive listing (208 files); health reports the pinned SHA
- **Committed in:** 1d9772a / 74045c9

**2. [Rule 1 - Bug] provenance `git -C` resolved the parent LemAstra repo on the snapshot dir**
- **Found during:** Task 2 (health test asserting pinned SHA got the LemAstra HEAD SHA)
- **Issue:** `git -C vendor/astrology-skill rev-parse HEAD` on a non-repo directory silently walks up and reports THIS repo's HEAD — wrong revision in every health/chart response
- **Fix:** `read_versions` now guards with `rev-parse --show-toplevel` and only trusts git when the skill path is itself the checkout root; otherwise reads UPSTREAM.revision
- **Files modified:** api/lemastra_api/provenance.py
- **Verification:** test_health_skill_revision_is_pinned_sha green
- **Committed in:** 74045c9

**3. [Rule 1 - Bug] UPSTREAM.revision lost its SHA-first format**
- **Found during:** Task 2
- **Issue:** The documentation write clobbered the SHA-only first version; line 1 became `# UPSTREAM.revision`
- **Fix:** Rewrote the file with the SHA as literal line 1, markdown documentation below
- **Verification:** pin-reading tests green
- **Committed in:** 74045c9

**4. [Rule 3 - Blocking] pytest could not import the unpackaged app**
- **Found during:** Task 2 (RED run)
- **Issue:** `package = false` (app-style project) means the project root is not on sys.path → ModuleNotFoundError under pytest
- **Fix:** `[tool.pytest.ini_options] pythonpath = ["."]`
- **Files modified:** api/pyproject.toml
- **Committed in:** 74045c9

**5. [Rule 1 - Bug] nonexistent-option label: naive astimezone + off-by-one gap end**
- **Found during:** Task 3 (label showed `02:00→02:59`, wrong tz abbreviation)
- **Issue:** `naive.astimezone()` attaches the system-local zone (machine-dependent garbage), and the forward gap-walk returned the last nonexistent minute instead of the first valid one
- **Fix:** derive label pieces from the aware `utc_instant.astimezone(tz)`; gap end walks to the first valid minute
- **Files modified:** api/lemastra_api/services/civil_time.py
- **Verification:** test_resolve_options_nonexistent_single_shifted_option green (03:30 EDT, 02:00→03:00)
- **Committed in:** 5b81f83

**6. [Rule 3 - Blocking] `uvicorn lemastra_api.main:app` had no `app` attribute**
- **Found during:** Task 4 plan verification
- **Issue:** only `create_app()` was exported; the documented run command failed to boot
- **Fix:** module-level `app = create_app()` (tests keep using the factory)
- **Files modified:** api/lemastra_api/main.py
- **Verification:** live uvicorn boot + health curl (pinned SHA)
- **Committed in:** dc5d42d

**7. [Rule 1 - Test bug] FakeProc missing returncode; docstring contained the literal `shell=True`**
- **Found during:** Task 4
- **Issue:** engine-error test's fake process lacked `returncode`; the module docstring's "never shell=True" note would make the plan's own `grep -c 'shell=True'` verification fail
- **Fix:** added `returncode = 1` to the fake; reworded the docstring ("no shell is ever involved")
- **Files modified:** api/tests/test_calculator_client.py, api/lemastra_api/services/calculator.py
- **Verification:** grep returns 0; all 11 calculator tests green
- **Committed in:** dc5d42d

---

**Total deviations:** 7 auto-fixed (2 blocking infrastructure, 1 pre-authorized vendoring fallback, 4 correctness bugs)
**Impact on plan:** The vendoring fallback is the only structural change — it was pre-authorized by the research for exactly this failure mode and preserves the pin, provenance, and AGPL containment. Everything else was standard RED/GREEN iteration. No scope creep.

## TDD Gate Compliance

All three TDD tasks (2, 3, 4) produced a `test(02-01)` RED commit before their `feat(02-01)` GREEN commit; each RED run failed for the right reason (missing module), each GREEN run passed. No REFACTOR commits were needed.

## Issues Encountered

- Upstream astrology-skill history rewrite (force-push) discovered mid-Task-1 — resolved via the pre-authorized snapshot fallback; upstream main now at 6667e41 with 660d992 unreachable. If the project ever wants to track upstream again, a deliberate re-pin + golden-fixture regeneration is required.

## User Setup Required

None - no external service configuration required. `GOOGLE_API_KEY` stays empty until the geocoding plans (02-04) need live UAT.

## Next Phase Readiness
- Wave-0 API infrastructure complete: later plans (02-03 routes, 02-04 geocoding, 02-07 error surface) mount directly on `create_app()` and reuse `civil_time`, `calculator`, `provenance`, and the conftest fixtures
- The calculator exit-code taxonomy is typed and tested; 02-03 maps `error_code` values onto HTTP responses
- GATE-02 golden fixtures (02-02) can pin against the same vendored revision + locked deps

## Self-Check: PASSED

All 14 key-files exist on disk; all 7 task commit hashes verified in git log.
