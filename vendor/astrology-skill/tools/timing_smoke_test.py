#!/usr/bin/env python3
"""Timing-type smoke test for tools/birth_to_chart.py.

Covers the three ``reading_type`` values that previously had *no* computation
path — ``solar_return``, ``annual_profection``, ``transit`` (td-9dfe2c). Each
mode is driven from one documented birth-data set and checked against an
independent value, so the assertions do not merely echo the tool's own output.

Independence model
------------------
- ``annual_profection`` is fully deterministic: the expected profected house
  ``(age mod 12) + 1`` and profected sign (Ascendant sign + ``age mod 12``,
  whole-sign) are recomputed here from the age and the natal Ascendant sign.
- ``solar_return`` is checked by its *defining property*: the transiting Sun at
  the returned instant equals the natal Sun longitude. Because the SR chart is
  cast at that instant, the SR Sun placement must equal the natal Sun placement
  (compared inside the JSON, no Julian-Day reconstruction). The return calendar
  date (2025-10-29 UT) is also pinned as a known astronomical anchor.
- ``transit``: outer-planet signs are pinned to known 2025-10-28 positions
  (Saturn in Pisces, Pluto in Aquarius, Jupiter in Cancer), and the
  Jupiter→natal-Mars conjunction orb is recomputed from the JSON longitudes
  with a from-scratch angular-distance formula and compared to the tool's
  reported ``orb_degrees``.

The birth data is the td-9dfe2c example: 1992-10-28 22:30 Lexington, KY
(America/New_York), Cancer Ascendant, Sun 5°58′ Scorpio. The age-33 year
(2025-10-28 → 2026) activates the whole-sign 10th house (Aries), ruled by Mars.

Run
---
    python tools/timing_smoke_test.py

Use the interpreter that has ``pyswisseph`` installed. Exits non-zero on any
failure. Each fixture also runs through ``--validate`` against
``chart_input_schema.json``.
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
ARCSEC = 1.0 / 3600.0  # one arcsecond in degrees

# Documented birth data (Cancer Ascendant, Sun 5°58′ Scorpio).
BIRTH_ARGS = ["--date", "1992-10-28", "--time", "22:30",
              "--lat", "38.0406", "--lon", "-84.5037",
              "--tz", "America/New_York", "--house-system", "Whole Sign",
              "--place", "Lexington, KY"]
TARGET_DATE = "2025-10-28"          # 33rd birthday → start of the age-33 year
EXPECTED_AGE = 33
EXPECTED_NATAL_SUN_ABS = 215.9683   # Scorpio 5°58′ (independent of this tool)


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _angular_diff(a: float, b: float) -> float:
    d = abs(a - b) % 360.0
    return min(d, 360.0 - d)


def _run(py: str, extra: list[str]) -> dict:
    cmd = [py, str(SCRIPT), *BIRTH_ARGS, *extra,
           "--validate", "--schema", str(SCHEMA)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        _fail(f"script exited {proc.returncode}; stderr:\n{proc.stderr.strip()}")
    if "VALID" not in proc.stderr:
        _fail("script did not report a passing --validate")
    return json.loads(proc.stdout)


def _check(cond: bool, msg: str) -> None:
    print(f"  {'PASS' if cond else 'FAIL'}: {msg}")
    if not cond:
        raise SystemExit(1)


# --------------------------------------------------------------------------- #
# annual_profection
# --------------------------------------------------------------------------- #

def test_profection(py: str) -> None:
    print("\n[annual_profection] age 33 → 10th house (Aries) → Mars")
    chart = _run(py, ["--reading-type", "annual_profection",
                      "--target-date", TARGET_DATE])
    cd = chart["chart_data"]
    tfs = cd.get("timing_factors")
    if not tfs or tfs[0].get("technique") != "annual_profection":
        _fail("no annual_profection timing_factors entry emitted")
    tf = tfs[0]

    # Independent recompute from the natal Ascendant sign + age.
    asc_sign = cd["ascendant"]["sign"]
    exp_house = (EXPECTED_AGE % 12) + 1
    exp_sign = SIGN[(SIGN.index(asc_sign) + (EXPECTED_AGE % 12)) % 12]

    _check(tf["age"] == EXPECTED_AGE, f"age == {EXPECTED_AGE} (got {tf['age']})")
    _check(tf["active_house"] == exp_house == 10,
           f"active_house == {exp_house} (==10)")
    _check(tf["profected_sign"] == exp_sign == "Aries",
           f"profected_sign == {exp_sign} (==Aries)")
    _check(tf["time_lord"] == "Mars", f"time_lord == Mars (got {tf['time_lord']})")

    lord = tf["lord_of_the_year_natal"]
    _check(lord["body"] == "Mars", "Lord of the Year body == Mars")
    _check(lord["sign"] == "Cancer", f"Lord natal sign == Cancer (got {lord['sign']})")
    _check(lord["house"] == 1, f"Lord natal house == 1 (got {lord.get('house')})")
    _check(lord["motion"] == "direct",
           f"Lord motion == direct (got {lord.get('motion')})")
    # The natal base must still be present (profection activates natal material).
    _check(cd["ascendant"]["sign"] == "Cancer", "natal base Ascendant == Cancer")


# --------------------------------------------------------------------------- #
# solar_return
# --------------------------------------------------------------------------- #

def test_solar_return(py: str) -> None:
    print("\n[solar_return] 2025 return: Sun returns to natal longitude")
    chart = _run(py, ["--reading-type", "solar_return",
                      "--target-date", TARGET_DATE])
    cd = chart["chart_data"]
    sr = cd.get("solar_return")
    if not sr:
        _fail("no solar_return block emitted")
    natal_sun = next(p["absolute_degree"] for p in cd["placements"]
                     if p["body"] == "Sun")
    sr_sun = next(p["absolute_degree"] for p in sr["placements"]
                  if p["body"] == "Sun")

    _check(sr["return_year"] == 2025, f"return_year == 2025 (got {sr['return_year']})")
    # Known astronomical anchor: the 2025 return for a 1992-10-28 birth falls on
    # 2025-10-29 UT (the Sun reaches natal degree just after local midnight EDT).
    ret_date = sr["return_moment_utc"][:10]
    _check(ret_date == "2025-10-29",
           f"return moment UTC date == 2025-10-29 (got {ret_date})")
    # Defining property, checked inside the JSON (no JD reconstruction).
    _check(abs(sr_sun - natal_sun) < ARCSEC,
           f"SR Sun == natal Sun within 1\" (delta {abs(sr_sun-natal_sun):.6f}°)")
    _check(abs(natal_sun - EXPECTED_NATAL_SUN_ABS) < 0.002,
           f"natal Sun abs == {EXPECTED_NATAL_SUN_ABS} (got {natal_sun})")
    # Structural completeness.
    _check(sr["ascendant"]["sign"] in SIGN, "SR Ascendant is a valid sign")
    _check(sr["chart_ruler"] in {"Sun", "Moon", "Mercury", "Venus", "Mars",
                                 "Jupiter", "Saturn"}, "SR chart ruler is a planet")
    _check(len(sr["placements"]) >= 10, "SR placements present (>=10)")
    _check(sr["aspects"], "SR internal aspects present")
    _check(sr["natal_contacts"], "SR → natal contacts present")
    tf = cd["timing_factors"][0]
    _check(tf["technique"] == "solar_return"
           and tf["time_lord"] == sr["chart_ruler"],
           "timing_factors solar_return summary matches chart ruler")


# --------------------------------------------------------------------------- #
# transit
# --------------------------------------------------------------------------- #

def test_transit(py: str) -> None:
    print("\n[transit] 2025-10-28: Jupiter conjuncts natal Mars in Cancer")
    chart = _run(py, ["--reading-type", "transit",
                      "--target-date", TARGET_DATE, "--target-time", "12:00"])
    cd = chart["chart_data"]
    tc = cd.get("transit_chart")
    if not tc:
        _fail("no transit_chart block emitted")

    def tplace(body: str) -> dict:
        return next(p for p in tc["placements"] if p["body"] == body)

    # Astronomical anchors for 2025-10-28.
    _check(tplace("Jupiter")["sign"] == "Cancer", "transit Jupiter in Cancer")
    _check(tplace("Saturn")["sign"] == "Pisces", "transit Saturn in Pisces")
    _check(tplace("Pluto")["sign"] == "Aquarius", "transit Pluto in Aquarius")

    # Independent recompute of the Jupiter→natal-Mars conjunction orb from the
    # raw longitudes, compared to the tool's reported orb.
    tj = tplace("Jupiter")["absolute_degree"]
    nmars = next(p["absolute_degree"] for p in cd["placements"]
                 if p["body"] == "Mars")
    exp_orb = round(_angular_diff(tj, nmars), 4)
    jm = next((c for c in tc["natal_contacts"]
               if c["triggering_body"] == "Jupiter" and c["natal_body"] == "Mars"
               and c["aspect"] == "conjunction"), None)
    if jm is None:
        _fail("no transit Jupiter conjunction natal Mars contact")
    _check(abs(jm["orb_degrees"] - exp_orb) <= 0.01,
           f"Jupiter→Mars orb matches independent recompute "
           f"(tool {jm['orb_degrees']} vs {exp_orb})")

    # Transit positions must be placed in the NATAL houses (whole-sign here).
    _check(tplace("Jupiter")["house"] == 1,
           f"transit Jupiter in natal 1st house (got {tplace('Jupiter')['house']})")
    _check(tc["natal_contacts"], "transit → natal contacts present")
    _check(cd["timing_factors"], "timing_factors emitted for transit")
    _check(all(t["technique"] == "transit" for t in cd["timing_factors"]),
           "all timing_factors entries are transits")


def main() -> int:
    if not SCRIPT.is_file():
        _fail(f"script not found: {SCRIPT}")
    if not SCHEMA.is_file():
        _fail(f"schema not found: {SCHEMA}")
    test_profection(sys.executable)
    test_solar_return(sys.executable)
    test_transit(sys.executable)
    print("\nAll 3 timing-type fixtures passed (profection deterministic; SR "
          "Sun-return self-consistent; transit contact orb independently "
          "recomputed; every output --validate-clean).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
