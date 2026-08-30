"""Dotenv bridge: parser grammar, real-env precedence, and load_settings pickup.

Env hygiene law for this file: the loader may introduce keys into
``os.environ`` that monkeypatch would not otherwise clean up, so every
key a test lets the loader define must first go through
``monkeypatch.setenv(KEY, "sentinel")`` followed by
``monkeypatch.delenv(KEY)`` — monkeypatch then restores the exact prior
state (including prior absence) at teardown even after ``setdefault``
injects a value. Grammar cases use file-unique ``DOTENV_TEST_*`` key
names so no other test file could ever read them.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import pytest

from lemastra_api.settings import _load_dotenv, load_settings


def _hygiene(monkeypatch: pytest.MonkeyPatch, *keys: str) -> None:
    """Register keys for exact-state teardown before the loader sees them.

    ``setenv`` + ``delenv`` makes monkeypatch snapshot the PRIOR state
    (present or absent); any value the loader later injects via
    ``setdefault`` is reverted at teardown.
    """
    for key in keys:
        monkeypatch.setenv(key, "sentinel")
        monkeypatch.delenv(key)


def _write_env(tmp_path: Path, content: str) -> Path:
    path = tmp_path / ".env"
    path.write_text(content, encoding="utf-8")
    return path


def test_missing_file_is_silent_no_op(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING):
        _load_dotenv(tmp_path / "does-not-exist.env")
    assert caplog.records == []


def test_comments_and_blank_lines_skipped(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_A")
    _load_dotenv(
        _write_env(
            tmp_path,
            "# full-line comment\n"
            "\n"
            "   \n"
            "DOTENV_TEST_A=present\n"
            "  # indented comment\n",
        )
    )
    assert os.environ["DOTENV_TEST_A"] == "present"
    assert "DOTENV_TEST_B" not in os.environ


def test_export_prefix_parsed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_EXPORT")
    _load_dotenv(_write_env(tmp_path, "export DOTENV_TEST_EXPORT=shipped\n"))
    assert os.environ["DOTENV_TEST_EXPORT"] == "shipped"


def test_value_containing_equals_split_on_first(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_EQ")
    _load_dotenv(_write_env(tmp_path, "DOTENV_TEST_EQ=a=b=c\n"))
    assert os.environ["DOTENV_TEST_EQ"] == "a=b=c"


def test_matching_quote_pair_stripped(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_DQ", "DOTENV_TEST_SQ")
    _load_dotenv(
        _write_env(
            tmp_path,
            'DOTENV_TEST_DQ="double quoted"\n'
            "DOTENV_TEST_SQ='single quoted'\n",
        )
    )
    assert os.environ["DOTENV_TEST_DQ"] == "double quoted"
    assert os.environ["DOTENV_TEST_SQ"] == "single quoted"


def test_mismatched_quotes_left_verbatim(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_MIXED")
    _load_dotenv(_write_env(tmp_path, 'DOTENV_TEST_MIXED="mixed\'\n'))
    assert os.environ["DOTENV_TEST_MIXED"] == '"mixed\''


def test_empty_value_allowed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_EMPTY")
    _load_dotenv(_write_env(tmp_path, "DOTENV_TEST_EMPTY=\n"))
    assert os.environ["DOTENV_TEST_EMPTY"] == ""


def test_malformed_lines_skipped_with_line_number_only_warnings(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
    caplog: pytest.LogCaptureFixture,
) -> None:
    _hygiene(monkeypatch, "DOTENV_TEST_OK")
    malformed = "this line has no equals sign SECRETVALUE"
    with caplog.at_level(logging.WARNING):
        _load_dotenv(
            _write_env(
                tmp_path,
                f"# header\n{malformed}\n=empty-key-value\nDOTENV_TEST_OK=fine\n",
            )
        )
    warnings = [r for r in caplog.records if r.levelno == logging.WARNING]
    assert len(warnings) == 2
    messages = [r.getMessage() for r in warnings]
    # Line numbers present, line CONTENT absent (a mangled line could
    # carry a pasted secret).
    assert any("line 2" in m for m in messages)
    assert any("line 3" in m for m in messages)
    for message in messages:
        assert "SECRETVALUE" not in message
        assert "empty-key-value" not in message
    assert os.environ["DOTENV_TEST_OK"] == "fine"


def test_real_env_precedence_pre_set_key_not_overridden(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DOTENV_TEST_PRESET", "from-shell")
    _load_dotenv(_write_env(tmp_path, "DOTENV_TEST_PRESET=from-file\n"))
    assert os.environ["DOTENV_TEST_PRESET"] == "from-shell"


def test_real_env_precedence_present_but_empty_not_overridden(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("DOTENV_TEST_EMPTYWIN", "")
    _load_dotenv(_write_env(tmp_path, "DOTENV_TEST_EMPTYWIN=from-file\n"))
    assert os.environ["DOTENV_TEST_EMPTYWIN"] == ""


def test_load_settings_picks_up_documented_keys_from_dotenv(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """End-to-end: load_settings reads GOOGLE_API_KEY and origins from .env."""
    _hygiene(monkeypatch, "GOOGLE_API_KEY", "LEMASTRA_ALLOW_ORIGINS")
    monkeypatch.setattr(
        "lemastra_api.settings._DOTENV_PATH",
        _write_env(
            tmp_path,
            "GOOGLE_API_KEY=file-key\n"
            "LEMASTRA_ALLOW_ORIGINS=http://one.test,http://two.test\n",
        ),
    )
    settings = load_settings()
    assert settings.google_api_key == "file-key"
    assert settings.allow_origins == ("http://one.test", "http://two.test")
