---
phase: 03-private-local-workspace
plan: 02
subsystem: privacy
tags: [redaction, telemetry-guard, logging, governance-tests, vitest, privacy]

# Dependency graph
requires:
  - phase: 01-trust-and-release-boundary
    provides: governance doc set (retention-deletion-policy §4 log/telemetry posture) + governance-docs.test.ts fail-hard scan archetype
  - phase: 02-trustworthy-natal-chart
    provides: api-schemas.ts envelope/birth-data shapes (chart_data, provenance, date/time/place/label/iana_zone) the redact tests prove stripped
provides:
  - redact(metadata) allowlist utility + ALLOWED_LOG_KEYS frozen set (coarse keys only)
  - logger (info/warn/error) — the only sanctioned console surface in src/; every call routes metadata through redact()
  - telemetry-guard.test.ts build gates: no telemetry dependency, no telemetry import, no stray console call site (T-03-04/05/06)
  - the seam a Phase-7+ Sentry beforeSend inherits (D-16 key_link)
affects: [04-chart-wheel, 05-transits, 06-interpretation, 07-managed-connections (Sentry integration), any phase adding logging]

# Tech tracking
tech-stack:
  added: []  # zero new dependencies — deliberate (PRIV-03: no analytics surface exists)
  patterns:
    - "Allowlist redaction (default-deny) — only sanctioned coarse keys survive; containers shallow-filtered ONE level with the same allowlist; arrays/deeper objects dropped wholesale"
    - "Sanctioned-logger pattern — single module owns the console global; guard test fails the build on any other console token"
    - "Mutation-verified positive control for fail-hard scanner tests (Phase-1 scanner pattern)"

key-files:
  created:
    - src/lib/redact.ts
    - src/__tests__/redact.test.ts
    - src/__tests__/telemetry-guard.test.ts
  modified: []

key-decisions:
  - "redact() output type allows one level of shallow-filtered container (not wholesale object drop): the plan behavior row requires birth-data keys stripped 'even when nested one level deep inside an allowlisted container value that is itself an object' — the same allowlist applies at depth 1 with primitive-only leaves, so untrusted structure is never deep-merged"
  - "ALLOWED_LOG_KEYS = error_code, duration_ms, count, attempt, chart_id, revision_id — coarse fields only (Pattern 7: ids without birth data, error codes, durations, counts); JSON-safe primitives (string/number/boolean/null) survive, bigint/functions/symbols/arrays are dropped"
  - "logger always passes the redacted payload object (even with no metadata) so the flowing shape is uniformly the redacted one — the seam a Phase-7+ beforeSend hook inherits"
  - "No allowlist/exemption file for the console scan (T-03-06): a future legitimate call site must extend the sanctioned logger, not append to a list"

patterns-established:
  - "Allowlist-redaction boundary: anything crossing app-internals → logs/telemetry must pass redact()"
  - "Fail-hard source-scan governance tests extended: dependency-graph + import-specifier + call-site-token scans with threat-naming headers"

requirements-completed: [PRIV-03, PRIV-04]

# Metrics
duration: 7 min
completed: 2026-08-27
status: complete
---

# Phase 3 Plan 2: redact() allowlist + telemetry guard Summary

**Allowlist redact() utility + sanctioned logger, plus fail-hard build gates that reject any telemetry SDK, telemetry import, or stray console call site (D-16 — PRIV-03/PRIV-04)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-08-27T18:17:10Z
- **Completed:** 2026-08-27T18:23:53Z
- **Tasks:** 2
- **Files created:** 3

## Accomplishments

- `redact()` allowlist utility: default-deny — coarse fields (error codes, durations, counts, chart/revision ids) survive verbatim; envelope shapes (chart_data/provenance/placements), birth-data shapes (date/time/place/label/iana_zone/envelope/identity/inputs — including one level nested inside an allowlisted container), unknown keys, arrays, and deeper objects are all stripped before any output call is possible
- `logger` (info/warn/error) is the only sanctioned console surface in src/ — every call routes metadata through redact(), and the module header states the PRIV-03/04 law + the Phase-7+ Sentry beforeSend inheritance requirement
- `telemetry-guard.test.ts` makes the no-telemetry posture build-enforced (runs in the mandatory CI vitest job, `.github/workflows/ci.yml` test job): dependency scan (sentry/posthog/amplitude/segment/firebase/datadog/bugsnag/analytics substrings), import-specifier scan over src/**\/*.{ts,tsx} (excluding tests/setup), and console-token scan outside src/lib/redact.ts
- Positive control mutation-verified: injecting a stray `console.log` into an application source file tripped the suite (exit 1, violation message naming file + token); mutation reverted, suite green again

## Task Commits

Each task was committed atomically:

1. **Task 1: redact() allowlist utility + sanctioned logger** (TDD)
   - RED: `8208805` (test: failing redact/logger tests — module did not exist)
   - GREEN: `3f73734` (feat: implement redact.ts — 14/14 tests, tsc clean)
2. **Task 2: telemetry guard source-scan tests** - `a21c56f` (test: 3 fail-hard gates + positive control)

## Files Created/Modified

- `src/lib/redact.ts` - ALLOWED_LOG_KEYS frozen allowlist, redact() (default-deny, one-level shallow container filter), logger info/warn/error routing through redact()
- `src/__tests__/redact.test.ts` - 14 pure-unit tests covering every plan behavior row (coarse survival, envelope/birth-data stripping incl. nested, allowlist default-deny, logger routing via console spies)
- `src/__tests__/telemetry-guard.test.ts` - 3 fail-hard source scans (dependency graph, import specifiers, console call-site tokens) with threat-naming header + positive-control record

## Decisions Made

- **One-level container filter instead of wholesale object drop:** the plan behavior row ("birth-data keys dropped even when nested one level deep inside an allowlisted container value that is itself an object") presupposes containers can survive at depth 1 — the same allowlist re-applies there with primitive-only leaves, satisfying both the nested-strip behavior and the "no deep-merging untrusted structure" action constraint
- **Minimal coarse allowlist:** exactly the categories Pattern 7 names (error codes, durations, counts, chart/revision ids) — `input_revision` digest deliberately excluded from v1 allowlist to keep the surface minimal; extending the set is a review-visible act
- **JSON-safe primitives only** (string/number/boolean/null): bigint/functions/symbols dropped so the redacted payload survives any future JSON serialization in a Sentry-like pipeline

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] tsc type error in telemetry-guard test (readdirSync recursive entries)**
- **Found during:** Task 2 (verification gate)
- **Issue:** `readdirSync(SRC_ROOT, { recursive: true })` is typed `(string | NonSharedBuffer)[]` — `.split()` failed `tsc --noEmit`
- **Fix:** coerce entries with `.toString()` before separator normalization
- **Files modified:** src/__tests__/telemetry-guard.test.ts
- **Verification:** full verify chain green — targeted 17/17, full suite 222/222 (24 files), `tsc --noEmit` exit 0
- **Committed in:** a21c56f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial type-level fix in the new test file; no scope change, no behavioral impact.

## Positive Control Record (mutation-verified trip)

Per Task 2 acceptance criterion 4 and the Phase-1 scanner-positive-control pattern: during execution (2026-08-27), a temporary file `src/lib/__guard-positive-control.ts` containing `console.log("temporary stray logging call")` was added under src/lib/. `npx vitest run src/__tests__/telemetry-guard.test.ts` exited **1** with:

```
PRIV-04 ... Violations: lib/__guard-positive-control.ts contains "console.log"
```

The mutation was then reverted and the suite re-verified green. The trip is also documented in the test file's header comment.

## Verification Results

- `npx vitest run src/__tests__/telemetry-guard.test.ts src/__tests__/redact.test.ts` → 17/17 passed ✓
- `npx vitest run` (full suite) → 24 files, 222/222 passed ✓
- `npx tsc --noEmit` → clean ✓
- Guards run in the mandatory CI vitest job (ci.yml test job runs `npx vitest run`; both test files match the vitest include pattern) ✓
- Baseline confirmed before implementation: zero `console.*` call sites in src/ outside tests (PRIV-04 baseline clean, as researched)

## Issues Encountered

None beyond the auto-fixed type error above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-16 posture is now build-enforced: adding any analytics/crash SDK, telemetry import, or stray logging call site breaks the mandatory CI vitest job
- `redact()` + `logger` are the ready-made seam for the Phase-7+ Sentry integration (beforeSend routes through redact(); SDK arrival must also update this guard suite's policy, not bypass it)
- Symbols for later plans: `redact(metadata)`, `ALLOWED_LOG_KEYS`, `logger` from `src/lib/redact.ts`

## Self-Check: PASSED

- Files exist on disk: src/lib/redact.ts ✓, src/__tests__/redact.test.ts ✓, src/__tests__/telemetry-guard.test.ts ✓
- Commits found: 8208805 ✓, 3f73734 ✓, a21c56f ✓
- All acceptance criteria re-verified green after the final state (targeted suites, full suite, tsc)

---
*Phase: 03-private-local-workspace*
*Completed: 2026-08-27*
