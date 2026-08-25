#!/usr/bin/env python3
"""Structural drift check: gap matrix vs on-disk reality (td-3b7112, A.2.1).

``references/reference_gap_matrix.md`` is a **planning artifact** that
summarizes Depth / Coverage / Headline-gap per reference category. It was
snapshot before Phase 5/6/7 enrichment landed, so several of its rows now
contradict the on-disk modules they describe, and it has no row for the
``mundane`` reading type added in Phase 7.

This script asserts four kinds of consistency between the matrix and the
on-disk reference library. It is a **regression guard**: it was red until
td-76f5e0 (Phase B.2) refreshed the matrix, and stays green thereafter so the
matrix cannot silently drift again.

Checks
------
1. **Enum coverage.** Every ``reading_type`` in
   ``assets/schemas/chart_input_schema.json`` must be mentioned in the matrix
   (the matrix is the planning doc that prioritizes coverage; an enum value
   with no row and no mention is invisible to planning). Catches the missing
   ``mundane`` row today.

2. **Module-count parity.** The matrix's per-category "Modules" count must
   match the number of on-disk ``*.md`` modules for that category. Catches
   the Reading-types (9 vs 11) and Synthesis-patterns (12 vs 15) drift today.

3. **Absence-claim contradictions.** If a row's Headline-gap claims a doctrine
   is absent ("No Ptolemaic sign-powers", "No classical house doctrine",
   "thin each"), but the on-disk modules in that category actually contain a
   matching enrichment section, flag the contradiction. Each trigger is the
   *specific stale phrase*; updating the phrase when the matrix is refreshed
   is the intended fix path.

4. **Depth-floor contradictions.** If a row's Depth is "Starter" but the
   on-disk modules uniformly carry an enrichment section (e.g.
   ``## Classical notes``), the Starter tier understates reality.

The category→directory and trigger→disprover mappings live in the registries
below. They are small, human-readable, and documented. Extend them when a new
category is enriched or when the matrix is rewritten.

Run
---
    python3 tests/structure/gap_matrix_drift.py

Exits 0 if the matrix is consistent with the disk; exits 1 with a DRIFT report
otherwise. Importable: ``collect_findings()`` returns the list of findings.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Callable

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
MATRIX = ROOT / "references" / "reference_gap_matrix.md"
SCHEMA = ROOT / "assets" / "schemas" / "chart_input_schema.json"
REFERENCES = ROOT / "references"

# Allow running the matrix check without the chart schema being installed
# (defensive; it is always present in this repo).
DEFAULT_ENUM = ["natal", "transit", "synastry", "solar_return",
                "annual_profection", "horary", "electional", "mundane"]


class Finding(tuple):  # type: ignore[misc]
    """A single drift finding (check, category, message)."""

    __slots__ = ()

    def __new__(cls, check: str, category: str, message: str) -> "Finding":
        return tuple.__new__(cls, (check, category, message))

    @property
    def check(self) -> str:
        return self[0]  # type: ignore[no-any-return]

    @property
    def category(self) -> str:
        return self[1]  # type: ignore[no-any-return]

    @property
    def message(self) -> str:
        return self[2]  # type: ignore[no-any-return]

    def render(self) -> str:
        return f"[{self.check}] {self.category}: {self.message}"


# --------------------------------------------------------------------------- #
# Registries (curated invariants; update when the matrix is refreshed)
# --------------------------------------------------------------------------- #

#: Matrix "Category" cell -> relative directory under references/.
#: Used by the module-count parity check. Every category maps to a flat
#: directory of ``*.md`` modules; ``Path.glob("*.md")`` is non-recursive, so
#: e.g. ``aspects`` does not swallow ``by_planet_pair/`` and ``traditions``
#: does not swallow ``classical/``.
CATEGORY_DIRS: dict[str, str] = {
    "Foundations": "foundations",
    "Traditions, broad": "traditions",
    "Traditions, classical focused": "traditions/classical",
    "Traditions, modern focused": "traditions/modern",
    "Planets": "planets",
    "Signs": "signs",
    "Houses": "houses",
    "Aspect types": "aspects",
    "Planet-pair aspects": "aspects/by_planet_pair",
    "Planet in sign": "placements/planet_in_sign",
    "Planet in house": "placements/planet_in_house",
    "Conditions": "placements/planet_condition",
    "Rulerships": "rulerships",
    "Reading types": "reading_types",
    "Synthesis patterns": "synthesis_patterns",
}

#: Absence-claim contradictions.
#: (category, trigger phrase in Headline-gap, disprover glob under references/,
#:  disprover section heading, human label of the doctrine).
ABSENCE_CLAIMS: list[tuple[str, str, str, str, str]] = [
    (
        "Signs",
        "No Ptolemaic sign-powers",
        "signs/*.md",
        "## Classical sign-powers",
        "Ptolemaic sign-powers",
    ),
    (
        "Houses",
        "No classical house doctrine",
        "houses/*.md",
        "## Classical notes",
        "classical house doctrine (topics, joys, derived houses)",
    ),
    (
        "Conditions",
        "thin each",
        "placements/planet_condition/*.md",
        "## Classical notes",
        "per-condition classical doctrine",
    ),
]

#: Depth-floor contradictions.
#: (category, stale Depth cell value, disprover glob, enrichment heading,
#:  minimum fraction of modules that must carry the heading to fire).
DEPTH_FLOORS: list[tuple[str, str, str, str, float]] = [
    ("Signs", "Starter", "signs/*.md", "## Classical sign-powers", 0.75),
    ("Conditions", "Starter", "placements/planet_condition/*.md",
     "## Classical notes", 0.75),
]


# --------------------------------------------------------------------------- #
# Parsers
# --------------------------------------------------------------------------- #

def _read_schema_enum() -> list[str]:
    if not SCHEMA.is_file():
        return list(DEFAULT_ENUM)
    try:
        doc = json.loads(SCHEMA.read_text(encoding="utf-8"))
        values = doc["properties"]["reading_type"]["enum"]
        if isinstance(values, list) and all(isinstance(v, str) for v in values):
            return list(values)
    except (json.JSONDecodeError, KeyError, TypeError):
        pass
    return list(DEFAULT_ENUM)


def parse_summary_table(matrix_text: str) -> dict[str, dict[str, str]]:
    """Return ``{category: {column: value}}`` from the Summary matrix table.

    Columns: Modules, Depth, Coverage, Priority, Risk, Headline gap.
    """
    rows: dict[str, dict[str, str]] = {}
    in_table = False
    columns = ["Modules", "Depth", "Coverage", "Priority", "Risk", "Headline gap"]
    for line in matrix_text.splitlines():
        if line.startswith("## "):
            in_table = "summary matrix" in line.lower()
            continue
        if not in_table or not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.split("|")]
        # [''] before first '|' and after last '|'; drop empties at ends.
        if cells and cells[0] == "":
            cells = cells[1:]
        if cells and cells[-1] == "":
            cells = cells[:-1]
        if len(cells) < 7:
            continue
        category = cells[0]
        if category.lower() == "category" or set(category) <= {"-", " "}:
            continue
        rows[category] = dict(zip(columns, cells[1:7]))
    return rows


def _count_modules(rel_dir: str) -> int:
    target = REFERENCES / rel_dir
    if not target.is_dir():
        return -1
    return len(list(target.glob("*.md")))


# --------------------------------------------------------------------------- #
# Checks (each returns a list of Findings)
# --------------------------------------------------------------------------- #

def check_enum_coverage(matrix_text: str, enum: list[str]) -> list[Finding]:
    findings: list[Finding] = []
    for reading_type in enum:
        pattern = r"\b" + re.escape(reading_type) + r"\b"
        if not re.search(pattern, matrix_text):
            findings.append(Finding(
                "enum-coverage",
                "(schema enum)",
                f"reading_type {reading_type!r} is in the chart_input_schema "
                "enum but is not mentioned anywhere in the gap matrix "
                "(no row, no module list, no priority).",
            ))
    return findings


def check_module_counts(table: dict[str, dict[str, str]]) -> list[Finding]:
    findings: list[Finding] = []
    for category, rel_dir in CATEGORY_DIRS.items():
        row = table.get(category)
        if not row:
            continue
        claimed_raw = row["Modules"]
        match = re.search(r"\d+", claimed_raw)
        if not match:
            continue  # non-numeric module cell (e.g. prose); skip
        claimed = int(match.group())
        actual = _count_modules(rel_dir)
        if actual < 0:
            continue  # directory not present; nothing to compare
        if claimed != actual:
            findings.append(Finding(
                "module-count",
                category,
                f"matrix claims Modules={claimed} but on-disk has {actual} "
                f"*.md modules under references/{rel_dir}/.",
            ))
    return findings


def _fraction_with_heading(rel_glob: str, heading: str) -> tuple[int, int]:
    files = sorted(REFERENCES.glob(rel_glob))
    if not files:
        return (0, 0)
    hits = sum(1 for f in files if heading in f.read_text(encoding="utf-8"))
    return (hits, len(files))


def check_absence_claims(table: dict[str, dict[str, str]]) -> list[Finding]:
    findings: list[Finding] = []
    for category, trigger, rel_glob, heading, label in ABSENCE_CLAIMS:
        row = table.get(category)
        if not row:
            continue
        headline = row["Headline gap"]
        if trigger not in headline:
            continue  # phrase already updated; no contradiction
        hits, total = _fraction_with_heading(rel_glob, heading)
        if total and hits >= max(1, total // 2):
            findings.append(Finding(
                "absence-claim",
                category,
                f'Headline-gap says "{trigger}" (i.e. {label} absent), but '
                f"{hits}/{total} on-disk modules under references/{rel_glob} "
                f"contain a `{heading}` section. Update the matrix to reflect "
                "the enriched modules.",
            ))
    return findings


def check_depth_floors(table: dict[str, dict[str, str]]) -> list[Finding]:
    findings: list[Finding] = []
    for category, stale_depth, rel_glob, heading, threshold in DEPTH_FLOORS:
        row = table.get(category)
        if not row:
            continue
        depth = row["Depth"]
        # Depth cells may compound (e.g. "Starter (1 Rich)"); fire only when
        # the cell's primary tier equals the stale value.
        if not depth.strip().startswith(stale_depth):
            continue
        hits, total = _fraction_with_heading(rel_glob, heading)
        frac = (hits / total) if total else 0.0
        if frac >= threshold:
            findings.append(Finding(
                "depth-floor",
                category,
                f'Depth is "{depth}" but {hits}/{total} on-disk modules under '
                f"references/{rel_glob} carry a `{heading}` section; the "
                f"category is past the Starter tier.",
            ))
    return findings


# --------------------------------------------------------------------------- #
# Entry points
# --------------------------------------------------------------------------- #

def collect_findings() -> list[Finding]:
    """Run every drift check and return the combined findings list."""
    matrix_text = MATRIX.read_text(encoding="utf-8")
    table = parse_summary_table(matrix_text)
    enum = _read_schema_enum()
    findings: list[Finding] = []
    findings += check_enum_coverage(matrix_text, enum)
    findings += check_module_counts(table)
    findings += check_absence_claims(table)
    findings += check_depth_floors(table)
    return findings


def main() -> int:
    if not MATRIX.is_file():
        print(f"FAIL: matrix not found: {MATRIX.relative_to(ROOT)}", file=sys.stderr)
        return 2
    findings = collect_findings()
    if not findings:
        print(
            "PASS: gap matrix is consistent with on-disk reference modules "
            f"(enum coverage, module counts, absence-claims, depth floors)."
        )
        return 0
    print(f"DRIFT: gap matrix contradicts on-disk reality ({len(findings)} finding(s)):")
    for f in findings:
        print("  " + f.render())
    print()
    print(
        "Regression guard: this check was red until td-76f5e0 (Phase B.2) "
        "refreshed references/reference_gap_matrix.md for Phase 5/6/7 "
        "enrichment and added a mundane row; keep it green so the matrix "
        "cannot silently drift again."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
