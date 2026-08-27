# Phase 2: Trustworthy Natal Chart - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-25
**Phase:** 2-Trustworthy Natal Chart
**Areas discussed:** Calculation service shape, Birthplace & timezone flow, Tricky-time UX, Defaults & provenance display

---

## Calculation service shape

| Option | Description | Selected |
|--------|-------------|----------|
| FastAPI in monorepo (Recommended) | New api/ directory: FastAPI wraps birth_to_chart.py as a subprocess. Matches STACK.md and provider registry. | ✓ |
| Defer backend | Separate service repo later; Phase 2 runs calculator another way | |
| Other arrangement | User describes a different arrangement | |

**User's choice:** FastAPI in monorepo
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Local dev only (Recommended) | Service runs locally during development; Expo app points at local URL; deployment in a later phase | ✓ |
| Deploy now | Stand up container on a hosting provider from day one | |
| Dev + preview deploy | Local-first plus one disposable preview deployment | |

**User's choice:** Local dev only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| One-time notice (Recommended) | First calculation shows a one-time inline notice (what is sent, where, ephemeral/not stored), then proceeds | ✓ |
| Settings toggle | Remote calculation off until enabled in settings | |
| Ask every time | Every calculation explicitly confirms the payload | |

**User's choice:** One-time notice
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Two-step API (Recommended) | Endpoint 1: resolve place → candidates; Endpoint 2: calculate chart with confirmed data | ✓ |
| Single endpoint | One endpoint returns candidates + chart; confirmation client-side after results | |
| You decide | Researcher/planner settles exact API shape | |

**User's choice:** Two-step API
**Notes:** None

---

## Birthplace & timezone flow

*User dismissed the interactive questions and instructed: "go with recommended option for birthplace/timezone flow." Recommended set applied wholesale.*

| Option | Description | Selected |
|--------|-------------|----------|
| Search + manual fallback (Recommended) | Type-ahead search via server-side Google Geocoding + manual entry (label, lat/lon, IANA timezone picker) | ✓ |
| Search only | Geocoding search only; no match blocks progress | |
| Manual only | Users always type label + coordinates + timezone | |

**User's choice:** Search + manual fallback (delegated to recommended)
**Notes:** Also applied recommended treatment for the BIRTH-02 confirmation screen (label, coordinates, IANA zone, resolved UTC offset before Calculate) and server-side Google Time Zone API resolution (never inferred from device clock).

---

## Tricky-time UX

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit picker (Recommended) | Ambiguous/nonexistent civil times resolved by explicit user offset choice; app never silently chooses | ✓ |
| Both variants | Calculate both variants, user switches between charts | |
| Warn only | Keep entry; resolve at calculation time with warning | |

**User's choice:** Explicit picker
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Inline four-state control (Recommended) | Timed (default) / Approximate / Rectified / Unknown visible on the form with helper text | ✓ |
| Two-step prompt | "Do you know your birth time?" then refine | |
| Advanced-only | Plain entry treated as Timed; refinement behind advanced disclosure | |

**User's choice:** Inline four-state control
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Only valid factors, marked (Recommended) | Time-independent factors listed; time-dependent factors marked unavailable with why; no noon chart | ✓ |
| Illustrative noon chart | Demonstrative watermarked noon chart alongside valid-factor lists | |
| Require a time | Block unknown-time entry | |

**User's choice:** Only valid factors, marked
**Notes:** skill's `--noon-for-unknown` deliberately unused (BIRTH-05).

---

## Defaults & provenance display

| Option | Description | Selected |
|--------|-------------|----------|
| Whole Sign default + selector (Recommended) | Calculator default (Whole Sign) with selector for other supported systems | ✓ |
| Placidus default + selector | Consumer-familiar default, selector offered | |
| Single system, fixed | One house system, no selector in Phase 2 | |

**User's choice:** Whole Sign default + selector
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Compact + expandable detail (Recommended) | Assumptions line + expandable Calculation details with full CALC-03 provenance | ✓ |
| Full inline block | Full provenance always visible on result screen | |
| Separate screen | Provenance behind dedicated Details destination | |

**User's choice:** Compact + expandable detail
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| Structured list only (Recommended) | Placement list + assumptions + provenance + validation status; wheel is Phase 4 | ✓ |
| List + aspects table | Also include static aspects table | |
| Preliminary wheel | Rough wheel ahead of Phase 4 | |

**User's choice:** Structured list only
**Notes:** None

| Option | Description | Selected |
|--------|-------------|----------|
| In-repo JSON fixture suite (Recommended) | Frozen JSON fixtures vs vendored skill revision; DST/unknown-time/high-latitude coverage; pytest in CI | ✓ |
| Generated fixtures | Expected values generated on the fly, self-consistency only | |
| Skill tests only | Rely on astrology-skill's own smoke tests | |

**User's choice:** In-repo JSON fixture suite
**Notes:** Satisfies GATE-02 within Phase 2.

---

## Agent's Discretion

- FastAPI project layout inside api/ (modules, config, error taxonomy)
- astrology-skill vendoring strategy (git dep / submodule / pinned tree) — revision must be recorded in provenance
- Form library (React Hook Form + Zod per STACK.md) and TanStack Query wiring — not yet installed; installing per STACK.md is fine
- CALC-04 recoverable-error taxonomy details
- Local dev connection ergonomics (app → api URL config)

## Deferred Ideas

None — discussion stayed within phase scope.
