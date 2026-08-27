---
status: testing
phase: 03-private-local-workspace
source: [03-VERIFICATION.md]
started: 2026-08-27T15:50:00Z
updated: 2026-08-27T15:50:00Z
---

## Current Test

number: 1
name: On a device (or emulator), save a labeled chart, force-quit the app, relaunch, and reopen the chart from the home list
expected: |
  The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
awaiting: user response

## Tests

### 1. Real restart survival
expected: The chart appears under 'Saved charts' and reopens with identical placements/provenance — no account, no re-calculation network call
result: [pending]

### 2. Native share sheet + cache-dir writes (both exports)
expected: The native share sheet opens offering lemastra-chart-<slug>-<id>.json / lemastra-all-data.json as application/json; the files exist in the app cache dir and contain pretty-printed provenance-complete JSON
result: [pending]

### 3. Revise round-trip on device
expected: History shows both revisions ('Latest' chip on the new one), the earlier version opens read-only with byte-identical evidence, and identical re-saves show 'Already saved with these exact details.'
result: [pending]

### 4. Full MVP user-flow walkthrough
expected: Every step behaves as the UI-SPEC copy deck states; delete-all ends on 'No personal data is stored on this device.' and the home list is empty
result: [pending]

### 5. Modal visual/focus quality
expected: Dialogs read as dialogs (centered card, focus capture, cancel default), the destructive confirm is the only error-filled element, empty-home renders exactly the Phase-2 hero
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
