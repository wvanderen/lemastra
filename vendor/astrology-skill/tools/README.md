# `tools/birth_to_chart.py` — Birth-Data → Chart JSON Pre-Processor

A standalone support script that converts raw birth data into a chart JSON
object conforming to
[`assets/schemas/chart_input_schema.json`](../assets/schemas/chart_input_schema.json).
The output is **geometry + provenance only**; the astrology skill supplies the
doctrine. This tool is a *pre-processor* — it is **not** imported, loaded, or
referenced by `SKILL.md` or `references/`, so the skill stays
calculation-free. See [`docs/birth_to_chart_design.md`](../docs/birth_to_chart_design.md)
for the full design and the boundary rationale.

> **License notice.** This `tools/` directory is **AGPL-3.0** because it uses
> `pyswisseph` (Swiss Ephemeris). Read [`NOTICE.md`](NOTICE.md) before use. The
> AGPL boundary is confined to this directory and does not extend to the skill.

---

## Install

The interpretive skill runtime has no dependencies. This tool is opt-in; install
it into a virtualenv of your own:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt          # runtime: pyswisseph, tzdata
pip install -r tools/requirements-dev.txt      # adds jsonschema for --validate
```

Requirements: Python 3.10+ (uses stdlib `zoneinfo` + the `tzdata`
package for complete, host-independent IANA timezone coverage).

The script also includes inline Python script metadata. If your environment has
`uv`, you can run it from an installed skill bundle without a manual venv:

```bash
uv run tools/birth_to_chart.py --help
```

**No ephemeris data files required.** The script uses the built-in Moshier
ephemeris by default (planets ≈ 0.1″, Moon ≈ 3″ — far inside any natal orb). It
records `ephemeris mode: Moshier (built-in)` in `source_notes`. For maximum
precision, download the `.se1` files once from Astrodienst and pass
`--ephe-path <dir>` (or set `SWISSEPH_PATH`); the mode note switches to
`Swiss Ephemeris .se1`. Never commit `.se1` files into this repo.

---

## Usage

### Non-interactive (flags)

```bash
python tools/birth_to_chart.py \
    --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 \
    --tz "America/New_York" \
    --house-system "Whole Sign" \
    --name "Subject A" --place "Brooklyn, NY" \
    --reading-type natal --tradition-mode blended --tone practical \
    --validate --output chart.json
```

### Timing-type charts (`solar_return` / `annual_profection` / `transit`)

These reading-types compute the matching timing chart **on top of the natal
chart** (the natal chart is always the base). Pass `--target-date` and the
tool derives the rest from Swiss Ephemeris; the output is schema-clean and
feeds `entry_commands.py --route` unchanged.

```bash
# Annual profection: age -> profected house, sign, Lord of the Year
python tools/birth_to_chart.py \
    --date 1992-10-28 --time 22:30 \
    --lat 38.0406 --lon -84.5037 --tz America/New_York \
    --reading-type annual_profection --target-date 2025-10-28 --validate

# Solar return: Sun-return moment + SR chart (cast at the return location)
python tools/birth_to_chart.py \
    --date 1992-10-28 --time 22:30 \
    --lat 38.0406 --lon -84.5037 --tz America/New_York \
    --reading-type solar_return --target-date 2025-10-28 \
    --return-lat 40.7128 --return-lon -74.0060 --return-place "New York, NY" \
    --validate

# Transit: transiting positions (in natal houses) + transit->natal contacts
python tools/birth_to_chart.py \
    --date 1992-10-28 --time 22:30 \
    --lat 38.0406 --lon -84.5037 --tz America/New_York \
    --reading-type transit --target-date 2025-10-28 --target-time 12:00 --validate
```

`solar_return` and `transit` default the target instant to **noon** when
`--target-time` is omitted, and default the target timezone to the birth
`--tz`. `annual_profection` needs only the birth date + `--target-date` (the
age is derived); a timed chart is still required to resolve the profected sign
and Lord of the Year from the natal Ascendant.

### JSON input file

```bash
python tools/birth_to_chart.py --input birth.json --validate --output chart.json
```

`birth.json` is the same keys as the CLI flags:

```json
{
  "date": "1990-05-21",
  "time": "14:32",
  "lat": 40.7128,
  "lon": -74.0060,
  "tz": "America/New_York",
  "house_system": "Whole Sign",
  "name": "Subject A",
  "place": "Brooklyn, NY",
  "reading_type": "natal",
  "approximate": false,
  "validate": true
}
```

### Interactive (no args)

```bash
python tools/birth_to_chart.py
```

Prompts for the required fields. Timezone may be entered as an IANA name or
left blank to use Local Mean Time derived from longitude.

### Output

- Default: JSON printed to **stdout**.
- `--output FILE`: written to a file instead.
- `--validate`: checks the emitted object against
  `assets/schemas/chart_input_schema.json` (requires `jsonschema`); prints
  `VALID: …` to stderr and exits non-zero on failure.

**Exit codes:** `0` success (and `--validate`, if requested, passed); `2`
bad/missing input or validation failure, with a message naming the field.

---

## Inputs

| Field | Required | Notes |
|---|---|---|
| `--date` | yes | ISO `YYYY-MM-DD`. |
| `--time` | see below | `HH:MM` or `HH:MM:SS` (24h). |
| `--lat`, `--lon` | yes | Decimal degrees. `--elevation` (m) enables topocentric Moon. |
| `--tz` | conditional | IANA name (`America/New_York`) **or** fixed offset (`+05:30`). Required unless `--lmt`. See [Timezone resolution](#timezone-resolution) for how zones are looked up and how errors are reported. |
| `--lmt` | optional | Local Mean Time offset derived from `--lon`. |
| `--place`, `--name` | optional | Free-text labels for `source_notes`. **Coordinates are authoritative** — no network geocoding (deterministic/offline). |
| `--house-system` | optional | Default **`Whole Sign`** (robust to birth-time uncertainty). Also: Placidus, Regiomontanus, Koch, Equal, Campanus, Porphyrius, Morinus, Alcabitius, Topocentric. |
| `--reading-type` / `--tradition-mode` / `--tone` | optional | `natal` default. For `solar_return` / `annual_profection` / `transit` the tool computes the matching timing chart (see [Timing-type charts](#timing-type-charts-solar_return--annual_profection--transit)); other values are pass-through. |
| `--user-question` | optional | Querent focus. |
| `--target-date` | conditional | YYYY-MM-DD the reading concerns. **Required** for `solar_return` (sets the return year), `annual_profection` (sets the age), and `transit` (the transit date). |
| `--target-time` / `--target-tz` / `--target-lmt` | optional | Time + timezone for the target instant (`transit`/`solar_return`). Defaults: noon; birth `--tz`; LMT off. |
| `--return-lat` / `--return-lon` / `--return-place` | optional | Solar-return location (location-sensitive). Defaults to birth `--lat`/`--lon`. |
| `--elevation` | optional | Meters; enables parallax-corrected (topocentric) Moon. |
| `--ayanamsa` | optional | `tropical` (default) or a SE sidereal mode (e.g. `Lahiri`). |
| `--ephe-path` / `SWISSEPH_PATH` | optional | Directory of `.se1` files. |
| `--extra-body` | optional | Add `chiron` / `lilith` (repeatable; Chiron needs `.se1`). |
| `--minor-aspects` | optional | Include quincunx (150°) and semisextile (30°). |
| `--no-angle-aspects` | optional | Suppress aspects to Ascendant/Midheaven. |
| `--no-lots` | optional | Suppress the Lot of Fortune. |
| `--verbose` | optional | Include internal planet daily speeds in placements. |

### Confidence flags (see `references/foundations/birth_time_uncertainty.md`)

| Flag / condition | `birth_time_confidence` |
|---|---|
| valid `--time` + `--tz`, no caveat | `Timed` |
| `--approximate`, or "around/about/approx/circa/~" wording in `--place`/`--confidence-notes` | `Approximate` |
| no `--time` (requires `--noon-for-unknown`), or `--confidence unknown` | `Unknown` |
| `--rectified` | `Rectified` |

**The tool never guesses a timezone or a birth time.**

- Missing `--tz` with no `--lmt` is a hard error.
- Missing `--time` with no `--noon-for-unknown` is a hard error. The user
  must *opt in* to a noon-reference chart.

When confidence is **Unknown**, the Ascendant, MC, houses, house cusps, sect,
and angle-based timing are **omitted**; only stable factors (planet signs,
interplanetary aspects, motion) are emitted, and the Moon placement is flagged
provisional (the Moon can move ~13°/day). This matches
`references/foundations/birth_time_uncertainty.md`. When **Approximate**, angles
and houses are still computed but `source_notes` labels them provisional.

### Timezone resolution

`--tz` accepts either an **IANA zone** (`America/New_York`, `Asia/Kolkata`,
`Europe/London`) or a **fixed offset** (`+05:30`, `-04:00`). Lookup is
non-guessing: a missing zone is a hard error.

Resolution order:

1. **System timezone database** (`/usr/share/zoneinfo` on Unix). Some hosts
   ship an incomplete or stale system db (macOS and minimal containers are the
   usual culprits), so a valid IANA zone can be absent here.
2. **`tzdata` package fallback.** stdlib `zoneinfo` automatically consults the
   PyPI [`tzdata`](https://pypi.org/project/tzdata/) package when the system db
   lacks a zone — cross-platform, not Windows-only. `tzdata` is a runtime
   dependency of this tool, so **every real IANA zone resolves identically on
   every host.** (Set `PYTHONTZPATH` to override the system search path.)
3. **Fixed offset** (`+HH:MM[:SS]`) when the token is not an IANA zone.

If a token looks like an IANA name but no such zone exists anywhere (for
example `America/Kentucky/Lexington` — Lexington, KY is served by
`America/New_York` / `America/Kentucky/Louisville`; there is no `Lexington`
zone in the IANA database), the error names it as IANA-shaped and suggests the
valid sibling zones under the same region ("Did you mean …?") plus the
corresponding offset form. This lets you tell a misspelled or imagined zone
apart from a host-tzdb gap. (`--lmt` derives Local Mean Time from `--lon`
instead.)

---

## Output shape

Conforms to `chart_input_schema.json` (top-level `reading_type`,
`tradition_mode`, `tone`, optional `user_question`, and `chart_data`):

- `source_notes` — provenance: pyswisseph/SE version, frame, house system,
  ephemeris mode, topocentric on/off, confidence, and the raw input.
- `birth_time_confidence` — `Timed` / `Approximate` / `Unknown` / `Rectified`.
- `ascendant`, `midheaven` — `{sign, degree, absolute_degree}` (when time known).
- `house_system` and `house_cusps` — array of `{house, sign, degree, absolute_degree}` (when time known).
- `placements` — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus,
  Neptune, Pluto, True Node (+ extras). Each: `body`, `sign`, `degree`,
  `absolute_degree`, `motion` (`direct`/`retrograde`/`stationary`), `house`
  (when known), and **major essential dignity** in `dignity` for the seven
  classical planets — `domicile` / `exaltation` / `detriment` / `fall`,
  derived deterministically from planet+sign (Ptolemy I.17, I.19). The outer
  planets, points, and signs with none of the four get `dignity: []`. `condition`
  and the minor essential dignities (triplicity / term / face) stay **empty /
  interpretive** — they belong to the skill.
- `aspects` — major Ptolemaic aspects (conjunction, opposition, trine, square,
  sextile) between planets **and** to the Asc/MC when known; `orb_degrees`,
  `applying`/`separating` (from daily-speed comparison), and `exact`. Minor
  aspects opt-in.
- `sect` — `{status, luminary_of_sect, sect_mate_planets, notes}`; day iff the
  Sun is above the horizon (when time known).
- `lots` — Lot of Fortune (sect-aware: day = Asc + Moon − Sun; night = Asc + Sun − Moon).

### Timing factors (`solar_return` / `annual_profection` / `transit`)

For these three reading-types the natal chart above is the base; the tool also
emits the matching timing data so the skill never has to derive it:

- `timing_factors` — schema-documented array. One `annual_profection` entry
  (`active_house`, `profected_sign`, `time_lord`, `lord_of_the_year_natal`);
  one `solar_return` summary (`date_time`, `time_lord` = SR chart ruler); one
  `transit` entry per transit→natal contact (`triggering_body`, `natal_body`,
  `aspect`, `orb_degrees`, `applying`/`separating`, `exact`).
- `solar_return` block — `return_year`, `return_moment_utc`, `return_location`,
  SR `ascendant`/`midheaven`/`house_cusps`, `chart_ruler` (domicile ruler of the
  SR Ascendant), SR `sect`, SR `placements`, SR `aspects`, and `natal_contacts`
  (SR planets → natal planets/angles). Computed at the UT where the transiting
  Sun returns to its natal longitude.
- `transit_chart` block — `date_time`, transiting `placements` (each placed in
  its **natal** house), and `natal_contacts` (transit → natal planets/angles).

Profections are whole-sign, counted from the natal Ascendant; the Lord of the
Year is the classical domicile ruler. `solar_return` requires a known birth
time (to anchor the natal Sun); `annual_profection` and `transit` degrade
gracefully on an untimed chart (no Ascendant-dependent factors are invented).

### Default orb table

Per-body max orbs (pair orb = the larger of the two): luminaries 10°, personal
planets (Mercury/Venus/Mars) 7°, Jupiter–Pluto 8°, True Node 5°, angles 8°.
Capped per aspect: sextile 6°, quincunx 3°, semisextile 2°; major aspects use
the pair orb uncapped. An aspect is `exact` when its orb is below 0.05°
(3 arcmin). Stationary is reported when |daily longitude speed| < 0.01°/day.

---

## Calculation vs. interpretation boundary

| Computed here (objective) | Deferred to the skill (interpretive) |
|---|---|
| Planet positions, signs, degrees | Sign/planet *meanings* |
| House cusp geometry, Asc/MC, planet-in-house | House *topic* synthesis |
| Sect day/night status | Sect *weighting* |
| Aspect geometry, orbs, applying/separating | Aspect *interpretation* |
| Lot of Fortune position | Lot *significance* |
| Motion (direct/retrograde) | Accidental strength, **condition** (combustion severity, bonification/maltreatment, reception) |
| **Major essential dignity** (domicile / exaltation / detriment / fall) for the seven classical planets — derived from planet+sign | **Minor essential dignity** (triplicity / term / face) — table- and sect-dependent |
| Solar-return moment, SR chart (Asc/MC/houses/placements/aspects), SR→natal contacts | SR *meaning*, annual-emphasis synthesis |
| Annual profection (profected house/sign, Lord of the Year, Lord's natal placement) | Profection *interpretation*, topic synthesis |
| Transiting positions, transit→natal aspect geometry | Transit *interpretation*, timing-window synthesis |

---

## From chart JSON to a reading

This tool is stage 1 of the wired path. Hand its output to the entry gate to
route it into the skill's retrieval workflow without calculating:

```bash
# File mode: the script wrote chart.json
python3 entry_commands.py --route chart.json

# Pipe mode: script stdout -> entry stdin, no temp file
python3 tools/birth_to_chart.py --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" --validate \
  | python3 entry_commands.py --route -
```

See [`docs/end_to_end.md`](../docs/end_to_end.md) for the full walkthrough
(including external-tool charts and failure-mode messages).

## Render a chart diagram

`tools/chart_diagram.py` turns already-calculated chart JSON into a chart-wheel
diagram. It is dependency-free and only renders supplied geometry: placements,
aspects, angles, and house cusps must already be present in the JSON.

```bash
python3 tools/chart_diagram.py chart.json --output chart.svg
python3 tools/chart_diagram.py chart.json --format html --output chart.html
python3 tools/birth_to_chart.py --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" \
  | python3 tools/chart_diagram.py - --output chart.svg
```

The renderer accepts the canonical `chart_input_schema.json` shape
(`{reading_type, chart_data}`) and the legacy browser-demo shape used by
`docs/chart_diagram_example.html` (`planets`, `houses`, `longitude`). Use
`--format html` for a quick browser preview, `--theme light`, or `--no-aspects`
when a simpler wheel is wanted.

## Smoke test

```bash
python tools/smoke_test.py          # natal Asc/MC vs independent stdlib recomputation
python tests/entry/chart_diagram_test.py  # dependency-free SVG renderer
python tools/timing_smoke_test.py   # solar_return / annual_profection / transit
python tools/tz_smoke_test.py       # IANA zone resolution + tz fallback / error copy
python tools/dignity_smoke_test.py  # major essential dignity (domicile/exalt/detriment/fall)
```

`smoke_test.py` runs three documented birth-data sets (different years, hemispheres, IANA
zones) and checks that the script's Ascendant and MC (via Swiss Ephemeris)
agree to **±0.05°** with an **independent** from-scratch recomputation
(IAU 1982 GMST + IAU 1980 obliquity, stdlib only — no Swiss Ephemeris), and
that each output passes `--validate`. Run with the interpreter that has
`pyswisseph` installed.

`dignity_smoke_test.py` checks that major essential dignity is surfaced
objectively: for the documented 1992-10-28 chart it asserts Mars-in-Cancer =
`fall`, Saturn-in-Aquarius = `domicile`, and Sun-in-Scorpio = `[]`; it also
runs the full table (every classical planet × every sign, reconstructed from
`references/classical_doctrine_notes.md`) and guards that `condition` stays
empty and no minor-dignity tag (triplicity/term/face) leaks into `dignity`.

`tz_smoke_test.py` checks timezone resolution: it forces `PYTHONTZPATH` at an
empty directory (simulating a host with no system tzdb) and confirms real IANA
zones still resolve end-to-end via the `tzdata` package fallback, and that an
IANA-shaped-but-invalid zone (`America/Kentucky/Lexington`) exits 2 with a
message that names the token as IANA-shaped, suggests the valid
`America/Kentucky/*` zones, and mentions `tzdata`.
