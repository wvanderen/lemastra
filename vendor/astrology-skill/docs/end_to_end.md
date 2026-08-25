# End-to-End Path: Birth Data → Reading

**Task:** `td-f1eb5b` (parent epic `td-9b20e3`)
**Scope:** The single wired path from raw birth data to a synthesized reading,
and how each stage hands off to the next. This is a walkthrough, not a design
note — every command below is runnable as written.

The path has four stages (stage 4 optional) and a hard boundary between
stage 1 and stage 2:

```
 raw birth data ──► [1] tools/birth_to_chart.py ──► chart JSON
                          (the ONLY calculator; AGPL-confined, opt-in)
                                                    │
                                  ── no-calculation boundary ──
                                                    │
            chart JSON ──► [2] entry_commands.py --route ──► route ticket
                          (resolve + validate; never computes)
                                                    │
                         route ticket ──► [3] SKILL.md Workflow step 1
                          (retrieval, ranking, synthesis, self-check)
                                                    │
            reading ──► [4] entry_commands.py --report  (OPTIONAL)
             (save / archive / export / deliver → report envelope)
```

Stage 1 **computes** geometry. Stages 2–4 **never compute** — they route,
interpret, and (optionally) package. The skill package an agent loads is
dependency-free and contains no
link to stage 1; `tools/birth_to_chart.py` is a separate-process pre-processor
the user opts into. See `docs/birth_to_chart_design.md` §1 and
`docs/entry_commands.md` §2 for the boundary rationale.

---

## Prerequisites (stage 1 only)

Stage 1 needs `pyswisseph` (and `jsonschema` for `--validate`). Install them in
a virtualenv of your own — the skill itself has no dependencies:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt          # pyswisseph
pip install -r tools/requirements-dev.txt      # jsonschema (for --validate)
```

Stages 2–3 use **only the Python standard library** (system `python3` is fine).

---

## Stage 1 — Birth data → chart JSON

`tools/birth_to_chart.py` converts raw birth data into a chart JSON object that
conforms to [`assets/schemas/chart_input_schema.json`](../assets/schemas/chart_input_schema.json).
The output is **geometry + provenance only** (positions, Asc/MC, houses,
aspects, sect, Lot of Fortune, `source_notes`, `birth_time_confidence`);
`dignity` now carries the four **major essential dignities**
(`domicile` / `exaltation` / `detriment` / `fall`) for the seven classical
planets — a deterministic function of planet+sign (Ptolemy I.17, I.19) — so
the skill's `references/placements/planet_condition/{condition}.md` retrieval
path is live for every computed chart. The minor essential dignities
(triplicity / term / face) and `condition` stay **empty / interpretive** and
belong to the skill.

```bash
python3 tools/birth_to_chart.py \
    --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" \
    --house-system "Whole Sign" --reading-type natal \
    --name "Subject A" --place "Brooklyn, NY" \
    --validate --output chart.json
```

`--validate` checks the emitted object against the schema and prints
`VALID: output conforms to chart_input_schema.json.` to stderr. Exit code is
`0` on success, `2` on bad/missing input or validation failure (the message
names the offending field).

No ephemeris data files are required — the built-in Moshier ephemeris is used
by default; pass `--ephe-path <dir>` for `.se1` precision. See
[`tools/README.md`](../tools/README.md) for every flag.

The tool **never guesses** a timezone or birth time. Missing `--tz` (without
`--lmt`) and missing `--time` (without `--noon-for-unknown`) are hard errors.
When confidence is `Unknown`, angles/houses/sect are omitted and the Moon is
flagged provisional — matching
[`references/foundations/birth_time_uncertainty.md`](../references/foundations/birth_time_uncertainty.md).

### Timing-type charts (`solar_return` / `annual_profection` / `transit`)

These three `reading_type` values are **computed by the tool**, not just
labeled. The natal chart above is still produced as the base; the tool then
derives the matching timing data from Swiss Ephemeris and attaches it to
`chart_data` (`timing_factors`, plus a `solar_return` or `transit_chart`
block). Stage 2 routes the object unchanged. This closes the gap where the
retrieval modules assumed timing data that no in-repo path produced.

```bash
# Annual profection (age derived from birth date + --target-date)
python3 tools/birth_to_chart.py \
    --date 1992-10-28 --time 22:30 \
    --lat 38.0406 --lon -84.5037 --tz America/New_York \
    --reading-type annual_profection --target-date 2025-10-28 --validate

# Solar return (Sun-return moment; cast at the return location, default = birth)
python3 tools/birth_to_chart.py \
    --date 1992-10-28 --time 22:30 \
    --lat 38.0406 --lon -84.5037 --tz America/New_York \
    --reading-type solar_return --target-date 2025-10-28 \
    --return-lat 40.7128 --return-lon -74.0060 --validate

# Transit (transiting positions in natal houses + transit→natal contacts)
python3 tools/birth_to_chart.py \
    --date 1992-10-28 --time 22:30 \
    --lat 38.0406 --lon -84.5037 --tz America/New_York \
    --reading-type transit --target-date 2025-10-28 --target-time 12:00 --validate
```

What you get, in `chart_data`:

- **`annual_profection`** — a `timing_factors` entry with the whole-sign
  `active_house`, `profected_sign`, `time_lord` (classical domicile ruler),
  and the Lord of the Year's natal placement. Profections are whole-sign,
  counted from the natal Ascendant, so a timed chart is required to resolve
  the sign and Lord (an untimed chart reports the house number only).
- **`solar_return`** — the SR `return_moment_utc`, `ascendant`/`midheaven`/
  `house_cusps`, `chart_ruler`, SR `sect`, SR `placements`/`aspects`, and
  `natal_contacts`, plus a `timing_factors` summary. Requires a known birth
  time to anchor the natal Sun.
- **`transit`** — a `transit_chart` block whose transiting `placements` are
  placed in their **natal** houses, with `natal_contacts` (transit → natal
  planets/angles); one `timing_factors` entry per contact. Degrades gracefully
  on an untimed chart (no angular/house contacts are invented).

See [`tools/README.md`](../tools/README.md) §“Timing-type charts” for the
field map and `tools/timing_smoke_test.py` for the asserted fixtures
(age 33 → 10th house → Mars; SR Sun-return self-consistency; transit
Jupiter→Mars orb independently recomputed).

---

## Stage 2 — chart JSON → route ticket

`entry_commands.py --route` is the single entry gate. It **resolves** the chart
object, **validates** it, and prints a route ticket that hands control to
`SKILL.md` Workflow step 1. It performs no calculation.

It accepts the chart in three input modes (all resolve to the same object):

| Mode | Invocation | Use when |
|---|---|---|
| **File path** | `--route chart.json` | The script wrote a file (stage 1 example). Repeat use. |
| **stdin / pipe** | `--route -` (reads stdin) | Piping the script's stdout straight in — one command, no temp file. |
| **Inline JSON** | `--route '{...}'` | Small/ad-hoc charts; matches the prompt-template Mode 1. |

### Mode A — file (stage 1 wrote `chart.json`)

```bash
python3 entry_commands.py --route chart.json
```

### Mode B — pipe (script stdout → entry stdin, no temp file)

```bash
python3 tools/birth_to_chart.py \
    --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" --validate \
  | python3 entry_commands.py --route -
```

### What the route ticket looks like

```
ENTRY ROUTE TICKET
==================
status:               VALID — gate passed (deep: jsonschema)
reading_type:         natal
tradition_mode:       blended
tone:                 practical
retrieval module:     references/reading_types/natal.md (present)
entry fragment:       prompts/entry/natal.md (present)

ROUTE -> Hand the resolved object to SKILL.md -> Workflow step 1
        ("Parse the supplied chart data and reading request").
        Do NOT calculate, rectify, or derive any chart factor.
```

`status` shows which gate ran:

- **`(deep: jsonschema)`** — `jsonschema` is installed; full Draft 2020-12
  validation against `chart_input_schema.json` ran in addition to the
  structural gate.
- **`(deep: unavailable)`** — only the dependency-free structural gate ran
  (requires `reading_type` in the enum and a `chart_data` object). This is the
  documented contract when `jsonschema` is absent; it is not an error. Install
  `jsonschema` (`tools/requirements-dev.txt`) if you want full deep validation
  at the gate.

---

## Stage 3 — route ticket → reading

The route ticket hands the **resolved chart object** to `SKILL.md` → Workflow
step 1 ("Parse the supplied chart data and reading request"). From there
`SKILL.md` owns everything: building the reading plan, selecting the minimum
references, ranking factors, synthesizing, and the reading self-check. The
prompt templates under [`prompts/entry/`](../prompts/entry/) frame per-type
requests (e.g. horary asks for the querent's question; electional lists
candidate start charts); they add no calculation.

If you are invoking through a host that supports the skill's prompt surface,
the canonical template [`prompts/entry/_reading.md`](../prompts/entry/_reading.md)
performs the same resolve → validate → route in prompt form.

---

## Stage 4 — reading → report (optional)

Stage 4 is **optional**. Not every chat answer becomes a report — produce one
only when the host or user asks to **save, archive, export, or deliver** the
reading as an artefact. The producer is `SKILL.md`'s synthesis step (Workflow
step 9); it wraps the reading in the standardized envelope defined by
[`assets/schemas/report_schema.json`](../assets/schemas/report_schema.json).
The contract carries the client, the reading type, the **date of reading**
(`generated_at`), and the JSON chart artefact(s) the reading was built from.
See [`docs/report_format.md`](report_format.md) for the field map and
[`references/templates/report_template.md`](../references/templates/report_template.md)
for the Markdown rendering.

Once a report envelope exists, gate it with `entry_commands.py --report` — the
output-side twin of `--route`. It resolves the report, validates it against
`report_schema.json`, and holds every embedded `chart_input` artefact to the
**same gate as Stage 2** (so a report cannot silently wrap a chart that
`--route` would reject). It performs no calculation.

```bash
python3 entry_commands.py --report report.json
```

`--report` accepts the same three input modes as `--route` (file path, inline
JSON, or `-` for stdin), so a generated report can be piped straight in:

```bash
# (report generation is owned by the SKILL.md workflow; this shows the gate)
python3 entry_commands.py --report -
```

### What the report ticket looks like

```
REPORT TICKET
=============
status:               VALID — gate passed (deep: jsonschema)
report_id:            natal-subject-a-20260620
schema_version:       1.0
generated_at:         2026-06-20T14:30:00-04:00 (America/New_York)
client:               Subject A
reading_type:         natal
tradition_mode:       blended
tone:                 practical
chart_artefacts:      2 total
  - [1] chart_input      embedded (chart_input gate: passed)
  - [2] reading_plan     ref: plans/plan-1.json (assets/schemas/reading_plan_schema.json)
self_check:           present (5 item(s))
references_used:      3

REPORT -> The envelope conforms to report_schema.json. Render to Markdown with
        references/templates/report_template.md, or deliver the JSON as-is.
        The report contains no derived chart factors (no-calculation boundary).
```

`status` shows which gate ran, mirroring Stage 2:

- **`(deep: jsonschema)`** — full Draft 2020-12 validation against
  `report_schema.json` ran, **and** each embedded `chart_input` was deep-
  validated against `chart_input_schema.json`.
- **`(deep: unavailable)`** — only the dependency-free structural gate ran for
  both the envelope and the nested chart(s). This is the documented contract
  when `jsonschema` is absent; it is not an error.

Report-gate failure modes mirror Stage 2's: every failure exits `2`, prints a
`FAIL:` line, and appends a pointer to `report_schema.json`. A nested
`chart_input` failure names the chart-input gate and the underlying problem
(e.g. `missing required field: chart_data`), so the report and the chart it
wraps are debuggable from one message.

---

## External chart tools (not just the bundled script)

Stage 2 accepts **any** chart JSON that conforms to
`chart_input_schema.json`, not only the bundled script's output. The schema is
`additionalProperties: true` at the root, in `chart_data`, and inside every
factor, so external tools may include extra fields. The only hard requirements
are:

- `reading_type` — one of the enum values in
  `chart_input_schema.json` → `properties.reading_type.enum`
  (`natal`, `transit`, `synastry`, `solar_return`, `annual_profection`,
  `horary`, `electional`).
- `chart_data` — an object.

Example: a hand-typed or externally-generated natal chart routes fine:

```bash
python3 entry_commands.py --route '{
  "reading_type": "natal",
  "tradition_mode": "classical",
  "tone": "technical",
  "user_question": "What is the vocation pattern?",
  "chart_data": {
    "source_notes": "External astrology program.",
    "house_system": "Whole Sign",
    "ascendant": {"sign": "Virgo", "degree": 18.4},
    "placements": [
      {"body": "Mercury", "sign": "Gemini", "degree": 15.7, "house": 10,
       "dignity": ["domicile"], "rules_houses": [1, 10]}
    ]
  }
}'
```

`tests/entry/sample_synastry.json` shows a richer external-tool-style chart
(nested `person_a` / `person_b` blocks plus inter-chart aspects) — it passes
the gate unchanged.

---

## Failure modes

Every chart-input failure exits `2` and prints a `FAIL:` line that **points at
the schema**, so the user always knows the authoritative shape. Deep-validation
failures (when `jsonschema` is present) print one concise line with the JSON
path instead of a multi-page schema dump.

| Problem | Message (illustrative) |
|---|---|
| Invalid JSON | `could not parse JSON from <inline>: ... See assets/schemas/chart_input_schema.json for the required shape.` |
| Missing `reading_type` | `missing required field: reading_type See assets/schemas/chart_input_schema.json for the required shape.` |
| Unknown `reading_type` | `reading_type 'banana' is not in the schema enum (allowed: ...) See assets/schemas/chart_input_schema.json for the required shape.` |
| Missing `chart_data` | `missing required field: chart_data See assets/schemas/chart_input_schema.json for the required shape.` |
| Wrong type for `chart_data` | `chart_data must be an object, got list See assets/schemas/chart_input_schema.json for the required shape.` |
| Deep failure (jsonschema) | `chart input failed schema validation at $.chart_data.placements[0]: 'body' is a required property See assets/schemas/chart_input_schema.json for the required shape.` |

The entry **never infers, defaults, or fills in** missing fields. If a field is
required for the requested reading but absent from `chart_data`, that is
handled later by `SKILL.md`'s incomplete-data rule (interpret only the factors
provided; ask for the rest, or narrow the reading and label it provisional).

---

## Acceptance-criteria mapping

| Criterion (`td-f1eb5b`) | Where |
|---|---|
| End-to-end path works: birth data → script → chart JSON → entry → workflow | Stage 1 → Stage 2 → Stage 3 above; asserted by `tests/entry/end_to_end_test.py` (real script run, file + pipe modes). |
| Documented example of the full path | This document (Modes A and B). |
| Entry gracefully handles script output **and** external-tool charts | "External chart tools" section; `additionalProperties: true`; tested for both sources. |
| Failure modes surface a clear message pointing to the schema | "Failure modes" table; every gate error appends the schema pointer. |

| Criterion (`td-8ddeaa`) | Where |
|---|---|
| Report path works: reading → report envelope → report gate | Stage 4 above; asserted by `tests/entry/report_test.py` (valid report + failure modes + nested chart-input rejection). |
| Report gate holds embedded charts to the same standard as `--route` | Stage 4 "What the report ticket looks like"; `validate_report` reuses `validate_chart` for each `chart_input` artefact. |
| Report generation is folded into the end-to-end walkthrough | This document (Stage 4 + updated diagram). |
