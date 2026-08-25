# Design Note: Birth-Data → Chart JSON Pre-Processor

**Task:** `td-af721a` (parent epic `td-9b20e3`)
**Status:** Design (blocks implementation task `td-2e2cd9`)
**Scope:** Decisions for a companion script that turns raw birth data into chart
JSON conforming to `assets/schemas/chart_input_schema.json`, **without**
breaching the skill's no-calculation boundary.

This is a *design note*, not the implementation. It exists to lock decisions
before `td-2e2cd9` writes code.

---

## 1. Boundary: this is a pre-processor, not part of the skill runtime

The interpretive skill (`SKILL.md` + `references/` markdown +
`assets/schemas/*.json` + `quick_validate.py`) is **calculation-free** and must
stay that way. The birth-data script is a separate, opt-in developer tool:

- It runs as its own process and is invoked by a user (or an entry-command
  wrapper) **before** a reading. Its only output is a chart JSON file/stdout
  handed to the skill.
- The skill's interpretive core has **no import, no subprocess call, and no
  code link** to the script. At most, docs may *point* to the script.
- Calculation logic never lives in `references/` or `SKILL.md`.

This boundary is also the legal firewall for the AGPL dependency (see §3):
because the interpretive runtime does not import or link to pyswisseph, AGPL
copyleft is confined to the separate calculator support-script unit.

---

## 2. Library choice: `pyswisseph` (Swiss Ephemeris), used directly

### Decision matrix

| Library | License | Depends on | Fit | Verdict |
|---|---|---|---|---|
| **`pyswisseph`** | AGPL-3.0 | none (zero Python deps) | Full SE API: houses, Asc/MC, `calc_ut`, topocentric, sidereal. Minimal, precise, dependency-light. | **Chosen** |
| `flatlib` | MIT | `pyswisseph==2.08.00-1` (pinned, old) | Traditional subset only; last release 0.2.3 (unmaintained); transitive AGPL via pyswisseph anyway. | Rejected |
| `kerykeion` | AGPL-3.0 | pyswisseph + pydantic + requests-cache + scour + simple-ascii-tables + pytz | Opinionated SVG/geocoding output; heavy network deps; does not map 1:1 to our schema. | Rejected |

### Rationale

- `pyswisseph` is the lowest layer the other two wrap; using it directly gives
  authoritative Swiss Ephemeris accuracy with **zero transitive Python deps**
  and full control over the output mapping to `chart_input_schema.json`.
- Swiss Ephemeris is the de facto reference ephemeris (JPL DE431 based), so a
  "known birth data → expected Asc/MC within tolerance" smoke test (per
  `td-2e2cd9`) can be checked against any independent astro.com chart.
- Confirmed API surface (from the `pyswisseph` 2.10.3.2 sdist): `swe_set_ephe_path`,
  `swe_calc_ut`, `swe_houses`, `swe_julday`, `swe_set_topo`, `swe_set_sid_mode`,
  `swe_close` — everything needed for positions, cusps, Asc/MC, topocentric Moon,
  optional sidereal.

---

## 3. Licensing (explicit notes)

- **Swiss Ephemeris** (the C library) and **`pyswisseph`** are dual-licensed:
  **AGPL-3.0** *or* the paid **Swiss Ephemeris Professional License** from
  Astrodienst (source: `astro.com/swisseph/swephinfo_e.htm`).
- AGPL conditions: anyone who *distributes* the software, or *offers it as a
  network service*, must place **the whole project** under AGPL or a compatible
  license, and must offer source to network users.
- **Containment strategy (default).** The script ships under AGPL-3.0 as its own
  self-contained unit in `tools/` (see §6), invoked as a separate process. The
  skill runtime contains no pyswisseph import and no code link to the script,
  so AGPL does not extend to that MIT runtime.
- **Closed/commercial path (documented alternative).** Users who cannot accept
  AGPL must purchase the Swiss Ephemeris Professional License from Astrodienst
  and then may use pyswisseph under those terms; this is recorded in
  `tools/NOTICE.md` so the choice is explicit, not silent.
- Ephemeris **data files** (`.se1`) are freely redistributable from Astrodienst's
  download area provided copyright/attribution notices are preserved; they are
  **not** bundled in this repo (see §5).

---

## 4. Inputs

| Field | Required | Notes |
|---|---|---|
| `--date` | yes | ISO calendar date `YYYY-MM-DD`. |
| `--time` | no | `HH:MM` (24h), optional `:SS`. Missing ⇒ `birth_time_confidence: Unknown`; do **not** silently default to noon (see §7). Optional explicit `--noon-for-unknown` for users who knowingly want a noon chart. |
| `--lat`, `--lon` | yes | Decimal degrees. Optional `--elevation` (m) enables topocentric Moon. |
| `--tz` | conditional | IANA name (`America/New_York`) **or** fixed offset (`+05:30`, `+05:30:00`). Required unless `--lmt` is given. Conversion via stdlib `zoneinfo` (no `pytz`). |
| `--lmt` | optional | Derive a Local Mean Time offset from longitude (15°/h). Only when explicitly requested; otherwise missing tz is an error, not a guess. |
| `--place` | optional | Free-text label (e.g. "Brooklyn, NY") for `source_notes`. **Coordinates are the source of truth**; no network geocoding (keeps the tool deterministic/offline). |
| `--name` | optional | Subject label; written into `source_notes`. Not a schema field. |
| `--house-system` | optional | Default **`Whole Sign`** (most robust to birth-time uncertainty; classical/traditional default). Accepts Placidus, Regiomontanus, Koch, Equal, Campanus, Porphyrius, Morinus, Alcabitius, Topocentric. |
| `--reading-type`, `--tradition-mode`, `--tone` | optional | Pass-through into the top-level schema fields; defaults match the schema (`natal` / `blended` / `practical`). |
| `--confidence` | optional | `timed` (default) / `approximate` / `rectified` / `unknown`. Also surfaced via flags `--approximate`, `--rectified`. |
| `--ephe-path` / env `SWISSEPH_PATH` | optional | Directory of `.se1` files (see §5). |
| `--ayanamsa` | optional | `tropical` (default) or a SE sidereal mode (e.g. `Lahiri`). |
| `--no-lots` | optional | Suppress Lot of Fortune. |
| `--validate` | optional | Run a JSON-Schema check on the emitted output. |
| `--input` / `--output` | optional | JSON input file for non-interactive use; output file (default: stdout). No-args invocation drops into interactive prompts. |

### Timezone handling summary

1. Compute the birth instant as **Julian Day in UT** — that is what Swiss
   Ephemeris consumes. Wall-clock → UTC uses `zoneinfo` from the `--tz` IANA
   name, or a fixed `--tz` offset, or `--lmt`.
2. The tool **never guesses** a timezone. Missing `--tz` with no `--lmt` is a
   hard error with a clear message — birth-time uncertainty must be explicit,
  matching `references/foundations/birth_time_uncertainty.md`.

---

## 5. Output: chart JSON conforming to `chart_input_schema.json`

Emitted object uses the schema's top-level shape
(`reading_type`, optional `tradition_mode`/`tone`, `chart_data`, plus
`additionalProperties: true` allowing the tool's provenance fields).

### `chart_data` contents

| Field | Produced? | Source / rule |
|---|---|---|
| `source_notes` | always | Provenance string: pyswisseph/SE version, house system, tropical/sidereal + ayanamsa, **ephemeris mode** (Moshier built-in vs `.se1` path), topocentric on/off, subject name/place if supplied, and the input date/time/tz/coords. |
| `birth_time_confidence` | always | `Timed` / `Approximate` / `Unknown` / `Rectified` — the labels defined in `references/foundations/birth_time_uncertainty.md`. Rules in §7. |
| `house_system` | when time known | The system name string. |
| `ascendant`, `midheaven` | when time known | `{sign, degree, absolute_degree}` via `swe_houses`. |
| `placements` | always | Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto, True Node. Each: `body`, `sign`, `degree`, `absolute_degree` (from `swe_calc_ut`), `house` (only when time known, via cusp membership), `motion` (`direct`/`retrograde`/`stationary` from the SE return flags), and **major essential dignity** in `dignity` for the seven classical planets (`domicile`/`exaltation`/`detriment`/`fall`, derived from planet+sign). The minor essential dignities and `condition` are emitted **empty** — those are interpretive and belong to the skill. |
| `house_cusps` (extra prop) | when time known | Array of `{house:1..12, sign, degree, absolute_degree}` from `swe_houses`. Allowed because `chart_data` is `additionalProperties: true`. |
| `aspects` | always | Major Ptolemaic (conjunction, opposition, trine, square, sextile) plus optional semisextile/quincunx, between planets (and to Asc/MC when known). Each carries `orb_degrees`, `applying`/`separating` (from velocity comparison), and `exact`. Orb table is documented and configurable. |
| `lots` | default on | Lot of Fortune: day formula `Asc + Moon − Sun`, night formula `Asc + Sun − Moon` (sect-aware). `{name, sign, degree, absolute_degree, house, formula}`. |
| `sect` | when time known | Object form: `{status: day|night, luminary_of_sect, sect_mate_planets, notes}`. Day if the Sun is above the horizon at birth (altitude > 0). |
| `timing_factors` | timing readings only | For `annual_profection`, emits the activated house/sign and Lord of the Year. For `solar_return`, emits the return moment and return-chart summary. For `transit`, emits transit-to-natal contacts. Omitted or empty for ordinary natal charts. |
| `solar_return` / `transit_chart` (extra props) | timing readings only | `solar_return` carries the computed return chart; `transit_chart` carries transiting placements in natal houses plus natal contacts. Allowed because `chart_data` is `additionalProperties: true`. |

### Calculation vs. interpretation boundary (audit table)

| Computed here (objective) | Deferred to the skill (interpretive) |
|---|---|
| Planet positions, signs, degrees, absolute longitude | Sign/planet *meanings* |
| House cusp geometry, Asc/MC, planet-in-house membership | House *topic* synthesis |
| Sect day/night status | Sect *weighting* on each planet |
| Aspect geometry, orbs, applying/separating | Aspect *interpretation* |
| Lot of Fortune position | Lot *significance* |
| Motion (direct/retrograde) | **Minor** essential **dignity** (triplicity / term / face) and accidental **condition** (cazimi, combust, under the beams, bonification/maltreatment, reception) |
| **Major** essential **dignity** (domicile / exaltation / detriment / fall) for the seven classical planets — derived from planet+sign | |

This is what keeps the script a faithful pre-processor: it emits geometry and
provenance; the skill supplies doctrine.

---

## 6. Location: `tools/` (new top-level directory)

```
tools/
  birth_to_chart.py      # the script (AGPL-3.0)
  README.md              # usage, install, data-file & license notes
  NOTICE.md              # AGPL/professional-license choice + SE attribution
  LICENSE                # AGPL-3.0 full text
  requirements.txt       # pyswisseph>=2.10.3.2
  requirements-dev.txt   # jsonschema (for --validate self-check)
```

**Why `tools/` and not repo-root:** existing conventions are `quick_validate.py`
at root and `tests/forward_testing/` for test harnesses. A dedicated `tools/`
(sibling to `references/`, `assets/`) reads cleanly as "support tooling — not
doctrine, not skill runtime," and gives the AGPL unit its own directory +
license file. Agent Skills examples commonly use `scripts/`, but the important
convention is that bundled helper scripts are referenced by relative path from
the installed skill root; `tools/birth_to_chart.py` is such a bundled support
script.

`SKILL.md` is **not** edited to load or import the script. If it is mentioned
at all, it is a documentation pointer only.

---

## 7. Dependency packaging & Swiss Ephemeris data-file handling

- **Runtime:** Python 3.10+ (uses stdlib `zoneinfo`). Single runtime dependency:
  `pyswisseph>=2.10.3.2`.
- **Dev/validate:** `jsonschema` (only for `--validate`). Optionally a tiny
  bundled fallback validator can keep even that dep optional.
- **Data files — default: none required.** pyswisseph's built-in **Moshier**
  ephemeris yields ~0.1″ planets and ~3″ Moon for 3000 BC–3000 AD with no
  downloads — well inside any realistic natal orb. The script works out of the
  box and records "ephemeris mode: Moshier (built-in)" in `source_notes`.
- **High precision (optional).** Point `--ephe-path` / `SWISSEPH_PATH` at a
  directory of `.se1` files downloaded once from Astrodienst's download area;
  the script calls `swe_set_ephe_path()` and logs "ephemeris mode: Swiss
  Ephemeris .se1 (<path>)". The full set is ~97 MB (DE431, 0.001″ precision).
- **Never commit `.se1` into git** (size + attribution handling). `tools/README.md`
  documents the one-time download command and the required attribution.
- **Topocentric Moon.** When lat/lon (and optional elevation) are supplied, call
  `swe_set_topo()` for parallax-corrected lunar position; note it in
  `source_notes`.
- **Packaging model.** `tools/birth_to_chart.py` and its README/NOTICE/license
  files are bundled so installed agents can resolve the advertised calculator
  path. Dependencies are not vendored; install them from
  `tools/requirements.txt` or use a runner that honors the script metadata.
  The shipped interpretive runtime stays dependency-free and MIT; AGPL is
  confined to the separate `tools/` support-script unit.

### `birth_time_confidence` rules

| Condition | Label |
|---|---|
| Valid `--time` + `--tz`, no caveat flag | `Timed` |
| `--approximate`, or a time clearly rounded to a coarse step, or "around" wording in `--place`/notes | `Approximate` |
| No `--time` (or explicit `--confidence unknown`) | `Unknown` — Asc/MC/houses/sect are **omitted**; only stable factors (planet signs, interplanetary aspects, motion) are emitted, matching `birth_time_uncertainty.md`. |
| `--rectified` | `Rectified` — computed, but `source_notes` flags it as user-supplied, not record-level. |

---

## 8. CLI sketch (drives the implementation task)

```bash
python tools/birth_to_chart.py \
  --date 1990-05-21 --time 14:32 \
  --lat 40.7128 --lon -74.0060 --elevation 10 \
  --tz "America/New_York" \
  --house-system "Whole Sign" \
  --name "Subject A" --place "Brooklyn, NY" \
  --reading-type natal --tradition-mode blended --tone practical \
  --validate --output chart.json
```

- Non-interactive: `--input birth.json` (all the flags as JSON).
- Interactive: no args ⇒ prompt for the required fields.
- Exit codes: `0` success (and passes `--validate`); non-zero on missing/invalid
  input or validation failure, with a message naming the offending field.

---

## 9. Implementation disposition

- The default orb table and supported aspect set are implemented in
  `tools/birth_to_chart.py` and regression-tested by `tools/smoke_test.py` and
  `tools/timing_smoke_test.py`.
- Planet-to-angle aspects are emitted for timed charts when they meet the
  configured aspect rules; untimed charts do not invent angle contacts.
- Default bodies remain the ten planets plus True Node. Additional points such
  as Chiron or Lilith stay out of the default output.
- Smoke fixtures now assert Asc/MC tolerance on three charts plus timing-type
  self-consistency for solar returns, annual profections, and transits.
