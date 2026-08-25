#!/usr/bin/env python3
"""Basic validation for this Codex skill package."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


REQUIRED_FIELDS = {"name", "description"}
OPTIONAL_FIELDS = {"license", "compatibility", "metadata", "allowed-tools"}
ALLOWED_FIELDS = REQUIRED_FIELDS | OPTIONAL_FIELDS
NAME_RE = re.compile(r"^[a-z0-9-]+$")
NAME_MAX_LENGTH = 64
DESCRIPTION_MAX_LENGTH = 1024
TRIGGER_WORDS = ("use when", "trigger", "use this skill")
PURPOSE_WORDS = ("interpret", "interpretation", "reading", "synthesize", "synthesis")


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def parse_frontmatter(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()

    if not lines or lines[0] != "---":
        fail("SKILL.md must start with YAML frontmatter delimited by ---")

    try:
        end = lines[1:].index("---") + 1
    except ValueError:
        fail("SKILL.md frontmatter must end with ---")

    metadata: dict[str, str] = {}
    current_key: str | None = None
    for line_number, line in enumerate(lines[1:end], start=2):
        if not line.strip():
            continue
        if line[0].isspace():
            if current_key is None:
                fail(f"frontmatter line {line_number} is indented without a field")
            metadata[current_key] = f"{metadata[current_key]}\n{line}".rstrip()
            continue
        if ":" not in line:
            fail(f"frontmatter line {line_number} must be a key: value pair")

        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()

        if not key:
            fail(f"frontmatter line {line_number} has an empty key")
        if key in metadata:
            fail(f"frontmatter field {key!r} is duplicated")
        metadata[key] = value
        current_key = key

    return metadata


def validate_skill_name(name: str, expected_name: str) -> None:
    if not name:
        fail("skill name must be non-empty")
    if len(name) > NAME_MAX_LENGTH:
        fail(f"skill name must be <= {NAME_MAX_LENGTH} characters")
    if not NAME_RE.fullmatch(name):
        fail("skill name must contain only lowercase letters, numbers, and hyphens")
    if name.startswith("-") or name.endswith("-"):
        fail("skill name must not start or end with a hyphen")
    if "--" in name:
        fail("skill name must not contain consecutive hyphens")
    if name != expected_name:
        fail(
            "skill name must match parent directory "
            f"({name!r} != {expected_name!r})"
        )


def validate_metadata(metadata: dict[str, str], skill_path: Path) -> None:
    fields = set(metadata)
    extra_fields = fields - ALLOWED_FIELDS
    missing_fields = REQUIRED_FIELDS - fields

    if extra_fields:
        fail(f"frontmatter contains unsupported fields: {', '.join(sorted(extra_fields))}")
    if missing_fields:
        fail(f"frontmatter is missing required fields: {', '.join(sorted(missing_fields))}")

    validate_skill_name(metadata["name"], skill_path.parent.name)

    description = metadata["description"]
    if not description:
        fail("description must be non-empty")
    if len(description) > DESCRIPTION_MAX_LENGTH:
        fail(f"description must be <= {DESCRIPTION_MAX_LENGTH} characters")

    normalized_description = description.lower()
    if not any(word in normalized_description for word in PURPOSE_WORDS):
        fail("description must state what the skill does")
    if not any(word in normalized_description for word in TRIGGER_WORDS):
        fail("description must state when the skill should trigger")


def validate_entry_surface() -> None:
    """Run the entry-command parity check if the surface is present.

    Folded in per docs/entry_commands.md §8 so the existing validation command
    catches enum/fragment drift. Informational warnings are printed but do not
    fail the build; only hard parity failures do.
    """
    entry = Path(__file__).resolve().parent / "entry_commands.py"
    schema = Path(__file__).resolve().parent / "assets/schemas/chart_input_schema.json"
    template = Path(__file__).resolve().parent / "prompts/entry/_reading.md"
    if not (entry.is_file() and schema.is_file() and template.is_file()):
        return  # entry surface not installed; nothing to check

    import importlib.util
    spec = importlib.util.spec_from_file_location("entry_commands", entry)
    if spec is None or spec.loader is None:
        return
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    hard_failures, warnings = module._collect_parity_issues(
        json.loads(schema.read_text(encoding="utf-8"))
    )
    for w in warnings:
        print(f"WARN: {w}")
    if hard_failures:
        fail("entry surface parity check failed: " + "; ".join(hard_failures))


def validate_report_schema_parity() -> None:
    """Assert report_schema.json enums match chart_input_schema.json.

    Delegates to ``entry_commands._collect_report_parity_issues`` so there is a
    single source of truth for report parity (the same function ``--check``
    uses at runtime). The report standard is optional: if
    ``report_schema.json`` is absent this is a no-op.
    """
    entry = Path(__file__).resolve().parent / "entry_commands.py"
    report_schema = (
        Path(__file__).resolve().parent / "assets" / "schemas" / "report_schema.json"
    )
    if not report_schema.is_file():
        return  # report standard not installed; nothing to check
    if not entry.is_file():
        return  # entry surface not installed; nothing to delegate to

    import importlib.util  # noqa: PLC0415

    spec = importlib.util.spec_from_file_location("entry_commands", entry)
    if spec is None or spec.loader is None:
        return
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    schema_path = Path(__file__).resolve().parent / "assets" / "schemas" / "chart_input_schema.json"
    chart_schema = json.loads(schema_path.read_text(encoding="utf-8"))
    hard_failures, _warnings = module._collect_report_parity_issues(chart_schema)
    if hard_failures:
        fail("report schema parity check failed: " + "; ".join(hard_failures))
    print("PASS: report_schema.json enums match chart_input_schema.json")


def main() -> None:
    skill_path = Path(__file__).with_name("SKILL.md")
    if not skill_path.exists():
        fail("SKILL.md not found")

    metadata = parse_frontmatter(skill_path)
    validate_metadata(metadata, skill_path)
    print("PASS: SKILL.md metadata is valid")

    validate_entry_surface()
    validate_report_schema_parity()


if __name__ == "__main__":
    main()
