#!/usr/bin/env python3
"""Timezone-resolution smoke test for tools/birth_to_chart.py.

Acceptance criteria (td-c6226a):

* ``birth_to_chart.py`` resolves any zone present in the IANA ``tzdata``
  package regardless of host OS.
* If resolution still fails, the error names the token as IANA-shaped and
  suggests ``tzdata`` / an equivalent zone.

How this stays honest
---------------------
The bug report that prompted this test claimed ``America/Kentucky/Lexington``
is "a valid IANA zone" absent from the macOS system db. It is **not** a real
IANA zone: it is missing from the PyPI ``tzdata`` package, from
``zone.tab`` / ``zone1970.tab``, and from ``zoneinfo.available_timezones()``
(which list only ``America/Kentucky/Louisville`` and
``America/Kentucky/Monticello``). So this test does NOT assert that Lexington
resolves — it asserts the two properties that actually hold:

1. **tzdata fallback (end-to-end).** With ``PYTHONTZPATH`` pointed at an empty
   directory we simulate a host whose system tzdb is missing/empty. The CLI
   must still resolve real IANA zones and emit a ``--validate``-clean chart,
   because ``tzdata`` is a runtime dependency and stdlib ``zoneinfo``
   auto-falls-back to it (cross-platform, not Windows-only). This is the real
   guarantee behind "resolves regardless of host OS".

2. **Helpful error copy.** An IANA-shaped-but-invalid token
   (``America/Kentucky/Lexington``) must exit 2 with a message that (a) names
   the token as IANA-shaped, (b) suggests the valid sibling zones under
   ``America/Kentucky/`` (Louisville, Monticello), (c) mentions ``tzdata``,
   and (d) still references the ``+05:30`` offset form.

Run
---
    python tools/tz_smoke_test.py

Use the interpreter that has ``pyswisseph`` and ``tzdata`` installed
(see ``tools/requirements.txt``). Exits non-zero on any failure.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE / "birth_to_chart.py"
SCHEMA = HERE.parent / "assets" / "schemas" / "chart_input_schema.json"

# Real IANA zones exercised by the fallback test. Chosen to span regions and
# to include subzones that some sparse system dbs omit (e.g. Indiana/Indiana/*,
# Asia/Kolkata, America/Puerto_Rico). All are present in the tzdata package.
REAL_ZONES = [
    "America/New_York",
    "America/Kentucky/Louisville",
    "America/Indiana/Indianapolis",
    "America/Argentina/Buenos_Aires",
    "America/Puerto_Rico",
    "Asia/Kolkata",
    "Asia/Kathmandu",          # +05:45 — an offset only a real zone encodes
    "Europe/London",
    "Pacific/Chatham",         # +12:45 — rare offset; tzdb-only on many hosts
    "Australia/Eucla",         # +08:45 — rare offset; tzdb-only on many hosts
]


def _fail(msg: str) -> None:
    print(f"  FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def _check(cond: bool, msg: str) -> None:
    print(f"  {'PASS' if cond else 'FAIL'}: {msg}")
    if not cond:
        raise SystemExit(1)


def _run(args: list[str], *, env: dict | None = None) -> subprocess.CompletedProcess:
    cmd = [sys.executable, str(SCRIPT), *args,
           "--validate", "--schema", str(SCHEMA)]
    return subprocess.run(cmd, capture_output=True, text=True, env=env)


# --------------------------------------------------------------------------- #
# Test 1: tzdata fallback resolves real zones even with no system tzdb.
# --------------------------------------------------------------------------- #

def test_tzdata_fallback() -> None:
    print("\n[tzdata fallback] PYTHONTZPATH=empty -> real zones still resolve")
    # Simulate a host with a missing/empty system tzdb. zoneinfo must then fall
    # back to the PyPI tzdata package (auto, cross-platform).
    empty_dir = tempfile.mkdtemp(prefix="empty_tzpath_")
    env = {**os.environ, "PYTHONTZPATH": empty_dir}
    # Sanity: confirm the subprocess actually sees the restricted path.
    probe = subprocess.run(
        [sys.executable, "-c",
         "import zoneinfo,sys; print(zoneinfo.TZPATH)"],
        capture_output=True, text=True, env=env)
    print(f"  subprocess TZPATH: {probe.stdout.strip()}")
    if empty_dir not in probe.stdout:
        _fail("PYTHONTZPATH not honored by the subprocess; test cannot run.")

    base = ["--date", "1992-10-28", "--time", "22:30",
            "--lat", "38.0406", "--lon", "-84.5034",
            "--house-system", "Whole Sign"]
    resolved = 0
    for z in REAL_ZONES:
        proc = _run([*base, "--tz", z], env=env)
        if proc.returncode != 0 or "VALID" not in proc.stderr:
            _fail(f"zone {z!r} did NOT resolve via tzdata fallback "
                  f"(exit {proc.returncode}); stderr:\n{proc.stderr.strip()}")
        resolved += 1
    _check(resolved == len(REAL_ZONES),
           f"all {len(REAL_ZONES)} real IANA zones resolved via tzdata fallback")

    # End-to-end: a full chart built from a real zone is schema-clean and the
    # provenance records the zone as an IANA (not offset) input.
    proc = _run([*base, "--tz", "America/Kentucky/Louisville"], env=env)
    chart = json.loads(proc.stdout)
    cd = chart["chart_data"]
    _check(
        "America/Kentucky/Louisville (iana)" in cd["source_notes"],
        "source_notes records the zone as an IANA input")
    _check(cd["ascendant"]["sign"] == "Cancer",
           f"Ascendant == Cancer for this fixture (got {cd['ascendant']['sign']})")
    _check(cd["sect"]["status"] == "night",
           f"sect == night for 1992-10-28 22:30 EST (got {cd['sect']['status']})")


# --------------------------------------------------------------------------- #
# Test 2: invalid IANA-shaped token -> helpful error.
# --------------------------------------------------------------------------- #

# A token that LOOKS like an IANA zone but is not one anywhere. Lexington, KY
# has no IANA zone (it uses America/New_York); the valid KY zones are Louisville
# and Monticello. This is the exact token from the bug report.
INVALID_IANA_TOKEN = "America/Kentucky/Lexington"
EXPECTED_SIBLINGS = {"America/Kentucky/Louisville", "America/Kentucky/Monticello"}


def test_invalid_zone_error() -> None:
    print(f"\n[error copy] {INVALID_IANA_TOKEN!r} -> helpful message, exit 2")
    proc = _run(["--date", "1992-10-28", "--time", "22:30",
                 "--lat", "38.0406", "--lon", "-84.5034",
                 "--tz", INVALID_IANA_TOKEN])
    _check(proc.returncode == 2,
           f"exit code == 2 for invalid zone (got {proc.returncode})")
    err = proc.stderr
    _check(err.startswith("FAIL:"),
           "error is reported on stderr starting with 'FAIL:'")
    _check("IANA zone name" in err,
           "message names the token as IANA-shaped")
    _check("not a real IANA zone" in err or "no such zone" in err.lower(),
           "message explains the token is not a real zone")
    for sib in EXPECTED_SIBLINGS:
        _check(sib in err, f"message suggests valid sibling {sib!r}")
    _check("tzdata" in err, "message mentions the tzdata package")
    _check("+05:30" in err, "message still references the fixed-offset form")
    # A non-IANA-shaped garbage token still errors cleanly (no crash).
    proc2 = _run(["--date", "1992-10-28", "--time", "22:30",
                  "--lat", "38.0406", "--lon", "-84.5034",
                  "--tz", "not_a_zone"])
    _check(proc2.returncode == 2,
           f"garbage token exits 2 (got {proc2.returncode})")


def main() -> int:
    if not SCRIPT.is_file():
        _fail(f"script not found: {SCRIPT}")
    if not SCHEMA.is_file():
        _fail(f"schema not found: {SCHEMA}")
    # Guardrail: the test's premise is that the token is genuinely invalid.
    try:
        import zoneinfo
        if INVALID_IANA_TOKEN in zoneinfo.available_timezones():
            _fail(f"premise broken: {INVALID_IANA_TOKEN} is now a real zone; "
                  f"pick a different invalid token for this test.")
        missing = [z for z in REAL_ZONES
                   if z not in zoneinfo.available_timezones()]
        if missing:
            _fail(f"premise broken: real-zone fixture(s) not in tzdata: {missing}")
    except ImportError:
        _fail("zoneinfo unavailable (need Python 3.9+)")

    test_tzdata_fallback()
    test_invalid_zone_error()
    print("\nAll timezone-resolution fixtures passed (tzdata fallback resolves "
          "real zones with no system db; invalid IANA-shaped tokens produce a "
          "helpful, sibling-suggesting error).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
