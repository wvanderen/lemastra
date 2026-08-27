"""civil_time: PEP 495 classification + D-08 picker payloads (BIRTH-03).

Dense parametrized table in the registry.test.ts tradition: every
classification x (before/at/after transition) crossing over two zones —
America/New_York (1 h DST) and Australia/Lord_Howe (30 min DST) — plus
option-payload contract tests for the D-08 picker that plan 02-08
renders. Pure functions: no network, no subprocess, no I/O.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pytest

from lemastra_api.services.civil_time import (
    classify,
    format_offset,
    resolve_options,
)

NY = ZoneInfo("America/New_York")
LORD_HOWE = ZoneInfo("Australia/Lord_Howe")

# (case id, zone, naive wall time, expected classification, fold=0 offset,
#  fold=1 offset) — offsets as timedelta seconds.
CLASSIFICATION_CASES = [
    # America/New_York — 1-hour DST shifts.
    ("ny-normal-1990-natal", NY, datetime(1990, 5, 21, 14, 32), "normal", -4 * 3600, -4 * 3600),
    ("ny-fallback-before", NY, datetime(2024, 11, 3, 0, 30), "normal", -4 * 3600, -4 * 3600),
    ("ny-fallback-at", NY, datetime(2024, 11, 3, 1, 30), "ambiguous", -4 * 3600, -5 * 3600),
    ("ny-fallback-after", NY, datetime(2024, 11, 3, 3, 30), "normal", -5 * 3600, -5 * 3600),
    ("ny-springforward-before", NY, datetime(2024, 3, 10, 1, 30), "normal", -5 * 3600, -5 * 3600),
    ("ny-springforward-at", NY, datetime(2024, 3, 10, 2, 30), "nonexistent", -5 * 3600, -4 * 3600),
    ("ny-springforward-after", NY, datetime(2024, 3, 10, 3, 30), "normal", -4 * 3600, -4 * 3600),
    # Australia/Lord_Howe — 30-minute DST shifts (half-hour zone).
    ("lh-normal-1990-natal", LORD_HOWE, datetime(1990, 5, 21, 14, 32), "normal", 10 * 3600 + 1800, 10 * 3600 + 1800),
    ("lh-fallback-before", LORD_HOWE, datetime(2024, 4, 7, 0, 30), "normal", 11 * 3600, 11 * 3600),
    ("lh-fallback-at", LORD_HOWE, datetime(2024, 4, 7, 1, 45), "ambiguous", 11 * 3600, 10 * 3600 + 1800),
    ("lh-fallback-after", LORD_HOWE, datetime(2024, 4, 7, 3, 30), "normal", 10 * 3600 + 1800, 10 * 3600 + 1800),
    ("lh-springforward-before", LORD_HOWE, datetime(2024, 10, 6, 1, 15), "normal", 10 * 3600 + 1800, 10 * 3600 + 1800),
    ("lh-springforward-at", LORD_HOWE, datetime(2024, 10, 6, 2, 15), "nonexistent", 10 * 3600 + 1800, 11 * 3600),
    ("lh-springforward-after", LORD_HOWE, datetime(2024, 10, 6, 3, 15), "normal", 11 * 3600, 11 * 3600),
]


@pytest.mark.parametrize(
    ("case_id", "zone", "wall", "expected", "offset0", "offset1"),
    CLASSIFICATION_CASES,
    ids=[case[0] for case in CLASSIFICATION_CASES],
)
def test_classify_dense_table(
    case_id: str,
    zone: ZoneInfo,
    wall: datetime,
    expected: str,
    offset0: int,
    offset1: int,
) -> None:
    classification, fold0, fold1 = classify(wall, zone)
    assert classification == expected
    assert fold0 == timedelta(seconds=offset0)
    assert fold1 == timedelta(seconds=offset1)


def test_ambiguous_ny_first_and_second_pass_utc_instants() -> None:
    """Materiality anchor: the two passes are distinct UTC instants."""
    wall = datetime(2024, 11, 3, 1, 30)
    first = wall.replace(tzinfo=NY, fold=0).astimezone(ZoneInfo("UTC"))
    second = wall.replace(tzinfo=NY, fold=1).astimezone(ZoneInfo("UTC"))
    assert first == datetime(2024, 11, 3, 5, 30, tzinfo=ZoneInfo("UTC"))
    assert second == datetime(2024, 11, 3, 6, 30, tzinfo=ZoneInfo("UTC"))


def test_nonexistent_ny_fold0_converts_to_shifted_wall_time() -> None:
    """In a gap, fold=0 yields the UTC instant of the adjacent valid time."""
    wall = datetime(2024, 3, 10, 2, 30)
    classification, fold0, _ = classify(wall, NY)
    assert classification == "nonexistent"
    utc_instant = wall.replace(tzinfo=NY, fold=0).astimezone(ZoneInfo("UTC"))
    shifted_wall = utc_instant.astimezone(NY)
    assert shifted_wall.replace(tzinfo=None) == datetime(2024, 3, 10, 3, 30)


def test_ambiguous_lord_howe_half_hour_difference() -> None:
    classification, fold0, fold1 = classify(datetime(2024, 4, 7, 1, 45), LORD_HOWE)
    assert classification == "ambiguous"
    assert abs(fold1 - fold0) == timedelta(minutes=30)


def test_classify_rejects_aware_datetime() -> None:
    """Silently re-interpreting an aware datetime would corrupt results."""
    aware = datetime(2024, 11, 3, 1, 30, tzinfo=NY)
    with pytest.raises(ValueError):
        classify(aware, NY)


def test_resolve_options_normal_is_empty() -> None:
    assert resolve_options(datetime(1990, 5, 21, 14, 32), NY) == []


def test_resolve_options_ambiguous_two_distinct_instants() -> None:
    options = resolve_options(datetime(2024, 11, 3, 1, 30), NY)
    assert [option["mode"] for option in options] == ["first_pass", "second_pass"]
    # Human labels carry each offset.
    assert "-04:00" in options[0]["label"]
    assert "-05:00" in options[1]["label"]
    # Distinct UTC instants — the materiality anchor from the research.
    assert options[0]["utc"] != options[1]["utc"]
    assert options[0]["utc"] == "2024-11-03T05:30:00Z"
    assert options[1]["utc"] == "2024-11-03T06:30:00Z"


def test_resolve_options_nonexistent_single_shifted_option() -> None:
    options = resolve_options(datetime(2024, 3, 10, 2, 30), NY)
    assert len(options) == 1
    option = options[0]
    assert option["mode"] == "shifted"
    # UTC instant equals the fold=0 conversion of the nonexistent wall time.
    assert option["utc"] == "2024-03-10T07:30:00Z"
    # Label names the shifted time and the jump.
    assert "03:30" in option["label"]
    assert "02:00" in option["label"]
    assert "03:00" in option["label"]


def test_resolve_options_ambiguous_lord_howe_labels() -> None:
    options = resolve_options(datetime(2024, 4, 7, 1, 45), LORD_HOWE)
    assert [option["mode"] for option in options] == ["first_pass", "second_pass"]
    assert "+11:00" in options[0]["label"]
    assert "+10:30" in options[1]["label"]
    assert options[0]["utc"] == "2024-04-06T14:45:00Z"
    assert options[1]["utc"] == "2024-04-06T15:15:00Z"


@pytest.mark.parametrize(
    ("seconds", "expected"),
    [
        (0, "+00:00"),
        (-14400, "-04:00"),
        (-18000, "-05:00"),
        (39600, "+11:00"),
        (37800, "+10:30"),
        (1800, "+00:30"),
    ],
)
def test_format_offset(seconds: int, expected: str) -> None:
    assert format_offset(seconds) == expected
