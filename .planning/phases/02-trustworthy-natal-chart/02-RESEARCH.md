# Phase 2: Trustworthy Natal Chart - Research

**Researched:** 2026-08-25
**Domain:** FastAPI/Python subprocess-wrapped astrology calculator + Expo birth-data UX + geocoding/timezone resolution + golden fixture suite
**Confidence:** HIGH (calculator contract verified by direct execution against the real repo at pinned deps; external APIs verified against official docs)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Calculation Service**
- **D-01:** Calculation runs in a **FastAPI service in the monorepo** (new `api/` directory). It wraps `astrology-skill`'s `tools/birth_to_chart.py` as a JSON-in/JSON-out subprocess per the STACK.md integration contract (hard timeout, no shared calculator state). Python 3.12, uv, exact-locked `pyswisseph`/`tzdata`/`jsonschema`.
- **D-02:** **Local dev only** in Phase 2 — the service runs locally (docker/compose or uvicorn) and the Expo app points at a local URL. No deployed endpoint, no hosting account, no real-user data. Deployment is deferred to a later phase.
- **D-03:** **Two-step API**: (1) resolve-place endpoint returns geocoding candidates (label, lat/lon, IANA zone); (2) calculate endpoint takes the confirmed birth data. The BIRTH-02 confirmation screen sits between them. Each step is independently testable and errorable.
- **D-04:** **One-time disclosure notice** before first calculation: what is sent (birth data), where (LemAstra calculation service), and that requests are ephemeral compute-and-discard (per the Phase 1 retention posture). Then Calculate proceeds without re-asking.

**Birthplace & Timezone Flow**
- **D-05:** Place input is **type-ahead search backed by server-side Google Geocoding** (API key stays server-side; provider id `google-geocoding-timezone` from the Phase 1 registry), with a **manual fallback**: direct entry of place label + latitude/longitude + IANA timezone picker when search fails or the user prefers precision. (User delegated this area to the recommended set.)
- **D-06:** The BIRTH-02 confirmation screen shows resolved place label, coordinates, IANA zone, and the **resolved UTC offset for the birth date** before Calculate. (Recommended set.)
- **D-07:** Birth timezone is resolved **server-side via Google Time Zone API** (coordinates + birth timestamp) — never inferred from the device clock. (Recommended set.)

**Tricky-Time UX**
- **D-08:** DST gap/overlap (BIRTH-03): an **explicit resolution picker**. Ambiguous (fall-back) times offer first-pass vs second-pass offset choice; nonexistent (spring-forward) times shift to the adjacent valid instant with a clear explanation. The app never silently chooses.
- **D-09:** Birth-time confidence (BIRTH-04): an **inline four-state control** — Timed (default), Approximate, Rectified, Unknown — with beginner-friendly helper text for each.
- **D-10:** Unknown birth time (BIRTH-05): result lists **only time-independent factors** (e.g., planets-in-sign); houses, angles, sect, lots, and other time-dependent factors are explicitly marked unavailable with a short why. **No invented noon chart** — the skill's `--noon-for-unknown` flag is deliberately not used.

**Defaults & Provenance Display**
- **D-11:** House system defaults to **Whole Sign** (the calculator's default) with a **selector** for the other systems supported by `birth_to_chart.py`'s HOUSE_SYSTEMS list, surfaced in an assumptions/advanced control. Changing it changes the chart calculation inputs (a new revision conceptually, formalized in Phase 3's WORK-04).
- **D-12:** CALC-02/03 display: a **compact assumptions line** (house system, zodiac mode, ephemeris mode, orb policy) plus an **expandable "Calculation details" section** with full provenance — skill/calculator revision, swisseph version, tzdata version, schema version, input revision id. Progressive disclosure per the audience constraint.
- **D-13:** Phase 2 result view is a **structured placement list only** (body, sign, degree, house, motion, dignity where present) + assumptions line + expandable provenance + validation status. No wheel, not even a preliminary one — the wheel is Phase 4 scope.
- **D-14:** GATE-02 fixtures: an **in-repo JSON fixture suite** pinned against the vendored skill revision, covering normal natal charts, DST ambiguous/nonexistent civil times, unknown birth time, and representative high-latitude cases. Run in CI via pytest against the calculation service; the app/API regression-tests against the same fixtures.

### Agent's Discretion
- Exact FastAPI project layout inside `api/` (module split, config, error taxonomy) — follow STACK.md guidance.
- How `astrology-skill` is vendored into the backend (git dependency vs submodule vs copied-and-pinned tree) as long as the revision is recorded in provenance and nothing is copied ad hoc into prompts.
- Form library choice (STACK.md suggests React Hook Form + Zod) and client fetch/query wiring (TanStack Query per STACK.md) — not yet installed; installing per STACK.md is fine.
- CALC-04 error taxonomy: specific recoverable error mapping for place/time resolution, calculation, and schema validation failures — the requirement is "specific and recoverable," the exact categories are implementation detail.
- Local dev connection ergonomics for the app → api URL (env config, simulator loopback) — implementation detail.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Persisting charts = Phase 3, wheel = Phase 4, transits = Phase 5, interpretation = Phase 6+.)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BIRTH-01 | Enter birth date, local time, birthplace | Birth form design (§7), RHF+Zod per STACK.md, calculator `--input` contract (§1) |
| BIRTH-02 | Review/confirm resolved lat/lon/IANA zone before calculation | Resolve endpoint design + confirm screen payload (§3, §4), D-06 offset display |
| BIRTH-03 | Explicitly resolve ambiguous/nonexistent civil times | Verified PEP 495 fold-detection algorithm + resolve payload for the D-08 picker (§5) |
| BIRTH-04 | Mark time as timed/approximate/rectified/unknown | Calculator confidence flags verified (§1, §6); four-state control maps 1:1 |
| BIRTH-05 | Unknown time → only supported factors, no invented noon | Verified calculator Unknown-mode behavior; both invocation paths omit houses/angles/sect/lots (§6) |
| CALC-01 | Chart passes product reference fixtures | GATE-02 fixture suite design (§8), deterministic Moshier ephemeris verified |
| CALC-02 | See calculation assumptions | source_notes + structured provenance envelope design (§1, §3) |
| CALC-03 | Record input revision + calculator/ephemeris/tzdata/schema versions | Provenance envelope builder design (§3); swe.version/tzdata verified |
| CALC-04 | Specific recoverable errors for resolution/calculation/validation failures | Verified exit-code taxonomy (0/2/1) + proposed API error codes (§3) |
| GATE-02 | Golden fixtures: calculations, civil-time ambiguity, unknown time, high latitude | Fixture suite + CI wiring (§8); high-latitude Placidus failure mode verified (§10) |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- **Tech stack:** React Native client (Expo SDK 57 line; scaffolder-selected tilde pins authoritative — Phase 01 T-01-SC). New deps go through `npx expo install`.
- **Domain dependency:** `dev/astrology-skill` (sibling repo) is the authoritative calculator; wrap `tools/birth_to_chart.py` as subprocess; record skill revision in provenance; never copy Markdown into ad-hoc prompts; never ask the LLM to calculate.
- **Trust:** calculated facts must stay distinguishable from interpretation — the result view surfaces facts + assumptions + provenance only.
- **Privacy:** calculation/geocoding requests are ephemeral compute-and-discard (retention-deletion-policy.md §1); birth data never persisted server-side; GOOGLE key server-side only (GATE-06); `.env*` blanket-ignored with `!.env.example`.
- **Governance consistency:** disclosure UI must stay registry-driven (`src/schemas/provider-registry.ts`; ids `lemastra-calculation`, `google-geocoding-timezone` are locked vocabulary); flipping provider status `planned`→`active` requires registry + data-inventory + retention updates first (registry schema `status` description).
- **CI ordering landmine (Phase 1):** typed routes + expo-env.d.ts regenerate via dev-server boot, not `expo export`; CI already handles this — new routes must pass through the same flow before `tsc --noEmit`.
- **GSD workflow:** all edits go through GSD commands (this research is part of `/gsd-plan-phase`).

## Summary

Phase 2 introduces the repo's first backend: a local FastAPI service in `api/` that vendors `astrology-skill` (sibling repo, HEAD `660d992` on `main`, remote `github.com/wvanderen/astrology-skill`) and wraps `tools/birth_to_chart.py` as a subprocess, plus the client birth-entry → confirm → result flow. I verified the entire calculator contract by **executing the real script** under a uv-managed Python 3.12.14 venv with `pyswisseph==2.10.3.2` (built from sdist — no cp312 wheels exist) and `tzdata==2026.3`: invocation modes, exit codes, error copy, provenance strings, unknown-time behavior (both invocation paths produce byte-identical factor sets; only `source_notes` differs), silent fold=0 acceptance of DST-ambiguous/nonexistent times (the service MUST pre-classify — §5), and the high-latitude failure mode (Placidus at 69.6°N exits 1 with a raw `swisseph.Error` traceback — not a typed error; §10). A single calculator run takes ~40 ms, so a 10–30 s subprocess timeout is ample.

On the environment: the machine has **only Python 3.14.7** (no 3.12) and **no uv**, but I verified the fix end-to-end — the official uv installer + `uv python install 3.12` + `uv pip install pyswisseph==2.10.3.2` all work locally (uv compiles the sdist). Docker CLI is present but the daemon is not running, so recommend uvicorn-based local dev over compose. Google Geocoding + Time Zone API request/response shapes were verified against current official docs, including a **critical documented caveat**: the Time Zone API "does not take historical time zones into account" for past timestamps — so the service must use Google only for IANA-zone identity and compute the actual historical birth-instant offset locally via `zoneinfo` + `tzdata` (empirically verified fold semantics in §5).

**Primary recommendation:** Vendor the skill as a **git submodule at `vendor/astrology-skill` pinned to `660d992`**, run `birth_to_chart.py` via `--input <temp-json-file>` + `--validate` with an asyncio subprocess timeout, classify DST ambiguity server-side with the verified PEP 495 algorithm *before* invoking the calculator, and drive the D-08 picker from a structured resolution payload. Client: three new expo-router routes (`/birth`, `/birth/confirm`, `/chart/result`) using react-hook-form + zod + TanStack Query, with the one-time disclosure persisted via AsyncStorage and content sourced from the existing provider registry.

### Recommendations at a glance

| # | Decision area | Recommendation | Confidence |
|---|---------------|----------------|------------|
| 1 | Calculator invocation | `--input` temp JSON file mode (avoids `--tz "-05:00"` argparse pitfall), `--validate` always on, `asyncio.wait_for` timeout 10 s | HIGH (verified by execution) |
| 2 | Vendoring | Git submodule `vendor/astrology-skill` @ `660d992`; provenance reads `git rev-parse HEAD` at startup | HIGH (contract verified; submodule mechanics standard) |
| 3 | FastAPI layout | `api/lemastra_api/` app-factory module split (§3); uvicorn local dev (not docker) | HIGH |
| 4 | Error taxonomy (CALC-04) | Machine-readable `error_code` enum + HTTP mapping (§3 table) | HIGH (inputs verified) |
| 5 | Geocoding/TZ | Google Geocoding for candidates; Google Time Zone for IANA zone **identity only**; local `zoneinfo`+`tzdata` for historical birth-instant offset; cross-check & surface drift | HIGH (docs + empirical) |
| 6 | DST handling | Server-side PEP 495 classification; resolve payload drives D-08 picker (first/second pass, shifted instant) | HIGH (empirically verified) |
| 7 | Unknown time | Wrapper passes `--time 12:00 --confidence unknown` (D-10-compliant; identical output to `--noon-for-unknown` minus provenance copy) | HIGH (verified by diff) |
| 8 | Client flow | 3 routes + RHF/zod/TanStack Query; disclosure via AsyncStorage, registry-driven text | HIGH |
| 9 | GATE-02 fixtures | `api/tests/fixtures/golden/` JSON suite, digest-compare excluding `source_notes` version strings; new CI `api` job | HIGH |
| 10 | Python runtime | uv-managed CPython 3.12 (machine lacks 3.12; uv fetches standalone build) | HIGH (verified locally) |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Birth data entry & client validation | Client (RN form) | API (revalidation) | UX latency; server stays authoritative (STACK.md) |
| Place type-ahead search | API (proxy) | Client (debounce UI) | GOOGLE_API_KEY must stay server-side (GATE-06 / D-05) |
| IANA zone identity for birthplace | API (Google TZ client) | — | D-07: never from device clock |
| Historical birth-instant offset + DST classification | API (local zoneinfo+tzdata) | Calculator subprocess (consumes tz) | Google TZ API ignores historical zone changes [CITED: developers.google.com/maps/documentation/timezone/requests-timezone] |
| DST explicit resolution choice | Client (picker UI) | API (payload echo) | User decision per D-08; server validates |
| Chart calculation | Calculator subprocess (vendored skill) | API (wrapper) | STACK.md isolation contract; AGPL containment |
| Schema validation gate | Calculator (`--validate`) | API (response envelope check) | Double gate per STACK.md ("validation is not optional") |
| Provenance assembly & display | API (envelope) | Client (expandable section) | CALC-03 requires complete version chain |
| Disclosure/consent content | Client registry (`src/data/provider-registry.json`) | API (no role) | Phase-1 pattern: registry is single disclosure source |
| Fixture regression (GATE-02) | CI (pytest job) | Local dev | D-14 |

## Standard Stack

### Core — API (new `api/` uv project)

| Library | Version | Purpose | Why Standard | Provenance |
|---------|---------|---------|--------------|------------|
| Python | 3.12 (uv-managed) | Runtime | D-01 pin; machine lacks 3.12 — `uv python install 3.12` verified → 3.12.14 | [VERIFIED: local execution] |
| fastapi | 0.141.1 (latest stable, locked) | HTTP framework | STACK.md; current registry version confirmed | [VERIFIED: PyPI registry] |
| uvicorn | 0.52.4 (locked) | ASGI server for local dev | STACK.md; D-02 uvicorn path avoids Docker daemon dependency | [VERIFIED: PyPI registry] |
| pydantic | v2 (FastAPI-bundled line, locked) | Request/response models | STACK.md; mirror calculator contract at API edge | [VERIFIED: PyPI registry] |
| pyswisseph | ==2.10.3.2 (exact) | Swiss Ephemeris (in calculator venv only) | Skill's pinned version; built from sdist on 3.12 successfully; `swe.version` → "2.10.03" | [VERIFIED: local build + run] |
| tzdata | ==2026.3 (exact) | Deterministic IANA DB | Skill requires >=2024.1; current release verified; guarantees host-independent resolution | [VERIFIED: PyPI registry] |
| jsonschema | >=4.18 (locked) | `--validate` gate | Skill's requirements-dev; Draft202012Validator used by the script | [VERIFIED: code read, tools/birth_to_chart.py L1390] |
| pytest + httpx | current stable (dev) | API tests incl. ASGI `TestClient` | Canonical FastAPI testing pair | [VERIFIED: PyPI registry] |
| uv | 0.12.5+ | Dependency + Python management | Lockfile reproducibility; fetches CPython 3.12 itself | [VERIFIED: local execution] |

### Core — Client additions (via `npx expo install` / npm)

| Library | Version | Purpose | Why Standard | Provenance |
|---------|---------|---------|--------------|------------|
| react-hook-form | 7.86.0 (current) | Birth form with interdependent optionality | STACK.md choice; Agent's Discretion confirms | [VERIFIED: npm registry] `[SUS: too-new — false positive, 60M dl/wk, canonical repo]` |
| @hookform/resolvers | 5.9.1 (current) | zod resolver for RHF | Canonical RHF+Zod pattern | [VERIFIED: npm registry] `[SUS: too-new — false positive, 51M dl/wk]` |
| @tanstack/react-query | 5.102.3 (current) | Mutations/queries for resolve+calculate | STACK.md choice | [VERIFIED: npm registry] `[SUS: too-new — false positive, 66M dl/wk]` |
| @react-native-async-storage/async-storage | 3.1.1 (current) | One-time disclosure flag (D-04) | Expo-documented persistence; seam verdict OK | [VERIFIED: npm registry, seam OK] |
| zod | ^4.4.3 (already installed) | Client schema validation | Phase 1 pattern (schema-test pattern) | [VERIFIED: package.json] |

No `postinstall` scripts on any of the npm packages above (checked via `npm view <pkg> scripts.postinstall` → null) [VERIFIED: npm registry].

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Submodule vendoring | uv git dependency | **Not viable:** `astrology-skill` has no `pyproject.toml`/packaging — it is not an installable Python package [VERIFIED: repo listing]. A git dep would require upstream packaging changes. |
| Submodule vendoring | Copied-and-pinned tree | Works everywhere, but drifts silently and duplicates AGPL code — violates "no ad-hoc copying" spirit; keep as fallback only. |
| uvicorn local dev | docker compose | Docker CLI present but daemon NOT running on this machine [VERIFIED: probe]. uvicorn + uv is one command and matches D-02's either/or. |
| RHF + zod | Hand-rolled form state | Rejected — birth form has interdependent optionality (unknown time disables time field; confidence state changes validation); RHF+Zod is the locked-direction stack. |
| AsyncStorage flag | expo-sqlite / expo-file-system | Both are Phase 3+ scope; AsyncStorage is the smallest honest persistence for "one-time notice". |

**Installation (client):**
```bash
npx expo install react-hook-form @hookform/resolvers @tanstack/react-query @react-native-async-storage/async-storage
```

**Installation (API):**
```bash
# from api/
uv python install 3.12
uv sync          # creates .venv from committed uv.lock
uv run uvicorn lemastra_api.main:app --reload --port 8000
```

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| react-hook-form | npm | ~7 yrs | 60.4M/wk | github.com/react-hook-form/react-hook-form | SUS (too-new heuristic) | Approved — recency false positive (same pattern as Phase 1's expo flags); planner includes checkpoint:human-verify before install |
| @hookform/resolvers | npm | ~5 yrs | 51.2M/wk | github.com/react-hook-form/resolvers | SUS (too-new heuristic) | Approved — same false-positive rationale; checkpoint:human-verify |
| @tanstack/react-query | npm | ~5 yrs | 66.8M/wk | github.com/TanStack/query | SUS (too-new heuristic) | Approved — same false-positive rationale; checkpoint:human-verify |
| @react-native-async-storage/async-storage | npm | ~8 yrs | 7.1M/wk | github.com/react-native-async-storage/async-storage | OK | Approved |
| fastapi / uvicorn / pydantic / jsonschema / pytest / httpx | PyPI | years | high (canonical) | official repos | SUS (unknown-downloads — PyPI has no download signal in seam) | Approved — all are the canonical ecosystem packages; cross-verified on registry |
| pyswisseph | PyPI | ~10 yrs | n/a | github.com/aloistr/swisseph (C lib) + astral/pyswisseph packaging | SUS (unknown-downloads) | Approved — **actually built and executed locally in this research**; version/behavior confirmed |
| tzdata | PyPI | continuous releases | canonical | github.com/python/tzdata | SUS (unknown-downloads) | Approved — the canonical IANA DB distribution for Python |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** react-hook-form, @hookform/resolvers, @tanstack/react-query (recency false positives — planner adds one `checkpoint:human-verify` covering the client-install task; the registry evidence above satisfies the human). All PyPI "SUS" verdicts stem from the seam lacking PyPI download data — every one is a canonical package with an official repository and years of history.

## Calculator Integration Contract (verified against `../astrology-skill` @ `660d992`)

Everything in this section was verified by reading the source (`tools/birth_to_chart.py`, 1623 lines) **and executing it** under Python 3.12.14 + pyswisseph 2.10.3.2 + tzdata 2026.3. Tag: [VERIFIED: local execution] unless noted.

### Invocation modes

| Mode | Command | Notes |
|------|---------|-------|
| Flags (non-interactive) | `python tools/birth_to_chart.py --date 1990-05-21 --time 14:32 --lat 40.7128 --lon -74.0060 --tz America/New_York --validate` | **Pitfall:** negative-offset tz values need `--tz=-05:00` equals-form; `--tz "-05:00"` is parsed as a flag → exit 2 (verified) |
| JSON file | `python tools/birth_to_chart.py --input birth.json --validate` | **Recommended for the wrapper** — one code path, no arg escaping, keys are snake_case: `date, time, lat, lon, tz, house_system, name, place, reading_type, confidence, approximate, rectified, noon_for_unknown, validate, ...` |
| `--input` + override | `--validate` / `--output` / `--schema` flags override the file's values (main() L1577–1586) | Wrapper should pass `validate: true` inside the JSON and not rely on flags |
| Interactive | no args → prompts | Wrapper must NEVER hit this: always pass `--input`; `_looks_bare` triggers prompts if `date`+`lat`+`lon` all absent |
| stdin pipe | **NOT supported** — `--input` takes a file path only | Wrapper writes a `tempfile.NamedTemporaryFile` (or `tempfile.TemporaryDirectory`) per request |
| Output | JSON to stdout by default (`indent=2`); `--output FILE` writes a file; use stdout capture | |

### Exit codes & error shapes (verified)

| Exit | Meaning | stderr shape | Example (verified verbatim) |
|------|---------|--------------|------------------------------|
| 0 | Success (+ `VALID: output conforms to chart_input_schema.json.` on stderr when `--validate`) | `VALID: …` | |
| 2 | `ConfigError` — bad/missing input, schema-validation failure, argparse usage error | `FAIL: <message naming the field>` | `FAIL: --tz 'America/Kentucky/Lexington' looks like an IANA zone name, but no such zone is resolvable on this host … Did you mean one of: America/Kentucky/Louisville, America/Kentucky/Monticello? …` |
| 1 | **Uncaught engine exception** (e.g. `swisseph.Error` at high latitude with quadrant house systems) | Raw Python traceback, last line `swisseph.Error: swisseph.houses: error` | Tromsø 69.6496N + Placidus (verified — §10) |

The wrapper must treat **exit 1 (or any unrecognized code) as a distinct, typed engine error**, surfacing a recoverable CALC-04 message, and log the stderr traceback server-side (never to the client).

### Output envelope (verified structure)

```jsonc
{
  "reading_type": "natal",
  "tradition_mode": "blended",
  "tone": "practical",
  "chart_data": {
    "house_system": "Whole Sign",          // only when time known
    "ascendant": { "sign": "Virgo", "degree": 24.5496, "absolute_degree": 174.5496 },
    "midheaven": { … },
    "house_cusps": [ { "house": 1, "sign": "Virgo", "degree": 0.0, "absolute_degree": 150.0 }, … ],
    "placements": [ { "body": "Sun", "sign": "Gemini", "degree": 0.4375, "absolute_degree": 60.4375,
                      "motion": "direct", "condition": [], "dignity": [], "house": 10 }, … ],
    "aspects": [ { "body_a": "Sun", "aspect": "trine", "body_b": "Saturn", "orb_degrees": 5.325,
                   "separating": true, "exact": false }, … ],
    "sect": { "status": "day", "luminary_of_sect": "Sun", "sect_mate_planets": ["Jupiter","Saturn"],
              "notes": "Sun altitude 60.6° at birth (above horizon)." },
    "lots": [ { "name": "Lot of Fortune", "sign": "Leo", …, "formula": "Asc + Moon − Sun (day sect)" } ],
    "source_notes": "Computed by pyswisseph/Swiss Ephemeris 2.10.03. Frame: tropical. House system: Whole Sign. Ephemeris mode: Moshier (built-in). Topocentric Moon: off. Birth-time confidence: Timed. … Input: date 1990-05-21, time 14:32, tz America/New_York (iana), lat 40.7128, lon -74.006.",
    "birth_time_confidence": "Timed"
  }
}
```

Key facts for the planner:
- **Provenance is prose** (`source_notes`) — the API must ADD structured provenance fields around it (see §3) because CALC-03 needs machine-readable versions.
- `swe.version` → `2.10.03`; `ephemeris mode: Moshier (built-in)` — **no `.se1` files needed**; positions verified accurate to natal use (~0.1″ planets / ~3″ Moon) [CITED: tools/README.md]. Never commit `.se1` files.
- Default bodies: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, True Node. `dignity` carries major essential dignities only for the 7 classical planets; `condition` always `[]` (interpretive — trust boundary preserved).
- `HOUSE_SYSTEMS` (verified dict, L181–192): `Whole Sign` (default), `Placidus`, `Regiomontanus`, `Koch`, `Equal`, `Campanus`, `Porphyrius`, `Morinus`, `Alcabitius`, `Topocentric` — this is the D-11 selector's exact vocabulary.
- `birth_time_confidence` ∈ `Timed | Approximate | Unknown | Rectified` (capitalized labels).
- `--confidence` explicit flag **overrides** inference (L922–929); wording hints ("around", "approx", "~", "circa") in `--place`/`--confidence-notes` force `Approximate` — the API should pass explicit `confidence` and a clean `place` label to avoid accidental downgrade (verified inference rules, L917–940).
- Aspect orbs: pair-orb = max of per-body (luminaries 10°, personal 7°, Jupiter–Pluto 8°, Node 5°, angles 8°); sextile capped 6°; `exact` < 0.05°; `stationary` < 0.01°/day [VERIFIED: constants L206–225].
- **Runtime:** one subprocess run ≈ 40 ms wall (verified `time` measurement) — dominated by interpreter startup. A 10 s timeout gives ~250× headroom.

### Wrapper isolation contract (per STACK.md)

- One `asyncio.create_subprocess_exec` per calculate request; **no shared calculator state** (each subprocess configures its own ephemeris — `swe.set_ephe_path` at import, L1622).
- `asyncio.wait_for(proc.communicate(), timeout=10)`; on timeout → `kill()` + typed `CALC_TIMEOUT` error. Do NOT use `shell=True`; argv is fully controlled (`--input` path + `--validate`).
- Env for subprocess: inherit minimal env (strip `GOOGLE_API_KEY` etc. — calculator needs none of it); optionally set `PYTHONTZPATH` to the venv's tzdata to force package-first resolution (script already prefers system db then falls back to tzdata — deterministic either way once `tzdata` is a hard dep).
- Stdout → JSON parse; stderr → captured for error taxonomy; both discarded after response (ephemeral, retention §1).
- Load: Phase 2 is local dev; no worker pool needed (STACK.md's bounded pool is a later-phase concern).

## Vendoring Strategy (Agent's Discretion → recommendation)

**Constraint source (D-01/discretion):** revision recorded in provenance; no ad-hoc copying of skill content; STACK.md: "versioned Git dependency, submodule, or published internal package."

**Recommendation: git submodule at `vendor/astrology-skill`, pinned to `660d992`.**

```bash
git submodule add https://github.com/wvanderen/astrology-skill.git vendor/astrology-skill
git -C vendor/astrology-skill checkout 660d992
git add vendor/astrology-skill && git commit  # gitlink records the exact SHA
```

Why this wins:
- **Provenance is native:** the gitlink SHA *is* the recorded revision; the service reads it at startup via `git -C vendor/astrology-skill rev-parse HEAD` and stamps every chart envelope (`skill_revision`). No separate manifest to drift.
- **uv git dependency is not viable:** `astrology-skill` has no `pyproject.toml` — it is not an installable distribution [VERIFIED: repo root listing]. The calculator is invoked as a *script*, which matches STACK.md's subprocess contract anyway (the skill never becomes an import dependency — preserving the AGPL boundary).
- **No copying:** the AGPL `tools/` unit stays intact with its own LICENSE/NOTICE (`tools/NOTICE.md`, `tools/LICENSE`), satisfying the STACK.md licensing-gate containment strategy (GATE-01 posture: Professional License option-a recorded; contract execution scheduled pre-beta — no new licensing decision needed this phase).
- The skill's own requirements are installed **into the api venv** (uv: `pyswisseph==2.10.3.2`, `tzdata==2026.3`, `jsonschema`) so the subprocess runs with `uv run python vendor/astrology-skill/tools/birth_to_chart.py …`.

Config notes:
- `pyproject.toml` (api): `requires-python = ">=3.12,<3.13"`; exact pins: `pyswisseph==2.10.3.2`, `tzdata==2026.3`, `jsonschema==<locked>`; commit `uv.lock`.
- `.gitmodules` entry: `path = vendor/astrology-skill`, `url = https://github.com/wvanderen/astrology-skill.git`, `branch = main` (pin by commit; branch field is informational).
- CI: `actions/checkout@v4` with `submodules: true` (or `recursive: false` + explicit — no nested submodules present).
- Local dev note: the sibling checkout `../astrology-skill` exists but is **not** what the service uses — the submodule is authoritative. Settings override `LEMASTRA_SKILL_PATH` may point at the sibling for experiments, default `vendor/astrology-skill`.
- Upstream skill repo currently has uncommitted local modifications (benchmark test files) — irrelevant to the vendored pin; `tools/` is clean at `660d992` [VERIFIED: git status].

**Fallback (if submodule friction bites during execution):** scripted snapshot copy into `vendor/astrology-skill/` with a committed `UPSTREAM.revision` file (`git rev-parse` output) + CI check that the tree matches the recorded upstream SHA. Same provenance guarantees, slightly more script.

## FastAPI Service Skeleton

### Project layout

```
api/
├── pyproject.toml              # uv project; requires-python >=3.12,<3.13; locked deps
├── uv.lock                     # committed
├── .env.example                # GOOGLE_API_KEY= (server-only), LEMASTRA_CALC_TIMEOUT_S=10, LEMASTRA_ALLOW_ORIGINS=...
├── README.md                   # run instructions (uv sync; uvicorn; simulator URLs)
└── lemastra_api/
    ├── __init__.py
    ├── main.py                 # app factory; CORS; /api/v1/health; router mounting
    ├── settings.py             # plain os.environ reads → frozen dataclass (no pydantic-settings dep needed)
    ├── schemas.py              # pydantic request/response models (mirror calculator contract)
    ├── errors.py               # CALC-04 taxonomy: error_code enum + HTTP mapping + detail payloads
    ├── provenance.py           # structured provenance envelope builder (skill rev, swe, tzdata, schema, request id)
    ├── routes/
    │   ├── places.py           # POST /api/v1/places/search, POST /api/v1/places/resolve-time
    │   └── charts.py           # POST /api/v1/charts/calculate
    └── services/
        ├── geocoding.py        # Google Geocoding + Time Zone client (httpx), response→typed errors
        ├── civil_time.py       # PEP 495 classification + offset resolution (pure, heavily tested)
        └── calculator.py       # subprocess wrapper: temp --input file, --validate, timeout, exit-code mapping
```

### Endpoints (refines D-03's two-step while preserving the confirm screen between resolve and calculate)

| Endpoint | Request | Response (success) | Errors |
|----------|---------|--------------------|--------|
| `GET /api/v1/health` | — | `{status, versions: {skill_revision, swisseph, tzdata, schema, api}}` | — |
| `POST /api/v1/places/search` | `{query: str (≥2 chars)}` | `{candidates: [{label: formatted_address, lat, lon, location_type, place_id?}], provenance: {provider: "google-geocoding-timezone", lookup_timestamp}}` | `PLACE_ZERO_RESULTS`, `PLACE_PROVIDER_UNAVAILABLE` (quota/denied), `PLACE_INVALID_QUERY` |
| `POST /api/v1/places/resolve-time` | `{lat, lon, local_date: YYYY-MM-DD, local_time: HH:MM, tz_override?: IANA or ±HH:MM}` | `{iana_zone, zone_source: "google"\|"manual", google: {timeZoneId, rawOffset, dstOffset, timeZoneName}, resolved: {offset_seconds, offset_label, classification: "normal"\|"ambiguous"\|"nonexistent", options: [ …D-08 picker payload… ]}, drift: bool}` | `TIMEZONE_NO_RESULTS`, `TIMEZONE_PROVIDER_UNAVAILABLE`, `TIMEZONE_INVALID_ZONE` |
| `POST /api/v1/charts/calculate` | confirmed birth data: `{date, time?, time_resolution?: {mode: "first_pass"\|"second_pass"\|"shifted", …}, confidence, house_system, place: {label, lat, lon}, iana_zone, zone_source}` | full chart envelope (calculator output) + `provenance` block + `unavailable_factors` (when Unknown) | `CALC_INVALID_INPUT` (exit 2 mapped), `CALC_ENGINE_ERROR` (exit 1), `CALC_TIMEOUT`, `CALC_VALIDATION_FAILED` (schema gate), `CALC_UNSUITABLE_HOUSE_SYSTEM` (high-latitude quadrant failure → recoverable: suggest Whole Sign/Equal) |

**Provenance block (CALC-03, added by the API around the calculator's prose `source_notes`):**
```jsonc
{
  "provenance": {
    "skill_revision": "660d992…",            // git rev-parse of vendored submodule at request time
    "swisseph_version": "2.10.03",            // parsed from source_notes OR read once at startup
    "tzdata_version": "2026.3",               // importlib.metadata.version("tzdata") in api process (same locked venv)
    "schema_version": "chart_input_schema v (draft 2020-12)",  // vendored schema identity
    "ephemeris_mode": "Moshier (built-in)",
    "house_system": "Whole Sign",
    "zodiac_mode": "tropical",
    "orb_policy": "tool default table",       // documented constants; surfaced as assumption line (D-12)
    "input_revision": "<uuid7/hash of normalized inputs>",   // STACK.md revision concept; formalized Phase 3
    "calculator_cmd": "birth_to_chart.py --input … --validate"
  }
}
```

### CALC-04 error taxonomy (Agent's Discretion → recommendation)

Machine-readable `error_code` in every 4xx/5xx body: `{error: {code, message, recoverable: true, hint?}}`. Recovery guidance per code (client renders `hint`): e.g. `PLACE_ZERO_RESULTS` → "Try a nearby city or enter coordinates manually" (activates D-05 manual fallback); `CALC_UNSUITABLE_HOUSE_SYSTEM` → "Placidus houses cannot be computed for this latitude/date — switch to Whole Sign or Equal" (verified real case, §10); `CALC_TIMEOUT` → retry. Map: exit 2 + stderr `FAIL:` prefix → `CALC_INVALID_INPUT` (pass through the field-naming message — it is already excellent copy, verified); exit 1 / traceback → `CALC_ENGINE_ERROR` unless stderr contains `swisseph.houses` → `CALC_UNSUITABLE_HOUSE_SYSTEM`.

### CORS / local-dev connection (Agent's Discretion → recommendation)

- Bind `127.0.0.1:8000`; CORS allowlist from `LEMASTRA_ALLOW_ORIGINS` env, default `http://localhost:8081,http://127.0.0.1:8081` (Expo web dev server).
- Client base URL: existing `.env.example` key `EXPO_PUBLIC_API_URL` (already committed, Phase 1). Platform defaults: iOS simulator → `http://localhost:8000` (shares host network); Android emulator → `http://10.0.2.2:8000` (emulator loopback alias for host); web → `http://localhost:8000`. Resolve via `process.env.EXPO_PUBLIC_API_URL ?? platform default` — EXPO_PUBLIC vars are plain-text inlined (documented in .env.example; nothing secret in them per GATE-06).
- Do not add authentication this phase (local dev only, D-02); the service must still never log full birth payloads (retention §1 redaction posture).

### pytest wiring

- `api/tests/` with `conftest.py` (fixture paths, temp skill-input helper, fake-geocoder stub); tests run via `uv run pytest -q` (fast subset `-k "not golden"`), full suite per wave/phase gate.
- ASGI testing through `httpx` + FastAPI `TestClient`; geocoder behind an interface so unit tests never hit Google (contract tests for parsing use recorded JSON fixtures).

## Geocoding + Timezone Resolution (verified against official docs)

### Geocoding — request/response [CITED: developers.google.com/maps/documentation/geocoding/requests-geocoding]

```
GET https://maps.googleapis.com/maps/api/geocode/json?address=<urlencoded>&key=$GOOGLE_API_KEY
```
Response: `{status, results: [...], error_message?}`. Statuses: `OK`, `ZERO_RESULTS`, `OVER_DAILY_LIMIT` (key missing/invalid, billing off), `OVER_QUERY_LIMIT`, `REQUEST_DENIED`, `INVALID_REQUEST`, `UNKNOWN_ERROR` (retryable). Each result: `formatted_address` (→ candidate label), `geometry.location {lat,lng}` (→ authoritative coords), `geometry.location_type` (`ROOFTOP`/`RANGE_INTERPOLATED`/`GEOMETRIC_CENTER`/`APPROXIMATE` — display as precision hint), `place_id`, `partial_match` flag (surface "best match" caveat). `address_components` may change shape without notice — do not parse beyond label + location [CITED: same page].

**Type-ahead caveat:** Google's docs state address geocoding is *not* a type-ahead/autocomplete service (ambiguous queries unsupported; Places Autocomplete is their suggestion for that). D-05 locked "type-ahead backed by server-side Google Geocoding" — implement as **debounced (≥300 ms, ≥3 chars) geocode-as-you-search** with candidates-as-results, which is honest to the locked decision; note Places Autocomplete as a future provider-swap (would need registry/data-inventory update — open question Q2).

### Time Zone — request/response [CITED: developers.google.com/maps/documentation/timezone/requests-timezone]

```
GET https://maps.googleapis.com/maps/api/timezone/json?location=LAT,LNG&timestamp=<birth-instant-seconds>&key=$GOOGLE_API_KEY
```
Response: `{status, timeZoneId, timeZoneName, rawOffset (seconds, no DST), dstOffset (seconds at that timestamp)}`. Statuses: `OK`, `INVALID_REQUEST`, `OVER_DAILY_LIMIT`, `OVER_QUERY_LIMIT`, `REQUEST_DENIED` (check HTTPS), `UNKNOWN_ERROR`, `ZERO_RESULTS` (over water/uninhabited).

**CRITICAL documented caveat:** *"the API does not take historical time zones into account. That is, if you specify a past timestamp, the API does not take into account the possibility that the location was previously in a different time zone."* It resolves the zone ID by location and applies that zone's rules; zones realigned historically (e.g., region moved zones, permanent offset changes) can misreport.

**Design consequence (D-07-compliant):** Google Time Zone API supplies the **IANA zone identity** (`timeZoneId`) as provider-of-record provenance; the **actual historical offset for the birth instant is computed locally** with `zoneinfo` + `tzdata` (the same DB the calculator uses — internally consistent by construction). Cross-check `rawOffset + dstOffset` vs local resolution; if they disagree, still trust local tzdata for computation but set `drift: true` in the resolve response + provenance so the confirm screen can show a subtle "provider offset differs" note. The BIRTH-02 offset display (D-06) always shows the locally-resolved offset.

Note: `timeZoneId` uses CLDR canonical IDs and may return legacy aliases (docs example: `Asia/Calcutta` not `Asia/Kolkata`) — `zoneinfo` resolves aliases fine; normalize for display if desired.

### What to persist in provenance (per resolve/calculate; all ephemeral server-side, retention §1)

`place.label` (formatted_address), `lat`, `lon`, `location_type`, `iana_zone`, `zone_source` (`google` | `manual`), `provider: "google-geocoding-timezone"`, `google.timeZoneId/rawOffset/dstOffset`, `resolved.offset_seconds`, `drift`, `lookup_timestamp` (ISO-8601 UTC), `time_resolution` choice (when tricky-time picker used). These ride along in the calculate response envelope (and Phase 3 will persist them device-side).

### Manual fallback (D-05)

Client form branch: place label (free text) + latitude/longitude (validated numeric fields, zod) + IANA zone picker (curated list — see below). The resolve-time endpoint accepts `tz_override` so manual entries get the same server-side offset/DST classification + provenance (`zone_source: "manual"`). IANA zone list source: the service can expose `GET /api/v1/meta/zones` from `zoneinfo.available_timezones()` (cheap, no quota) — or a static curated subset client-side; recommend the endpoint so client and server never disagree. Calculator validates any zone with excellent did-you-mean errors (verified) — the picker mostly prevents that class.

### Geocoder error mapping (CALC-04)

| Google status | API error_code | HTTP | Client recovery hint |
|---------------|----------------|------|----------------------|
| ZERO_RESULTS | PLACE_ZERO_RESULTS | 404 | "Try a nearby city or enter coordinates manually" |
| OVER_DAILY_LIMIT / REQUEST_DENIED | PLACE_PROVIDER_UNAVAILABLE | 503 | "Place search unavailable — enter coordinates manually" |
| OVER_QUERY_LIMIT | PLACE_PROVIDER_UNAVAILABLE (Retry-After) | 429 | debounced retry |
| INVALID_REQUEST | PLACE_INVALID_QUERY | 400 | fix query |
| UNKNOWN_ERROR / network | PLACE_PROVIDER_UNAVAILABLE | 503 | retry |
| TZ ZERO_RESULTS | TIMEZONE_NO_RESULTS | 404 | manual zone picker |

## DST Gap/Overlap Handling (BIRTH-03 / D-08) — verified

**The calculator does NOT detect tricky times.** `wallclock_to_ut` (L426–436) constructs `datetime(..., tzinfo=tz)` (fold=0 default) and converts — "we surface the resolved UTC rather than guessing." Verified: `2024-11-03 01:30 America/New_York` (ambiguous) and `2024-03-10 02:30` (nonexistent) are both **silently accepted** with fold=0 semantics. Therefore classification MUST happen in the API's resolve step before any calculate call.

### Verified classification algorithm (PEP 495; executed on this machine)

```python
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def classify(local: datetime, tz: ZoneInfo):
    d0 = local.replace(tzinfo=tz, fold=0)
    d1 = local.replace(tzinfo=tz, fold=1)
    o0, o1 = d0.utcoffset(), d1.utcoffset()
    rt0 = d0.astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None)
    rt1 = d1.astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None)
    if rt0 != local and rt1 != local:
        return "nonexistent", o0, o1          # neither fold round-trips
    if o0 != o1:
        return "ambiguous", o0, o1            # both round-trip, different offsets
    return "normal", o0, o1
```

Verified results (America/New_York):
| Wall time | Classification | fold=0 | fold=1 |
|-----------|----------------|--------|--------|
| 1990-05-21 14:32 | normal | −04:00 → UTC 18:32 | same |
| 2024-11-03 01:30 (fall-back) | ambiguous | EDT −04:00 → UTC 05:30 (first pass) | EST −05:00 → UTC 06:30 (second pass) |
| 2024-03-10 02:30 (spring-forward) | nonexistent | EST −05:00 → UTC 07:30 ≡ wall 03:30 EDT | EDT −04:00 → UTC 06:30 |

Counterintuitive but verified: in a **gap**, fold=0 applies the *pre-transition* offset, producing the UTC instant whose local wall time is the **shifted adjacent instant** (02:30 → 03:30). That is exactly D-08's prescribed "shift to the adjacent valid instant."

### Resolve payload for the D-08 picker

```jsonc
// classification: "ambiguous"
"options": [
  { "mode": "first_pass",  "label": "01:30 EDT (−04:00) — first occurrence before the clocks fell back", "utc": "2024-11-03T05:30:00Z" },
  { "mode": "second_pass", "label": "01:30 EST (−05:00) — second occurrence after the clocks fell back", "utc": "2024-11-03T06:30:00Z" }
]
// classification: "nonexistent" — single option + explanation
"options": [
  { "mode": "shifted", "label": "02:30 did not exist (clocks jumped 02:00→03:00). Using 03:30 EDT (−04:00).", "utc": "2024-03-10T07:30:00Z" }
]
// classification: "normal" → options: [], no picker
```

The calculate endpoint accepts the chosen `time_resolution.mode` and converts it into calculator inputs deterministically: `first_pass` → pass the wall time with the IANA zone (calculator fold=0 default = first pass, verified); `second_pass` → pass the equivalent **fixed-offset tz** (`-05:00` via `--input` JSON `"tz": "-05:00"`, verified working — avoids argparse entirely); `shifted` → pass the shifted wall time (03:30) with the IANA zone. Materiality verified: first vs second pass move the Ascendant **149.5557° → 161.3879°** (a whole sign) — the picker is not cosmetic.

## Unknown Birth Time (BIRTH-05 / D-10) — verified

**Constraint tension found and resolved:** the calculator *requires* either `--time` or `--noon-for-unknown` (missing both = hard exit 2, verified message: *"No birth time supplied. Pass --time HH:MM, or --noon-for-unknown … A time is never silently guessed."*). D-10 forbids `--noon-for-unknown`. The D-10-compliant invocation is:

```json
{ "date": "1990-05-21", "time": "12:00", "confidence": "unknown",
  "lat": 40.7128, "lon": -74.006, "tz": "America/New_York", "reading_type": "natal" }
```

Verified by execution and **JSON diff**: `--time 12:00 --confidence unknown` and `--noon-for-unknown` (no time) produce **identical `chart_data` except one `source_notes` sentence** ("time 12:00" vs "time (none)"). Explicit `--confidence unknown` overrides inference (L922–929); `time_known = confidence in (Timed, Approx, Rectified)` (L1071) → False → the Unknown branch runs regardless of the passed time. So the letter of D-10 is honored (flag unused) with zero behavioral cost.

**What the tool emits when confidence is Unknown (verified):**
- Present: `placements` (all bodies, sign/degree/absolute_degree/motion/dignity — **no `house` key at all**), interplanetary `aspects` (**no** angle contacts), `birth_time_confidence: "Unknown"`, `source_notes` with a noon-reference explanation.
- Omitted keys: `house_system`, `ascendant`, `midheaven`, `house_cusps`, `sect`, `lots`.
- Moon placement gets `notes: "Provisional: computed at the noon reference."` (Moon moves ~13°/day).
- `Approximate`: angles/houses ARE computed but `source_notes` labels them provisional (verified code path L1092–1096) — client should carry that caveat into the assumptions line.

**API response marking (D-10 "unavailable + why"):** the calculate endpoint derives `unavailable_factors` from the calculator output (not hard-coded), e.g.:

```jsonc
"unavailable_factors": [
  { "factor": "houses",         "reason": "Requires a birth time" },
  { "factor": "ascendant_mc",   "reason": "Requires a birth time" },
  { "factor": "sect",           "reason": "Requires sunrise/sunset timing" },
  { "factor": "lots",           "reason": "Lot of Fortune requires the Ascendant" }
],
"provisional_factors": [ { "factor": "moon", "reason": "Moon moves ~13°/day; degree may shift without a known time" } ]
```

Client renders these as explicit "unavailable" cards in the result list — never blank rows. (Stable-vs-unreliable factor doctrine: `references/foundations/birth_time_uncertainty.md` [VERIFIED: read].)

## Expo Client Screens

### Routes (expo-router file routes, Phase-1 pattern: `src/app/{index,privacy}.tsx`)

```
src/app/index.tsx            # add "New chart" CTA → /birth  (minimal edit)
src/app/birth.tsx            # BIRTH-01/04: date, time, place search (D-05), confidence control (D-09), house-system advanced control (D-11)
src/app/birth/confirm.tsx    # BIRTH-02/03: resolved label/coords/zone/offset (D-06), tricky-time picker (D-08), one-time disclosure (D-04), Calculate
src/app/chart/result.tsx     # D-13: structured placement list + assumptions line (D-12) + expandable provenance + validation status + unavailable cards (D-10)
```

Draft state (form → confirm → result) via expo-router params (`router.push({ pathname: '/birth/confirm', params: { draft: JSON.stringify(...) } })`) — no global store needed this phase (Zustand stays deferred until Phase 3 persistence).

### Component/test structure (reuses Phase-1 primitives)

```
src/components/birth/         # confidence-control.tsx (4-state segmented), place-search.tsx (debounced type-ahead + manual fallback), tricky-time-picker.tsx
src/components/chart/         # placement-list.tsx, assumptions-line.tsx, provenance-details.tsx, unavailable-factors.tsx
src/lib/api.ts                # typed fetch client over EXPO_PUBLIC_API_URL + platform default (10.0.2.2 on Android)
src/lib/api-schemas.ts        # zod schemas for resolve/calculate responses (parse-then-trust)
src/hooks/use-disclosure.ts   # AsyncStorage-backed one-time flag (D-04)
src/lib/query-client.tsx      # TanStack Query provider; focusManager ↔ AppState wiring (STACK.md)
```

- Themed primitives: `themed-text.tsx`, `themed-view.tsx`, `use-theme` (existing) — no new UI kit.
- Disclosure content (D-04) **must be registry-driven**: read `lemastra-calculation` + `google-geocoding-timezone` entries from `src/data/provider-registry.json` (the Phase-1 test suite enforces registry-driven disclosure rendering — keep that invariant). Flipping their `status` from `planned` → `active` is part of this phase (registry schema documents the required inventory+retention sync; content already matches §1 strings).
- Client zod schemas double as tests (Phase-1 schema-test pattern: parse valid / reject malformed).
- Component tests: RNTL `/pure` pattern, `IS_REACT_ACT_ENVIRONMENT`, vitest node environment — extend `src/__tests__/` (form validation logic, confidence control state transitions, tricky-time picker rendering per classification, unavailable-factors rendering, assumptions-line/provenance progressive disclosure).
- **Remember (Phase-1 CI landmine):** after adding routes, regenerate typed routes via dev-server boot before `tsc --noEmit`.

### Library wiring

- `react-hook-form` + `@hookform/resolvers/zod`: birth form. Interdependency rules: confidence `Unknown` → disable time field (and skip picker); `Approximate/Rectified` → time required; place = search-selected candidate **or** manual (lat/lon/zone) — zod discriminated union.
- `@tanstack/react-query`: `useMutation` for calculate (POST once, user-initiated); debounced query (or manual mutation) for place search; error → typed error_code handling per §3 table (render `hint`).
- `@react-native-async-storage/async-storage`: `@lemastra:disclosure.calculation.v1` boolean set after first Calculate tap acknowledgement.

## GATE-02 Golden Fixture Suite (D-14)

### Location & shape

```
api/tests/fixtures/golden/
├── cases/            # input + expectation per case (JSON, committed)
│   ├── natal-1990-brooklyn.json
│   ├── natal-1992-kentucky.json
│   ├── natal-southern-hemisphere.json
│   ├── dst-ambiguous-ny-2024.json
│   ├── dst-nonexistent-ny-2024.json
│   ├── dst-half-hour-shift.json        # e.g. Lord Howe Island (30-min DST) — dense sample
│   ├── unknown-time-1990-brooklyn.json
│   ├── high-latitude-tromso-whole-sign.json   # success case
│   └── high-latitude-tromso-placidus.json     # expected-failure case (exit 1 → CALC_UNSUITABLE_HOUSE_SYSTEM)
└── README.md          # how to regenerate digests deliberately (not on every run)
```

Case schema:
```jsonc
{
  "id": "dst-ambiguous-ny-2024",
  "category": "dst_ambiguous",
  "input": { "date": "2024-11-03", "time": "01:30", "tz": "America/New_York",
             "lat": 40.7128, "lon": -74.006, "house_system": "Whole Sign" },
  "expect": {
    "exit_code": 0,
    "birth_time_confidence": "Timed",
    "digest": { "ascendant.absolute_degree": 149.5557,
                "placements.Sun.absolute_degree": 232.7,
                "house_count": 12, "aspect_count_range": [10, 40], ... },
    "second_pass_digest": { "ascendant.absolute_degree": 161.3879 }   // via tz=-05:00 variant
  }
}
```

**Design rules:**
- Compare **field digests, not whole-document equality**: `source_notes` embeds version strings (swisseph/tzdata) that legitimately change on deliberate upgrades — whitelisting digests keeps upgrades reviewable instead of silently breaking [VERIFIED: version strings in output].
- Values are deterministic under the pinned lockfile (Moshier ephemeris is built-in and time-invariant; historical zone offsets pinned by exact `tzdata`) — regenerating digests is a deliberate, reviewed act on dependency promotion (STACK.md: promote tzdata/ephemeris upgrades through fixture gates).
- The suite runs against the **calculation service** (through the FastAPI calculate endpoint via TestClient), not just the raw script — D-14 "the app/API regression-tests against the same fixtures." One parametrized pytest module drives all cases through the API (subprocess included) — runtime ~1 s total at 40 ms/case (verified).
- Also run the skill's own smoke tests (`tools/smoke_test.py`, `tz_smoke_test.py`, `dignity_smoke_test.py`, `timing_smoke_test.py`) in CI against the vendored rev — cheap upstream regression (STACK.md testing table).
- Fixture coverage ↔ requirement mapping: normal natal (CALC-01), DST ambiguous + nonexistent (BIRTH-03), unknown time (BIRTH-05), high latitude incl. expected-failure (GATE-02 "representative high-latitude behavior", CALC-04 recovery).

### CI wiring

Add a job to `.github/workflows/ci.yml`:

```yaml
  api:
    name: API tests + golden fixtures (pytest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: true }        # vendored astrology-skill
      - uses: astral-sh/setup-uv@v5       # [ASSUMED: action tag — verify at plan time]
        with: { python-version: "3.12", enable-cache: true }
      - run: uv sync --locked             # reproducible from committed uv.lock
        working-directory: api
      - run: uv run pytest -q
        working-directory: api
      - run: uv run python vendor/astrology-skill/tools/smoke_test.py   # upstream regression (from repo root)
```

Notes: GitHub ubuntu runners ship a C toolchain, so the pyswisseph cp312 sdist build succeeds (same as local, §10); the exact setup-uv action version must be pinned at plan time (ASSUMED tag above). No Google key in CI — geocoder paths are unit-tested with recorded fixtures; the fixture suite never calls Google.

## Validation Architecture

> `workflow.nyquist_validation: true` (`.planning/config.json`) — section required.

### Test Framework

| Property | API | Client |
|----------|-----|--------|
| Framework | pytest (uv-run) + httpx TestClient | Vitest 4 + RNTL 14 `/pure` (existing) |
| Config file | `api/pyproject.toml` `[tool.pytest.ini_options]` (Wave 0) | `vitest.config.ts` (existing) |
| Quick run command | `cd api && uv run pytest -q -k "not golden"` | `npx vitest run` |
| Full suite command | `cd api && uv run pytest -q` | `npx vitest run && npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BIRTH-01 | Form accepts/validates birth data | unit (client) | `npx vitest run src/__tests__/birth-form.test.tsx` | ❌ Wave 0 |
| BIRTH-02 | Confirm shows resolved coords/zone/offset | unit (client) + integration (API) | vitest confirm-screen test; `uv run pytest tests/test_places.py -q` | ❌ Wave 0 |
| BIRTH-03 | Ambiguous/nonexistent classification + picker payload | unit (API `civil_time`) + unit (client picker) | `uv run pytest tests/test_civil_time.py -q`; vitest tricky-time-picker | ❌ Wave 0 |
| BIRTH-04 | Four-state confidence control | unit (client) | vitest confidence-control test | ❌ Wave 0 |
| BIRTH-05 | Unknown → supported factors only, no invented time | integration (API+subprocess) | `uv run pytest tests/test_calculate.py -k unknown -q` | ❌ Wave 0 |
| CALC-01 | Chart passes golden fixtures | integration (golden suite) | `uv run pytest tests/test_golden.py -q` | ❌ Wave 0 |
| CALC-02 | Assumptions visible | unit (client, assumptions-line) | vitest | ❌ Wave 0 |
| CALC-03 | Full version provenance recorded | integration (API) | `uv run pytest tests/test_calculate.py -k provenance -q` | ❌ Wave 0 |
| CALC-04 | Typed recoverable errors per failure class | integration (API) | `uv run pytest tests/test_errors.py -q` | ❌ Wave 0 |
| GATE-02 | Fixture suite green in CI | CI | `api` GitHub job | ❌ Wave 0 |

### Sampling Rate (Nyquist analysis)

**Dense sampling (per-commit quick suite):**
- **DST edge dates** — both transition kinds (ambiguous + nonexistent) in ≥2 zones (NY + a half-hour-shift zone like Lord Howe `Australia/Lord_Howe`); plus fold-choice equivalence checks (first/second pass digests). This is the highest-uncertainty dimension in the phase — civil-time errors silently corrupt every downstream calculation.
- **Tricky-time classification unit table** — parametrized `civil_time.classify` over normal/ambiguous/nonexistent × (before/at/after transition) — pure function, thousands of cases cost milliseconds.
- **Calculator exit-code mapping** — exit 0/2/1 + timeout → error_code matrix (mocked/subprocess).
- **Unknown-time omission contract** — absent-key assertions (no `ascendant`/`house` keys at all, not empty), Moon provisional note, no angle aspects.
- **High-latitude pair** — Whole-Sign success digest + Placidus expected-failure at 69.6°N (verified real behavior).
- **Schema gate** — every calculate response passes the vendored chart_input_schema (double validation).

**Medium sampling (per-wave):**
- Full golden suite through the API endpoint; geocoder response parsing per Google status (recorded JSON); provenance field completeness; client render of result list + unavailable cards; disclosure one-time flag lifecycle.

**Sparse sampling (phase gate / manual):**
- Form layout/aesthetics, helper-text copy, accessibility phrasing (visual/UAT via `/gsd-verify-work`); CORS behavior in real simulator; debouncing feel of type-ahead.

### Wave 0 Gaps

- [ ] `api/pyproject.toml` + `uv.lock` + pytest config — framework install (uv project bootstrap)
- [ ] `api/tests/conftest.py` — temp skill-input helper, geocoder stub, TestClient fixture
- [ ] `api/tests/test_civil_time.py` — dense classification table (REQ BIRTH-03)
- [ ] `api/tests/test_calculator_client.py` — exit-code/timeout mapping (REQ CALC-04)
- [ ] `api/tests/fixtures/golden/cases/*` — GATE-02 cases
- [ ] `src/lib/api-schemas.ts` + tests — client-side response contracts
- [ ] Client component tests listed in the test map

*(Client vitest/RNTL infrastructure already exists — no framework install needed there.)*

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ephemeris math, houses, dignities, orbs | Any planet-position code | `birth_to_chart.py` subprocess | The entire point of the domain dependency; hand-rolled math is unverifiable and duplicates AGPL logic |
| DST gap/overlap *detection primitive* | Custom transition tables | PEP 495 fold semantics on `zoneinfo` + `tzdata` (algorithm in §5) | stdlib-correct across all zones incl. historical rules |
| Historical offset for birth instant | Reimplementing tz rules | `zoneinfo` + pinned `tzdata` | Same DB the calculator uses — internal consistency |
| Schema validation | Ad-hoc field checks | calculator `--validate` (Draft 2020-12) + pydantic edge models + zod client parse | Triple gate, each already exists |
| Form state for interdependent fields | Manual useState webs | React Hook Form + zod resolver | Locked-direction stack; edge cases (unknown-time disable, discriminated place union) are RHF bread-and-butter |
| Server-state caching/retries | Hand-rolled fetch wrappers | TanStack Query | STACK.md; error_code plumbing + retry semantics per mutation |
| Timezone list for manual picker | Hard-coded array in client | `zoneinfo.available_timezones()` via `/api/v1/meta/zones` | Never disagrees with server resolution |
| Provenance version capture | Regex-per-request over source_notes only | Startup-read structured envelope (git rev-parse, importlib.metadata, parsed swe.version) + source_notes preserved verbatim | CALC-03 needs machine-readable fields; prose stays for audit |

**Key insight:** every deterministic computation in this phase already exists behind a tested boundary (calculator) or in the stdlib (zoneinfo). The novel code in Phase 2 is *orchestration, classification, error mapping, and UI* — that is where all new tests belong.

## Common Pitfalls

### 1. pyswisseph has no CPython 3.12+ wheels
**What goes wrong:** `pip install pyswisseph` on 3.12/3.13/3.14 builds from sdist; on a machine without a C compiler it fails outright.
**Verified:** PyPI wheels for 2.10.3.2 cover only cp36–cp311. **Local build works:** uv compiled the sdist on macOS arm64/3.12.14 in seconds.
**Avoid:** pin Python 3.12 via uv (`uv python install 3.12`, `requires-python = ">=3.12,<3.13"`), keep `pyswisseph==2.10.3.2` exact-locked, ensure CI runner has build tools (ubuntu-latest does). Never `pip install --user` into system 3.14.

### 2. Machine has no Python 3.12 (and no uv)
**What goes wrong:** D-01 pins 3.12; the host has only Homebrew 3.14.7; uv is not installed.
**Avoid:** bootstrap uv (installer verified, 0.12.5) and let uv fetch standalone CPython 3.12.14 (`uv python install 3.12` — verified 4.9 s). Docker daemon is NOT running (CLI present), so prefer the uvicorn path for D-02 local dev.

### 3. `--tz "-05:00"` argparse trap
**What goes wrong:** passing a negative-offset tz as a separate argv token is parsed as a flag → exit 2 usage error (verified).
**Avoid:** always invoke via `--input` JSON file mode (`"tz": "-05:00"` — verified working); if flags are ever used, `--tz=-05:00` equals-form works.

### 4. Calculator silently resolves DST folds (no detection)
**What goes wrong:** ambiguous/nonexistent wall times are accepted with fold=0 (verified); a chart is computed for a possibly-wrong instant.
**Avoid:** the API resolve step classifies with `civil_time.classify` (§5) *before* calculate; client renders the D-08 picker; calculate translates the choice (first_pass → IANA zone; second_pass/shifted → fixed-offset tz / shifted wall time).

### 5. High-latitude quadrant house systems crash untyped
**What goes wrong:** Placidus at 69.6°N mid-summer exits **1** with a raw `swisseph.Error: swisseph.houses: error` traceback — not a ConfigError/exit 2 (verified).
**Avoid:** wrapper maps exit-1 + `swisseph.houses` in stderr → `CALC_UNSUITABLE_HOUSE_SYSTEM` with "switch to Whole Sign/Equal" hint (C-04 recovery); GATE-02 includes the expected-failure fixture. Winter solstice case fails identically (verified exit 1).

### 6. Google Time Zone API ignores historical zone changes
**What goes wrong:** for a birth decades ago in a zone that was realigned, Google's offsets reflect current rules; trusting rawOffset/dstOffset mis-dates the UT instant (documented caveat, §4).
**Avoid:** use Google for zone *identity* + provenance; compute the birth-instant offset locally via zoneinfo/tzdata; set `drift: true` when they disagree.

### 7. Typed-routes/expo-env.d.ts regeneration (Phase-1 carryover)
**What goes wrong:** adding `/birth`, `/birth/confirm`, `/chart/result` routes then running bare `tsc --noEmit` on a fresh clone fails — generated files are gitignored and only a dev-server boot regenerates them.
**Avoid:** CI already boots a dev server before typecheck (ci.yml `test` job); keep that flow untouched; run `npx expo start` once locally after adding routes.

### 8. Secrets hygiene with the new server (GATE-06)
**What goes wrong:** GOOGLE_API_KEY leaking into client env / EXPO_PUBLIC_* / logs.
**Avoid:** key lives only in `api/.env` (gitignored by the root `.env*` rule); `api/.env.example` committed with non-secret placeholders; geocoding only via server proxy; client never sees the key; server logs redact payloads (retention §1).

### 9. Registry status flip is a governed act
**What goes wrong:** enabling calculation flows without flipping `lemastra-calculation` / `google-geocoding-timezone` from `planned` → `active` (or flipping without checking docs) breaks the disclosure-consistency tests or makes disclosures false.
**Avoid:** flip `status` in `provider-registry.json` in the same plan that wires the flow; registry schema requires inventory+retention to already match (they do — verified §1 strings align).

### 10. uv lock reproducibility in CI
**What goes wrong:** `uv sync` (unpinned) resolves newer transitive deps than local, breaking golden digests.
**Avoid:** commit `uv.lock`; CI uses `uv sync --locked`; dependency promotion (tzdata, pyswisseph, skill rev) is a deliberate reviewed change with digest regeneration.

### 11. Submodule forgotten in clone/CI
**What goes wrong:** fresh clone without `--recurse-submodules` has an empty `vendor/astrology-skill` → cryptic file-not-found at import of the calculator path.
**Avoid:** CI `submodules: true`; api README documents `git submodule update --init`; service fails fast at startup with a clear message when the calculator script is missing.

### 12. Interactive-mode footgun
**What goes wrong:** invoking `birth_to_chart.py` without `--input` and with empty core fields drops into stdin prompts → subprocess hangs until timeout (verified `_looks_bare` → `collect_interactive`).
**Avoid:** wrapper always passes `--input` + redirects stdin from DEVNULL.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Homebrew/system Python for services | uv-managed pinned CPython + `uv.lock` | uv is now the standard Python project tool (STACK.md adopted) | Python 3.12 available on any machine without Homebrew |
| gunicorn-in-tianganolo base image | Plain `python:3.12-slim` + uvicorn | tiangolo image deprecated (STACK.md) | Phase 2 local dev: bare uvicorn; deployment image later |
| react-test-renderer | `test-renderer` peer + RNTL `/pure` under Vitest | Phase 1 (verified) | All new component tests copy the Phase-1 pattern |
| Geocoding API v3 endpoint | v4 is GA; v3 guides still documented | 2025–2026 [CITED: docs page banner] | v3 `maps.googleapis.com/maps/api/geocode/json` still works; stick with v3 shape for Phase 2, note v4 migration exists |

**Deprecated/outdated:** `tiangolo/uvicorn-gunicorn-fastapi` image (STACK.md); `react-test-renderer` (Phase 1); Prisma-on-Expo (early access — n/a this phase).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `astral-sh-setup-uv@v5` is the correct current action tag (not verified in CI this session) | §8 CI wiring | Wrong tag → CI yaml error, trivially fixed at execution |
| A2 | Places-Autocomplete-swap debate — debounced Geocoding satisfies D-05's "type-ahead" intent | §4, Q2 | If product wants true autocomplete UX, provider/registry change needed (deferred, flagged) |
| A3 | Expo Router param-passing (JSON-stringified draft) is adequate for Phase 2 flow state | §7 | If params feel brittle, add Zustand one phase early (STACK-sanctioned) |
| A4 | `importlib.metadata.version("tzdata")` in API process equals the calculator subprocess's tzdata (same venv) | §3 provenance | If ever split venvs, version drift — guard with a provenance test |
| A5 | Simulator loopback defaults (10.0.2.2 Android / localhost iOS) still current for Expo Go on SDK 57 | §3 CORS | Mis-documentation only; runtime probe at execution fixes |
| A6 | GitHub ubuntu-latest runners still ship a C compiler for the pyswisseph sdist build | §8, P1 | If stripped, add `apt-get install build-essential` step — one-line CI fix |

## Open Questions

1. **D-10 vs calculator mechanics — confirm wrapper mapping** *(resolved technically, confirm at planning)*
   - What we know: `--time 12:00 --confidence unknown` ≡ `--noon-for-unknown` except one provenance sentence (verified diff, §6). D-10 says the flag is "deliberately not used."
   - What's unclear: whether D-10's author also dislikes the *explicit* `time: "12:00"` provenance sentence ("Input: … time 12:00").
   - Recommendation: proceed with `--time 12:00 --confidence unknown`; the response's `unavailable_factors` carries the real D-10 semantics (no time-dependent factors presented). If the user prefers "time (none)" provenance, switching to the flag is a one-line change with identical output.
2. **Type-ahead: debounced Geocoding vs Places Autocomplete**
   - What we know: D-05 locked Google Geocoding as the type-ahead backend; Google docs say geocoding isn't an autocomplete service (ambiguous queries weakly supported).
   - Recommendation: debounced candidates (≥3 chars, 300 ms) with manual fallback is adequate for birthplace entry (city-level, not address-level); revisit Autocomplete only if UX testing shows bad candidates.
3. **House-system selector scope on the birth form (D-11)**
   - What we know: selector surfaced in "assumptions/advanced" control; 10 systems verified.
   - Recommendation: advanced collapsible with the 10 verified names; default Whole Sign. No open risk.
4. **Does the disclosure (D-04) need an explicit accept tap or is continue-implies-ack enough?**
   - Recommendation: one "Got it / Calculate" combined CTA on first run (friction-minimal, records an explicit acknowledgement event for the flag). Planner may surface to user in plan review.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | client, existing CI | ✓ | 22.22.3 / 10.9.8 | — |
| CPython 3.12 | api (D-01) | ✗ (3.14.7 only) | — | **uv-managed 3.12.14 — VERIFIED WORKING** (`uv python install 3.12`) |
| uv | api bootstrap | ✗ not installed | — | Official installer — VERIFIED WORKING (0.12.5) |
| pyswisseph 2.10.3.2 | calculator | ✓ (built from sdist in spike venv) | 2.10.3.2 / swe 2.10.03 | — |
| Docker daemon | optional local-dev alternative | ✗ CLI present, daemon stopped | 29.5.3 | uvicorn direct (recommended anyway) |
| GOOGLE_API_KEY | place search + TZ resolution | ✗ not set (needs user's GCP key) | — | Manual-fallback path works without it; geocoder unit tests use recorded fixtures; **human setup required before live UAT** |
| astrology-skill repo | vendoring source | ✓ sibling checkout @ `660d992` (main) | — | submodule pins the same SHA |
| gitleaks / CI | existing gates | ✓ (Phase 1) | 8.30.1 pinned | — |

**Missing dependencies with no fallback:**
- GOOGLE_API_KEY — blocks *live* geocoding flows at UAT (not at implementation; tests use recorded Google responses). Planner should include a `checkpoint:human-verify`/user-setup note: enable Geocoding + Time Zone APIs on a GCP project, key into `api/.env` only.

**Missing dependencies with fallback:**
- Python 3.12 / uv → uv-managed toolchain (verified); Docker daemon → uvicorn.

## Security Domain

> `security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high` (`.planning/config.json`).

### Applicable ASVS Categories (L1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no (Phase 2 = local service, D-02) | None this phase; service binds 127.0.0.1; no user accounts |
| V3 Session Management | no | No sessions; each request self-contained |
| V4 Access Control | yes (perimeter) | CORS allowlist (dev origins only); bind loopback; no auth endpoints exposed beyond LAN-less loopback |
| V5 Input Validation | yes | Pydantic models at API edge (lat/lon bounds, date/time formats, house-system enum mirroring `HOUSE_SYSTEMS`); calculator revalidates (exit 2); zod parses responses client-side |
| V6 Cryptography | no | No crypto this phase (no tokens; key is env-injected) |
| V8 Data Protection | yes | Ephemeral compute-and-discard (retention §1) — request payloads never persisted/logged server-side; charts client-side only (Phase 3 storage is out of scope) |
| V14 Config | yes | `.env*` gitignored (`.env.example` non-secret only); GOOGLE_API_KEY server-side only (GATE-06, secret-isolation-policy.md) |

### Known Threat Patterns for FastAPI-subprocess + geocoder stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret exfiltration via client bundle | Information Disclosure | GOOGLE_API_KEY never in client/EXPO_PUBLIC_*; gitleaks gates already in CI (Phase 1, 3 jobs) extended to api/ files |
| Command injection into subprocess | Tampering / Elevation | Never `shell=True`; argv fully controlled (`--input <tempfile>` + `--validate`); payload reaches the process as JSON file content, not shell text |
| SSRF-ish abuse of geocoder proxy | Abuse | Query is forwarded to a fixed Google endpoint only; rate-limit/debounce client-side; no arbitrary-URL parameters accepted |
| Calculator resource exhaustion (DoS) | DoS | Per-request subprocess + `asyncio.wait_for` timeout (10 s) + kill; request body size caps in uvicorn/FastAPI defaults |
| Birth-data leakage via logs | Information Disclosure | No payload logging; retention §1 redaction rule; subprocess stdout/stderr discarded after error-code extraction |
| Unvalidated response consumption (client) | Tampering | zod parse of every API response before render (parse-then-trust) |

## Sources

### Primary (HIGH confidence)
- `../astrology-skill/tools/birth_to_chart.py` (@ `660d992`) — read in full; **executed** for normal/DST/gap/unknown/high-latitude/bad-tz cases (this session, Python 3.12.14 + pyswisseph 2.10.3.2 + tzdata 2026.3 via uv)
- `../astrology-skill/tools/README.md`, `docs/birth_to_chart_design.md`, `tools/requirements.txt`, `assets/schemas/chart_input_schema.json`, `references/foundations/birth_time_uncertainty.md` — read
- Google Geocoding API request/response + status codes — https://developers.google.com/maps/documentation/geocoding/requests-geocoding (fetched this session)
- Google Time Zone API requests/responses + historical caveat — https://developers.google.com/maps/documentation/timezone/requests-timezone (fetched this session)
- PEP 495 fold semantics — verified empirically (local execution, §5 algorithm + outputs)
- uv 0.12.5 + standalone CPython 3.12.14 + pyswisseph sdist build — verified by local install and execution
- PyPI registry metadata (pyswisseph 2.10.3.2 wheel tags; fastapi 0.141.1; uvicorn 0.52.4; tzdata 2026.3) — queried this session
- npm registry (react-hook-form 7.86.0, @hookform/resolvers 5.9.1, @tanstack/react-query 5.102.3, @react-native-async-storage/async-storage 3.1.1; no postinstall scripts) — queried this session
- LemAstra repo: `.planning/config.json`, `ci.yml`, `package.json`, `vitest.config.ts`, `.env.example`, `src/schemas/provider-registry.ts`, `src/data/provider-registry.json`, `docs/governance/retention-deletion-policy.md` §1, `docs/governance/data-inventory.md` — read

### Secondary (MEDIUM confidence)
- STACK.md recommendations (FastAPI/uv/subprocess contract, TanStack/RHF/Zod) — project research artifact, HIGH within project context

### Tertiary (LOW confidence)
- Simulator loopback defaults (A5); setup-uv action tag (A1); GH runner toolchain (A6) — flagged in Assumptions Log

## Metadata

**Confidence breakdown:**
- Calculator integration contract: HIGH — verified by direct execution against the pinned dependency set
- DST/timezone handling: HIGH — algorithm + material cases executed; Google caveat documented officially
- Geocoding integration: HIGH for shapes/statuses (official docs fetched); MEDIUM for live behavior (no key in session)
- FastAPI skeleton / vendoring: HIGH — mechanical, grounded in verified constraints
- Client screens: HIGH structure / MEDIUM ergonomics (params-based flow state is a recommendation)
- Fixtures/CI: HIGH (behavior verified); two ASSUMED tags on CI action details

**Research date:** 2026-08-25
**Valid until:** 2026-09-24 (stable domain; re-verify npm/PyPI versions and Google docs if execution starts later)




