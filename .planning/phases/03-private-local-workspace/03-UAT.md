---
status: diagnosed
phase: 03-private-local-workspace
source: [03-VERIFICATION.md]
started: 2026-08-29T17:30:00Z
updated: 2026-08-30T00:02:46Z
---

## Current Test

[testing complete]

## Tests

### 1. Real restart survival
expected: The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
result: pass
note: passed on native dev build after gap-closure fixes 03-10/03-11; earlier "failure" was the designed D-03 web gate (UNAVAILABLE) run from Firefox

### 2. Native share sheet + cache-dir writes (both exports)
expected: The native share sheet opens offering lemastra-chart-<slug>-<id>.json / lemastra-all-data.json as application/json; the files exist in the app cache dir and contain pretty-printed provenance-complete JSON
result: pass

### 3. Revise round-trip on device
expected: History shows both revisions ('Latest' chip on the new one), the earlier version opens read-only with byte-identical evidence, and identical re-saves show 'Already saved with these exact details.'
result: pass

### 4. Full MVP user-flow walkthrough
expected: Every step behaves as the UI-SPEC copy deck states; delete-all ends on 'No personal data is stored on this device.' and the home list is empty
result: pass

### 5. Modal visual/focus quality
expected: Dialogs read as dialogs (centered card, focus capture, cancel default), the destructive confirm is the only error-filled element, empty-home renders exactly the Phase-2 hero
result: pass

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call"
  status: resolved
  reason: "Was: chart save failed with generic copy and no console output. Root cause of the REPORT was running on web, where the D-03 gate (repository.ts requireStorageAvailable) throws UNAVAILABLE by design — invisible before the 03-11 error-code caption. Closed by gap-closure 03-10/03-11 (typed errors + on-screen code) which made the gate observable; native re-run passed Test 1 on 2026-08-29."
  severity: blocker
  test: 1
  resolved_by: 03-10-PLAN.md, 03-11-PLAN.md (+ native-platform retest)
  root_cause: "Mis-diagnosed as device DB conflict; actual cause was the test running on web where the D-03 gate throws UNAVAILABLE by design (made visible by the 03-11 error-code caption). Full original diagnosis archived in the debug session."
  debug_session: .planning/debug/chart-save-fails.md

- truth: "App boots on web and the saved chart reopens from the home list after force-quit/relaunch"
  status: resolved
  reason: "Was: Metro 'Unable to resolve module ./0000_nebulous_meggan.sql' on web + native boot failure. Closed by gap-closure plan 03-09 (commits f31a38b, add5697, 000adaf, 5e207be): metro.config.js sourceExts 'sql', babel.config.js inline-import, wasm assetExt registration + fail-hard guard test. Independently re-verified 2026-08-29: expo export web + ios exit 0 (migration SQL inlined in Hermes string table), 415 tests green, tsc clean."
  severity: blocker
  test: 1
  resolved_by: 03-09-PLAN.md
  debug_session: .planning/debug/resolved/app-boot-crash-drizzle-migration.md

- truth: "A populated api/.env with GOOGLE_API_KEY produces a working local API when started per the README — place search returns results"
  status: failed
  reason: "User reported: 'Hitting a 503 after starting uv' — POST /api/v1/places/search returns 503 PLACE_PROVIDER_UNAVAILABLE despite api/.env existing with a valid key; 'this did work earlier on this machine'"
  severity: minor
  test: 1
  root_cause: "DIAGNOSED during session (2026-08-29): api/.env is never loaded by any code path. settings.py reads raw os.environ (deliberately, no pydantic-settings); 'uv run' does not load .env files; uvicorn's --env-file flag would crash because it lazy-imports python-dotenv (uvicorn/config.py:347) which is NOT in the api lockfile. The documented README start command (api/README.md:38 'uv run uvicorn lemastra_api.main:app --reload --port 8000') therefore silently ignores the key — GOOGLE_API_KEY defaults to '' and the places endpoint maps missing-key to 503 (services/geocoding.py). It 'worked earlier' because the key was exported in that shell session. Workaround used: 'set -a && source .env && set +a' before uv run."
  artifacts:
    - path: "api/README.md"
      issue: "Documents api/.env (line 44 points at .env.example) but the start command at line 38 never loads it"
    - path: "api/lemastra_api/settings.py"
      issue: "Plain os.environ reads with no dotenv loading; .env is documented in its own docstring but nothing wires it up"
    - path: "api/pyproject.toml"
      issue: "python-dotenv absent — uvicorn --env-file (the obvious fix) crashes with ModuleNotFoundError"
  missing:
    - "Pick one loading path and document it as THE start flow: (a) add python-dotenv to api dependencies + --env-file .env in the README start command, or (b) document 'set -a && source .env && set +a' as the required pre-step, or (c) load .env in settings.py via a minimal parser (no new dependency)"
    - "Optional: warn or fail fast at startup when GOOGLE_API_KEY is empty and place search is reachable (or surface it in /api/v1/health) so a missing key is visible without a 503 round-trip"
  debug_session: ""
