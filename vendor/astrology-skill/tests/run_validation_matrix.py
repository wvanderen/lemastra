#!/usr/bin/env python3
"""Single green/red validation matrix for the astrology skill (td-3b7112, A.1).

Re-runnable command that runs every deterministic validation surface and
prints one green/red matrix. Covers the six ``A.1`` checks from
``docs/e2e_validation_plan.md`` plus the two ``A.2`` structural-drift guards
landed in this task.

The matrix is the honest snapshot: a check is ``PASS`` (exit 0), ``FAIL``
(non-zero), or ``SKIP`` (a venv-only check when ``.venv`` is absent). The
script exits 0 only when every check is ``PASS``.

Today the matrix is **fully green**: ``A.2.1`` (gap-matrix drift) was the
last red row and went green once ``td-76f5e0`` (Phase B.2) refreshed
``references/reference_gap_matrix.md`` for Phase 5/6/7 enrichment and added a
mundane row. It now guards against regression.

Checks
------
A.1 deterministic suite (must be green before B–D proceed):
  1. quick_validate.py            (system python3; SKILL.md + entry parity)
  2. entry_commands.py --check    (system python3; enum/fragment parity)
  3. tests/entry/smoke_test.py    (system python3; full entry surface)
  4. tests/entry/end_to_end_test.py (.venv; calculator-backed stages)
  5. tools/smoke_test.py          (.venv; Asc/MC within ±0.05° on 3 fixtures)
  6. schema + agents/openai.yaml parse (.venv; ROADMAP Phase 5 static guard)
  7. tests/entry/report_test.py   (system python3; report gate --report)
  8. tools/timing_smoke_test.py   (.venv; solar_return/annual_profection/transit)
  9. tests/trigger/run_trigger_eval.py (system python3; trigger eval fixtures)
 10. tests/forward_testing/benchmark_summary.py --check
      (system python3; provider-free forward-test benchmark baseline)
 11. install.sh --smoke-test      (direct; staged published bundle)

A.2 structural-drift guards (new in td-3b7112):
  7. tests/structure/gap_matrix_drift.py        (system python3)
  8. tests/structure/source_notes_pointers.py   (system python3)

Run
---
    python3 tests/run_validation_matrix.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent  # tests/
ROOT = HERE.parent                    # repo root
VENV_PY = ROOT / ".venv" / "bin" / "python3"

# Width helpers for the printed table.
_COL_ID = 6
_COL_INTERP = 7


@dataclass
class Check:
    cid: str
    group: str
    label: str
    interpreter: str  # "system", "venv", or "direct"
    argv: list[str]
    note: str
    required: bool = True
    # Populated by run().
    status: str = "SKIP"
    detail: str = field(default="")


CHECKS: list[Check] = [
    Check("A.1.1", "A.1", "quick_validate.py",
          "system", ["quick_validate.py"],
          "SKILL.md metadata + folded entry parity"),
    Check("A.1.2", "A.1", "entry_commands.py --check",
          "system", ["entry_commands.py", "--check"],
          "enum <-> fragment parity (8 reading types)"),
    Check("A.1.3", "A.1", "tests/entry/smoke_test.py",
          "system", ["tests/entry/smoke_test.py"],
          "full entry-command surface"),
    Check("A.1.4", "A.1", "tests/entry/end_to_end_test.py",
          "venv", ["tests/entry/end_to_end_test.py"],
          "calculator-backed stages + failure modes"),
    Check("A.1.5", "A.1", "tools/smoke_test.py",
          "venv", ["tools/smoke_test.py"],
          "Asc/MC within +/-0.05 deg on 3 fixtures"),
    Check("A.1.6", "A.1", "schema + agents/openai.yaml parse",
          "venv", ["tests/structure/schema_and_agents_parse.py"],
          "ROADMAP Phase 5 static-asset guard (+ report schema/output keys)"),
    Check("A.1.7", "A.1", "tests/entry/report_test.py",
          "system", ["tests/entry/report_test.py"],
          "report gate (--report) + nested chart_input validation"),
    Check("A.1.8", "A.1", "tools/timing_smoke_test.py",
          "venv", ["tools/timing_smoke_test.py"],
          "solar_return / annual_profection / transit computation (td-9dfe2c)"),
    Check("A.1.9", "A.1", "tests/trigger/run_trigger_eval.py",
          "system", ["tests/trigger/run_trigger_eval.py"],
          "SKILL.md trigger eval fixture structure (td-4aea8b)"),
    Check("A.1.10", "A.1", "tests/forward_testing/benchmark_summary.py --check",
          "system", ["tests/forward_testing/benchmark_summary.py", "--check"],
          "provider-free blind forward-test retrieval/output benchmark"),
    Check("A.1.11", "A.1", "install.sh --smoke-test",
          "direct", ["./install.sh", "--smoke-test"],
          "staged published bundle profile passes entry parity"),
    Check("A.2.1", "A.2", "tests/structure/gap_matrix_drift.py",
          "system", ["tests/structure/gap_matrix_drift.py"],
          "gap matrix vs on-disk modules (regression guard)"),
    Check("A.2.2", "A.2", "tests/structure/source_notes_pointers.py",
          "system", ["tests/structure/source_notes_pointers.py"],
          "Source-notes pointer targets exist"),
    Check("A.3.1", "A.3", "skills-ref validate",
          "system", ["tests/structure/skills_ref_validate.py"],
          "optional official Agent Skills validator; SKIP when absent",
          required=False),
]


def _resolve_interpreter(kind: str) -> str | None:
    if kind == "system":
        return sys.executable or shutil.which("python3") or "python3"
    if kind == "venv":
        if VENV_PY.is_file():
            return str(VENV_PY)
        return None
    if kind == "direct":
        return ""
    raise ValueError(f"unknown interpreter kind: {kind!r}")


def _last_meaningful_line(stdout: str, stderr: str) -> str:
    """Return a one-line summary of the check's output."""
    blob = "\n".join(part for part in (stdout, stderr) if part).strip()
    if not blob:
        return ""
    # Prefer the final PASS/FAIL/DRIFT/SKIP summary line.
    for line in reversed(blob.splitlines()):
        stripped = line.strip()
        if not stripped:
            continue
        if stripped[:6].upper() in ("PASS: ", "FAIL: ", "DRIFT:", "SKIP: ") or \
                stripped.lower().startswith(("pass", "all ", "drift")):
            return stripped
    return blob.splitlines()[-1].strip()


def run_check(check: Check) -> None:
    py = _resolve_interpreter(check.interpreter)
    if py is None:
        check.status = "SKIP"
        check.detail = ".venv absent (venv-only check)"
        return
    argv = check.argv if check.interpreter == "direct" else [py, *check.argv]
    try:
        proc = subprocess.run(
            argv, capture_output=True, text=True, cwd=str(ROOT), timeout=120,
        )
    except subprocess.TimeoutExpired:
        check.status = "FAIL"
        check.detail = "timed out after 120s"
        return
    check.status = "PASS" if proc.returncode == 0 else "FAIL"
    if not check.required and proc.returncode == 77:
        check.status = "SKIP"
    check.detail = _last_meaningful_line(proc.stdout, proc.stderr)


def print_matrix(checks: list[Check]) -> None:
    print()
    print("Astrology skill — deterministic validation matrix")
    print("=" * 72)
    label_w = max(len(c.label) for c in checks)
    print(f"{'ID':<{_COL_ID}}  {'Check':<{label_w}}  {'Status':<6}  "
          f"{'Interp':<{_COL_INTERP}}  Note")
    print("-" * (72))
    last_group = None
    for c in checks:
        if c.group != last_group:
            if last_group is not None:
                print()
            last_group = c.group
        print(f"{c.cid:<{_COL_ID}}  {c.label:<{label_w}}  {c.status:<6}  "
              f"{c.interpreter:<{_COL_INTERP}}  {c.note}")
        # Show the captured summary line only when it adds information
        # (non-PASS, or a SKIP/FAIL explanation).
        if c.status != "PASS" and c.detail and c.detail != c.note:
            print(f"{'':<{_COL_ID}}  {'':<{label_w}}  {'':<6}  "
                  f"{'':<{_COL_INTERP}}  -> {c.detail}")
    print()


def main() -> int:
    for check in CHECKS:
        run_check(check)

    print_matrix(CHECKS)

    # Group tallies.
    groups: dict[str, list[Check]] = {}
    for c in CHECKS:
        groups.setdefault(c.group, []).append(c)

    for gid in sorted(groups):
        row = groups[gid]
        p = sum(1 for c in row if c.status == "PASS")
        f = sum(1 for c in row if c.status == "FAIL")
        s = sum(1 for c in row if c.status == "SKIP")
        tag = f"{p}/{len(row)} PASS"
        if f:
            tag += f", {f} FAIL"
        if s:
            tag += f", {s} SKIP"
        print(f"  {gid} ({len(row)} checks): {tag}")

    fails = [c for c in CHECKS if c.status == "FAIL"]
    required_skips = [c for c in CHECKS if c.status == "SKIP" and c.required]
    optional_skips = [c for c in CHECKS if c.status == "SKIP" and not c.required]
    print()
    if not fails and not required_skips:
        print("MATRIX GREEN: every deterministic check passed.")
        if optional_skips:
            print(
                f"MATRIX OPTIONAL: {len(optional_skips)} optional check(s) skipped "
                "without failing offline validation."
            )
        return 0
    if fails:
        print(f"MATRIX RED: {len(fails)} check(s) failed:")
        for c in fails:
            print(f"  - [{c.cid}] {c.label}: {c.detail}")
    if required_skips:
        print(f"MATRIX AMBER: {len(required_skips)} required check(s) skipped:")
        for c in required_skips:
            print(f"  - [{c.cid}] {c.label}: {c.detail}")
    if optional_skips:
        print(f"MATRIX OPTIONAL: {len(optional_skips)} optional check(s) skipped:")
        for c in optional_skips:
            print(f"  - [{c.cid}] {c.label}: {c.detail}")
    print()
    print(
        "Note: A.2.1 (gap-matrix drift) is a regression guard. It was red "
        "until td-76f5e0 (Phase B.2) refreshed references/reference_gap_matrix.md; "
        "it should now stay green so the matrix cannot silently drift again."
    )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
