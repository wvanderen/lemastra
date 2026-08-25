"""Calculator subprocess wrapper (STACK.md isolation contract, CALC-04).

One ``asyncio.create_subprocess_exec`` per request against the vendored
``tools/birth_to_chart.py`` — argv is fully controlled (no shell is
ever involved; threat T-02-01) and never flags-mode (the
``--tz "-05:00"`` argparse trap): the payload always travels as
``--input`` temp-file JSON content. Stdin is DEVNULL
so an underspecified payload can never drop the calculator into
interactive prompts (verified footgun). The child environment is
stripped of secret-looking variables (T-02-02). A hard
``asyncio.wait_for`` timeout kills the subprocess (T-02-03); the
default (10 s) gives ~250x headroom over the verified ~40 ms runtime.

Exit-code taxonomy (verified against the pinned skill revision):
- ``0``                     -> parsed chart envelope (stdout JSON)
- ``2`` + ``FAIL:`` stderr  -> ``CalculatorInvalidInput`` carrying the
  field-naming message verbatim (already excellent user-facing copy)
- ``1`` / anything else     -> ``CalculatorEngineError`` (traceback
  logged server-side only), UNLESS the stderr contains
  ``swisseph.houses`` -> ``CalculatorUnsuitableHouseSystem``
  (high-latitude quadrant-house crash, verified at 69.6°N)

Subprocess stdout/stderr are discarded after error-code extraction and
never logged with payload content (T-02-04, retention §1).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from lemastra_api.settings import load_settings

logger = logging.getLogger(__name__)

_VALID_CONFIDENCE = {"timed", "approximate", "rectified", "unknown"}

# Substrings whose presence in stderr marks the high-latitude quadrant
# house-system crash (raw swisseph.Error, not a typed ConfigError).
_UNSUITABLE_MARKER = "swisseph.houses"


class CalculatorError(Exception):
    """Base class for typed calculator failures (CALC-04)."""

    error_code = "CALC_ENGINE_ERROR"


class CalculatorInvalidInput(CalculatorError):
    """Exit 2: bad/missing input or schema-validation failure."""

    error_code = "CALC_INVALID_INPUT"


class CalculatorEngineError(CalculatorError):
    """Exit 1 / unrecognized: uncaught engine exception."""

    error_code = "CALC_ENGINE_ERROR"


class CalculatorTimeout(CalculatorError):
    """Subprocess exceeded the hard timeout and was killed."""

    error_code = "CALC_TIMEOUT"


class CalculatorUnsuitableHouseSystem(CalculatorError):
    """Quadrant house system uncomputable at this latitude/date."""

    error_code = "CALC_UNSUITABLE_HOUSE_SYSTEM"


def build_child_env() -> dict[str, str]:
    """Child environment: ``os.environ`` minus secret-looking variables.

    The calculator needs none of our credentials (T-02-02) — strip any
    variable whose name advertises a key/secret/token.
    """
    return {
        name: value
        for name, value in os.environ.items()
        if not any(marker in name.upper() for marker in ("KEY", "SECRET", "TOKEN"))
    }


def unknown_time_payload(base: dict[str, Any]) -> dict[str, Any]:
    """D-10-compliant unknown-time inputs (``--noon-for-unknown`` never used).

    Explicit ``time 12:00`` + ``confidence unknown`` is verified to
    produce output identical to the flag minus one provenance sentence;
    the response's factor-availability marking carries the real D-10
    semantics (02-03 derives ``unavailable_factors``).
    """
    payload = dict(base)
    payload["time"] = "12:00"
    payload["confidence"] = "unknown"
    payload.pop("noon_for_unknown", None)
    return payload


def _prepare_payload(input_payload: dict[str, Any]) -> dict[str, Any]:
    """Enforce wrapper-level payload hygiene before spawning a process.

    - ``validate: True`` always (the schema gate is not optional); the
      ``--validate`` argv flag is also passed because the script lets
      the flag override the file value.
    - Explicit ``confidence`` always: the calculator's inference
      short-circuits on an explicit value, so wording hints in the
      place label can never silently downgrade a Timed reading.
    """
    payload = dict(input_payload)
    payload["validate"] = True

    confidence = str(payload.get("confidence", "")).strip().lower()
    if confidence not in _VALID_CONFIDENCE:
        raise CalculatorInvalidInput(
            "confidence must be one of "
            f"{sorted(_VALID_CONFIDENCE)} (got {payload.get('confidence')!r})"
        )
    payload["confidence"] = confidence
    return payload


async def run_chart(
    input_payload: dict[str, Any], *, timeout_s: float | None = None
) -> dict[str, Any]:
    """Run the vendored calculator on ``input_payload``; return the chart.

    Raises the typed ``Calculator*`` taxonomy on failure (02-03 maps
    ``error_code`` onto the HTTP error surface).
    """
    payload = _prepare_payload(input_payload)
    settings = load_settings()
    skill_script = settings.skill_path / "tools" / "birth_to_chart.py"
    if timeout_s is None:
        timeout_s = settings.calc_timeout_s

    with tempfile.TemporaryDirectory(prefix="lemastra-calc-") as workdir:
        input_path = Path(workdir) / "input.json"
        input_path.write_text(json.dumps(payload), encoding="utf-8")

        proc = await asyncio.create_subprocess_exec(
            sys.executable,
            str(skill_script),
            "--input",
            str(input_path),
            "--validate",
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=build_child_env(),
        )
        try:
            stdout, stderr = await asyncio.wait_for(
                proc.communicate(), timeout=timeout_s
            )
        except TimeoutError:
            proc.kill()
            await proc.communicate()  # reap the killed child
            raise CalculatorTimeout(
                f"calculator exceeded {timeout_s}s timeout and was killed"
            ) from None

        stderr_text = stderr.decode("utf-8", errors="replace").strip()

        if proc.returncode == 0:
            return json.loads(stdout)

        if proc.returncode == 2 and stderr_text.startswith("FAIL:"):
            # Pass the field-naming message through verbatim (minus the
            # FAIL: prefix) — verified excellent user-facing copy.
            raise CalculatorInvalidInput(
                stderr_text.removeprefix("FAIL:").strip()
            )

        if _UNSUITABLE_MARKER in stderr_text:
            raise CalculatorUnsuitableHouseSystem(
                "The selected house system cannot be computed for this "
                "latitude/date (Swiss Ephemeris house calculation "
                "failed). Switch to Whole Sign or Equal houses."
            )

        # Unrecognized failure: log server-side only (T-02-04) — the
        # traceback may embed payload fragments and never reaches the
        # client.
        logger.error(
            "calculator exited %s for input file %s; stderr (server-only): %s",
            proc.returncode,
            input_path.name,
            stderr_text,
        )
        raise CalculatorEngineError(
            "The calculation engine failed unexpectedly. The issue has "
            "been logged; please retry."
        )
