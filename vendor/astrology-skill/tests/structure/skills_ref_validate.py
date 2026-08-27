#!/usr/bin/env python3
"""Optional official Agent Skills validation wrapper.

This check intentionally does not install the official validator. Local
validation must remain useful offline; when ``skills-ref`` is absent we print a
clear SKIP and use exit code 77 so the validation matrix can report the skip
without treating the offline environment as broken.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SKIP = 77


def main() -> int:
    exe = os.environ.get("SKILLS_REF_BIN") or shutil.which("skills-ref")
    if not exe:
        print(
            "SKIP: skills-ref not installed; install the official Agent Skills "
            "reference validator, then rerun `skills-ref validate .` or "
            "`python3 tests/run_validation_matrix.py`."
        )
        return SKIP

    target = Path(os.environ.get("SKILLS_REF_TARGET", str(ROOT))).resolve()
    cmd = [exe, "validate", str(target)]
    proc = subprocess.run(cmd, cwd=str(ROOT), text=True)
    if proc.returncode == 0:
        print(f"PASS: skills-ref validate {target}")
    else:
        print(
            "FAIL: skills-ref findings must be reconciled with quick_validate.py "
            "or documented as an intentional official/local delta."
        )
    return proc.returncode


if __name__ == "__main__":
    raise SystemExit(main())
