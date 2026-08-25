# Phase 2: User Setup Required

**Generated:** 2026-08-25
**Phase:** 02-trustworthy-natal-chart
**Status:** Incomplete

Complete these items for live place search and timezone resolution at UAT. Implementation and the whole test suite use recorded Google fixtures and need no key — this setup is only required for **live** verification (D-05/D-07 flows).

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `GOOGLE_API_KEY` | GCP Console → APIs & Services → Credentials → Create API key (enable Geocoding API and Time Zone API on the project first) | `api/.env` (gitignored — copy from `api/.env.example`) |

## Account Setup

A Google Cloud Platform project with billing enabled is required (Geocoding + Time Zone APIs are billed services; the free monthly credit covers local-dev UAT volume easily).

## Dashboard Configuration

| Status | Task | Location |
|--------|------|----------|
| [ ] | Enable **Geocoding API** and **Time Zone API** on the project | GCP Console → APIs & Services → Library |
| [ ] | Create an API key and **restrict it to those two services** (API restrictions) | GCP Console → APIs & Services → Credentials |

## Local Dev Notes

- The key lives only in `api/.env` (gitignored via the root `.env*` rule) and is read server-side at call time — it must never appear in the client, in `EXPO_PUBLIC_*`, or in any log line (GATE-06 / docs/governance/secret-isolation-policy.md).
- Without the key the API fails honestly: place search and google-path timezone resolution return typed `PLACE_PROVIDER_UNAVAILABLE` / `TIMEZONE_PROVIDER_UNAVAILABLE` (503) with manual-fallback hints; the manual `tz_override` path and `GET /api/v1/meta/zones` work without any key.
- Start the server from `api/` with `uv run uvicorn lemastra_api.main:app --reload --port 8000`.

## Verification Commands

```bash
# Without a key — honest failure (works today, no setup needed):
curl -s -X POST localhost:8000/api/v1/places/search \
  -d '{"query":"brooklyn"}' -H 'content-type: application/json'
# → HTTP 503, error.code PLACE_PROVIDER_UNAVAILABLE

# With the key configured in api/.env — live search:
curl -s -X POST localhost:8000/api/v1/places/search \
  -d '{"query":"brooklyn"}' -H 'content-type: application/json'
# → HTTP 200 with candidates[] and provenance.provider google-geocoding-timezone

# With the key configured — live resolve-time (google identity path):
curl -s -X POST localhost:8000/api/v1/places/resolve-time \
  -d '{"lat":40.7128,"lon":-74.006,"local_date":"1990-05-21","local_time":"14:30"}' \
  -H 'content-type: application/json'
# → HTTP 200 with iana_zone America/New_York, resolved.offset_label "-04:00", drift false
```
