"""Environment-driven settings (plain ``os.environ`` reads, no pydantic-settings).

Every key is documented in ``api/.env.example``. Values are frozen into a
dataclass once loaded; callers get a snapshot via :func:`load_settings`.

Before the first ``os.environ`` read, :func:`load_settings` bridges the
optional ``api/.env`` file into the process environment via
:func:`_load_dotenv` — a deliberately minimal loader (see its docstring
for the supported grammar). Precedence contract: variables already
present in the real environment (exported in the shell, set by pytest,
set by CI) always win over ``api/.env`` — the file only fills gaps, so
the historically-working exported-key flow is preserved unchanged.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

# Repo root: api/lemastra_api/settings.py -> api/ -> repo root.
_REPO_ROOT = Path(__file__).resolve().parents[2]

# api/ directory: settings.py -> lemastra_api/ -> api/. Resolved from the
# module location (never CWD) because uvicorn may be launched from api/
# or the repo root — the .env file must be found either way.
_DOTENV_PATH = Path(__file__).resolve().parents[1] / ".env"

DEFAULT_ALLOW_ORIGINS = "http://localhost:8081,http://127.0.0.1:8081"
DEFAULT_SKILL_PATH = "vendor/astrology-skill"
DEFAULT_CALC_TIMEOUT_S = 10.0


def _load_dotenv(path: Path) -> None:
    """Bridge ``api/.env`` into ``os.environ`` without overriding anything.

    Precedence: applied via ``os.environ.setdefault`` only — variables
    already present in the real environment (including present-but-empty
    ones) are never overridden.

    Supported grammar (one assignment per line):

    - blank lines and full-line ``#`` comments are skipped;
    - one optional leading ``export `` prefix is dropped;
    - the line splits on the FIRST ``=`` (values may contain ``=``);
    - the value has ONE pair of matching surrounding single or double
      quotes removed; mismatched quotes are left verbatim;
    - empty values are allowed (``KEY=``).

    Deliberate omissions: no variable interpolation, no escape sequences,
    no multiline values, no command execution — a config file is data,
    never code. Malformed lines are skipped with a warning that carries
    the file name and line number ONLY (never the line content — a
    mangled line could contain a pasted secret). A missing file is a
    silent no-op (keyless local dev is a documented posture).
    """
    if not path.is_file():
        return

    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :]
        if "=" not in line:
            logger.warning("%s: line %d skipped (no '=')", path.name, line_number)
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        if not key:
            logger.warning("%s: line %d skipped (empty key)", path.name, line_number)
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        os.environ.setdefault(key, value)


@dataclass(frozen=True)
class Settings:
    """Frozen snapshot of the service configuration."""

    google_api_key: str
    calc_timeout_s: float
    allow_origins: tuple[str, ...]
    skill_path: Path


def load_settings() -> Settings:
    """Read the environment (no caching — call sites decide lifetime)."""
    _load_dotenv(_DOTENV_PATH)
    raw_origins = os.environ.get("LEMASTRA_ALLOW_ORIGINS", DEFAULT_ALLOW_ORIGINS)
    origins = tuple(
        origin.strip() for origin in raw_origins.split(",") if origin.strip()
    )

    raw_skill_path = os.environ.get("LEMASTRA_SKILL_PATH", DEFAULT_SKILL_PATH)
    skill_path = Path(raw_skill_path)
    if not skill_path.is_absolute():
        # Relative skill paths resolve against the repo root, independent
        # of the process CWD (uvicorn may be launched from api/ or repo/).
        skill_path = _REPO_ROOT / skill_path

    return Settings(
        google_api_key=os.environ.get("GOOGLE_API_KEY", ""),
        calc_timeout_s=float(
            os.environ.get("LEMASTRA_CALC_TIMEOUT_S", str(DEFAULT_CALC_TIMEOUT_S))
        ),
        allow_origins=origins,
        skill_path=skill_path,
    )
