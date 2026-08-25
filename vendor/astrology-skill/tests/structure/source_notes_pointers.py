#!/usr/bin/env python3
"""Structural drift check: Source-notes pointer targets exist (td-3b7112, A.2.2).

Every ``## Source notes`` section in ``references/`` points at one or more
companion files via backtick-quoted relative paths (e.g.
``references/classical_doctrine_notes.md``). Phase 8 (``td-2a1b24``) found and
fixed four broken such pointers by hand; this script is the regression guard
so a future edit cannot silently re-introduce a dangling pointer.

Scope
-----
For each ``## Source notes`` section, scan for backtick-quoted tokens that name
a target **under** ``references/`` (the token starts with ``references/`` and
looks like a markdown path). For each such target, assert the file exists on
disk. Archive IDs, URLs, and bare prose are ignored.

This is deliberately narrow: it only checks intra-repo pointer targets, not
external URLs or archive identifiers, which are validated separately in the
rights ledger.

Run
---
    python3 tests/structure/source_notes_pointers.py

Exits 0 if every named target resolves; exits 1 with a per-file DRIFT report
otherwise. Importable: ``collect_findings()`` returns the list of findings.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
REFERENCES = ROOT / "references"

# A backtick-quoted token that names an intra-references markdown target.
# Captures paths like `references/classical_doctrine_notes.md` or
# `references/traditions/modern/outer_planets.md`.
POINTER_RE = re.compile(r"`(references/[^`]+?\.(?:md|txt))`")
# Section heading that opens a Source notes block.
SOURCE_NOTES_RE = re.compile(r"^##\s+Source notes\b", re.MULTILINE)


class Finding(tuple):  # type: ignore[misc]
    """A single broken-pointer finding (source_file, target, message)."""

    __slots__ = ()

    def __new__(cls, source_file: str, target: str, message: str) -> "Finding":
        return tuple.__new__(cls, (source_file, target, message))

    @property
    def source_file(self) -> str:
        return self[0]  # type: ignore[no-any-return]

    @property
    def target(self) -> str:
        return self[1]  # type: ignore[no-any-return]

    @property
    def message(self) -> str:
        return self[2]  # type: ignore[no-any-return]

    def render(self) -> str:
        return f"{self.source_file}: {self.message}"


def _extract_source_notes_sections(text: str) -> list[str]:
    """Return the body of every ``## Source notes`` section in ``text``.

    A section runs from its heading to the next ``## `` heading or end of file.
    """
    sections: list[str] = []
    lines = text.splitlines()
    i = 0
    n = len(lines)
    while i < n:
        if SOURCE_NOTES_RE.match(lines[i]):
            start = i + 1
            j = start
            while j < n and not lines[j].startswith("## "):
                j += 1
            sections.append("\n".join(lines[start:j]))
            i = j
        else:
            i += 1
    return sections


def _targets_named(section_body: str) -> list[str]:
    return POINTER_RE.findall(section_body)


def collect_findings() -> list[Finding]:
    findings: list[Finding] = []
    for path in sorted(REFERENCES.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        sections = _extract_source_notes_sections(text)
        if not sections:
            continue
        rel = path.relative_to(ROOT).as_posix()
        seen: set[str] = set()
        for body in sections:
            for target in _targets_named(body):
                if target in seen:
                    continue
                seen.add(target)
                target_path = ROOT / target
                if not target_path.is_file():
                    findings.append(Finding(
                        rel,
                        target,
                        f"Source notes names `{target}` but no such file "
                        "exists under references/.",
                    ))
    return findings


def main() -> int:
    findings = collect_findings()
    if not findings:
        # Also report how many pointers were verified, for confidence.
        verified = 0
        files_with_pointers = 0
        for path in sorted(REFERENCES.rglob("*.md")):
            text = path.read_text(encoding="utf-8")
            bodies = _extract_source_notes_sections(text)
            count_this = 0
            for body in bodies:
                # de-dup per file
                count_this += len(set(_targets_named(body)))
            if count_this:
                files_with_pointers += 1
                verified += count_this
        print(
            "PASS: every Source-notes pointer target exists under references/ "
            f"({verified} distinct pointer(s) across {files_with_pointers} "
            "file(s) verified)."
        )
        return 0
    print(
        f"DRIFT: {len(findings)} broken Source-notes pointer target(s):"
    )
    for f in findings:
        print("  " + f.render())
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
