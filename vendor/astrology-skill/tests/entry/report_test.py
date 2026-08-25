#!/usr/bin/env python3
"""Report-gate test: validate reading reports via entry_commands.py --report.

Task: ``td-8ddeaa`` (parent: report-standard ``td-7d265d``).

This mirrors ``tests/entry/end_to_end_test.py`` for the **output** side of the
skill. It asserts that:

  - ``entry_commands.py --report`` resolves + validates a conforming report
    (built from the bundled natal sample) and prints a report ticket;
  - the ticket reaches the right summary (report_id, reading_type, client,
    chart_artefacts) and notes that an embedded ``chart_input`` passed the
    same gate as ``--route``;
  - every failure mode (missing report_id / generated_at, unknown
    reading_type, empty chart_artefacts, artefact missing role/source, reading
    with no body or sections, wrong schema_version) exits ``2`` and prints a
    message pointing at ``report_schema.json``;
  - a report that embeds a **chart_input failing the chart gate** is itself
    rejected (the report cannot silently wrap an invalid chart);
  - stdin mode works (``--report -``).

The report gate is dependency-free (structural, system python3). When
``jsonschema`` is present the deep path is also exercised; otherwise the
deep-specific assertion is SKIPped, mirroring the calculator/jsonschema skip
convention in ``end_to_end_test.py``.

Run
---
    python3 tests/entry/report_test.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
ENTRY = ROOT / "entry_commands.py"
REPORT_SCHEMA = ROOT / "assets" / "schemas" / "report_schema.json"
NATAL_SAMPLE = HERE / "sample_natal.json"
SCHEMA_POINTER = "assets/schemas/report_schema.json"

PY = sys.executable


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _check(condition: bool, msg: str) -> None:
    print(f"  {'PASS' if condition else 'FAIL'}: {msg}")
    if not condition:
        _fail(msg)


def _skip(msg: str) -> None:
    print(f"  SKIP: {msg}")


def _run(args: list[str], stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PY, str(ENTRY), *args],
        capture_output=True, text=True, cwd=str(ROOT), input=stdin,
    )


def _has_jsonschema() -> bool:
    return subprocess.run(
        [PY, "-c", "import jsonschema"], capture_output=True, text=True,
    ).returncode == 0


def _valid_report() -> dict:
    chart = json.loads(NATAL_SAMPLE.read_text(encoding="utf-8"))
    return {
        "schema_version": "1.0",
        "report_id": "natal-subject-a-20260620",
        "generated_at": "2026-06-20T14:30:00-04:00",
        "timezone": "America/New_York",
        "client": {"label": "Subject A"},
        "reading_type": "natal",
        "tradition_mode": "blended",
        "tone": "practical",
        "user_question": "What is the vocation pattern?",
        "chart_artefacts": [
            {
                "role": "chart_input",
                "schema_ref": "assets/schemas/chart_input_schema.json",
                "source": "tests/entry/sample_natal.json",
                "object": chart,
            },
            {
                "role": "reading_plan",
                "schema_ref": "assets/schemas/reading_plan_schema.json",
                "source": "<inline>",
                "ref": "plans/plan-1.json",
            },
        ],
        "reading": {
            "title": "Natal Reading — Subject A",
            "summary": "A night-chart with Mars rising in Cancer.",
            "body": "## Chart shape\n\n...\n\n## Vocation\n\n...",
            "scope_notes": ["Vocation read from the 10th/2nd/6th rulers."],
            "uncertainty_notes": ["Birth time is Timed, not Rectified."],
        },
        "references_used": [
            "references/foundations/interpretive_principles.md",
            "references/foundations/synthesis_rules.md",
        ],
    }


# --------------------------------------------------------------------------- #
# Happy path
# --------------------------------------------------------------------------- #

def test_valid_report_routes() -> None:
    report = _valid_report()
    proc = _run(["--report", json.dumps(report)])
    _check(proc.returncode == 0,
           f"valid report exits 0 (got {proc.returncode}); stderr: {proc.stderr.strip()}")
    out = proc.stdout
    _check("REPORT TICKET" in out, "ticket header present")
    _check("VALID" in out, "ticket reports VALID")
    _check("report_id:            natal-subject-a-20260620" in out,
           "ticket echoes report_id")
    _check("reading_type:         natal" in out, "ticket echoes reading_type")
    _check("client:               Subject A" in out,
           "ticket resolves pseudonymous client label")
    _check("chart_artefacts:      2 total" in out, "ticket counts artefacts")
    _check("chart_input gate: passed" in out,
           "ticket confirms embedded chart_input passed the chart gate")
    _check("report_schema.json" in out and "report_template.md" in out,
           "ticket points at the report contract + template")
    _check("no derived chart factors" in out,
           "ticket reaffirms the no-calculation boundary")


def test_report_via_stdin() -> None:
    proc = _run(["--report", "-"], stdin=json.dumps(_valid_report()))
    _check(proc.returncode == 0, f"--report - exits 0 (got {proc.returncode})")
    _check("VALID" in proc.stdout, "stdin report reports VALID")


def test_referenced_artefact() -> None:
    """An artefact using 'ref' (not embedded) is accepted; it is not chart-gated."""
    report = _valid_report()
    report["chart_artefacts"] = [
        {"role": "chart_input", "source": "chart.json", "ref": "chart.json"},
    ]
    proc = _run(["--report", json.dumps(report)])
    _check(proc.returncode == 0, f"ref-only chart_input accepted (got {proc.returncode})")
    _check("ref: chart.json" in proc.stdout, "ticket shows the ref")


def test_deep_path_when_jsonschema() -> None:
    if not _has_jsonschema():
        return _skip("jsonschema absent; deep-path assertion skipped")
    proc = _run(["--report", json.dumps(_valid_report())])
    _check("(deep: jsonschema)" in proc.stdout,
           "ticket reports the deep path when jsonschema is present")
    # A deep-only violation (sections item missing required 'heading') is a
    # clean one-liner, not a verbose schema dump.
    bad = _valid_report()
    bad["reading"] = {"sections": [{"body": "no heading"}]}
    proc = _run(["--report", json.dumps(bad)])
    _check(proc.returncode == 2, "deep-only failure exits 2")
    _check("failed schema validation" in proc.stderr,
           "deep-only failure names schema validation")
    _check("'heading' is a required property" in proc.stderr,
           "deep-only failure names the missing field")
    _check("Failed validating" not in proc.stderr,
           "deep failure is a one-liner, not a verbose schema dump")


# --------------------------------------------------------------------------- #
# Failure modes — every message points at report_schema.json
# --------------------------------------------------------------------------- #

def _assert_failure(report: dict, needle: str, label: str) -> None:
    proc = _run(["--report", json.dumps(report)])
    _check(proc.returncode == 2, f"{label} exits 2 (got {proc.returncode})")
    _check(needle in proc.stderr, f"{label} names the problem ({needle!r})")
    _check(SCHEMA_POINTER in proc.stderr,
           f"{label} points at {SCHEMA_POINTER}")


def test_fail_missing_report_id() -> None:
    bad = _valid_report(); del bad["report_id"]
    _assert_failure(bad, "missing required field: report_id", "missing report_id")


def test_fail_missing_generated_at() -> None:
    bad = _valid_report(); bad["generated_at"] = ""
    _assert_failure(bad, "missing required field: generated_at", "missing generated_at")


def test_fail_unknown_reading_type() -> None:
    bad = _valid_report(); bad["reading_type"] = "banana"
    _assert_failure(bad, "not in the report schema enum", "unknown reading_type")


def test_fail_empty_chart_artefacts() -> None:
    bad = _valid_report(); bad["chart_artefacts"] = []
    _assert_failure(bad, "chart_artefacts must be a non-empty array", "empty chart_artefacts")


def test_fail_artefact_missing_role() -> None:
    bad = _valid_report()
    bad["chart_artefacts"] = [{"source": "x", "object": {"reading_type": "natal"}}]
    _assert_failure(bad, "missing 'role'", "artefact missing role")


def test_fail_artefact_missing_source() -> None:
    bad = _valid_report()
    bad["chart_artefacts"] = [{"role": "chart_input", "object": {"reading_type": "natal"}}]
    _assert_failure(bad, "missing 'source'", "artefact missing source")


def test_fail_artefact_no_object_or_ref() -> None:
    bad = _valid_report()
    bad["chart_artefacts"] = [{"role": "chart_input", "source": "x"}]
    _assert_failure(bad, "embedded 'object' or a 'ref'",
                    "artefact without object or ref")


def test_fail_reading_without_body_or_sections() -> None:
    bad = _valid_report(); bad["reading"] = {"title": "orphan"}
    _assert_failure(bad, "non-empty 'body' or a non-empty 'sections'",
                    "reading without body or sections")


def test_fail_wrong_schema_version() -> None:
    bad = _valid_report(); bad["schema_version"] = "2.0"
    _assert_failure(bad, "schema_version must be '1.0'", "wrong schema_version")


def test_fail_embedded_chart_input_rejected() -> None:
    """A report wrapping a chart_input that fails the chart gate is rejected."""
    bad = _valid_report()
    bad["chart_artefacts"] = [
        {"role": "chart_input", "source": "x",
         "object": {"reading_type": "natal"}},  # missing chart_data
    ]
    proc = _run(["--report", json.dumps(bad)])
    _check(proc.returncode == 2,
           f"invalid embedded chart_input rejected (got {proc.returncode})")
    _check("chart-input gate" in proc.stderr,
           "failure names the nested chart-input gate")
    _check("chart_data" in proc.stderr,
           "failure surfaces the underlying chart problem (chart_data)")
    _check(SCHEMA_POINTER in proc.stderr,
           "nested failure still points at the report schema")


# --------------------------------------------------------------------------- #
# Runner
# --------------------------------------------------------------------------- #

def main() -> int:
    if not ENTRY.is_file():
        _fail(f"entry_commands.py not found at {ENTRY}")
    if not REPORT_SCHEMA.is_file():
        _fail(f"report_schema.json not found at {REPORT_SCHEMA}")
    print("Report-gate test (td-8ddeaa)\n")

    for fn in (test_valid_report_routes, test_report_via_stdin,
               test_referenced_artefact, test_deep_path_when_jsonschema,
               test_fail_missing_report_id, test_fail_missing_generated_at,
               test_fail_unknown_reading_type, test_fail_empty_chart_artefacts,
               test_fail_artefact_missing_role, test_fail_artefact_missing_source,
               test_fail_artefact_no_object_or_ref,
               test_fail_reading_without_body_or_sections,
               test_fail_wrong_schema_version,
               test_fail_embedded_chart_input_rejected):
        print(f"\n[{fn.__name__}]")
        fn()

    deep_ran = _has_jsonschema()
    print("\nAll report-gate tests passed"
          + ("" if deep_ran else " (deep-path assertions skipped without jsonschema)")
          + ".")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
