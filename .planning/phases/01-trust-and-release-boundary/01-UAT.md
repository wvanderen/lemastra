---
status: testing
phase: 01-trust-and-release-boundary
source: [01-VERIFICATION.md]
started: 2026-08-23T17:45:00Z
updated: 2026-08-23T17:45:00Z
---

## Current Test

number: 1
name: MVP user-flow walk-through — app opens on Privacy & Data screen
expected: |
  Run `npm install && npx expo start`, open the app on web (w), iOS simulator (i), or Android (a).
  The app opens directly on the Privacy & Data screen: all six providers (LemAstra Calculation
  Service, Google Geocoding + Time Zone APIs, Hosting Provider, OpenAI Responses API, Supabase,
  Sentry) each show name, 'Planned — not yet active' label, data categories, 'When it sends'
  trigger, Retention, Purpose; a banner reading 'No remote feature is enabled yet… no data
  currently leaves your device' appears at the top.
awaiting: user response

## Tests

### 1. MVP user-flow walk-through (interactive device/simulator)
expected: App opens directly on the Privacy & Data screen; six provider cards each show name, "Planned — not yet active" label, data categories, "When it sends" trigger, Retention, Purpose; nothing-active banner at top.
result: [pending]

### 2. First CI execution on GitHub Actions
expected: Add a GitHub origin remote, push the branch, and confirm the first run: test / gitleaks / bundle-scan jobs all green; introducing a secret-suggestive EXPO_PUBLIC_ name on a scratch branch turns gitleaks/bundle-scan red.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
