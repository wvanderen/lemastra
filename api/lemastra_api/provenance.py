"""Structured provenance reader (CALC-03 foundation).

Reads the version chain of everything that influences a calculation:

- ``skill_revision`` — the pinned ``astrology-skill`` revision. Read via
  ``git -C <skill_path> rev-parse HEAD`` when the skill path is a git
  checkout (e.g. ``LEMASTRA_SKILL_PATH`` pointed at a local clone for
  experiments); otherwise read from the committed ``UPSTREAM.revision``
  pin file that ships with the vendored snapshot.
- ``swisseph`` — the Swiss Ephemeris version of the *running venv* (the
  calculator subprocess runs the same venv, research A4).
- ``tzdata`` — the IANA database version via ``importlib.metadata``.
- ``schema`` — identity of the vendored ``chart_input_schema.json``
  (``$id`` when present, otherwise title + JSON Schema draft).
- ``api`` — this service's version (static).

The result is cached per skill path: versions cannot change within a
running process, and ``/api/v1/health`` plus every chart envelope reuse
the same snapshot.
"""

from __future__ import annotations

import functools
import json
import logging
import re
import subprocess
from pathlib import Path

import swisseph
from importlib.metadata import version as pkg_version

logger = logging.getLogger(__name__)

API_VERSION = "0.1.0"

_SHA_RE = re.compile(r"[0-9a-f]{40}")


@functools.lru_cache(maxsize=None)
def read_versions(skill_path: str | Path) -> dict[str, str]:
    """Return the cached version chain for the skill at ``skill_path``."""
    path = Path(skill_path)
    return {
        "skill_revision": _read_skill_revision(path),
        "swisseph": swisseph.version,
        "tzdata": pkg_version("tzdata"),
        "schema": _read_schema_identity(path),
        "api": API_VERSION,
    }


def _read_skill_revision(skill_path: Path) -> str:
    """Pinned revision: git ref if the path is a checkout, else the pin file."""
    try:
        # Verify the skill path is itself the root of a git checkout —
        # `git -C` on a plain directory silently resolves the parent repo
        # (e.g. this repository), which would report the wrong revision.
        toplevel = subprocess.run(
            ["git", "-C", str(skill_path), "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        ).stdout.strip()
        if Path(toplevel).resolve() != skill_path.resolve():
            raise RuntimeError("skill path is inside another git repository")
        result = subprocess.run(
            ["git", "-C", str(skill_path), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=10,
            check=True,
        )
        revision = result.stdout.strip()
        if _SHA_RE.fullmatch(revision):
            return revision
    except (OSError, subprocess.SubprocessError, RuntimeError) as exc:
        logger.debug("skill path %s is not a readable git checkout: %s", skill_path, exc)

    pin_file = skill_path / "UPSTREAM.revision"
    revision = pin_file.read_text(encoding="utf-8").splitlines()[0].strip()
    if not _SHA_RE.fullmatch(revision):
        raise RuntimeError(
            f"UPSTREAM.revision at {pin_file} does not contain a full 40-char SHA"
        )
    return revision


def _read_schema_identity(skill_path: Path) -> str:
    """Identity string for the vendored chart input schema."""
    schema_path = skill_path / "assets" / "schemas" / "chart_input_schema.json"
    doc = json.loads(schema_path.read_text(encoding="utf-8"))
    if "$id" in doc:
        return str(doc["$id"])
    title = doc.get("title", "chart_input_schema")
    draft = "unknown draft"
    schema_decl = str(doc.get("$schema", ""))
    match = re.search(r"draft/([\w-]+)/", schema_decl)
    if match:
        draft = match.group(1)
    return f"{title} (draft {draft})"
