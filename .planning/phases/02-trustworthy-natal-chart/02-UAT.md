---
status: complete
phase: 02-trustworthy-natal-chart
source: [02-VERIFICATION.md]
started: 2026-08-26T10:10:00Z
updated: 2026-08-26T19:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Live Google geocoding & timezone resolution

Set `GOOGLE_API_KEY` in `api/.env` (GCP key restricted to Geocoding + Time Zone APIs), run the API + client, search a real birthplace.

expected: Real labeled candidates with coordinates; confirm card shows the Google-resolved IANA zone plus the locally-computed historical offset; drift note only on genuine disagreement. Manual fallback path needs no key (already fixture- and walk-verified).
result: pass
note: Initially blocked (API down, then GOOGLE_API_KEY not loaded, then GCP APIs not enabled). Root causes resolved in session: API must be started with `uv run --env-file .env uvicorn ...` (settings.py reads os.environ only, no dotenv code), and Geocoding + Time Zone APIs must be enabled on the GCP project. Confirmed working via live request and user verification.

### 2. Full-flow walk on device/emulator

Home CTA → /birth (enter date/time, search or manually enter a place, pick confidence incl. Unknown, open Assumptions) → /birth/confirm (resolved card, ambiguous-DST picker on a fall-back time) → first-run disclosure → Calculate → /chart/result (placements, assumptions card, expandable provenance, unavailable factors for Unknown).

expected: Screens render per the UI-SPEC; the tricky-time picker blocks Calculate until an explicit first/second-pass choice; the disclosure appears exactly once; the result screen shows calculated facts only — no wheel, no interpretation.
result: pass
note: Place search returned the designed recoverable 503 (PLACE_PROVIDER_UNAVAILABLE, GOOGLE_API_KEY not configured) with manual-entry guidance; flow completed via manual place entry. Rest of flow passed per user. Live Google path tracked by Test 1.

### 3. Disclosure persistence across app restart

Acknowledge the first-run calculation disclosure, kill and relaunch the app, calculate again.

expected: The disclosure does not reappear after restart (the @lemastra:disclosure.calculation.v1 flag persisted via AsyncStorage).
result: pass

## Summary

total: 3
passed: 3
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
