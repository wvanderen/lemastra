---
phase: 260826-tob-fix-aspect-schema-contract-mismatch-calc
plan: 01
subsystem: client-api-contracts
tags: [zod, schema-contract, aspects, calculate, tdd]
requires:
  - "vendor/astrology-skill compute_aspects emission contract (applying XOR separating presence flags, neither when relative speed is zero)"
provides:
  - "aspectSchema that accepts every real calculate response (all three aspect shapes)"
  - "recordedCalculateFixture contract test pinning client and server contracts together"
affects:
  - "src/lib/api.ts postCalculate parse path (HTTP-200 responses no longer mis-parse as network errors)"
tech-stack:
  added: []
  patterns:
    - "presence-flag modeling: z.literal(true).optional() mirrors emit-only-when-true calculator fields (same pattern as placeCandidateSchema.partial_match)"
key-files:
  created: []
  modified:
    - src/lib/api-schemas.ts
    - src/lib/api-schemas.test.ts
decisions:
  - "No superRefine for applying/separating mutual exclusivity — mirror the calculator emission exactly; literal-true already rejects every other value and the drift mutation test pins it"
metrics:
  duration: 3 min
  completed: 2026-08-27
status: complete
---

# Quick Task 260826-tob: Fix aspect schema contract mismatch Summary

Mirrored the vendored calculator's aspect emission contract (applying XOR separating as `z.literal(true).optional()` presence flags, neither when relative motion is zero) in `aspectSchema`, pinned by a recorded live-response fixture — real HTTP-200 calculate responses now parse instead of failing as "Can't reach the calculation service."

## What Was Built

### Task 1: Pin the real aspect contract in tests (RED) — 481732a

- Rewrote `calculateTimedFixture.chart_data.aspects` to the three real-world shapes from the recorded Lexington chart: applying-only (Sun square Moon, orb 5.3982), separating-only (Sun trine Jupiter, orb 2.1), neither (Ascendant square Midheaven, orb 0.7063, commented: calculator omits both flags when relative speed is zero — angles carry speed None). `calculateUnknownFixture`'s separating-only aspect left as-is.
- Added `recordedCalculateFixture` — plain object, deliberately NO `satisfies CalculateResponse` (recorded server output the client must accept, not client-authored data): trimmed verbatim values from the live calculate envelope at the temp path (case-placidus-lex), including all 10 provenance keys verbatim, the Lot of Fortune with its extra `house: 9` key, full `source_notes`, and empty `unavailable_factors`/`provisional_factors`. Its 4 aspects cover applying-only (×2), separating-only (×1), and neither (×1).
- Extended the `calculateResponseSchema` suite: timed-envelope test now asserts all three aspect shapes parse; new "parses a recorded real calculate response (client/server contract)" test asserts shape counts, `exact` boolean on every entry, and `input_revision` string; new "rejects aspect contract drift" mutation test asserts `applying: false` throws (calculator only ever emits literal true) and `exact` removal throws.
- RED verified: scoped run failed exactly on the two aspect-contract tests with 5 occurrences of `expected boolean, received undefined` — the production ZodError signature reproduced at the contract layer.

### Task 2: Mirror the calculator contract in aspectSchema (GREEN) — 9036b6b

- Single surgical edit to `aspectSchema` (src/lib/api-schemas.ts): added `applying: z.literal(true).optional().describe(...)` documenting the presence-flag semantics, mutual exclusivity, and the calculator's omit-when-zero-relative-motion rule; changed `separating` from required `z.boolean()` to `z.literal(true).optional().describe(...)`. `exact` and all other fields untouched. No superRefine.
- Deviation note (cosmetic, within task scope): the initial edit used multi-line zod chaining, which broke the plan's grep gate `grep -c 'z.literal(true).optional()'` (returned 0 instead of 2); reformatted to single-line `z.literal(true).optional()` chaining before commit. No behavior difference.

## Verification Results

1. `npx vitest run` — full suite green: **20 files, 191 tests passed**, including the new recorded-response contract test and aspect-shape assertions.
2. `npx tsc --noEmit` — clean; the `satisfies CalculateResponse` fixtures with applying-only aspects typecheck, proving no consumer depended on `separating` being required.
3. Grep gates: `grep -c 'z.literal(true).optional()' src/lib/api-schemas.ts` → **2**; `grep -c 'recordedCalculateFixture' src/lib/api-schemas.test.ts` → **4** (≥ 2).
4. Scope check: `git diff --name-only 19842ab..HEAD` → exactly `src/lib/api-schemas.ts` and `src/lib/api-schemas.test.ts`. No api/, vendor/, src/app/, or copy-deck files touched. Working tree clean, no untracked files.

## TDD Gate Compliance

- RED: `test(quick)` commit 481732a precedes implementation; scoped suite failed exactly on the aspect-contract tests (2 failed / 35 passed) with the expected `separating` invalid_type errors.
- GREEN: `fix(quick)` commit 9036b6b makes all Task 1 tests pass with zero test changes.
- REFACTOR: not needed — the fix is minimal and matches neighboring schema style.

## Deviations from Plan

**1. [Rule 1 - Bug] Reformatted zod chaining to satisfy the contract grep gate**
- **Found during:** Task 2 verification
- **Issue:** Multi-line `.literal(true).optional()` chaining produced 0 matches for the plan-mandated `z.literal(true).optional()` grep/must_haves pattern.
- **Fix:** Reformatted both fields to single-line `z.literal(true).optional().describe(...)` chaining; re-ran the full gate (191/191 + tsc clean) before committing.
- **Files modified:** src/lib/api-schemas.ts
- **Commit:** 9036b6b

Otherwise the plan executed exactly as written.

## Self-Check: PASSED

- Files: `src/lib/api-schemas.ts` FOUND, `src/lib/api-schemas.test.ts` FOUND.
- Commits: `481732a` (test(quick) RED) FOUND, `9036b6b` (fix(quick) GREEN) FOUND on `gsd/phase-02-trustworthy-natal-chart`.
- All four verification gates green (full vitest, tsc, grep gates, scope check).
