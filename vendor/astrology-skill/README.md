# Astrology Skill

A retrieval-first astrology **interpretation** skill. It synthesizes a reading
from chart data — placements, houses, aspects, dignities, sect, rulerships,
transits, synastry factors, lots, and timing factors. Preferred input is chart
data that has already been calculated, but the repository also includes an
opt-in raw-birth-data → chart JSON calculator for hosts that can run it.

The interpretive skill runtime is **dependency-free** (Python standard library
only). The bundled birth-data → chart calculator is an **opt-in,
separate-process** support script that is never imported by the skill runtime.
The reading workflow consumes its output; it does not freehand-calculate or
invent missing chart factors.

> **Skill doctrine lives in [`SKILL.md`](SKILL.md).** That file defines the
> input contract, the retrieval workflow, the weighting hierarchy, the output
> guardrails, and the reading self-check. This README is the operational guide.

---

## What it does

- **Interprets** structured chart JSON into a synthesized reading
  (natal, transit, synastry, solar return, annual profection, horary,
  electional, mundane).
- **Routes** chart JSON through a single validation gate into the retrieval
  workflow described in `SKILL.md`.
- **Renders** already-calculated chart JSON as an SVG or standalone HTML chart
  wheel with [`tools/chart_diagram.py`](tools/chart_diagram.py).
- **Loads only the relevant references** (137 interpretive modules under
  [`references/`](references)) rather than free-associating from general
  knowledge.

The hard rule is the **no-calculation boundary**: stage 1 *computes* geometry;
stages 2–3 only *route* and *interpret*. See
[`docs/end_to_end.md`](docs/end_to_end.md) for the full walkthrough.

```
 raw birth data ──► [1] tools/birth_to_chart.py ──► chart JSON   (computes; AGPL, opt-in)
                                                     │
                                  ── no-calculation boundary ──
                                                     │
            chart JSON ──► [2] entry_commands.py --route ──► route ticket   (validates; never computes)
                                                     │
                         route ticket ──► [3] SKILL.md Workflow step 1   (retrieve, rank, synthesize, self-check)
```

---

## Requirements

- **Python 3.10+** (stage 1 uses stdlib `zoneinfo`).
- **No dependencies** for the skill itself, the entry gate, or `SKILL.md` —
  system `python3` is sufficient.
- **Optional** (stage 1 calculator only): `pyswisseph`, plus `jsonschema` if
  you want deep validation. These live in a virtualenv you create (see below).

---

## Installation

### 1. Get the skill

```bash
git clone <this-repo-url> astrology-skill
cd astrology-skill
```

The skill is now usable. An agent host loads `SKILL.md` and the
[`agents/openai.yaml`](agents/openai.yaml) interface metadata; the retrieval
workflow and all references are plain Markdown.

### 2. (Optional) Set up the birth-data calculator

Only needed if you want to generate chart JSON from raw birth data. This is
isolated to [`tools/`](tools) and is **AGPL-3.0** (it uses `pyswisseph`) —
read [`tools/NOTICE.md`](tools/NOTICE.md) first. The AGPL boundary is confined
to `tools/` and does not extend to the skill.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r tools/requirements.txt          # runtime: pyswisseph
pip install -r tools/requirements-dev.txt      # adds jsonschema for --validate
```

No ephemeris data files are required — the built-in Moshier ephemeris is used
by default (planets ≈ 0.1″, Moon ≈ 3″, well inside any natal orb). For maximum
precision, download `.se1` files from Astrodienst and pass `--ephe-path <dir>`
(or set `SWISSEPH_PATH`). Never commit `.se1` files.

---

## Installing the skill into coding agents

This skill follows the [Agent Skills standard](https://agentskills.io/specification):
a directory containing `SKILL.md` with `name` + `description` frontmatter. Any
standard-compliant harness (Codex, Pi, Claude Code, …) loads it the same way.

> The skill's [`SKILL.md`](SKILL.md) already conforms to the standard.
> [`agents/openai.yaml`](agents/openai.yaml) is **extra interface metadata**
> (display name, entry-command surface). The standard loader ignores unknown
> fields, so the skill loads even in a harness that does not read that file;
> harnesses that do (e.g. Codex) use it for the entry-command surface.

### Recommended: `install.sh`

[`install.sh`](install.sh) copies the skill into a harness skills directory so
the agent discovers it on next start. It targets any Agent-Skills-standard
loader — Codex, Pi, or the harness-neutral `~/.agents/skills/` (scanned by Pi
and any compliant loader). It is **idempotent**: it safely replaces a previous
install of *this* skill and **refuses to clobber** a directory that belongs to
a different skill (matched by the `name:` in the destination's `SKILL.md`); a
leftover symlink from a manual install is replaced with a real copy.

```bash
./install.sh                      # default: install into all three targets below
./install.sh --target codex       # $CODEX_HOME/skills/        (default ~/.codex/skills)
./install.sh --target pi          # $PI_HOME/agent/skills/     (default ~/.pi/agent/skills)
./install.sh --target agents      # $AGENTS_HOME/skills/       (default ~/.agents/skills, harness-neutral)
./install.sh --target all         # install into all three (default)
./install.sh --dry-run            # show what would happen; copy nothing
./install.sh --smoke-test         # stage the published bundle and run --check
./install.sh --force              # overwrite a destination that belongs to another skill
```

Run `./install.sh --help` for the full reference. Re-running it after a `git pull`
updates every installed copy. Override the default locations with the
`CODEX_HOME`, `PI_HOME`, or `AGENTS_HOME` environment variables.

The installer publishes a lean bundle profile documented in
[`docs/bundle_profile.md`](docs/bundle_profile.md): `SKILL.md`, runtime
references, schemas, entry prompts, `entry_commands.py`, `agents/openai.yaml`,
necessary docs/templates, and the opt-in calculator support script.
Repository-only context such as `AGENTS.md`, `ROADMAP.md`, `tests/`, `.todos`,
forward-testing artifacts, and non-runtime docs/tooling is not copied.

> **The AGPL calculator (`tools/birth_to_chart.py`) is included but opt-in.**
> Agent Skills harnesses resolve bundled scripts by relative path from the
> installed skill root; including the script keeps the advertised
> `tools/birth_to_chart.py` path usable after install. Dependencies are not
> vendored. Install them into a venv of your own:
> ```bash
> python3 -m venv .venv && . .venv/bin/activate \
>   && pip install -r tools/requirements.txt -r tools/requirements-dev.txt
> ```
> See [`tools/README.md`](tools/README.md) and [`tools/NOTICE.md`](tools/NOTICE.md).

### Target locations

| `--target` | Harness skills directory | Env override | Notes |
|---|---|---|---|
| `codex` | `~/.codex/skills/` | `CODEX_HOME` | Codex ships a built-in `skill-installer` too; `agents/openai.yaml` declares the entry-command surface Codex reads. |
| `pi` | `~/.pi/agent/skills/` | `PI_HOME` | Also accepts `pi --skill <path>` or a `skills` array in `.pi/settings.json`; registers as `/skill:astrology-skill`. |
| `agents` | `~/.agents/skills/` | `AGENTS_HOME` | Harness-neutral; scanned by Pi and any standard-compliant loader. Also used by Claude Code–style shared setups. |

For **Claude Code**, point the same script at its skills dir via a custom
`AGENTS_HOME`, or copy manually:

```bash
mkdir -p ~/.claude/skills
./install.sh --target agents        # then move, or set AGENTS_HOME=~/.claude
```

(`install.sh` does not yet ship a dedicated `claude` target; Claude Code reads
`~/.claude/skills/` for global user skills and `.claude/skills/` for project
scope — the `agents` target covers the shared standard directory.)

### Project-level install

For a single project, the cross-harness convention is `.agents/skills/` at the
project root (discovered by Pi and other standard-compliant harnesses). Copy
(rather than symlink) so the skill is self-contained:

```bash
mkdir -p .agents/skills
AGENTS_HOME="$PWD/.agents" ./install.sh --target agents
```

Claude Code and Pi also read their own project dirs (`.claude/skills/`,
`.pi/skills/`).

### Manual install (if you prefer not to use the script)

Copy the skill directory into a target's skills directory (see table above).
Use the published bundle profile from
[`docs/bundle_profile.md`](docs/bundle_profile.md). At minimum, copy
`SKILL.md`, `LICENSE`, `README.md`, `entry_commands.py`, `agents/openai.yaml`,
`assets/schemas/`, `prompts/entry/`, `references/`, and the listed runtime
docs:

```bash
./install.sh --dry-run   # prints the exact allowlist
```

Avoid symlinks for skill discovery — some harnesses (notably Codex) do not
follow them reliably, which is why `install.sh` copies instead.

### Verify it loaded

```bash
# The installed copy is a real directory and still passes its own checks:
python3 ~/.codex/skills/astrology-skill/entry_commands.py --check
./install.sh --smoke-test
ls ~/.pi/agent/skills ~/.agents/skills    # astrology-skill present
```

In the harness, the skill registers as `/skill:astrology-skill` (Pi) and is
auto-suggested when a request matches its description. Ask the agent
*"what skills are available?"* to confirm discovery, then route a small chart:

```bash
python3 entry_commands.py --route '{
  "reading_type": "natal",
  "chart_data": {
    "house_system": "Whole Sign",
    "placements": [{"body": "Sun", "sign": "Taurus", "degree": 0}]
  }
}'
```

…and ask the agent to interpret the routed chart using the skill.

---

## Usage

### List the available reading functions

Reading types are **enum-driven** off
[`assets/schemas/chart_input_schema.json`](assets/schemas/chart_input_schema.json),
so this command reflects the schema directly:

```bash
python3 entry_commands.py --list
```

Output shows each `reading_type` (`natal`, `transit`, `synastry`,
`solar_return`, `annual_profection`, `horary`, `electional`, `mundane`) mapped
to its retrieval module and entry fragment.

### Route a chart into the workflow (the single entry gate)

`entry_commands.py --route` resolves and validates a chart object, then prints
a **route ticket** that hands control to `SKILL.md` Workflow step 1. It never
calculates. It accepts three input modes:

```bash
# File
python3 entry_commands.py --route chart.json

# Pipe / stdin (no temp file)
... | python3 entry_commands.py --route -

# Inline JSON (small / ad-hoc charts; also works for external-tool output)
python3 entry_commands.py --route '{ "reading_type": "natal", "chart_data": { ... } }'
```

The gate requires `reading_type` (a schema enum value) and a `chart_data`
object. If `jsonschema` is installed it runs full Draft 2020-12 validation;
otherwise a dependency-free structural gate runs (this is the documented
contract, not an error). Every failure exits `2` and points at the schema.

### The full path: birth data → reading

Combine stage 1 (calculator) with stage 2 (entry gate):

```bash
# Stage 1: raw birth data -> chart JSON (AGPL, opt-in; needs the venv)
python3 tools/birth_to_chart.py \
    --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" \
    --house-system "Whole Sign" --reading-type natal \
    --name "Subject A" --place "Brooklyn, NY" \
    --validate --output chart.json

# Stage 2: chart JSON -> route ticket (stdlib; system python3)
python3 entry_commands.py --route chart.json
```

Or as one pipe:

```bash
python3 tools/birth_to_chart.py \
    --date 1990-05-21 --time 14:32 \
    --lat 40.7128 --lon -74.0060 --tz "America/New_York" --validate \
  | python3 entry_commands.py --route -
```

**Stage 3** is the reading itself: the route ticket hands the resolved chart to
`SKILL.md` → Workflow step 1, which builds a reading plan, selects the minimum
references, ranks factors, synthesizes, and runs the reading self-check. The
per-type prompt templates under [`prompts/entry/`](prompts/entry) frame
requests (e.g. horary asks for the querent's question; electional lists
candidate start charts) and add no calculation.

> The calculator **never guesses** a timezone or birth time. Missing `--tz`
> (without `--lmt`) and missing `--time` (without `--noon-for-unknown`) are
> hard errors. When birth-time confidence is `Unknown`, angles/houses/sect are
> omitted and the Moon is flagged provisional. See
> [`tools/README.md`](tools/README.md) for every flag.

### External chart tools

Stage 2 accepts **any** chart JSON that conforms to
`chart_input_schema.json`, not only the bundled calculator's output. The
schema is `additionalProperties: true` everywhere, so external tools may
include extra fields. Example:

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

See [`tests/entry/sample_synastry.json`](tests/entry/sample_synastry.json) for
a richer external-tool-style chart (nested `person_a` / `person_b` blocks plus
inter-chart aspects).

---

## Validation & tests

A single re-runnable matrix runs every deterministic check and prints a
green/red snapshot:

```bash
python3 tests/run_validation_matrix.py
```

Individual checks:

| Command | Needs | What it checks |
|---|---|---|
| `python3 quick_validate.py` | system `python3` | `SKILL.md` frontmatter + entry parity |
| `python3 entry_commands.py --check` | system `python3` | enum ↔ entry-fragment parity |
| `python3 entry_commands.py --list` | system `python3` | enumerate reading functions |
| `python3 tests/entry/smoke_test.py` | system `python3` | full entry surface |
| `python3 tests/entry/end_to_end_test.py` | `.venv` | calculator-backed stages |
| `python3 tools/smoke_test.py` | `.venv` | Asc/MC within ±0.05° on 3 fixtures (independent recomputation) |
| `python3 tests/structure/gap_matrix_drift.py` | system `python3` | reference-gap regression guard |
| `python3 tests/structure/schema_and_agents_parse.py` | `.venv` | schema + `agents/openai.yaml` parse |
| `python3 tests/structure/skills_ref_validate.py` | optional `skills-ref` | official Agent Skills validation; reports `SKIP` with install guidance when absent |

See [`docs/e2e_validation_plan.md`](docs/e2e_validation_plan.md) for the full
plan.

The official Agent Skills reference validator is opportunistic: local checks do
not install it or require network access. If `skills-ref` is on `PATH`, the
matrix runs `skills-ref validate` against the repository skill root. To validate
a staged or published bundle instead, set `SKILLS_REF_TARGET=/path/to/bundle`;
to use a non-`PATH` binary, set `SKILLS_REF_BIN=/path/to/skills-ref`. Any
official finding should be resolved by updating `quick_validate.py` when the
local validator is missing a real rule, or by documenting an intentional
official/local difference so the two checks do not disagree silently.

---

## Project layout

```
SKILL.md                  Skill doctrine: input contract, workflow, weighting, guardrails, self-check
AGENTS.md                 Agent operating instructions for this repo
install.sh                Install the skill into a harness skills dir (Codex / Pi / ~/.agents)
entry_commands.py         Entry gate: --list / --check / --route (stdlib; never calculates)
quick_validate.py         Lightweight SKILL.md + entry-parity validator
agents/openai.yaml        Interface metadata for agent hosts
assets/schemas/           chart_input_schema.json (input), reading_plan_schema.json (internal plan)
prompts/entry/            Per-reading-type entry templates + canonical _reading.md
references/               137 interpretive modules (foundations, planets, signs, placements,
                          aspects, rulerships, houses, traditions, reading_types, synthesis_patterns)
tools/                    birth_to_chart.py + smoke tests (AGPL-3.0; opt-in calculator)
docs/                     design notes + end-to-end walkthroughs
tests/                    entry, structure, and forward-testing suites + validation matrix
```

Only the published bundle profile is copied into agent skill directories; see
[`docs/bundle_profile.md`](docs/bundle_profile.md).

---

## Documentation

- [`SKILL.md`](SKILL.md) — the skill itself (start here).
- [`docs/end_to_end.md`](docs/end_to_end.md) — the full birth-data → reading walkthrough.
- [`docs/entry_commands.md`](docs/entry_commands.md) — entry-command surface design.
- [`docs/bundle_profile.md`](docs/bundle_profile.md) — files included in installed skill bundles.
- [`docs/birth_to_chart_design.md`](docs/birth_to_chart_design.md) — calculator design + boundary rationale.
- [`tools/README.md`](tools/README.md) — every `birth_to_chart.py` flag.
- [`ROADMAP.md`](ROADMAP.md) — roadmap and phase history.

## License

- The **interpretive skill runtime** (`SKILL.md`, `references/`,
  `assets/schemas/`, `prompts/entry/`, `entry_commands.py`,
  `agents/openai.yaml`, and necessary docs/templates) is licensed under the
  **MIT License**. See [`LICENSE`](LICENSE). `SKILL.md` also declares
  `license: MIT` in frontmatter for package metadata consumers.
- No `compatibility` frontmatter is declared yet: the runtime skill remains
  dependency-free and targets the standard `SKILL.md` loader shape.
- The **calculator** under [`tools/`](tools) is bundled as a separate
  **AGPL-3.0** support-script unit because it uses `pyswisseph` (Swiss
  Ephemeris). See [`tools/NOTICE.md`](tools/NOTICE.md). It is a separate
  process and is not imported by the MIT runtime.
