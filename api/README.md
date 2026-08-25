# LemAstra API

Local calculation service (Phase 2+, decision D-01/D-02): a uv-managed
Python 3.12 FastAPI app that wraps the vendored `astrology-skill`
calculator (`tools/birth_to_chart.py`) as a JSON-in/JSON-out subprocess
with a hard timeout. Local dev only in Phase 2 — bind `127.0.0.1:8000`;
no deployed endpoint, no real-user data.

## Vendored calculator

The pinned `astrology-skill` tree lives at `vendor/astrology-skill/`
(committed directly — **not** a git submodule; upstream force-pushed
`main` after the pin, so the verified revision is snapshotted here).
`vendor/astrology-skill/UPSTREAM.revision` records the pinned commit
SHA; the API reads it at startup and stamps every health/chart response
with it. Do not edit files under `vendor/` — see `UPSTREAM.revision`
for the upgrade procedure.

## Bootstrap

Requires [uv](https://docs.astral.sh/uv/) (the official installer fetches
its own managed CPython 3.12 — the host Python version is irrelevant):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # once
cd api
uv sync        # creates .venv from the committed uv.lock (exact resolution)
```

`uv sync` also builds `pyswisseph` from its sdist (no CPython 3.12 wheels
exist) — a C toolchain is required (present on macOS with Xcode CLT and
on GitHub `ubuntu-latest` runners).

## Run (local dev)

```bash
cd api
uv run uvicorn lemastra_api.main:app --reload --port 8000
# then: curl -s localhost:8000/api/v1/health
```

The service binds loopback (`127.0.0.1:8000`) per the Phase 2 local-only
posture; CORS allowlist comes from `LEMASTRA_ALLOW_ORIGINS` (see
`.env.example`).

### Simulator base URLs (client → local API)

| Platform | Base URL |
|----------|----------|
| iOS simulator | `http://localhost:8000` |
| Android emulator | `http://10.0.2.2:8000` |
| Web | `http://localhost:8000` |

Override with `EXPO_PUBLIC_API_URL` in the client `.env` (non-secret).

## Tests

```bash
cd api
uv run pytest -q              # full suite (health, civil_time, calculator)
```

The calculator tests run the **real** vendored subprocess (~40 ms each).
No network access and no `GOOGLE_API_KEY` are needed for the test suite.
