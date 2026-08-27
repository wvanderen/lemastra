#!/usr/bin/env python3
"""Entry-command surface for the astrology skill.

This is the **structural** companion to the prompt-template entry surface
described in ``docs/entry_commands.md``. It is dependency-free (Python
standard library only) and **enum-driven**: the list of reading types is read
at runtime from ``assets/schemas/chart_input_schema.json`` via the JSON Pointer
in ``agents/openai.yaml`` → ``interface.entry_commands.enum_source``. Adding a
``reading_type`` to the schema enum requires **no** change here.

The interpretive routing itself is owned by the prompt templates under
``prompts/entry/`` and by ``SKILL.md``. This script only:

  - **lists** the available reading functions (``--list``);
  - **checks** structural parity between the schema enum, the entry fragments,
    the retrieval modules, and the report-schema enums (``--check``);
  - **routes** a resolved chart object through the single validation gate and
    prints a route ticket that hands control to ``SKILL.md`` step 1
    (``--route``);
  - **validates** a resolved reading report against ``report_schema.json``
    and prints a report ticket (``--report``). Embedded ``chart_input``
    artefacts are held to the same gate as ``--route``, so a report cannot
    silently wrap a chart the input gate would reject.

It never calculates a chart factor. See ``docs/entry_commands.md`` §2 for the
no-calculation boundary.

EXIT CODES
----------
    0  success
    2  bad/missing input or a hard parity/validation failure
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
SCHEMA_PATH = HERE / "assets" / "schemas" / "chart_input_schema.json"
SCHEMA_PATH_DISPLAY = SCHEMA_PATH.relative_to(HERE).as_posix()
AGENTS_PATH = HERE / "agents" / "openai.yaml"
# Appended to every chart-input failure so the user is pointed at the
# authoritative shape (AC: failure modes surface a clear schema pointer).
_SCHEMA_HINT = f"See {SCHEMA_PATH_DISPLAY} for the required shape."
REPORT_SCHEMA_PATH = HERE / "assets" / "schemas" / "report_schema.json"
REPORT_SCHEMA_PATH_DISPLAY = REPORT_SCHEMA_PATH.relative_to(HERE).as_posix()
# Appended to every report-gate failure so the user is pointed at the
# authoritative report contract (mirrors _SCHEMA_HINT for the input gate).
_REPORT_SCHEMA_HINT = f"See {REPORT_SCHEMA_PATH_DISPLAY} for the required shape."
CANONICAL_TEMPLATE = HERE / "prompts" / "entry" / "_reading.md"
FRAGMENTS_DIR = HERE / "prompts" / "entry"
READING_TYPES_DIR = HERE / "references" / "reading_types"
DEFAULT_ENUM_POINTER = "#/properties/reading_type/enum"

# Opportunistic deep validation: used only when the dev package is present.
try:
    import jsonschema  # type: ignore

    _HAS_JSONSCHEMA = True
except ImportError:  # pragma: no cover - environment dependent
    _HAS_JSONSCHEMA = False


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(2)


# --------------------------------------------------------------------------- #
# Schema + enum loading (enum-driven; no hardcoded list)
# --------------------------------------------------------------------------- #

def _resolve_pointer(document: Any, pointer: str) -> Any:
    """Resolve a JSON Pointer of the form ``#/a/b/c`` against ``document``."""
    if not pointer.startswith("#"):
        raise ValueError(f"JSON Pointer must start with '#': {pointer!r}")
    ref = pointer[1:]
    if ref in ("", "/"):
        return document
    if not ref.startswith("/"):
        raise ValueError(f"JSON Pointer must be '#/...' or '#': {pointer!r}")
    node = document
    for raw_token in ref[1:].split("/"):
        token = raw_token.replace("~1", "/").replace("~0", "~")
        if isinstance(node, list):
            node = node[int(token)]
        elif isinstance(node, dict):
            if token not in node:
                raise KeyError(f"pointer segment {token!r} not found")
            node = node[token]
        else:
            raise KeyError(f"cannot descend into {token!r} from {type(node).__name__}")
    return node


def _enum_pointer_from_agents(default: str) -> str:
    """Read the enum_source pointer from agents/openai.yaml without PyYAML.

    The file is small and stable; a targeted scan avoids a hard dependency on
    PyYAML while still honoring the declared single source of truth.
    """
    if not AGENTS_PATH.is_file():
        return default
    text = AGENTS_PATH.read_text(encoding="utf-8")
    in_block = False
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("entry_commands:"):
            in_block = True
            continue
        if in_block:
            if line and not line[0].isspace() and not stripped.startswith("#"):
                break  # left the entry_commands block
            if stripped.startswith("enum_source:"):
                value = stripped.split(":", 1)[1].strip().strip('"').strip("'")
                # enum_source is "<path>#/<json-pointer>"; keep only the pointer.
                if "#" in value:
                    value = "#/" + value.rsplit("#", 1)[1].lstrip("/")
                return value or default
    return default


def load_schema() -> dict[str, Any]:
    if not SCHEMA_PATH.is_file():
        fail(f"schema not found: {SCHEMA_PATH}")
    return json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))


def reading_types(schema: dict[str, Any]) -> list[str]:
    pointer = _enum_pointer_from_agents(DEFAULT_ENUM_POINTER)
    try:
        values = _resolve_pointer(schema, pointer)
    except (KeyError, ValueError) as exc:
        fail(f"could not resolve enum_source {pointer!r}: {exc}")
    if not isinstance(values, list) or not values:
        fail(f"enum_source {pointer!r} is not a non-empty list")
    if not all(isinstance(v, str) for v in values):
        fail(f"enum_source {pointer!r} contains non-string values")
    return list(values)


# --------------------------------------------------------------------------- #
# Validation gate (single gate, dependency-free; deep check when available)
# --------------------------------------------------------------------------- #

class ChartInputError(ValueError):
    """Raised when a resolved chart object fails the entry gate."""


def _gate(message: str) -> ChartInputError:
    """Build a chart-input error that points the user at the schema."""
    return ChartInputError(f"{message} {_SCHEMA_HINT}")


def validate_chart(obj: Any, schema: dict[str, Any] | None = None) -> None:
    """Run the single validation gate on a resolved chart object.

    Required (always, stdlib only):
      - ``reading_type`` is present and one of the schema enum values;
      - ``chart_data`` is present and an object.

    Opportunistic (when ``jsonschema`` is installed): full Draft 2020-12
    validation against ``chart_input_schema.json``. Absence of ``jsonschema``
    is not an error — the structural gate is the contract.

    Every failure raised here points the user at the schema file via
    ``_SCHEMA_HINT`` (deep failures are reduced to one concise line with the
    JSON path, not a verbose schema dump).
    """
    if not isinstance(obj, dict):
        raise _gate("chart input must be a JSON object")

    enum = reading_types(schema if schema is not None else load_schema())

    reading_type = obj.get("reading_type")
    if reading_type is None:
        raise _gate("missing required field: reading_type")
    if not isinstance(reading_type, str):
        raise _gate(f"reading_type must be a string, got {type(reading_type).__name__}")
    if reading_type not in enum:
        raise _gate(
            f"reading_type {reading_type!r} is not in the schema enum "
            f"(allowed: {', '.join(enum)})"
        )

    chart_data = obj.get("chart_data")
    if chart_data is None:
        raise _gate("missing required field: chart_data")
    if not isinstance(chart_data, dict):
        raise _gate(f"chart_data must be an object, got {type(chart_data).__name__}")

    if _HAS_JSONSCHEMA and schema is not None:
        try:
            jsonschema.Draft202012Validator(schema).validate(obj)
        except jsonschema.ValidationError as exc:
            # One concise, human-readable line with the JSON path; the raw
            # ValidationError str is a multi-page schema dump, which is not a
            # clear message. The hint points at the schema file.
            where = exc.json_path or "$"
            raise _gate(
                f"chart input failed schema validation at {where}: {exc.message}"
            ) from exc


# --------------------------------------------------------------------------- #
# Report gate (single gate, dependency-free; deep check when available)
# --------------------------------------------------------------------------- #

class ReportError(ValueError):
    """Raised when a resolved report object fails the report gate."""


def _report_gate(message: str) -> ReportError:
    """Build a report error that points the user at the report schema."""
    return ReportError(f"{message} {_REPORT_SCHEMA_HINT}")


def load_report_schema() -> dict[str, Any]:
    if not REPORT_SCHEMA_PATH.is_file():
        fail(f"report schema not found: {REPORT_SCHEMA_PATH}")
    return json.loads(REPORT_SCHEMA_PATH.read_text(encoding="utf-8"))


def _report_enum(report_schema: dict[str, Any]) -> list[str]:
    values = (
        report_schema.get("properties", {})
        .get("reading_type", {})
        .get("enum")
    )
    if not isinstance(values, list) or not values:
        fail("report_schema.json is missing properties.reading_type.enum")
    return list(values)


def validate_report(
    obj: Any,
    report_schema: dict[str, Any] | None = None,
    chart_schema: dict[str, Any] | None = None,
) -> None:
    """Run the report gate on a resolved report object.

    Required (always, stdlib only):
      - the report is a JSON object;
      - ``schema_version`` (``1.0``), ``report_id``, ``generated_at``,
        ``reading_type``, ``chart_artefacts``, and ``reading`` are present and
        well-shaped;
      - ``reading_type`` is one of the report-schema enum values;
      - each ``chart_artefacts`` entry has ``role`` + ``source`` and either an
        embedded ``object`` or a ``ref``;
      - ``reading`` has a non-empty ``body`` or a non-empty ``sections`` array;
      - every embedded ``chart_input`` artefact passes the same chart-input
        gate as ``entry_commands.py --route`` (reuses ``validate_chart``), so a
        report cannot silently wrap a chart that the input gate would reject.

    Opportunistic (when ``jsonschema`` is installed): full Draft 2020-12
    validation against ``report_schema.json``. Absence of ``jsonschema`` is not
    an error — the structural gate is the contract (same philosophy as the
    chart gate).

    Every failure points the user at the report schema via
    ``_REPORT_SCHEMA_HINT`` (deep failures are reduced to one concise line).
    """
    if not isinstance(obj, dict):
        raise _report_gate("report must be a JSON object")

    if report_schema is None:
        report_schema = load_report_schema()
    enum = _report_enum(report_schema)

    schema_version = obj.get("schema_version")
    if schema_version is None:
        raise _report_gate("missing required field: schema_version")
    if schema_version != "1.0":
        raise _report_gate(f"schema_version must be '1.0', got {schema_version!r}")

    for field in ("report_id", "generated_at"):
        if not obj.get(field):
            raise _report_gate(f"missing required field: {field}")

    reading_type = obj.get("reading_type")
    if reading_type is None:
        raise _report_gate("missing required field: reading_type")
    if not isinstance(reading_type, str):
        raise _report_gate(
            f"reading_type must be a string, got {type(reading_type).__name__}"
        )
    if reading_type not in enum:
        raise _report_gate(
            f"reading_type {reading_type!r} is not in the report schema enum "
            f"(allowed: {', '.join(enum)})"
        )

    artefacts = obj.get("chart_artefacts")
    if artefacts is None:
        raise _report_gate("missing required field: chart_artefacts")
    if not isinstance(artefacts, list) or not artefacts:
        raise _report_gate("chart_artefacts must be a non-empty array")
    for i, art in enumerate(artefacts):
        if not isinstance(art, dict):
            raise _report_gate(f"chart_artefacts[{i}] must be an object")
        if not art.get("role"):
            raise _report_gate(f"chart_artefacts[{i}] is missing 'role'")
        if not art.get("source"):
            raise _report_gate(f"chart_artefacts[{i}] is missing 'source'")
        if art.get("object") is None and not art.get("ref"):
            raise _report_gate(
                f"chart_artefacts[{i}] must have an embedded 'object' or a 'ref'"
            )

    reading = obj.get("reading")
    if reading is None:
        raise _report_gate("missing required field: reading")
    if not isinstance(reading, dict):
        raise _report_gate(
            f"reading must be an object, got {type(reading).__name__}"
        )
    has_body = isinstance(reading.get("body"), str) and reading["body"].strip()
    has_sections = isinstance(reading.get("sections"), list) and reading["sections"]
    if not (has_body or has_sections):
        raise _report_gate(
            "reading must have a non-empty 'body' or a non-empty 'sections' array"
        )

    if _HAS_JSONSCHEMA:
        try:
            jsonschema.Draft202012Validator(report_schema).validate(obj)
        except jsonschema.ValidationError as exc:
            where = exc.json_path or "$"
            raise _report_gate(
                f"report failed schema validation at {where}: {exc.message}"
            ) from exc

    # Nested: every embedded chart_input must pass the same gate as --route.
    if chart_schema is None:
        chart_schema = load_schema()
    for i, art in enumerate(artefacts):
        if art.get("role") == "chart_input" and isinstance(art.get("object"), dict):
            try:
                validate_chart(art["object"], chart_schema)
            except ChartInputError as exc:
                raise _report_gate(
                    f"chart_artefacts[{i}] (role 'chart_input') failed the "
                    f"chart-input gate: {exc}"
                ) from exc


# --------------------------------------------------------------------------- #
# Input resolution (inline JSON | file path | stdin)
# --------------------------------------------------------------------------- #

def resolve_input(arg: str) -> dict[str, Any]:
    """Resolve a chart from a file path, inline JSON, or '-' (stdin)."""
    raw: str
    source: str
    if arg == "-":
        raw = sys.stdin.read()
        source = "<stdin>"
    else:
        candidate = Path(arg)
        if candidate.is_file():
            raw = candidate.read_text(encoding="utf-8")
            source = str(candidate)
        else:
            raw = arg
            source = "<inline>"

    try:
        obj = json.loads(raw)
    except json.JSONDecodeError as exc:
        fail(f"could not parse JSON from {source}: {exc} {_SCHEMA_HINT}")
    return obj


# --------------------------------------------------------------------------- #
# Modes: --list / --check / --route
# --------------------------------------------------------------------------- #

def _fragment_for(reading_type: str) -> Path:
    return FRAGMENTS_DIR / f"{reading_type}.md"


def _retrieval_module_for(reading_type: str) -> Path:
    return READING_TYPES_DIR / f"{reading_type}.md"


def list_types(schema: dict[str, Any]) -> int:
    types = reading_types(schema)
    width = max(len(t) for t in types)
    print(
        "Astrology skill — entry functions "
        f"(from {SCHEMA_PATH.relative_to(HERE)} → properties.reading_type.enum)"
    )
    for t in types:
        module = _retrieval_module_for(t)
        module_str = str(module.relative_to(HERE)) if module.is_file() else "(no retrieval module)"
        fragment = "yes" if _fragment_for(t).is_file() else "no"
        print(f"  {t:<{width}}  -> {module_str}  [fragment: {fragment}]")
    print(
        "Birth-data entry utility: tools/birth_to_chart.py "
        "(pre-processor; separate process, not imported by the skill runtime)"
    )
    return 0


def _collect_parity_issues(schema: dict[str, Any]) -> tuple[list[str], list[str]]:
    """Return (hard_failures, warnings) for the entry surface.

    Hard failures are structural drift that breaks the surface: a missing
    canonical template, duplicate enum values, or an entry fragment whose
    reading_type is absent from the schema enum. Missing retrieval modules are
    informational only — the generic route still covers the type.
    """
    types = reading_types(schema)
    hard_failures: list[str] = []
    warnings: list[str] = []

    if not CANONICAL_TEMPLATE.is_file():
        hard_failures.append(
            f"canonical template missing: {CANONICAL_TEMPLATE.relative_to(HERE)}"
        )

    if len(set(types)) != len(types):
        hard_failures.append(f"schema enum contains duplicate values: {types}")

    for t in types:
        if not _retrieval_module_for(t).is_file():
            warnings.append(
                f"enum value {t!r} has no references/reading_types/{t}.md "
                "(generic route still covers it; informational)"
            )

    if FRAGMENTS_DIR.is_dir():
        for path in sorted(FRAGMENTS_DIR.glob("*.md")):
            if path.name.startswith("_"):
                continue
            if path.stem not in types:
                hard_failures.append(
                    f"entry fragment {path.relative_to(HERE).as_posix()} has no "
                    "matching reading_type in the schema enum"
                )

    return hard_failures, warnings


def _collect_report_parity_issues(
    chart_schema: dict[str, Any],
) -> tuple[list[str], list[str]]:
    """Return (hard_failures, warnings) for the report standard.

    The report standard is optional: if ``report_schema.json`` is absent this
    is a no-op (the report gate is simply not installed). When present, the
    inlined ``reading_type`` / ``tradition_mode`` / ``tone`` enums must match
    ``chart_input_schema.json`` so the two contracts cannot drift. This is the
    single source of truth — ``quick_validate.py`` delegates here.
    """
    if not REPORT_SCHEMA_PATH.is_file():
        return [], []
    report_schema = load_report_schema()
    hard_failures: list[str] = []
    for field in ("reading_type", "tradition_mode", "tone"):
        input_enum = chart_schema.get("properties", {}).get(field, {}).get("enum")
        report_enum = (
            report_schema.get("properties", {}).get(field, {}).get("enum")
        )
        if report_enum is None:
            hard_failures.append(
                f"report_schema.json is missing an enum for {field!r}"
            )
            continue
        if input_enum is None or list(report_enum) != list(input_enum):
            hard_failures.append(
                f"report_schema.json {field} enum drifted from "
                f"chart_input_schema.json (report: {report_enum}; "
                f"input: {input_enum})"
            )
    return hard_failures, []


def check_parity(schema: dict[str, Any]) -> int:
    hard_failures, warnings = _collect_parity_issues(schema)
    report_hard, report_warns = _collect_report_parity_issues(schema)
    hard_failures += report_hard
    warnings += report_warns

    for w in warnings:
        print(f"WARN: {w}")

    if hard_failures:
        for message in hard_failures:
            print(f"FAIL: {message}", file=sys.stderr)
        raise SystemExit(2)

    if REPORT_SCHEMA_PATH.is_file():
        report_note = "; report_schema.json in parity"
    else:
        report_note = "; report_schema.json absent (report standard not installed)"
    print(
        f"PASS: entry surface is in parity "
        f"({len(reading_types(schema))} reading types; enum-driven; canonical template present)"
        f"{report_note}"
        + (f"; {len(warnings)} informational warning(s)" if warnings else "")
    )
    return 0


def route(arg: str, schema: dict[str, Any]) -> int:
    """Resolve + validate a chart, then print a route ticket to SKILL.md step 1."""
    obj = resolve_input(arg)
    try:
        validate_chart(obj, schema)
    except ChartInputError as exc:
        fail(str(exc))

    reading_type = obj["reading_type"]
    tradition_mode = obj.get("tradition_mode", "blended")
    tone = obj.get("tone", "practical")
    user_question = obj.get("user_question")

    module = _retrieval_module_for(reading_type)
    fragment = _fragment_for(reading_type)
    deep = " (deep: jsonschema)" if _HAS_JSONSCHEMA else " (deep: unavailable)"

    print("ENTRY ROUTE TICKET")
    print("==================")
    print(f"status:               VALID — gate passed{deep}")
    print(f"reading_type:         {reading_type}")
    print(f"tradition_mode:       {tradition_mode}")
    print(f"tone:                 {tone}")
    if user_question:
        preview = re.sub(r"\s+", " ", user_question).strip()
        if len(preview) > 80:
            preview = preview[:77] + "..."
        print(f"user_question:        {preview}")
    print(f"retrieval module:     {module.relative_to(HERE).as_posix()} "
          f"({'present' if module.is_file() else 'MISSING — use broader fallback'})")
    print(f"entry fragment:       prompts/entry/{reading_type}.md "
          f"({'present' if fragment.is_file() else 'absent — generic route'})")
    print()
    print("ROUTE -> Hand the resolved object to SKILL.md -> Workflow step 1")
    print("        (\"Parse the supplied chart data and reading request\").")
    print("        Do NOT calculate, rectify, or derive any chart factor.")
    return 0


def _describe_report_client(client: Any) -> str:
    if isinstance(client, dict):
        if client.get("name"):
            return str(client["name"])
        if client.get("label"):
            return str(client["label"])
    return "Anonymous"


def report(
    arg: str, report_schema: dict[str, Any], chart_schema: dict[str, Any]
) -> int:
    """Resolve + validate a report, then print a report ticket."""
    obj = resolve_input(arg)
    try:
        validate_report(obj, report_schema, chart_schema)
    except ReportError as exc:
        fail(str(exc))

    deep = " (deep: jsonschema)" if _HAS_JSONSCHEMA else " (deep: unavailable)"
    client = _describe_report_client(obj.get("client"))
    tz = obj.get("timezone")
    generated_at = obj.get("generated_at", "")
    when = f"{generated_at} ({tz})" if tz else generated_at
    artefacts = obj["chart_artefacts"]
    self_check = obj.get("self_check")
    refs = obj.get("references_used") or []

    print("REPORT TICKET")
    print("=============")
    print(f"status:               VALID — gate passed{deep}")
    print(f"report_id:            {obj.get('report_id')}")
    print(f"schema_version:       {obj.get('schema_version')}")
    print(f"generated_at:         {when}")
    print(f"client:               {client}")
    print(f"reading_type:         {obj.get('reading_type')}")
    if obj.get("tradition_mode"):
        print(f"tradition_mode:       {obj.get('tradition_mode')}")
    if obj.get("tone"):
        print(f"tone:                 {obj.get('tone')}")
    print(f"chart_artefacts:      {len(artefacts)} total")
    for i, art in enumerate(artefacts, start=1):
        role = art.get("role")
        if art.get("object") is not None:
            kind = "embedded"
        else:
            kind = f"ref: {art.get('ref')}"
        if role == "chart_input" and isinstance(art.get("object"), dict):
            note = " (chart_input gate: passed)"
        elif art.get("schema_ref"):
            note = f" ({art.get('schema_ref')})"
        else:
            note = ""
        print(f"  - [{i}] {role:<16} {kind}{note}")
    if self_check:
        print(f"self_check:           present ({len(self_check)} item(s))")
    else:
        print("self_check:           absent (client-facing deliverable)")
    print(f"references_used:      {len(refs)}")
    print()
    print("REPORT -> The envelope conforms to report_schema.json. Render to "
          "Markdown with")
    print("        references/templates/report_template.md, or deliver the "
          "JSON as-is.")
    print("        The report contains no derived chart factors "
          "(no-calculation boundary).")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="entry_commands.py",
        description="Astrology skill entry-command surface (enum-driven, "
                    "no calculation). See docs/entry_commands.md.",
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--list", action="store_true",
                       help="Enumerate reading types from the schema enum.")
    group.add_argument("--check", action="store_true",
                       help="Assert parity between the enum, fragments, "
                            "retrieval modules, and the report-schema enums.")
    group.add_argument("--route", metavar="CHART",
                       help="Resolve + validate a chart (file path, inline "
                            "JSON, or '-' for stdin) and print a route ticket "
                            "to SKILL.md step 1.")
    group.add_argument("--report", metavar="REPORT",
                       help="Resolve + validate a reading report (file path, "
                            "inline JSON, or '-' for stdin) against "
                            "report_schema.json and print a report ticket. "
                            "Embedded chart_input artefacts are held to the "
                            "same gate as --route.")
    args = parser.parse_args()

    schema = load_schema()
    if args.list:
        return list_types(schema)
    if args.check:
        return check_parity(schema)
    if args.route:
        return route(args.route, schema)
    if args.report:
        return report(args.report, load_report_schema(), schema)
    parser.error("no mode selected")  # unreachable: group is required
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
