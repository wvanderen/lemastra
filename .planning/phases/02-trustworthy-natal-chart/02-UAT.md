---
status: testing
phase: 02-trustworthy-natal-chart
source: [02-VERIFICATION.md]
started: 2026-08-26T18:10:00Z
updated: 2026-08-26T18:10:00Z
---

## Current Test

number: 1
name: Live Google geocoding & timezone resolution
expected: |
  Place type-ahead returns real labeled candidates with coordinates; confirm card shows the
  Google-resolved IANA zone and locally-computed historical offset; drift note appears only
  on genuine disagreement.
awaiting: user response

## Tests

### 1. Live Google geocoding & timezone resolution

Set `GOOGLE_API_KEY` in `api/.env` (GCP key restricted to Geocoding + Time Zone APIs), run the API + client, search a real birthplace.

expected: Real labeled candidates with coordinates; confirm card shows the Google-resolved IANA zone plus the locally-computed historical offset; drift note only on genuine disagreement. Manual fallback path needs no key (already fixture- and walk-verified).
result: [pending]

### 2. Full-flow walk on device/emulator

Home CTA → /birth (enter date/time, search or manually enter a place, pick confidence incl. Unknown, open Assumptions) → /birth/confirm (resolved card, ambiguous-DST picker on a fall-back time) → first-run disclosure → Calculate → /chart/result (placements, assumptions card, expandable provenance, unavailable factors for Unknown).

expected: Screens render per the UI-SPEC; the tricky-time picker blocks Calculate until an explicit first/second-pass choice; the disclosure appears exactly once; the result screen shows calculated facts only — no wheel, no interpretation.
result: [pending]

### 3. Disclosure persistence across app restart

Acknowledge the first-run calculation disclosure, kill and relaunch the app, calculate again.

expected: The disclosure does not reappear after restart (the @lemastra:disclosure.calculation.v1 flag persisted via AsyncStorage).
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
