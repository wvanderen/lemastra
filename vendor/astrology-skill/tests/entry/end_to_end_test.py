#!/usr/bin/env python3
"""End-to-end test: birth data -> chart JSON -> entry command -> reading workflow.

Task: ``td-f1eb5b`` (parent epic ``td-9b20e3``).

This wires the three stages together and asserts the full path:

  1. ``tools/birth_to_chart.py`` converts raw birth data to chart JSON
     (``assets/schemas/chart_input_schema.json``).
  2. ``entry_commands.py --route`` resolves + validates that JSON and prints a
     route ticket that hands control to ``SKILL.md -> Workflow step 1``.
  3. The reading itself is a prompt-retrieval workflow (out of scope here);
     the contract is that the route ticket *reaches* step 1 without calculating.

It also verifies the AC items that do NOT depend on the calculator:

  - The entry gracefully handles **external-tool** chart JSON (additional
    properties, nested person blocks), not only the bundled script's output.
  - Every failure mode (invalid JSON, missing/unknown fields, deep schema
    violations) exits non-zero and prints a message pointing at
    ``chart_input_schema.json``.

Calculator-backed checks (stages that invoke ``birth_to_chart.py``) are
**skipped, not failed**, when ``pyswisseph`` is absent: the skill runtime is
dependency-free and CI may not carry the opt-in tooling. Run under the venv
that has ``tools/requirements*.txt`` installed to exercise them::

    .venv/bin/python tests/entry/end_to_end_test.py

Run
---
    python3 tests/entry/end_to_end_test.py            # structural + failure modes
"""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ENTRY = ROOT / "entry_commands.py"
SCRIPT = ROOT / "tools" / "birth_to_chart.py"
SCHEMA = ROOT / "assets" / "schemas" / "chart_input_schema.json"
SYNASTRY_SAMPLE = HERE / "sample_synastry.json"
SCHEMA_POINTER = "assets/schemas/chart_input_schema.json"

PY = sys.executable

# A documented, independently-verified birth dataset (same as tools/smoke_test.py
# fixture 1: 1990-05-21 14:32 America/New_York, NYC -> Asc ~174.55 Virgo).
BIRTH_ARGS = [
    "--date", "1990-05-21", "--time", "14:32",
    "--lat", "40.7128", "--lon", "-74.0060", "--tz", "America/New_York",
    "--house-system", "Whole Sign", "--reading-type", "natal",
    "--name", "Subject A", "--place", "Brooklyn, NY",
]


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _check(condition: bool, msg: str) -> None:
    print(f"  {'PASS' if condition else 'FAIL'}: {msg}")
    if not condition:
        _fail(msg)


def _skip(msg: str) -> None:
    print(f"  SKIP: {msg}")


def _run_entry(args: list[str], stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PY, str(ENTRY), *args],
        capture_output=True, text=True, cwd=str(ROOT), input=stdin,
    )


def _run_script(args: list[str], stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PY, str(SCRIPT), *args],
        capture_output=True, text=True, cwd=str(ROOT), input=stdin,
    )


def _has_swisseph() -> bool:
    proc = subprocess.run(
        [PY, "-c", "import swisseph"], capture_output=True, text=True,
    )
    return proc.returncode == 0


def _has_jsonschema() -> bool:
    proc = subprocess.run(
        [PY, "-c", "import jsonschema"], capture_output=True, text=True,
    )
    return proc.returncode == 0


# --------------------------------------------------------------------------- #
# Stage 1 -> 2 wiring (calculator-backed; skipped without pyswisseph)
# --------------------------------------------------------------------------- #

def test_script_output_routes_via_pipe(tmpdir: Path) -> None:
    """Script stdout -> entry stdin: one path, no temp file (Mode 3)."""
    if not _has_swisseph():
        return _skip("pyswisseph absent; script->route pipe test needs the opt-in tool")
    gen = _run_script([*BIRTH_ARGS, "--validate"])
    _check(gen.returncode == 0, f"script exits 0 (got {gen.returncode}); "
                                f"stderr: {gen.stderr.strip()}")
    _check("VALID: output conforms" in gen.stderr,
           "script --validate reports schema conformance")
    chart = json.loads(gen.stdout)
    _check(chart["reading_type"] == "natal", "script output is a natal chart")

    route = _run_entry(["--route", "-"], stdin=gen.stdout)
    _check(route.returncode == 0, f"--route (stdin) exits 0 (got {route.returncode})")
    _assert_reaches_workflow(route.stdout, "script-pipe")


def test_script_output_routes_via_file(tmpdir: Path) -> None:
    """Script --output FILE -> entry --route FILE (Mode 2)."""
    if not _has_swisseph():
        return _skip("pyswisseph absent; script->route file test needs the opt-in tool")
    out = tmpdir / "chart.json"
    gen = _run_script([*BIRTH_ARGS, "--validate", "--output", str(out)])
    _check(gen.returncode == 0, f"script --output exits 0 (got {gen.returncode})")
    _check(out.is_file(), "script wrote the output file")
    # The script must be silent on stdout when --output is used.
    _check(gen.stdout.strip() == "", "script writes nothing to stdout with --output")

    route = _run_entry(["--route", str(out)])
    _check(route.returncode == 0, f"--route (file) exits 0 (got {route.returncode})")
    _assert_reaches_workflow(route.stdout, "script-file")

    # Both stages agree on the reading_type (single schema, single source of truth).
    chart = json.loads(out.read_text(encoding="utf-8"))
    _check(f"reading_type:         {chart['reading_type']}" in route.stdout,
           "route ticket echoes the script's reading_type")


def _assert_reaches_workflow(stdout: str, label: str) -> None:
    _check("VALID" in stdout, f"[{label}] route ticket reports VALID")
    _check("reading_type:         natal" in stdout,
           f"[{label}] route ticket shows reading_type")
    _check("references/reading_types/natal.md (present)" in stdout,
           f"[{label}] route ticket resolves the natal retrieval module")
    _check("SKILL.md" in stdout and "Workflow step 1" in stdout,
           f"[{label}] route ticket reaches SKILL.md step 1 (the workflow)")
    _check("Do NOT calculate" in stdout,
           f"[{label}] route ticket reaffirms the no-calculation boundary")


# --------------------------------------------------------------------------- #
# External-tool charts (no calculator needed)
# --------------------------------------------------------------------------- #

EXTERNAL_MINIMAL = (
    '{"reading_type":"natal","tradition_mode":"classical","tone":"technical",'
    '"user_question":"vocation pattern?",'
    '"chart_data":{"source_notes":"external program","house_system":"Whole Sign",'
    '"ascendant":{"sign":"Virgo","degree":18.4},'
    '"placements":[{"body":"Mercury","sign":"Gemini","degree":15.7,"house":10}]}}'
)


def test_external_tool_chart_routes() -> None:
    """An external-tool chart with extra/missing-provenance fields routes fine."""
    route = _run_entry(["--route", EXTERNAL_MINIMAL])
    _check(route.returncode == 0,
           f"external-tool chart routes (exit {route.returncode})")
    _check("VALID" in route.stdout, "external-tool chart reports VALID")
    _check("reading_type:         natal" in route.stdout,
           "external-tool chart keeps its reading_type")


def test_nested_external_chart_routes() -> None:
    """A rich external-tool chart (synastry w/ person_a/person_b blocks) routes."""
    route = _run_entry(["--route", str(SYNASTRY_SAMPLE)])
    _check(route.returncode == 0,
           f"nested synastry sample routes (exit {route.returncode})")
    _check("reading_type:         synastry" in route.stdout,
           "nested synastry sample keeps its reading_type")
    _check("SKILL.md" in route.stdout and "Workflow step 1" in route.stdout,
           "nested synastry sample reaches SKILL.md step 1")


# --------------------------------------------------------------------------- #
# Failure modes — every message points at chart_input_schema.json (AC4)
# --------------------------------------------------------------------------- #

def _assert_failure(args: list[str], needle: str, label: str,
                    stdin: str | None = None) -> None:
    proc = _run_entry(args, stdin=stdin)
    _check(proc.returncode == 2, f"{label} exits 2 (got {proc.returncode})")
    _check(needle in proc.stderr, f"{label} names the problem ({needle!r})")
    _check(SCHEMA_POINTER in proc.stderr,
           f"{label} points at {SCHEMA_POINTER}")


def test_fail_invalid_json() -> None:
    _assert_failure(["--route", "{not valid json"], "could not parse JSON",
                    "invalid JSON")


def test_fail_missing_reading_type() -> None:
    _assert_failure(["--route", '{"chart_data":{}}'], "missing required field: reading_type",
                    "missing reading_type")


def test_fail_missing_chart_data() -> None:
    _assert_failure(["--route", '{"reading_type":"natal"}'],
                    "missing required field: chart_data", "missing chart_data")


def test_fail_unknown_reading_type() -> None:
    _assert_failure(["--route", '{"reading_type":"banana","chart_data":{}}'],
                    "not in the schema enum", "unknown reading_type")


def test_fail_chart_data_wrong_type() -> None:
    _assert_failure(["--route", '{"reading_type":"natal","chart_data":[1,2]}'],
                    "chart_data must be an object", "chart_data not an object")


def test_fail_deep_validation_points_at_schema(tmpdir: Path) -> None:
    """A deep schema violation (placement missing 'body') gives a clean message."""
    if not _has_jsonschema():
        return _skip("jsonschema absent; deep-validation message test skipped "
                     "(structural gate cannot see nested required fields)")
    bad = tmpdir / "bad_placement.json"
    bad.write_text(
        '{"reading_type":"natal","chart_data":{"placements":[{"sign":"Aries"}]}}',
        encoding="utf-8",
    )
    _assert_failure(["--route", str(bad)], "failed schema validation",
                    "deep: placement missing body")
    # Deep errors must NOT dump the verbose multi-page schema block.
    proc = _run_entry(["--route", str(bad)])
    _check("Failed validating" not in proc.stderr,
           "deep failure is a one-liner, not a verbose schema dump")


# --------------------------------------------------------------------------- #
# Runner
# --------------------------------------------------------------------------- #

def main() -> int:
    if not ENTRY.is_file():
        _fail(f"entry_commands.py not found at {ENTRY}")
    if not SCHEMA.is_file():
        _fail(f"schema not found at {SCHEMA}")
    print("End-to-end path test (td-f1eb5b)\n")

    with tempfile.TemporaryDirectory() as d:
        tmpdir = Path(d)

        print("[script -> entry: pipe]")
        test_script_output_routes_via_pipe(tmpdir)
        print("\n[script -> entry: file]")
        test_script_output_routes_via_file(tmpdir)

        print("\n[external-tool charts]")
        test_external_tool_chart_routes()

        print("\n[nested external chart]")
        test_nested_external_chart_routes()

        print("\n[failure modes]")
        for fn in (test_fail_invalid_json, test_fail_missing_reading_type,
                   test_fail_missing_chart_data, test_fail_unknown_reading_type,
                   test_fail_chart_data_wrong_type):
            print(f"  [{fn.__name__}]")
            fn()
        print("  [test_fail_deep_validation_points_at_schema]")
        test_fail_deep_validation_points_at_schema(tmpdir)

    print("\nAll end-to-end path tests passed (calculator-backed tests "
          "skipped without pyswisseph).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
