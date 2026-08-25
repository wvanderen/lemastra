"""FastAPI app factory: CORS allowlist, startup skill check, health endpoint.

Local-dev posture (D-02): bind 127.0.0.1:8000 (see README), no auth this
phase. Every later plan mounts routers on this skeleton.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from lemastra_api.provenance import read_versions
from lemastra_api.settings import Settings, load_settings

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the LemAstra API application."""
    if settings is None:
        settings = load_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        _verify_skill_checkout(settings)
        yield

    app = FastAPI(title="LemAstra API", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allow_origins),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/v1/health")
    def health() -> dict:
        versions = read_versions(settings.skill_path)
        return {"status": "ok", "versions": versions}

    return app


def _verify_skill_checkout(settings: Settings) -> None:
    """Fail fast at startup when the vendored calculator is missing."""
    skill_script = settings.skill_path / "tools" / "birth_to_chart.py"
    if not skill_script.is_file():
        raise RuntimeError(
            f"astrology-skill calculator not found at {skill_script}. "
            "The vendored skill tree is missing — run "
            "`git submodule update --init` (submodule checkouts) or "
            "restore vendor/astrology-skill from the repository "
            "(pinned snapshot with UPSTREAM.revision)."
        )
    # Cache the version chain once at startup so every health/chart
    # response shares the same provenance snapshot.
    versions = read_versions(settings.skill_path)
    logger.info(
        "LemAstra API ready — skill %s, swisseph %s, tzdata %s",
        versions["skill_revision"][:12],
        versions["swisseph"],
        versions["tzdata"],
    )


# Module-level ASGI app for `uvicorn lemastra_api.main:app` (README flow).
# Tests build isolated instances via create_app(); this one reads the
# ambient environment once at import.
app = create_app()
