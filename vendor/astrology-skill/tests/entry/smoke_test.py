#!/usr/bin/env python3
"""Smoke test for the entry-command surface (td-13e366).

Acceptance criterion (td-13e366): *invoking a command with a conforming sample
chart reaches the retrieval workflow.* Concretely this verifies that:

  - ``entry_commands.py --list`` enumerates every ``reading_type`` in
    ``assets/schemas/chart_input_schema.json`` (enum-driven, no hardcoded list);
  - ``entry_commands.py --check`` reports parity;
  - ``entry_commands.py --route <sample>`` resolves a conforming chart, passes
    the validation gate, and prints a route ticket that hands control to
    ``SKILL.md -> Workflow step 1``;
  - non-conforming charts (missing/invalid ``reading_type``) are rejected;
  - the surface picks up a **new** enum value with no code change;
  - ``quick_validate.py``'s folded parity check catches enum/fragment drift;
  - ``agents/openai.yaml`` declares the implemented commands.

The "commands" are prompt templates under ``prompts/entry/``; ``entry_commands.py``
is their deterministic resolver/validator/router. This script does not call an
LLM and performs no calculation.

Run
---
    python tests/entry/smoke_test.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ENTRY = ROOT / "entry_commands.py"
QUICK = ROOT / "quick_validate.py"
SCHEMA = ROOT / "assets" / "schemas" / "chart_input_schema.json"
TEMPLATE = ROOT / "prompts" / "entry" / "_reading.md"
AGENTS = ROOT / "agents" / "openai.yaml"
NATAL = HERE / "sample_natal.json"
SYNASTRY = HERE / "sample_synastry.json"

PY = sys.executable


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _run(args: list[str], stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PY, str(ENTRY), *args],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        input=stdin,
    )


def _check(condition: bool, msg: str) -> None:
    print(f"  {'PASS' if condition else 'FAIL'}: {msg}")
    if not condition:
        _fail(msg)


# --------------------------------------------------------------------------- #
# Tests
# --------------------------------------------------------------------------- #

def test_schema_enum() -> list[str]:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    enum = schema["properties"]["reading_type"]["enum"]
    expected = {
        "natal", "transit", "synastry", "solar_return",
        "annual_profection", "horary", "electional", "mundane",
    }
    _check(set(enum) == expected, f"schema enum is {sorted(enum)}")
    return enum


def test_list(enum: list[str]) -> None:
    proc = _run(["--list"])
    _check(proc.returncode == 0, f"--list exits 0 (got {proc.returncode})")
    for t in enum:
        _check(t in proc.stdout, f"--list enumerates {t!r}")
    _check("birth_to_chart.py" in proc.stdout,
           "--list mentions the birth-data utility")


def test_check() -> None:
    proc = _run(["--check"])
    _check(proc.returncode == 0, f"--check exits 0 (got {proc.returncode})")
    _check("PASS" in proc.stdout, "--check reports PASS")


def test_route_natal() -> None:
    proc = _run(["--route", str(NATAL)])
    _check(proc.returncode == 0, f"--route natal exits 0 (got {proc.returncode})")
    out = proc.stdout
    _check("VALID" in out, "--route natal reports VALID")
    _check("reading_type:         natal" in out, "--route natal shows reading_type")
    _check("references/reading_types/natal.md (present)" in out,
           "--route natal resolves the retrieval module")
    _check("prompts/entry/natal.md (present)" in out,
           "--route natal resolves the entry fragment")
    _check("SKILL.md" in out and "Workflow step 1" in out,
           "--route natal reaches SKILL.md step 1 (the retrieval workflow)")


def test_route_synastry() -> None:
    proc = _run(["--route", str(SYNASTRY)])
    _check(proc.returncode == 0, f"--route synastry exits 0 (got {proc.returncode})")
    _check("reading_type:         synastry" in proc.stdout,
           "--route synastry shows reading_type")


def test_route_rejects_invalid() -> None:
    cases = [
        ('{"chart_data": {}}', "reading_type", "missing reading_type"),
        ('{"reading_type": "banana", "chart_data": {}}', "not in the schema enum",
         "unknown reading_type"),
        ('{"reading_type": "natal"}', "chart_data", "missing chart_data"),
    ]
    for payload, needle, label in cases:
        proc = _run(["--route", payload])
        _check(proc.returncode == 2,
               f"--route rejects {label} (exit {proc.returncode})")
        _check(needle in proc.stderr, f"--route names the problem for {label}")


def test_route_stdin() -> None:
    payload = '{"reading_type":"transit","chart_data":{"timing_factors":[]}}'
    proc = _run(["--route", "-"], stdin=payload)
    _check(proc.returncode == 0, f"--route - exits 0 (got {proc.returncode})")
    _check("reading_type:         transit" in proc.stdout,
           "--route stdin resolves the chart")


def test_enum_driven_new_type() -> None:
    """A new enum value is invocable with NO change to entry_commands.py."""
    # Placeholder for a type that is genuinely not in the real enum, used to
    # prove the surface is enum-driven. Update if this token ever ships.
    future_type = "__future_type__"

    sys.path.insert(0, str(ROOT))
    import entry_commands  # type: ignore  # noqa: PLC0415

    real_schema = entry_commands.load_schema()
    real_types = entry_commands.reading_types(real_schema)
    _check(future_type not in real_types,
           f"{future_type} is not yet in the real enum")

    mutated = json.loads(json.dumps(real_schema))
    mutated["properties"]["reading_type"]["enum"].append(future_type)

    _check(future_type in entry_commands.reading_types(mutated),
           "reading_types() picks up the new enum value")

    new_chart = {"reading_type": future_type, "chart_data": {}}
    try:
        entry_commands.validate_chart(new_chart, mutated)
        accepted = True
    except entry_commands.ChartInputError:
        accepted = False
    _check(accepted, "validate_chart() accepts the new type under the mutated schema")

    try:
        entry_commands.validate_chart(new_chart, real_schema)
        rejected = False
    except entry_commands.ChartInputError:
        rejected = True
    _check(rejected, "validate_chart() rejects the new type under the real schema")

    source = Path(entry_commands.__file__).read_text(encoding="utf-8")
    _check(
        '"natal", "transit", "synastry"' not in source,
        "entry_commands.py holds no hardcoded enum list",
    )

    sys.path.pop(0)


def test_canonical_template() -> None:
    _check(TEMPLATE.is_file(), "canonical template exists")
    text = TEMPLATE.read_text(encoding="utf-8")
    _check("SKILL.md" in text and "Workflow step 1" in text,
           "canonical template routes to SKILL.md step 1")
    _check("properties.reading_type.enum" in text,
           "canonical template references the schema enum")
    _check("tools/birth_to_chart.py" in text,
           "canonical template points raw birth data to the calculator path")
    _check("freehand-calculate" in text and "interpretive workflow" in text,
           "canonical template keeps calculation outside interpretation")


def test_agents_yaml() -> None:
    text = AGENTS.read_text(encoding="utf-8")
    for needle in ("entry_commands:", "enum_source:", "canonical_template:",
                   "input_modes:", "python3 entry_commands.py --list",
                   "python3 entry_commands.py --route", "raw birth data"):
        _check(needle in text, f"agents/openai.yaml declares {needle!r}")
    try:
        import yaml  # type: ignore  # noqa: PLC0415
        yaml.safe_load(text)
        _check(True, "agents/openai.yaml parses as YAML")
    except ImportError:
        print("  SKIP: PyYAML unavailable; agents/openai.yaml not parsed")


def test_quick_validate_catches_drift() -> None:
    """The folded parity check in quick_validate.py must fail on drift."""
    stray = ROOT / "prompts" / "entry" / "zz_smoke_stray_type.md"
    try:
        stray.write_text("# stray fragment with no enum backing\n", encoding="utf-8")
        proc = subprocess.run(
            [PY, str(QUICK)], capture_output=True, text=True, cwd=str(ROOT),
        )
        _check(proc.returncode != 0,
               f"quick_validate.py fails on stray fragment (exit {proc.returncode})")
        _check("entry surface parity check failed" in proc.stderr,
               "quick_validate.py names the parity failure")
    finally:
        if stray.is_file():
            stray.unlink()


def main() -> int:
    print("Entry-command smoke test (td-13e366)\n")
    enum = test_schema_enum()
    for fn in (test_list, test_check, test_route_natal, test_route_synastry,
               test_route_rejects_invalid, test_route_stdin,
               test_enum_driven_new_type, test_canonical_template,
               test_agents_yaml, test_quick_validate_catches_drift):
        title = fn.__name__
        if title == "test_list":
            print(f"\n[{title}]")
            test_list(enum)
        else:
            print(f"\n[{title}]")
            fn()
    print("\nAll entry-command smoke tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
