#!/usr/bin/env python3
"""Structural drift check: chart-input schema + agents/openai.yaml parse (td-3b7112, A.1 block 6).

This is the ROADMAP Phase 5 static-asset guard. It asserts the two files that
define the entry contract are themselves well-formed *as static files*, before
``entry_commands.py`` ever loads them at runtime:

  - ``assets/schemas/chart_input_schema.json`` and
    ``assets/schemas/reading_plan_schema.json`` parse as valid JSON and as
    valid Draft 2020-12 JSON Schema documents.
  - ``agents/openai.yaml`` parses as YAML, declares the documented
    ``interface.entry_commands`` keys, and its ``enum_source`` JSON Pointer
    resolves against the chart-input schema to a non-empty list of reading
    types.

``entry_commands.py`` already resolves the enum at runtime; this script
catches a malformed schema or YAML file independently (e.g. a hand-edit that
breaks the pointer). It needs ``jsonschema`` and ``PyYAML`` (both present in
the project venv); without them it SKIPs rather than failing, mirroring the
calculator-skip convention in ``tests/entry/end_to_end_test.py``.

Run
---
    .venv/bin/python3 tests/structure/schema_and_agents_parse.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CHART_SCHEMA = ROOT / "assets" / "schemas" / "chart_input_schema.json"
PLAN_SCHEMA = ROOT / "assets" / "schemas" / "reading_plan_schema.json"
REPORT_SCHEMA = ROOT / "assets" / "schemas" / "report_schema.json"
AGENTS = ROOT / "agents" / "openai.yaml"

REQUIRED_ENTRY_KEYS = (
    "spec", "enum_source", "canonical_template",
    "fragments_dir", "input_modes",
)
# interface.output keys declared by the report standard (td-7d265d / td-8ddeaa).
# Asserted only when report_schema.json is installed (the standard is optional).
REQUIRED_OUTPUT_KEYS = (
    "report_schema", "report_template", "report_format_doc",
)


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _check(condition: bool, msg: str) -> None:
    print(f"  {'PASS' if condition else 'FAIL'}: {msg}")
    if not condition:
        _fail(msg)


def _resolve_pointer(document: object, pointer: str) -> object:
    if not pointer.startswith("#"):
        raise ValueError(f"JSON Pointer must start with '#': {pointer!r}")
    node = document
    ref = pointer[1:]
    if ref in ("", "/"):
        return node
    for raw in ref.lstrip("/").split("/"):
        token = raw.replace("~1", "/").replace("~0", "~")
        node = node[token]  # type: ignore[index]
    return node


def main() -> int:
    try:
        import jsonschema  # type: ignore
    except ImportError:
        print("SKIP: jsonschema unavailable; run under the project venv "
              "(.venv/bin/python3) to exercise this check.")
        return 0
    try:
        import yaml  # type: ignore
    except ImportError:
        print("SKIP: PyYAML unavailable; run under the project venv "
              "(.venv/bin/python3) to exercise this check.")
        return 0

    print("Schema + agents/openai.yaml parse guard")

    # 1. Chart-input schema parses and is a valid Draft 2020-12 schema.
    chart_text = CHART_SCHEMA.read_text(encoding="utf-8")
    _check(chart_text.lstrip().startswith("{") and json.loads(chart_text) is not None,
           "chart_input_schema.json is valid JSON")
    chart = json.loads(chart_text)
    jsonschema.Draft202012Validator.check_schema(chart)
    print("  PASS: chart_input_schema.json is a valid Draft 2020-12 JSON Schema")

    # 2. Reading-plan schema parses and is a valid Draft 2020-12 schema.
    plan = json.loads(PLAN_SCHEMA.read_text(encoding="utf-8"))
    jsonschema.Draft202012Validator.check_schema(plan)
    print("  PASS: reading_plan_schema.json is a valid Draft 2020-12 JSON Schema")

    # 2b. Report schema (optional standard): when present it must parse and be
    #     a valid Draft 2020-12 schema, and its inlined enums must match the
    #     chart-input enums (parity is also enforced at runtime by
    #     entry_commands.py --check and quick_validate.py).
    if REPORT_SCHEMA.is_file():
        report = json.loads(REPORT_SCHEMA.read_text(encoding="utf-8"))
        jsonschema.Draft202012Validator.check_schema(report)
        print("  PASS: report_schema.json is a valid Draft 2020-12 JSON Schema")
        for field in ("reading_type", "tradition_mode", "tone"):
            input_enum = chart["properties"][field].get("enum")
            report_enum = report["properties"][field].get("enum")
            _check(list(report_enum) == list(input_enum),
                   f"report_schema.json {field} enum matches chart_input_schema.json")
    else:
        print("  SKIP: report_schema.json absent (report standard not installed)")

    # 3. agents/openai.yaml parses and declares the entry contract.
    agents_doc = yaml.safe_load(AGENTS.read_text(encoding="utf-8"))
    _check(isinstance(agents_doc, dict), "agents/openai.yaml root is a mapping")
    assert isinstance(agents_doc, dict)
    entry = agents_doc.get("interface", {}).get("entry_commands", {})
    for key in REQUIRED_ENTRY_KEYS:
        _check(key in entry, f"agents/openai.yaml declares entry_commands.{key}")

    # 3b. When the report standard is installed, agents/openai.yaml must declare
    #     the output contract (interface.output) that points at it.
    output = agents_doc.get("interface", {}).get("output", {})
    if REPORT_SCHEMA.is_file():
        for key in REQUIRED_OUTPUT_KEYS:
            _check(key in output,
                   f"agents/openai.yaml declares output.{key}")
        _check(output.get("report_schema") == "assets/schemas/report_schema.json",
               "output.report_schema points at the report schema")
    else:
        _check(not output,
               "output block absent when report_schema.json is not installed")

    # 4. enum_source resolves against the chart schema to a non-empty enum.
    enum_source = entry["enum_source"]
    schema_path_str, json_ptr = enum_source.rsplit("#", 1)
    _check(schema_path_str == "assets/schemas/chart_input_schema.json",
           f"enum_source points at the chart schema (got {schema_path_str!r})")
    enum = _resolve_pointer(chart, "#" + json_ptr)
    _check(isinstance(enum, list) and len(enum) >= 1 and all(isinstance(x, str) for x in enum),
           f"enum_source resolves to a non-empty string list ({enum})")

    # 5. Every enum value has a retrieval module + entry fragment is not a
    #    *hard* requirement here (entry_commands --check owns parity); we only
    #    confirm the static assets that define the contract are coherent.
    print()
    print(f"All schema + agents/openai.yaml parse checks passed "
          f"(enum = {enum}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
