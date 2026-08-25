"""PEP 495 civil-time classification and D-08 picker option payloads.

The wrapped calculator silently accepts DST-ambiguous and nonexistent
wall times with fold=0 semantics (verified — research §DST), so this
module classifies every civil birth time *before* any calculate call.
Pure functions only: no I/O, no calculator invocations, no device-clock
inference (D-07/D-08 — classification is server-side, API-tier).

Classification algorithm (verified against zoneinfo + tzdata):
- Build fold=0 and fold=1 aware versions of the naive wall time.
- If *neither* fold round-trips back to the same wall time, the time is
  ``nonexistent`` (spring-forward gap).
- If both round-trip but the two folds carry different UTC offsets, the
  time is ``ambiguous`` (fall-back overlap).
- Otherwise ``normal``.

Counterintuitive but verified: in a gap, fold=0 applies the
*pre-transition* offset, producing the UTC instant whose local wall
time is the shifted adjacent instant (02:30 EST -> 03:30 EDT) — exactly
D-08's prescribed "shift to the adjacent valid instant".
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

Classification = str  # "normal" | "ambiguous" | "nonexistent"

_UTC = timezone.utc


def classify(local: datetime, tz: ZoneInfo) -> tuple[Classification, timedelta, timedelta]:
    """Classify a naive civil ``local`` time in ``tz``.

    Returns ``(classification, fold0_offset, fold1_offset)``. Raises
    ``ValueError`` for aware datetimes — re-interpreting one would
    silently corrupt the result.
    """
    if local.tzinfo is not None:
        raise ValueError(
            "classify expects a naive civil time; got an aware datetime "
            f"({local.tzinfo!s}). Strip tzinfo first."
        )
    d0 = local.replace(tzinfo=tz, fold=0)
    d1 = local.replace(tzinfo=tz, fold=1)
    o0, o1 = d0.utcoffset(), d1.utcoffset()
    rt0 = d0.astimezone(_UTC).astimezone(tz).replace(tzinfo=None)
    rt1 = d1.astimezone(_UTC).astimezone(tz).replace(tzinfo=None)
    if rt0 != local and rt1 != local:
        return "nonexistent", o0, o1
    if o0 != o1:
        return "ambiguous", o0, o1
    return "normal", o0, o1


def resolve_options(local: datetime, tz: ZoneInfo) -> list[dict[str, str]]:
    """Picker payload entries for the D-08 explicit-resolution UI.

    - ``ambiguous`` -> two options (``first_pass`` / ``second_pass``),
      labels naming each offset, distinct UTC instants.
    - ``nonexistent`` -> a single ``shifted`` option whose UTC instant
      equals the fold=0 conversion (the adjacent valid instant); the
      label names the shifted time and the clock jump.
    - ``normal`` -> no options (no picker is rendered).
    """
    classification, o0, o1 = classify(local, tz)
    if classification == "normal":
        return []

    if classification == "ambiguous":
        d0 = local.replace(tzinfo=tz, fold=0)
        d1 = local.replace(tzinfo=tz, fold=1)
        return [
            {
                "mode": "first_pass",
                "label": (
                    f"{_hmm(local)} {d0.tzname()} ({format_offset(int(o0.total_seconds()))})"
                    " — first occurrence before the clocks fell back"
                ),
                "utc": _iso_z(d0.astimezone(_UTC)),
            },
            {
                "mode": "second_pass",
                "label": (
                    f"{_hmm(local)} {d1.tzname()} ({format_offset(int(o1.total_seconds()))})"
                    " — second occurrence after the clocks fell back"
                ),
                "utc": _iso_z(d1.astimezone(_UTC)),
            },
        ]

    # nonexistent: fold=0 conversion is the shifted adjacent instant.
    utc_instant = local.replace(tzinfo=tz, fold=0).astimezone(_UTC)
    shifted_aware = utc_instant.astimezone(tz)  # 02:30 EST -> 03:30 EDT
    gap_start, gap_end = _gap_boundaries(local, tz)
    return [
        {
            "mode": "shifted",
            "label": (
                f"{_hmm(local)} did not exist (clocks jumped "
                f"{_hmm(gap_start)}\u2192{_hmm(gap_end)}). "
                f"Using {_hmm(shifted_aware)} {shifted_aware.tzname()} "
                f"({format_offset(int(shifted_aware.utcoffset().total_seconds()))})."
            ),
            "utc": _iso_z(utc_instant),
        }
    ]


def format_offset(offset_seconds: int) -> str:
    """Render a UTC offset in seconds as a ``±HH:MM`` string."""
    sign = "+" if offset_seconds >= 0 else "-"
    magnitude = abs(offset_seconds)
    hours, remainder = divmod(magnitude, 3600)
    minutes = remainder // 60
    return f"{sign}{hours:02d}:{minutes:02d}"


def _iso_z(moment: datetime) -> str:
    """ISO-8601 UTC instant with a trailing Z, second precision."""
    return moment.astimezone(_UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _hmm(local: datetime) -> str:
    return local.strftime("%H:%M")


def _gap_boundaries(local: datetime, tz: ZoneInfo) -> tuple[datetime, datetime]:
    """Wall-clock readouts where the clocks jump (minute resolution).

    Walks outward from the nonexistent wall time to the first
    nonexistent minute below it and the first valid minute above it.
    Zone transitions land on minute boundaries (incl. half-hour zones
    like Lord Howe), so a one-minute probe is exact for every DST gap;
    the returned readouts feed the human label only — the UTC instant
    of an option is always exact fold arithmetic.
    """
    gap_start = local
    while classify(gap_start - timedelta(minutes=1), tz)[0] == "nonexistent":
        gap_start -= timedelta(minutes=1)
    gap_end = local + timedelta(minutes=1)
    while classify(gap_end, tz)[0] == "nonexistent":
        gap_end += timedelta(minutes=1)
    return gap_start, gap_end
