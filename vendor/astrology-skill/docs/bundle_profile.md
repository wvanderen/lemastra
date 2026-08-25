# Published skill bundle profile

`install.sh` publishes a lean agent-loaded bundle by allowlist. The installed
copy contains runtime skill material, the small amount of user-facing
documentation needed to understand and verify the entry surface, and the
separate opt-in calculator script advertised by the skill metadata.

## Included

- `SKILL.md`
- `LICENSE`
- `README.md`
- `entry_commands.py`
- `agents/openai.yaml`
- `assets/schemas/`
- `prompts/entry/`
- `references/`
- `tools/birth_to_chart.py`
- `tools/chart_diagram.py`
- `tools/README.md`
- `tools/NOTICE.md`
- `tools/LICENSE`
- `tools/requirements.txt`
- `tools/requirements-dev.txt`
- `docs/bundle_profile.md`
- `docs/birth_to_chart_design.md`
- `docs/entry_commands.md`
- `docs/end_to_end.md`
- `docs/report_format.md`

These paths cover the files referenced by `SKILL.md`, the entry-command
metadata consumed by agent hosts, the schemas used by the entry/report gates,
the report template under `references/templates/`, the bundled calculator
support script path named by `agents/openai.yaml`, and the dependency-free
chart diagram renderer.

## Excluded

Development-only repository context is not copied into Codex, Pi, or
`~/.agents` targets. That includes `AGENTS.md`, `ROADMAP.md`, `tests/`,
`tests/forward_testing/`, `.todos`, VCS/editor/cache files, and tool smoke
tests.

The `tools/` calculator is included as an opt-in support-script unit so agents
can resolve `tools/birth_to_chart.py` relative to the installed skill root, as
described by the Agent Skills scripts convention. Its dependencies are not
vendored; install them from `tools/requirements.txt`, or run the script with a
runner that honors its inline metadata. The MIT interpretive runtime does not
import the calculator. The calculator remains AGPL-3.0 unless the user has a
Swiss Ephemeris Professional License; see `tools/NOTICE.md`.

The chart diagram renderer (`tools/chart_diagram.py`) is dependency-free and
does not calculate chart factors. It only renders supplied chart JSON geometry
as SVG or a small standalone HTML page.

## Verification

Dry-run mode prints the publish allowlist without copying files:

```bash
./install.sh --dry-run
```

Smoke-test mode stages the same bundle profile in a temporary directory,
asserts the calculator support files are present, and runs the installed copy's
entry parity check:

```bash
./install.sh --smoke-test
```

Real installs also run `python3 entry_commands.py --check` from the destination
after copying.

If the official Agent Skills reference validator is installed, the development
matrix can validate either this repository root or a staged/published bundle:

```bash
python3 tests/run_validation_matrix.py
SKILLS_REF_TARGET=/path/to/published/astrology-skill \
  python3 tests/structure/skills_ref_validate.py
```

When `skills-ref` is absent, the wrapper reports `SKIP` with install guidance
instead of failing. Treat any installed-validator finding as actionable: either
teach `quick_validate.py` the same local rule or record why the official and
local checks intentionally differ.
