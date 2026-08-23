---
phase: 01-trust-and-release-boundary
plan: 05
subsystem: infra
tags: [gitleaks, secrets, expo, governance, gate-06, ci]

# Dependency graph
requires:
  - phase: 01-trust-and-release-boundary (plan 01-01)
    provides: Expo SDK 57 skeleton (exportable web bundle), .gitignore .env* blanket-ignore + !.env.example negation
provides:
  - Secret / publishable-identifier / user-secret classification policy (GATE-06 authority)
  - gitleaks config with custom expo-public-secret-name rule (local + CI consumable)
  - Rationale-contract .gitleaksignore (empty at creation)
  - Locally proven clean scans: git history, working tree, exported web bundle
affects: [01-trust-and-release-boundary (plan 01-07 CI wiring), Phase 2+ (any EXPO_PUBLIC_ or publishable identifier addition), Phase 7 (BYO credential class)]

# Tech tracking
tech-stack:
  added: [gitleaks 8.30.1 (brew-installed dev/CI tooling — not an app dependency)]
  patterns: [classification-based allowlist contract (class + rationale per fingerprint), scan-the-shipped-artifact (bundle scan as authoritative GATE-06 check)]

key-files:
  created: [docs/governance/secret-isolation-policy.md, .gitleaks.toml, .gitleaksignore]
  modified: []

key-decisions:
  - "Custom rule fires on the NAME, not the value: EXPO_PUBLIC_*KEY|SECRET|TOKEN|PASSWORD is forbidden regardless of entropy — bundle inlining makes the name itself the violation"
  - "secretGroup=1 wraps the full variable name so findings/report entries identify the exact forbidden identifier"
  - ".gitleaksignore starts empty with a binding class+rationale header contract — only publishable-identifier class entries may ever be added (T-01-11 mitigation)"
  - "Bundle scan (gitleaks dir dist/) is the authoritative GATE-06 check, since EXPO_PUBLIC_ inlining happens at bundle time"

patterns-established:
  - "Scanner-positive-control: proving a gate fires (temp fixture → exit 1) alongside proving the repo is clean (exit 0)"
  - "Every allowlist entry carries its classification-policy class + rationale as preceding comment lines"

requirements-completed: [GATE-06]

# Metrics
duration: 3min
completed: 2026-08-23
status: complete
---

# Phase 1 Plan 5: Client Secret Isolation Summary

**Three-class secret-isolation policy plus gitleaks gate (custom EXPO_PUBLIC_ secret-name rule) with git history, working tree, and exported web bundle all proven scan-clean.**

## Performance

- **Duration:** 3 min
- **Started:** 2026-08-23T17:15:33Z
- **Completed:** 2026-08-23T17:17:52Z
- **Tasks:** 3
- **Files modified:** 3 (created)

## Accomplishments

- `docs/governance/secret-isolation-policy.md`: GATE-06 classification authority — Secret (forbidden in client, server-side only), Publishable identifier (allowed but fingerprint-allowlisted with rationale), User secret (device-only secure storage; Phase 7 BYO credential class named in advance). Enforcement section maps local git/dir/bundle scans and the 01-07 CI jobs; approval placeholder for 01-07 countersignature.
- `.gitleaks.toml`: extends the gitleaks default ruleset with `expo-public-secret-name` — regex `(EXPO_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|PASSWORD))`, secretGroup 1, keyword EXPO_PUBLIC, paths ts/tsx/js/jsx/json/.env.
- `.gitleaksignore`: binding header contract (class: publishable-identifier + rationale required per entry); zero fingerprint entries — no publishable identifier is in the client yet.
- GATE-06 proven end-to-end locally: history, working tree, and shipped bundle all scan clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the secret-isolation policy** - `d14582b` (feat)
2. **Task 2: Configure gitleaks (.gitleaks.toml + .gitleaksignore)** - `dea4749` (feat)
3. **Task 3: Prove the exported bundle is secret-free** - no commit (build output only, gitignored; evidence recorded here)

**Plan metadata:** (see final docs commit)

## Verification Evidence (Task 3 — authoritative GATE-06 check)

Exact commands and exit statuses:

```
$ npx expo export --platform web
EXPORT_EXIT=0                     # dist/ produced (index.html, privacy.html, assets/, 2.07 MB JS)

$ gitleaks dir dist/ --redact --report-path gitleaks-bundle.json --report-format json
INF scanned ~2068759 bytes (2.07 MB) in 1.36s
INF no leaks found
SCAN_EXIT=0                       # zero findings in the exported bundle

$ rm gitleaks-bundle.json         # transient artifact deleted (dist/ already gitignored)
```

Task 2 scans (both with project config loaded):

```
$ gitleaks git . --redact         # 30 commits scanned, no leaks found — exit 0
$ gitleaks dir . --redact         # working tree (~2.58 MB), no leaks found — exit 0
```

Positive control (gate proven to fire, run against a temp fixture outside the repo, cleaned up after): a `.ts` file containing `EXPO_PUBLIC_SUPABASE_KEY` produced `ruleid: expo-public-secret-name`, exit 1 — the gate fails closed on violations rather than silently passing.

## Files Created/Modified

- `docs/governance/secret-isolation-policy.md` - three-class classification policy + enforcement + allowlist contract (GATE-06 authority)
- `.gitleaks.toml` - default-ruleset extension + expo-public-secret-name custom rule
- `.gitleaksignore` - rationale-contract allowlist header, zero entries

## Decisions Made

- Rule targets secret-suggestive *names* (not values) — EXPO_PUBLIC_ inlining makes any `…KEY|SECRET|TOKEN|PASSWORD` name a bundle-time leak by construction.
- `.gitleaksignore` created empty-but-contracted: the pattern (class + rationale comments) exists before the first real identifier arrives.

## Deviations from Plan

None - plan executed exactly as written.

## Threat Mitigations Applied

- **T-01-09** (EXPO_PUBLIC_ secret inlining): custom rule + authoritative bundle scan, green (Task 3); CI repetition scheduled in 01-07.
- **T-01-10** (committed secrets in history): `gitleaks git .` full-history scan green (30 commits).
- **T-01-11** (allowlist abuse): `.gitleaksignore` header contract requires class + rationale; empty at start; policy §3 governs what qualifies.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. (gitleaks 8.30.1 installed via brew per plan; CI installs its own copy in 01-07.)

## Next Phase Readiness

- GATE-06 enforcement exists and is locally proven across source, history, and shipped artifact — plan 01-07 wires the same commands (`gitleaks git .`, `gitleaks dir .`, `expo export` + `gitleaks dir dist/`) into CI using this same `.gitleaks.toml`.
- Future findings have a classification path (policy §1); future allowlist entries have a required justification format (policy §3 / `.gitleaksignore` header).
- No blockers.

## Self-Check: PASSED

- Files exist: `docs/governance/secret-isolation-policy.md`, `.gitleaks.toml`, `.gitleaksignore` (all committed; `git status` clean)
- Commits exist: `d14582b`, `dea4749` present in `git log`
- All task acceptance criteria re-verified: policy greps (publishable/service_role/secure storage/EXPO_PUBLIC) pass; expo-public-secret-name rule present; git/dir/bundle scans all exit 0

---
*Phase: 01-trust-and-release-boundary*
*Completed: 2026-08-23*
