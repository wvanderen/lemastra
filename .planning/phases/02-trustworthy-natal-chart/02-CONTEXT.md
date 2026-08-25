# Phase 2: Trustworthy Natal Chart - Context

**Gathered:** 2026-08-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can enter birth data (date, local time, birthplace, time-confidence), resolve the birthplace to coordinates + historical IANA timezone with explicit confirmation, resolve ambiguous/nonexistent civil times explicitly, and receive a validated natal chart with visible assumptions, complete calculation/input provenance, and recoverable errors. Includes the golden reference fixture suite (GATE-02). Requirements: BIRTH-01..05, CALC-01..04, GATE-02.

NOT in this phase: saving/persisting charts (Phase 3), the interactive wheel and evidence views (Phase 4), transits (Phase 5), interpretation (Phase 6+). The chart result view in this phase is a structured list, not a wheel.

</domain>

<decisions>
## Implementation Decisions

### Calculation Service
- **D-01:** Calculation runs in a **FastAPI service in the monorepo** (new `api/` directory). It wraps `astrology-skill`'s `tools/birth_to_chart.py` as a JSON-in/JSON-out subprocess per the STACK.md integration contract (hard timeout, no shared calculator state). Python 3.12, uv, exact-locked `pyswisseph`/`tzdata`/`jsonschema`.
- **D-02:** **Local dev only** in Phase 2 — the service runs locally (docker/compose or uvicorn) and the Expo app points at a local URL. No deployed endpoint, no hosting account, no real-user data. Deployment is deferred to a later phase.
- **D-03:** **Two-step API**: (1) resolve-place endpoint returns geocoding candidates (label, lat/lon, IANA zone); (2) calculate endpoint takes the confirmed birth data. The BIRTH-02 confirmation screen sits between them. Each step is independently testable and errorable.
- **D-04:** **One-time disclosure notice** before first calculation: what is sent (birth data), where (LemAstra calculation service), and that requests are ephemeral compute-and-discard (per the Phase 1 retention posture). Then Calculate proceeds without re-asking.

### Birthplace & Timezone Flow
- **D-05:** Place input is **type-ahead search backed by server-side Google Geocoding** (API key stays server-side; provider id `google-geocoding-timezone` from the Phase 1 registry), with a **manual fallback**: direct entry of place label + latitude/longitude + IANA timezone picker when search fails or the user prefers precision. (User delegated this area to the recommended set.)
- **D-06:** The BIRTH-02 confirmation screen shows resolved place label, coordinates, IANA zone, and the **resolved UTC offset for the birth date** before Calculate. (Recommended set.)
- **D-07:** Birth timezone is resolved **server-side via Google Time Zone API** (coordinates + birth timestamp) — never inferred from the device clock. (Recommended set.)

### Tricky-Time UX
- **D-08:** DST gap/overlap (BIRTH-03): an **explicit resolution picker**. Ambiguous (fall-back) times offer first-pass vs second-pass offset choice; nonexistent (spring-forward) times shift to the adjacent valid instant with a clear explanation. The app never silently chooses.
- **D-09:** Birth-time confidence (BIRTH-04): an **inline four-state control** — Timed (default), Approximate, Rectified, Unknown — with beginner-friendly helper text for each.
- **D-10:** Unknown birth time (BIRTH-05): result lists **only time-independent factors** (e.g., planets-in-sign); houses, angles, sect, lots, and other time-dependent factors are explicitly marked unavailable with a short why. **No invented noon chart** — the skill's `--noon-for-unknown` flag is deliberately not used.

### Defaults & Provenance Display
- **D-11:** House system defaults to **Whole Sign** (the calculator's default) with a **selector** for the other systems supported by `birth_to_chart.py`'s HOUSE_SYSTEMS list, surfaced in an assumptions/advanced control. Changing it changes the chart calculation inputs (a new revision conceptually, formalized in Phase 3's WORK-04).
- **D-12:** CALC-02/03 display: a **compact assumptions line** (house system, zodiac mode, ephemeris mode, orb policy) plus an **expandable "Calculation details" section** with full provenance — skill/calculator revision, swisseph version, tzdata version, schema version, input revision id. Progressive disclosure per the audience constraint.
- **D-13:** Phase 2 result view is a **structured placement list only** (body, sign, degree, house, motion, dignity where present) + assumptions line + expandable provenance + validation status. No wheel, not even a preliminary one — the wheel is Phase 4 scope.
- **D-14:** GATE-02 fixtures: an **in-repo JSON fixture suite** pinned against the vendored skill revision, covering normal natal charts, DST ambiguous/nonexistent civil times, unknown birth time, and representative high-latitude cases. Run in CI via pytest against the calculation service; the app/API regression-tests against the same fixtures.

### Agent's Discretion
- Exact FastAPI project layout inside `api/` (module split, config, error taxonomy) — follow STACK.md guidance.
- How `astrology-skill` is vendored into the backend (git dependency vs submodule vs copied-and-pinned tree) as long as the revision is recorded in provenance and nothing is copied ad hoc into prompts.
- Form library choice (STACK.md suggests React Hook Form + Zod) and client fetch/query wiring (TanStack Query per STACK.md) — not yet installed; installing per STACK.md is fine.
- CALC-04 error taxonomy: specific recoverable error mapping for place/time resolution, calculation, and schema validation failures — the requirement is "specific and recoverable," the exact categories are implementation detail.
- Local dev connection ergonomics for the app → api URL (env config, simulator loopback) — implementation detail.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Skill calculator (authoritative domain tooling)
- `../astrology-skill/tools/birth_to_chart.py` — the calculator to wrap; note `HOUSE_SYSTEMS` validation, `--noon-for-unknown` (deliberately unused per D-10), time-confidence values, interactive/JSON modes
- `../astrology-skill/tools/README.md` and `../astrology-skill/docs/birth_to_chart_design.md` — intended invocation contract and design rationale
- `../astrology-skill/assets/schemas/chart_input_schema.json` — chart input contract (`birth_time_confidence`, `house_system`, placements/aspects/lots shape)
- `../astrology-skill/assets/schemas/report_schema.json` — downstream envelope (context for validation gate conventions)
- `../astrology-skill/tools/requirements.txt` — pinned calculator deps (`pyswisseph>=2.10.3.2`, `tzdata>=2024.1`, `jsonschema>=4.18`)

### Project planning & research
- `.planning/research/STACK.md` — FastAPI/Python/uv service design, astrology-skill integration contract (subprocess isolation, provenance storage, "never ask the LLM to calculate"), geocoding strategy, API/schema tooling
- `.planning/REQUIREMENTS.md` — Phase 2 requirement definitions (BIRTH-01..05, CALC-01..04, GATE-02)
- `.planning/ROADMAP.md` §"Phase 2: Trustworthy Natal Chart" — goal and success criteria

### Governance (Phase 1 outputs that constrain this phase)
- `docs/governance/data-inventory.md` — recorded data flows; calculation/geocoding requests are ephemeral compute-and-discard
- `docs/governance/retention-deletion-policy.md` — retention strings the D-04 notice derives from
- `docs/governance/swiss-ephemeris-posture.md` — GATE-01 licensing posture (Professional License option-a)
- `docs/governance/secret-isolation-policy.md` — Google API key lives server-side only; never in the client (GATE-06)

### Existing code
- `src/schemas/provider-registry.ts` — zod-validated provider registry; provider ids `lemastra-calculation` and `google-geocoding-timezone` are the locked vocabulary for this phase's disclosures
- `src/app/privacy.tsx` — existing disclosure screen pattern the one-time notice can align with

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/schemas/provider-registry.ts` + `src/data/provider-registry.json`: zod-validated provider registry — reuse for the one-time calculation notice content (provider ids already registered)
- `src/components/themed-text.tsx`, `themed-view.tsx`, `src/constants/theme.ts`, `src/hooks/use-theme.ts`: themed primitives for the new birth form and result screens
- `src/app/_layout.tsx` + expo-router file routes: add birth-entry / confirm / result routes following the existing `index`/`privacy` pattern
- `vitest.config.ts` + RN-under-Vitest zero-dependency setup (Phase 01 decision) and RNTL `/pure` component-testing pattern: extend for form/result component tests
- CI workflow from plan 01-07 (vitest+tsc, gitleaks jobs): the new pytest fixture suite (D-14) joins these gates

### Established Patterns
- Expo ~57 tilde pins are authoritative (Phase 01 T-01-SC) — new deps go through `npx expo install`
- Typed routes: regenerate (dev-server boot) after adding routes before `tsc --noEmit`
- Governance consistency tests consume the provider registry — new disclosure UI should stay registry-driven to avoid drift
- Secrets: `.env*` blanket-ignored with `!.env.example`; Google API key and service config must remain server-side only

### Integration Points
- New `api/` service directory at repo root (Python/FastAPI per STACK.md) — first backend code in the repo; CI needs a Python job alongside the existing Node jobs
- New client routes for birth entry → confirm → calculate → result
- `astrology-skill` currently lives as a sibling checkout (`../astrology-skill`); vendoring strategy into the backend is Agent's Discretion but must record revision in provenance

</code_context>

<specifics>
## Specific Ideas

No specific external references or "make it like X" examples were given — decisions above are the source of truth.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 2-Trustworthy Natal Chart*
*Context gathered: 2026-08-25*
