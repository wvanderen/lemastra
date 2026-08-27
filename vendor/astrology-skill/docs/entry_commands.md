# Design Note: Entry-Command Surface

**Task:** `td-78486e` (parent epic `td-9b20e3`)
**Status:** Implemented
**Scope:** Decide and document how users invoke each skill function through
explicit entry commands that route **pre-calculated** chart data into the
`SKILL.md` retrieval workflow.

This began as a design note for `td-13e366`; it now documents the implemented
entry surface, prompt templates, listing helper, and `agents/openai.yaml`
metadata.

---

## 1. Goals and non-goals

### Goals

- One explicit, documented way to invoke every supported reading type.
- A birth-data entry utility path that bridges `tools/birth_to_chart.py` to a
  reading.
- A surface that is **enum-driven** off
  `assets/schemas/chart_input_schema.json`: adding a `reading_type` to the
  schema enum requires **zero** changes to the command surface.
- A help/listing command that enumerates available functions from the schema.
- Metadata in `agents/openai.yaml` that declares the surface to the harness.

### Non-goals

- Calculating charts. Entry commands **route** pre-calculated data; they never
  compute positions, houses, aspects, dignities, sect, lots, or timing.
- Replacing `SKILL.md`. The entry surface only resolves and validates a chart
  object and hands it to the existing retrieval workflow at step 1.
- Introducing astrological doctrine. This note adds no interpretive content.
- Building a host-application command palette. The surface is prompt-template
  based (see §4); it does not assume a slash-command UI.

---

## 2. The no-calculation boundary (preserved)

The skill's interpretive core (`SKILL.md` + `references/` + `assets/schemas/`
+ `quick_validate.py`) is and stays **calculation-free**. Entry commands must
not breach that boundary. Concretely:

- Entry commands **resolve** a chart object (from inline JSON, a file, or the
  birth-data utility's stdout), **validate** it against
  `assets/schemas/chart_input_schema.json`, and **hand it** to `SKILL.md`.
- They **never** compute. The only calculation in this ecosystem lives in
  `tools/birth_to_chart.py`, which is a separate-process, opt-in, AGPL-confined
  pre-processor (see `docs/birth_to_chart_design.md`). Entry commands may
  *point to* that script as an input source; they do not import, load, or call
  it from the skill runtime.
- Calculation logic never lives in `references/`, `SKILL.md`, or a prompt
  template.

| Computed upstream (objective) — out of scope here | Routed by the entry surface (interpretive input) |
|---|---|
| Planet positions, Asc/MC, houses, aspects, lots, sect status (via `tools/birth_to_chart.py` or any external tool) | The full `chart_input_schema.json` object, passed unchanged into `SKILL.md` |

This mirrors the boundary table in `docs/birth_to_chart_design.md` §5.

---

## 3. Functions exposed

Every supported `reading_type` in the schema enum is a function. The list is
**not** hardcoded in the surface; it is derived from
`assets/schemas/chart_input_schema.json` → `properties.reading_type.enum`. The
table below is descriptive only and reflects the current enum.

| Function (`reading_type`) | Retrieval module loaded by `SKILL.md` | Optional entry fragment (`prompts/entry/{type}.md`) | Chart-data emphasis for this type |
|---|---|---|---|
| `natal` | `references/reading_types/natal.md` | `prompts/entry/natal.md` | Ascendant, ascendant ruler, angular planets, Sun/Moon condition, sect. |
| `transit` | `references/reading_types/transit.md` (+ `transit_examples.md` when triggered) | `prompts/entry/transit.md` | `chart_data.timing_factors[]` with `technique: transit`; natal baseline. |
| `synastry` | `references/reading_types/synastry.md` (+ `synastry_examples.md` when triggered) | `prompts/entry/synastry.md` | Two charts (subject + partner); relationship context in `user_question`. |
| `solar_return` | `references/reading_types/solar_return.md` | `prompts/entry/solar_return.md` | Return chart + natal chart; return-year focus. |
| `annual_profection` | `references/reading_types/annual_profection.md` | `prompts/entry/annual_profection.md` | Activated house, Lord of the Year, age/profection `timing_factors`. |
| `horary` | `references/reading_types/horary.md` | `prompts/entry/horary.md` | Querent's question, significators, radicality data; `user_question` is primary. |
| `electional` | `references/reading_types/electional.md` | `prompts/entry/electional.md` | Two or more candidate start charts + the goal in `user_question`. |
| `mundane` | `references/reading_types/mundane.md` (+ `mundane_examples.md` when triggered) | `prompts/entry/mundane.md` | Collective/political/market ingress, lunation, or great-conjunction chart; scope guardrails apply. |

**Birth-data entry utility.** Not a reading type; an *input* function. Exposed
as `tools/birth_to_chart.py` (already implemented). Its output is a
schema-conforming chart object, consumed by Mode 3 below. See
`docs/birth_to_chart_design.md`.

**Enum-driven guarantee.** When a future reading type is added to the schema
enum, the entry surface picks it up automatically: `--list` enumerates it, the
canonical generic template (§7) routes it, and an exact per-type fragment can
be added for UX framing without rewriting the command surface. `mundane` is
the landed example of this path.

**Output-side companion: `--report`.** The same surface gates *output*
artefacts. `python3 entry_commands.py --report <report-or-path-or-->`
validates a reading report against `assets/schemas/report_schema.json` and
re-runs the chart-input gate on every embedded `chart_input` artefact, so a
delivered report cannot silently wrap a chart that `--route` would reject. The
report standard is documented in `docs/report_format.md`; the end-to-end path
(reading → report) is Stage 4 of `docs/end_to_end.md`. `--check` also asserts
parity between the report-schema enums and the chart-input enums.

---

## 4. Command mechanism: prompt templates (chosen)

### Decision

**Primary mechanism: prompt templates**, declared in `agents/openai.yaml` and
authored as files under `prompts/entry/`. **Secondary: the existing
`tools/birth_to_chart.py` wrapper** for the birth-data *input* side. A small
dependency-free **listing helper** provides the help/listing command (§8).

### Why prompt templates (justified against `agents/openai.yaml`)

The repo's own contract establishes the prompt as the native invocation unit:

- `agents/openai.yaml` exposes `interface.default_prompt`, and that prompt
  invokes the skill via the `$astrology-skill` token. Invocation is therefore
  *a prompt carrying a chart object* — exactly what
  `tests/forward_testing/structured_reading_prompts.md` exercises today.
- `quick_validate.py` locks `SKILL.md` frontmatter to `{name, description}`
  only. There is no place — and no validator — for a command registry in
  `SKILL.md`.
- `agents/openai.yaml` is validated only for YAML well-formedness (see the
  Phase 5 validation snippet in `ROADMAP.md`), so additive keys under
  `interface:` are a safe, non-breaking place to *declare* the surface.

A prompt template is the lowest-friction artifact that preserves the
no-calculation boundary: it resolves, validates, and routes pre-calculated
data. It composes naturally with the birth-data utility's stdout.

### Why not slash commands

There is **no slash-command registry** in this skill's contract — no field in
`SKILL.md` frontmatter, no key in `agents/openai.yaml`, and no validator that
recognizes one. Inventing a registry would be speculative and unverifiable
against the harness as it exists. Slash commands also imply a host-application
feature (a chat/UI command palette) that this repo does not target.

*Forward compatibility:* if a future harness version adds a slash-command
registry, each prompt template maps cleanly onto one slash command (template
body = command body). The design therefore does not preclude slash commands;
it simply does not depend on them.

### Why not a wrapper script as the primary mechanism

A wrapper that orchestrates the reading would have to either (a) live in the
skill runtime — breaching the no-calculation boundary and the AGPL firewall —
or (b) live in `tools/` as a separate process, which is precisely what
`tools/birth_to_chart.py` already is, scoped to the one step that genuinely
needs computation (birth data → chart JSON). The reading itself is a
prompt-retrieval workflow, not a CLI process; wrapping it in a script would
misrepresent the skill's nature. Wrappers belong only where there is
computation, and that wrapper is already built.

---

## 5. Enum-driven surface (single source of truth)

The schema enum is the **only** list of reading types. The surface is built so
that no per-type command is ever hand-written:

1. **One canonical, generic entry template** (`prompts/entry/_reading.md`, §7)
   parameterized by `reading_type`. It validates `reading_type` against the
   schema enum and routes generically into `SKILL.md`.
2. **Optional per-type fragments** (`prompts/entry/{reading_type}.md`). The
   generic template *appends* a fragment when one exists and proceeds
   generically when one does not — mirroring `SKILL.md`'s existing
   "Load `references/reading_types/{reading_type}.md` when it exists" rule.
3. **Listing/parity helper** (§8) reads the enum from the schema at runtime, so
   `--list` and validation never carry a second, drift-prone copy of the list.

Adding a reading type therefore requires, at most: (a) add the value to the
schema enum, (b) optionally add `references/reading_types/{type}.md` and
`prompts/entry/{type}.md`. The command surface is untouched. A type with no
fragment and no reference module is still invocable; `SKILL.md` already
defines the "exact module missing → broader fallback → name it in the reading
plan" behavior.

---

## 6. Input modes

Every entry command accepts chart data in any of three modes. All three resolve
to the **same** in-memory object shaped by `chart_input_schema.json`; routing
is identical. The template (§7) is input-mode-agnostic.

| Mode | What the user provides | How it resolves | When to use |
|---|---|---|---|
| **1. Inline JSON** | The chart object pasted into the prompt body | Parsed directly | Default; matches existing fixtures and `default_prompt`. Best for small/ad-hoc charts. |
| **2. File path** | A path to a JSON file conforming to the schema | The skill loads the file at the path | Large charts, charts generated upstream, repeat use. |
| **3. Birth-data script output** | The stdout of `tools/birth_to_chart.py` | The entry consumes the pre-processor's stdout (piped or via `--output`) | Bridging raw birth data to a reading. The script is the only calculator; the entry does not compute. |

**Single gate.** Whatever the mode, the resolved object must conform to
`chart_input_schema.json` (required: `reading_type`, `chart_data`). If it does
not, the entry stops and asks for the missing/invalid fields — it never infers
them. This is the same incomplete-data rule `SKILL.md` already enforces.

**Composition example (Mode 3).**

```bash
python3 tools/birth_to_chart.py \
    --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" \
    --house-system "Whole Sign" --reading-type natal --validate \
  > chart.json
# then invoke the natal entry command with chart.json (Mode 2),
# or pipe the object inline into the prompt (Mode 1/3).
```

The `--validate` flag on the pre-processor and the schema gate on the entry
together guarantee the object is well-formed before `SKILL.md` sees it.

For the full runnable walkthrough — including the piped one-liner, the
file mode, external-tool charts, and the failure-mode messages — see
[`docs/end_to_end.md`](end_to_end.md).

---

## 7. Canonical entry prompt template

`td-13e366` will create `prompts/entry/_reading.md` with essentially this body.
It is generic, enum-driven, and calculation-free:

````markdown
# Astrology reading request — entry

You are invoking the `astrology-skill`. Route the supplied **pre-calculated**
chart data into the `SKILL.md` retrieval workflow. Do **not** calculate,
rectify, or derive any chart factor — use only what is supplied.

## 1. Resolve the chart input

Accept the chart in any of these forms and resolve it to one object:

1. **Inline JSON** in the fenced block below.
2. **File path** to a JSON file conforming to
   `assets/schemas/chart_input_schema.json`.
3. **Birth-data script output** — the stdout of `tools/birth_to_chart.py`
   (already schema-conforming).

## 2. Validate (single gate)

The resolved object MUST conform to `assets/schemas/chart_input_schema.json`:

- `reading_type` MUST be one of the values in
  `assets/schemas/chart_input_schema.json` → `properties.reading_type.enum`.
- `chart_data` MUST be present.

If validation fails, stop and ask for the specific missing or invalid fields.
Do **not** infer, default, or fill them in.

## 3. Route

Hand the resolved object to **`SKILL.md` → Workflow step 1** ("Parse the
supplied chart data and reading request"). `SKILL.md` owns all retrieval,
factor ranking, synthesis, scope, and self-check behavior. This entry does not
duplicate any of it.

## 4. Optional per-type guidance

If `prompts/entry/{reading_type}.md` exists, append its framing to this
request. If it does not exist, proceed with the generic route (this is not an
error).

--- BEGIN CHART INPUT ---
{chart_input_or_path_or_script_output}
--- END CHART INPUT ---
````

Placeholders (`{reading_type}`, `{chart_input_or_path_or_script_output}`) are
filled by the caller or the host; the template itself contains no logic beyond
resolve → validate → route. Per-type fragments (e.g.
`prompts/entry/horary.md`) may add framing such as "state the querent's
question and significators"; they never add calculation.

---

## 8. Help / listing command

`td-13e366` AC requires a command that enumerates available functions. It is
**enum-driven**: the helper reads `properties.reading_type.enum` from
`assets/schemas/chart_input_schema.json` at runtime — it carries no hardcoded
list.

**Recommended implementation:** a small, dependency-free script
`entry_commands.py` at the repository root (sibling of `quick_validate.py`),
with two modes:

- `python3 entry_commands.py --list` — print each enum value, the matching
  retrieval module path (if present), and whether an entry fragment exists.
- `python3 entry_commands.py --check` — assert parity: every enum value has a
  route (generic template always covers this), and flag (informationally, not
  as a hard failure) enum values lacking `references/reading_types/{type}.md`.
  This parity check should also be callable from / folded into
  `quick_validate.py` so the existing validation command catches enum drift.

**Location note.** Root (next to `quick_validate.py`) is recommended because
listing/parity is part of the skill's *structural* surface, not opt-in
tooling. The exact file name and whether `--check` merges into
`quick_validate.py` is the implementer's call; the contract is "enum-driven,
no second copy of the list, no calculation."

**Sample `--list` output:**

```
Astrology skill — entry functions (from assets/schemas/chart_input_schema.json → properties.reading_type.enum)
  natal              -> references/reading_types/natal.md  [fragment: yes]
  transit            -> references/reading_types/transit.md  [fragment: yes]
  synastry           -> references/reading_types/synastry.md  [fragment: yes]
  solar_return       -> references/reading_types/solar_return.md  [fragment: yes]
  annual_profection  -> references/reading_types/annual_profection.md  [fragment: yes]
  horary             -> references/reading_types/horary.md  [fragment: yes]
  electional         -> references/reading_types/electional.md  [fragment: yes]
  mundane            -> references/reading_types/mundane.md  [fragment: yes]
Birth-data entry utility: tools/birth_to_chart.py (pre-processor; separate process, not imported by the skill runtime)
```

---

## 9. Metadata changes to `agents/openai.yaml`

The current file is:

```yaml
interface:
  display_name: "Astrology Reading"
  short_description: "Retrieval-first astrology reading workflow"
  default_prompt: "Use $astrology-skill to interpret supplied astrology data. If only raw birth data is supplied and the optional birth-data utility is available, preprocess it to chart JSON first; otherwise ask for calculated chart data."
```

Add an additive `entry_commands` block under `interface:` (existing keys
unchanged; the file still parses as plain YAML, so the Phase 5 validation
snippet in `ROADMAP.md` keeps passing):

```yaml
interface:
  display_name: "Astrology Reading"
  short_description: "Retrieval-first astrology reading workflow"
  default_prompt: "Use $astrology-skill to interpret supplied astrology data. If only raw birth data is supplied and the optional birth-data utility is available, preprocess it to chart JSON first; otherwise ask for calculated chart data."
  entry_commands:
    spec: docs/entry_commands.md
    enum_source: assets/schemas/chart_input_schema.json#/properties/reading_type/enum
    canonical_template: prompts/entry/_reading.md
    fragments_dir: prompts/entry
    input_modes:
      - inline_json
      - file_path
      - birth_data_script_stdout
    birth_data_utility:
      script: tools/birth_to_chart.py
      design: docs/birth_to_chart_design.md
      boundary: separate-process, opt-in, AGPL-confined; not imported by the skill runtime
    listing:
      command: python3 entry_commands.py --list
      check: python3 entry_commands.py --check
      route: python3 entry_commands.py --route <chart-or-path-or-->
      report: python3 entry_commands.py --report <report-or-path-or-->
      description: Enumerate reading types; assert parity (enum/fragments/report enums); gate a chart into the workflow (--route); gate a report envelope and its embedded chart artefacts (--report).
    end_to_end: docs/end_to_end.md
    no_calculation: true
  output:
    report_schema: assets/schemas/report_schema.json
    report_template: references/templates/report_template.md
    report_format_doc: docs/report_format.md
    description: When the host or user asks to save, archive, export, or deliver a reading, wrap it in the standardized report envelope (client, reading type, date of reading, JSON chart artefacts). Quick chat answers need no envelope.
```

Rationale for each key:

- `spec` — points to this document (single source of truth for the surface).
- `enum_source` — a JSON Pointer to the authoritative reading-type list.
- `canonical_template` / `fragments_dir` — where the prompt templates live.
- `input_modes` — the three accepted input forms (§6), machine-readable.
- `birth_data_utility` — declares the pre-processor and its boundary, so the
  harness (and auditors) can see that calculation is firewalled outside the
  skill runtime.
- `listing` — the help/listing command and the parity check.
- `no_calculation: true` — explicit reaffirmation of the boundary in metadata.

If a future harness version ignores unknown keys, the templates, the listing
helper, and this spec still constitute the canonical surface, so the design
degrades gracefully.

---

## 10. File layout

```
prompts/
  entry/
    _reading.md            # canonical generic template (§7)
    natal.md               # optional per-type fragment
    transit.md
    synastry.md
    solar_return.md
    annual_profection.md
    horary.md
    electional.md
    mundane.md
entry_commands.py          # --list / --check (§8), dependency-free, root
agents/openai.yaml         # + interface.entry_commands block (§9)
docs/entry_commands.md     # this spec (already exists)
```

`SKILL.md` does **not** load or import any of these at runtime. The entry
surface hands control to `SKILL.md` step 1 unchanged.

---

## 11. Acceptance-criteria mapping

| Acceptance criterion (from `td-78486e`) | Where addressed |
|---|---|
| Enumerate the functions (natal, transit, synastry, solar_return, annual_profection, horary, electional, mundane) + birth-data utility | §3 (functions table); §8 (`--list`) |
| Decide the command mechanism and justify against `agents/openai.yaml` | §4 (prompt templates chosen; rejects slash commands + wrapper-as-primary, with evidence) |
| Specify how each command accepts chart data (inline JSON, file path, script output) and routes to `reading_type` | §6 (input modes); §7 (template route) |
| Enum-driven off `chart_input_schema.json`; new types picked up without rewriting commands | §5 (single source of truth); §3 (enum-driven guarantee) |
| Produce a spec describing the surface and metadata changes | This document; §9 (`agents/openai.yaml` block) |
| Preserve the no-calculation boundary | §2 (boundary table); §4 (why-not-wrapper); §9 (`no_calculation: true`, `birth_data_utility.boundary`) |

Implementation-task (`td-13e366`) acceptance is covered by the file layout
(§10), the template (§7), the listing helper (§8), and the metadata block (§9).

---

## 12. Implementation disposition

- Per-type fragments exist for all eight current reading types. Each adds
  framing only and never calculation.
- `entry_commands.py` remains the standalone dependency-free helper for
  `--list`, `--check`, `--route`, and `--report`; `quick_validate.py` keeps a
  folded parity check for quick local validation.
- Host-filled placeholders and user-pasted fenced JSON are both supported by
  Mode 1; the templates remain host-agnostic.
- The concrete smoke and parity coverage lives in
  `tests/entry/smoke_test.py`, `tests/entry/end_to_end_test.py`, and the
  top-level `python3 tests/run_validation_matrix.py`.
