#!/usr/bin/env python3
"""Chart diagram renderer tests.

Task: ``td-b5b155``.

Run
---
    python3 tests/entry/chart_diagram_test.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SCRIPT = ROOT / "tools" / "chart_diagram.py"
NATAL = ROOT / "chart.json"

PY = sys.executable


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _check(condition: bool, msg: str) -> None:
    print(f"  {'PASS' if condition else 'FAIL'}: {msg}")
    if not condition:
        _fail(msg)


def _run(args: list[str], stdin: str | None = None) -> subprocess.CompletedProcess:
    return subprocess.run(
        [PY, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
        input=stdin,
    )


def test_svg_from_canonical_chart() -> None:
    proc = _run([str(NATAL), "--title", "Fixture Chart"])
    _check(proc.returncode == 0, f"canonical chart exits 0 (got {proc.returncode})")
    out = proc.stdout
    _check(out.startswith("<svg "), "output starts with an SVG element")
    _check('aria-label="Fixture Chart"' in out, "SVG carries the accessible title")
    _check("♈" in out and "♓" in out, "SVG renders the zodiac ring")
    _check("☉" in out and "♄" in out, "SVG renders supplied planet glyphs")
    _check("Asc" in out and "MC" in out, "SVG renders supplied angles")
    _check("#c75c56" in out, "SVG renders square aspect lines")


def test_html_from_stdin() -> None:
    chart = NATAL.read_text(encoding="utf-8")
    proc = _run(["-", "--format", "html", "--theme", "light"], stdin=chart)
    _check(proc.returncode == 0, f"stdin HTML exits 0 (got {proc.returncode})")
    _check(proc.stdout.startswith("<!doctype html>"), "HTML wrapper starts with doctype")
    _check("<svg " in proc.stdout, "HTML wrapper contains the SVG")
    _check("#f7f4ed" in proc.stdout, "light theme is applied")


def test_legacy_example_shape_routes() -> None:
    legacy = {
        "ascendant": {"longitude": 112.0},
        "midheaven": {"longitude": 6.0},
        "houses": {
            "House 1": {"longitude": 90},
            "House 10": {"longitude": 0},
        },
        "planets": {
            "Sun": {"longitude": 215.5, "degree": 5.5, "sign": "Scorpio"},
            "Moon": {"longitude": 257.5, "degree": 17.5, "sign": "Sagittarius"},
        },
        "aspects": [{"planet1": "Sun", "aspect": "trine", "planet2": "Moon"}],
    }
    proc = _run([json.dumps(legacy)])
    _check(proc.returncode == 0, f"legacy chart exits 0 (got {proc.returncode})")
    _check("☉" in proc.stdout and "☽" in proc.stdout, "legacy planets render")
    _check("#4d9a63" in proc.stdout, "legacy aspect keys render")


def test_escaping() -> None:
    chart = {
        "reading_type": "natal",
        "chart_data": {
            "placements": [
                {
                    "body": "<script>alert(1)</script>",
                    "sign": "Aries",
                    "degree": 2,
                    "absolute_degree": 2,
                }
            ]
        },
    }
    proc = _run([json.dumps(chart), "--title", 'A "quote" & tag'])
    _check(proc.returncode == 0, f"escaping chart exits 0 (got {proc.returncode})")
    _check("&quot;quote&quot; &amp; tag" in proc.stdout, "title is escaped")
    _check("<script>" not in proc.stdout, "raw script tag is not emitted")
    _check("&lt;" in proc.stdout, "planet fallback label is escaped")


def test_invalid_input_fails_cleanly() -> None:
    proc = _run(["{not-json"])
    _check(proc.returncode == 2, f"invalid JSON exits 2 (got {proc.returncode})")
    _check("could not parse JSON" in proc.stderr, "invalid JSON names parse failure")


def main() -> None:
    test_svg_from_canonical_chart()
    test_html_from_stdin()
    test_legacy_example_shape_routes()
    test_escaping()
    test_invalid_input_fails_cleanly()


if __name__ == "__main__":
    main()
