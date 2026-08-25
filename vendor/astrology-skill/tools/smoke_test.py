#!/usr/bin/env python3
"""Smoke test for tools/birth_to_chart.py.

Acceptance criterion (td-2e2cd9): *a known birth data set produces the
expected Ascendant and MC within tolerance.*

How this stays independent
--------------------------
The expected Ascendant/MC are NOT read from Swiss Ephemeris or hardcoded
magic numbers. They are recomputed here from scratch using only the Python
standard library:

  - Sidereal time: IAU 1982 GMST polynomial + the UT1 fraction of day.
  - Obliquity: IAU 1980 mean obliquity of the ecliptic.
  - MC:  ecliptic longitude atan2(sin RAMC, cos RAMC · cos ε).
  - Asc: ecliptic longitude atan2(−cos RAMC, −(sin ε · tan φ + cos ε · sin RAMC)).

This is an entirely separate code path from ``swe.houses``/``houses_ex`` that
the script uses. The two agree to ~0.003° (the residual is the IAU1980/1982
model vs Swiss Ephemeris's newer precession/nutation model). Because each
fixture is specified by its **wall-clock + IANA zone**, the comparison also
exercises the script's timezone → UT conversion (the most failure-prone step).

Run
---
    python tools/smoke_test.py

Run with the same interpreter that has ``pyswisseph`` installed (see
``tools/requirements.txt``). Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import math
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "birth_to_chart.py"
SCHEMA = HERE.parent / "assets" / "schemas" / "chart_input_schema.json"

TOL_DEG = 0.05  # tolerance per docs/birth_to_chart_design.md §9


# --------------------------------------------------------------------------- #
# Independent geometry (stdlib only)
# --------------------------------------------------------------------------- #

def _obliquity(jd: float) -> float:
    t = (jd - 2451545.0) / 36525.0
    return math.radians(
        23.439291111 - 0.0130041667 * t - 1.638889e-7 * t * t
        + 5.036111e-7 * t ** 3
    )


def _gmst_deg(jd: float) -> float:
    """Greenwich mean sidereal time, degrees in [0, 360). IAU 1982."""
    jd0 = math.floor(jd - 0.5) + 0.5
    t0 = (jd0 - 2451545.0) / 36525.0
    secs = (jd - jd0) * 86400.0
    gmst = (
        24110.54841
        + 8640184.812866 * t0
        + 0.093104 * t0 * t0
        - 6.2e-6 * t0 ** 3
    )
    gmst += 1.00273790935 * secs
    return (gmst / 3600.0) % 24.0 * 15.0


def _jd_from_calendar(y: int, mo: int, d: int, ut_hours: float) -> float:
    # Proleptic Gregorian Julian Day at a UT fraction-of-day.
    a = (14 - mo) // 12
    yy = y + 4800 - a
    mm = mo + 12 * a - 3
    jdn = d + (153 * mm + 2) // 5 + 365 * yy + yy // 4 - yy // 100 + yy // 400 - 32045
    return jdn - 0.5 + ut_hours / 24.0


def independent_asc_mc(jd_ut: float, lat: float, lon: float) -> tuple[float, float]:
    """Return (ascendant, midheaven) absolute degrees from first principles."""
    eps = _obliquity(jd_ut)
    ramc = math.radians((_gmst_deg(jd_ut) + lon) % 360.0)
    phi = math.radians(lat)
    mc = math.degrees(math.atan2(math.sin(ramc), math.cos(ramc) * math.cos(eps))) % 360.0
    denom = math.sin(eps) * math.tan(phi) + math.cos(eps) * math.sin(ramc)
    asc = math.degrees(math.atan2(math.cos(ramc), -denom)) % 360.0
    return asc, mc


# --------------------------------------------------------------------------- #
# Fixtures: documented birth data with a known UT instant.
# --------------------------------------------------------------------------- #
# Each fixture pins a wall-clock + IANA zone to the UT it must resolve to, so
# the test also guards the tz conversion. The expected Asc/MC are derived in
# independent_asc_mc() above — not from Swiss Ephemeris.
FIXTURES = [
    {
        "label": "1990-05-21 14:32 EDT, New York (day chart)",
        "args": ["--date", "1990-05-21", "--time", "14:32",
                 "--lat", "40.7128", "--lon", "-74.0060",
                 "--tz", "America/New_York", "--house-system", "Whole Sign"],
        "ut": _jd_from_calendar(1990, 5, 21, 18 + 32 / 60),  # EDT = UTC-4
        "lat": 40.7128, "lon": -74.0060,
    },
    {
        "label": "2000-01-01 12:00 GMT, London (winter, ~UTC)",
        "args": ["--date", "2000-01-01", "--time", "12:00",
                 "--lat", "51.5074", "--lon", "-0.1278",
                 "--tz", "Europe/London", "--house-system", "Placidus"],
        "ut": _jd_from_calendar(2000, 1, 1, 12.0),  # GMT = UTC
        "lat": 51.5074, "lon": -0.1278,
    },
    {
        "label": "1985-07-04 09:15 PDT, Los Angeles",
        "args": ["--date", "1985-07-04", "--time", "09:15",
                 "--lat", "34.0522", "--lon", "-118.2437",
                 "--tz", "America/Los_Angeles", "--house-system", "Regiomontanus"],
        "ut": _jd_from_calendar(1985, 7, 4, 9 + 15 / 60 + 7),  # PDT = UTC-7
        "lat": 34.0522, "lon": -118.2437,
    },
]


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _angular_delta(a: float, b: float) -> float:
    return min(abs(a - b) % 360.0, 360.0 - abs(a - b) % 360.0)


def run_fixture(py: str, fx: dict) -> None:
    print(f"\n[{fx['label']}]")
    expected_asc, expected_mc = independent_asc_mc(fx["ut"], fx["lat"], fx["lon"])
    print(f"  independent expectation: Asc={expected_asc:.4f}°  MC={expected_mc:.4f}°")

    cmd = [py, str(SCRIPT), *fx["args"], "--validate", "--schema", str(SCHEMA)]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        _fail(f"script exited {proc.returncode}; stderr:\n{proc.stderr.strip()}")
    if "VALID" not in proc.stderr:
        _fail("script did not report a passing --validate")

    chart = json.loads(proc.stdout)
    cd = chart["chart_data"]
    got_asc = cd["ascendant"]["absolute_degree"]
    got_mc = cd["midheaven"]["absolute_degree"]
    d_asc = _angular_delta(got_asc, expected_asc)
    d_mc = _angular_delta(got_mc, expected_mc)
    print(f"  script output:           Asc={got_asc:.4f}°  MC={got_mc:.4f}°")
    print(f"  delta:                   Asc={d_asc:.5f}°  MC={d_mc:.5f}°  (tol ±{TOL_DEG}°)")
    if d_asc > TOL_DEG:
        _fail(f"Ascendant out of tolerance: {d_asc:.4f}° > {TOL_DEG}°")
    if d_mc > TOL_DEG:
        _fail(f"Midheaven out of tolerance: {d_mc:.4f}° > {TOL_DEG}°")

    # Structural sanity: placements/aspects/sect present for a Timed chart.
    if not cd.get("placements"):
        _fail("placements missing")
    if not cd.get("aspects"):
        _fail("aspects missing")
    if not cd.get("sect"):
        _fail("sect missing for a timed chart")
    if not cd.get("house_cusps"):
        _fail("house_cusps missing")
    bodies = {p["body"] for p in cd["placements"]}
    required = {"Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter",
                "Saturn", "Uranus", "Neptune", "Pluto", "True Node"}
    missing = required - bodies
    if missing:
        _fail(f"missing required bodies: {sorted(missing)}")
    print("  PASS")


def main() -> int:
    if not SCRIPT.is_file():
        _fail(f"script not found: {SCRIPT}")
    if not SCHEMA.is_file():
        _fail(f"schema not found: {SCHEMA}")
    for fx in FIXTURES:
        run_fixture(sys.executable, fx)
    print(f"\nAll {len(FIXTURES)} fixtures passed (Asc/MC within ±{TOL_DEG}° of "
          f"an independent stdlib recomputation; --validate passed).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
