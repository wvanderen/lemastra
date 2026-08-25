#!/usr/bin/env python3
"""Major-essential-dignity smoke test for tools/birth_to_chart.py.

Covers td-9832f0: computed charts must surface the four MAJOR essential
dignities (domicile / exaltation / detriment / fall) because they are a
deterministic function of planet + sign — the same geometry the tool already
emits. Minor essential dignity (triplicity / term / face) and accidental
``condition`` stay empty / interpretive.

How this stays independent
--------------------------
The expected dignity tags are NOT read from the tool. They are re-derived here
from the authoritative in-repo doctrine table (Ptolemy, *Tetrabiblos* I.17 for
domicile, I.19 for exaltation, with detriment/fall as the opposite signs — see
``references/classical_doctrine_notes.md`` §"Dignities and debilities"). The
fixture is the same documented birth data the other smoke tests use
(1992-10-28 22:30 Lexington, KY): the chart that motivated the issue, where
Mars in Cancer = fall and Saturn in Aquarius = domicile had to be applied by
hand because the arrays were empty.

Two layers are checked:

  1. **Integration** — run the real script for the known chart and assert the
     emitted ``dignity`` arrays (Mars/Cancer == ["fall"], Saturn/Aquarius ==
     ["domicile"], Sun/Scorpio == []), plus the guardrail that every
     ``condition`` array is empty and no minor-dignity tag leaks in.
  2. **Table coverage** — import the tool and assert ``major_essential_dignity``
     for every (classical planet, sign) pair against the doctrine table,
     including Mercury-in-Virgo = ["domicile", "exaltation"] and that the outer
     planets / True Node / unknown bodies always return [].

Run
---
    python tools/dignity_smoke_test.py

Use the interpreter that has ``pyswisseph`` installed (see
``tools/requirements.txt``). Exits non-zero on any failure. The integration
fixture also runs through ``--validate`` against ``chart_input_schema.json``.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "birth_to_chart.py"
SCHEMA = HERE.parent / "assets" / "schemas" / "chart_input_schema.json"

SIGN = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
        "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]

# Documented birth data (Cancer Ascendant, Sun 5°58′ Scorpio) — the chart from
# the "Discovered while" note in td-9832f0.
BIRTH_ARGS = ["--date", "1992-10-28", "--time", "22:30",
              "--lat", "38.0406", "--lon", "-84.5037",
              "--tz", "America/New_York", "--house-system", "Whole Sign",
              "--place", "Lexington, KY"]

# Doctrine table (planet -> {sign: [tags]}) reconstructed from
# references/classical_doctrine_notes.md: domicile I.17, exaltation I.19,
# detriment = opposite of domicile, fall = opposite of exaltation.
DOCTRINE = {
    "Sun":    {"Leo": ["domicile"], "Aquarius": ["detriment"],
               "Aries": ["exaltation"], "Libra": ["fall"]},
    "Moon":   {"Cancer": ["domicile"], "Capricorn": ["detriment"],
               "Taurus": ["exaltation"], "Scorpio": ["fall"]},
    "Mercury": {"Gemini": ["domicile"], "Virgo": ["domicile", "exaltation"],
                "Sagittarius": ["detriment"], "Pisces": ["detriment", "fall"]},
    "Venus":  {"Taurus": ["domicile"], "Libra": ["domicile"],
               "Scorpio": ["detriment"], "Aries": ["detriment"],
               "Pisces": ["exaltation"], "Virgo": ["fall"]},
    "Mars":   {"Aries": ["domicile"], "Scorpio": ["domicile"],
               "Libra": ["detriment"], "Taurus": ["detriment"],
               "Capricorn": ["exaltation"], "Cancer": ["fall"]},
    "Jupiter": {"Sagittarius": ["domicile"], "Pisces": ["domicile"],
                "Gemini": ["detriment"], "Virgo": ["detriment"],
                "Cancer": ["exaltation"], "Capricorn": ["fall"]},
    "Saturn": {"Capricorn": ["domicile"], "Aquarius": ["domicile"],
               "Cancer": ["detriment"], "Leo": ["detriment"],
               "Libra": ["exaltation"], "Aries": ["fall"]},
}
CLASSICAL_PLANETS = list(DOCTRINE)
MINOR_TAGS = {"triplicity", "term", "face", "bound"}
KNOWN_CHART_EXPECTED = {
    # body -> expected dignity list for the 1992-10-28 fixture.
    "Mars": ["fall"],            # Cancer
    "Saturn": ["domicile"],      # Aquarius
    "Sun": [],                   # Scorpio (none of the four)
    "Moon": [],                  # Sagittarius
    "Mercury": [],               # Scorpio
    "Venus": [],                 # Sagittarius
    "Jupiter": [],               # Libra
}


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _check(cond: bool, msg: str) -> None:
    print(f"  {'PASS' if cond else 'FAIL'}: {msg}")
    if not cond:
        raise SystemExit(1)


def _run(py: str, extra: list[str]) -> dict:
    cmd = [py, str(SCRIPT), *BIRTH_ARGS, *extra,
           "--validate", "--schema", str(SCHEMA)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        _fail(f"script exited {proc.returncode}; stderr:\n{proc.stderr.strip()}")
    if "VALID" not in proc.stderr:
        _fail("script did not report a passing --validate")
    return json.loads(proc.stdout)


# --------------------------------------------------------------------------- #
# 1. Integration: the known chart (1992-10-28 22:30 Lexington, KY)
# --------------------------------------------------------------------------- #

def test_known_chart(py: str) -> None:
    print("\n[natal] 1992-10-28 chart: major essential dignity surfaced")
    chart = _run(py, ["--reading-type", "natal"])
    cd = chart["chart_data"]

    places = {p["body"]: p for p in cd["placements"]}
    for body, exp in KNOWN_CHART_EXPECTED.items():
        if body not in places:
            _fail(f"expected body {body!r} missing from placements")
        got = places[body]["dignity"]
        sign = places[body]["sign"]
        _check(got == exp,
               f"{body} in {sign} dignity == {exp} (got {got})")

    # Guardrail (acceptance criterion 3): condition stays empty for every
    # placement, and no minor-dignity tag may appear in any dignity array.
    for p in cd["placements"]:
        cond = p.get("condition")
        _check(cond == [],
               f"{p['body']} condition empty (got {cond})")
        leaked = MINOR_TAGS & set(p.get("dignity", []))
        _check(not leaked,
               f"{p['body']} dignity has no minor tags (leaked {sorted(leaked)})")

    # Outer planets + True Node must carry [] (no traditional dignity in this
    # doctrine) so modern co-rulership is never mislabeled as essential dignity.
    for body in ("Uranus", "Neptune", "Pluto", "True Node"):
        if body in places:
            _check(places[body]["dignity"] == [],
                   f"{body} dignity == [] (no traditional dignity)")

    # Provenance: the source_notes must record HOW dignity was derived.
    sn = cd.get("source_notes", "")
    _check("Major essential dignity" in sn and "Ptolemy" in sn,
           "source_notes records the major-dignity provenance")


def test_timing_charts_inherit_dignity(py: str) -> None:
    print("\n[transit] timing placements flow through the same dignity path")
    # Transit Jupiter in Cancer (2025-10-28) = exaltation; transit Mars in
    # Scorpio = domicile. Confirms compute_positions tags every chart it builds.
    chart = _run(py, ["--reading-type", "transit",
                      "--target-date", "2025-10-28", "--target-time", "12:00"])
    tc = chart["chart_data"]["transit_chart"]
    tp = {p["body"]: p for p in tc["placements"]}
    _check(tp.get("Jupiter", {}).get("dignity") == ["exaltation"],
           f"transit Jupiter in Cancer dignity == ['exaltation'] "
           f"(got {tp.get('Jupiter', {}).get('dignity')})")
    _check(tp.get("Mars", {}).get("dignity") == ["domicile"],
           f"transit Mars in Scorpio dignity == ['domicile'] "
           f"(got {tp.get('Mars', {}).get('dignity')})")
    for p in tc["placements"]:
        _check(p.get("condition") == [],
               f"transit {p['body']} condition empty")


# --------------------------------------------------------------------------- #
# 2. Table coverage: every classical planet/sign pair + outer planets
# --------------------------------------------------------------------------- #

def test_full_table() -> None:
    print("\n[table] major_essential_dignity over all (planet, sign) pairs")
    try:
        sys.path.insert(0, str(HERE))
        import birth_to_chart as b  # type: ignore
    except ImportError as exc:
        _fail(f"could not import birth_to_chart (need pyswisseph venv): {exc}")

    for planet in CLASSICAL_PLANETS:
        for sign in SIGN:
            got = b.major_essential_dignity(planet, sign)
            exp = DOCTRINE[planet].get(sign, [])
            if got != exp:
                _fail(f"{planet} in {sign}: expected {exp}, got {got}")
    print("  PASS: all 7 classical planets x 12 signs match the doctrine table")

    # Outer planets / points / unknown bodies / missing sign -> always [].
    for body in ("Uranus", "Neptune", "Pluto", "True Node", "Chiron",
                 "Lilith", "NotAPlanet"):
        for sign in SIGN:
            if b.major_essential_dignity(body, sign) != []:
                _fail(f"{body} in {sign}: expected [] (no traditional dignity)")
        if b.major_essential_dignity(body, None) != []:
            _fail(f"{body} with None sign: expected []")
    print("  PASS: outer planets / points / unknown bodies always []")

    # Canonical ordering: domicile < exaltation < detriment < fall.
    got = b.major_essential_dignity("Mercury", "Virgo")
    _check(got == ["domicile", "exaltation"],
           f"Mercury in Virgo == ['domicile','exaltation'] (got {got})")


def main() -> int:
    if not SCRIPT.is_file():
        _fail(f"script not found: {SCRIPT}")
    if not SCHEMA.is_file():
        _fail(f"schema not found: {SCHEMA}")
    test_known_chart(sys.executable)
    test_timing_charts_inherit_dignity(sys.executable)
    test_full_table()
    print("\nAll major-essential-dignity checks passed (known chart mapped; "
          "timing charts inherit; full table matches the doctrine; condition "
          "stays empty; every output --validate-clean).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
