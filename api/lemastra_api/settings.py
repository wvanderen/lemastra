"""Environment-driven settings (plain ``os.environ`` reads, no pydantic-settings).

Every key is documented in ``api/.env.example``. Values are frozen into a
dataclass once loaded; callers get a snapshot via :func:`load_settings`.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

# Repo root: api/lemastra_api/settings.py -> api/ -> repo root.
_REPO_ROOT = Path(__file__).resolve().parents[2]

DEFAULT_ALLOW_ORIGINS = "http://localhost:8081,http://127.0.0.1:8081"
DEFAULT_SKILL_PATH = "vendor/astrology-skill"
DEFAULT_CALC_TIMEOUT_S = 10.0


@dataclass(frozen=True)
class Settings:
    """Frozen snapshot of the service configuration."""

    google_api_key: str
    calc_timeout_s: float
    allow_origins: tuple[str, ...]
    skill_path: Path


def load_settings() -> Settings:
    """Read the environment (no caching — call sites decide lifetime)."""
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
