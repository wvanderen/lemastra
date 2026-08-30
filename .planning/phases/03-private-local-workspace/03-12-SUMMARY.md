---
phase: 03-private-local-workspace
plan: 12
subsystem: api
tags: [dotenv, fastapi, settings, fastapi, observability, developer-experience]

requires:
  - phase: 03-private-local-workspace (03-11)
    provides: gap-closure wave context; UAT gap 3 register (api/.env never loaded)
provides:
  - api/.env auto-loading via a restrictive stdlib bridge in settings.load_settings (README start command works with zero shell pre-steps)
  - Real-environment-over-.env precedence contract (exported/CI/pytest variables always win, including present-but-empty)
  - Keyless visibility: one absence-only startup warning + /api/v1/health places_search_available boolean
affects: [04-calculate-refine, api-dx, uat-gap-closure]

tech-stack:
  added: []  # stdlib only — logging/pathlib/os; uv.lock untouched
  patterns:
    - "Config-file-as-data loader: no interpolation, no escapes, no execution; warnings carry file+line only, never content"
    - "Presence flag mirrors the consumer's exact emptiness check (bool(settings.google_api_key) == geocoding's `if not api_key`) so flag, warning, and 503 can never disagree"

key-files:
  created:
    - api/tests/test_dotenv.py
  modified:
    - api/lemastra_api/settings.py
    - api/lemastra_api/main.py
    - api/tests/test_health.py
    - api/README.md
    - api/.env.example

key-decisions:
  - "Keyless test state pinned via monkeypatch.setenv(KEY, \"\") (present-but-empty) instead of absence — setdefault can only fill ABSENT variables, so this is the only hygiene form deterministic against a real populated api/.env (plan's literal sentinel-setenv-then-delenv idiom contradicted its own determinism rationale; Rule 1 inline fix)"
  - "No-leak proof made strong: keyless warning test points _DOTENV_PATH at a canary .env (file HAS a key, env says empty) and asserts the canary never reaches any caplog line"
  - "Zero new packages: built-in bridge at the single configuration read site instead of python-dotenv + --env-file (forgetting the flag reproduces the silent 503) or shell sourcing (executes the file as script)"

patterns-established:
  - "Env hygiene law for tests that touch configuration loading: every key the loader may define goes through monkeypatch first (setenv+delenv for loader-injected keys, setenv(\"\") for keys that must stay empty against a real file)"
  - "Absence-only copy discipline: warnings and health surfaces report key PRESENCE, never value, length, or prefix (T-03-12-01)"

requirements-completed: [WORK-01, WORK-02]

duration: 3 min
completed: 2026-08-30
status: complete
---

# Phase 03 Plan 12: api/.env loading + keyless visibility Summary

**Minimal stdlib .env bridge in settings (real-env precedence, no interpolation/execution) plus one-line keyless startup warning and places_search_available health flag — README start command now yields working place search with zero pre-steps**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-30T02:42:54Z
- **Completed:** 2026-08-30T02:46:03Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Closed the final open Phase-03 UAT gap: `uv run uvicorn lemastra_api.main:app --reload --port 8000` with a populated `api/.env` now answers live place search (smoke-verified: 200 with real Brooklyn candidates, no pre-export, no flags)
- `_load_dotenv` restrictive parser (comments, blanks, optional `export `, first-`=` split, one matching quote pair) applied via `os.environ.setdefault` — exported/CI/pytest env always wins, missing file silently keeps the documented keyless posture
- Keyless starts are visible without a 503 round-trip: exactly one absence-only remediation warning + `places_search_available` boolean in `/api/v1/health` mirroring geocoding's exact emptiness check
- Malformed-line warnings carry file name + line number only — never key or value text (a mangled line could contain a pasted secret); smoke-verified no key material in any log line

## Task Commits

Each task was committed atomically:

1. **Task 1: Minimal .env bridge in settings.py (loader + precedence contract) with parser tests** - `198f560` (feat)
2. **Task 2: Keyless visibility — one startup warning + places_search_available health flag** - `c76b9c4` (feat)
3. **Task 3: Documentation truth — README start flow and .env.example header** - `60443f4` (docs)

## Files Created/Modified
- `api/lemastra_api/settings.py` - `_DOTENV_PATH` module-resolved constant + `_load_dotenv` loader called first in `load_settings()`; docstring documents grammar and precedence contract
- `api/lemastra_api/main.py` - lifespan keyless warning (absence-only copy, fires once per process) + health `places_search_available` boolean
- `api/tests/test_dotenv.py` - 11 tests: grammar matrix, precedence (incl. present-but-empty), missing-file no-op, malformed-line warnings (line number, never content), `load_settings` end-to-end
- `api/tests/test_health.py` - flag truthful in both key states, versions shape unchanged, exactly-one-warning caplog test with canary .env, no-warning-with-key
- `api/README.md` - "Environment (api/.env)" note before the unchanged start command (cp .env.example .env, auto-load, precedence, keyless posture, health flag)
- `api/.env.example` - header teaches auto-load + shell precedence; template stays non-secret-only with GOOGLE_API_KEY empty

## Decisions Made
- Keyless-state test hygiene uses `setenv(KEY, "")` (present-but-empty) rather than absence — see Deviations
- Loader placed at the single configuration read site (`load_settings`) rather than behind a CLI flag or shell pre-step — the failure mode this gap documented was forgettable pre-steps
- Health flag `bool(settings.google_api_key)` uses the SAME emptiness check as geocoding's `_require_api_key` (`if not api_key`) — the two surfaces cannot disagree by construction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Keyless test hygiene idiom corrected to present-but-empty**
- **Found during:** Task 2 (test_health.py extension)
- **Issue:** The plan's literal hygiene idiom ("sentinel-setenv then delenv") leaves GOOGLE_API_KEY ABSENT — but `create_app()` → `load_settings()` runs `_load_dotenv` against the REAL `api/.env`, whose `setdefault` re-fills an absent key on any machine with a populated file. That would make the keyless tests fail exactly where the plan requires them to be deterministic; the plan's own rationale ("present-but-empty beats setdefault") points at the correct form.
- **Fix:** Keyless states pinned via `monkeypatch.setenv("GOOGLE_API_KEY", "")` — present-but-empty beats `setdefault`, matching the plan's stated determinism goal and the `GOOGLE_API_KEY=` verification smoke verbatim. The canary test additionally monkeypatches `_DOTENV_PATH` for a strong no-leak assertion.
- **Files modified:** api/tests/test_health.py
- **Verification:** 22/22 health+dotenv tests pass on this machine (real populated api/.env present); full suite 112 passed
- **Committed in:** c76b9c4 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — plan-text vs intent)
**Impact on plan:** None on scope or behavior — the fix implements the plan's stated determinism rationale instead of its contradictory literal wording. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT gap 3 (the last failed item) is closed: the README start command is the complete truth; keyless posture is observable at startup and via health without a 503 round-trip
- Standing decisions preserved: plain os.environ reads (no pydantic-settings), uv.lock untouched (zero new packages), .env.example non-secret law, key server-only isolation (stripped from calculator child env by build_child_env, never logged)
- Phase 03 gap-closure wave is complete (03-10, 03-11, 03-12); all automated verification green

## Self-Check: PASSED

- Key files exist on disk: settings.py, main.py, test_dotenv.py, test_health.py, README.md, .env.example — all verified via git show/committer checks
- Commits found: 198f560, c76b9c4, 60443f4 on gsd/phase-03-private-local-workspace
- Plan verification re-run: full suite 112 passed offline; README-flow smoke (health ok + places_search_available true, place search 200 with candidates); keyless smoke (exactly 1 warning, flag false, honest 503 PLACE_PROVIDER_UNAVAILABLE)

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-30*
