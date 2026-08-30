# Phase 5: Natal Transit Workspace - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can choose an exact transit moment (date, time, timezone), calculate an immutable provenance-rich transit artifact against a saved natal chart's exact revision, inspect the comparison in a synchronized bi-wheel plus structured contact evidence (aspect, orb, applying/separating, exactness, natal context), and save/reopen transit snapshots anchored to the exact natal and transit revisions. Includes the transit half of the GATE-02 golden fixtures (per the ROADMAP Phase 2 note: "the transit fixture half completes in Phase 5"). Requirements: TRAN-01, TRAN-02, TRAN-03, TRAN-04, TRAN-05, TRAN-06.

NOT in this phase: reading plans and interpretation of transit evidence (Phase 6+ — TRAN-05 stops at inspection), conversations (Phase 8), reports/report rendering of transits (Phase 9), synastry/solar returns/profections (v2 TECH-*), animated time-scrubbing calendars (v2 TIME-*), new place/geocoding surfaces (transit positions reuse the natal chart's birth-place configuration), accounts/sync (v2).

</domain>

<decisions>
## Implementation Decisions

### Transit Flow Entry & Moment Selection (TRAN-01)
- **D-01:** Transits launch **from saved-chart surfaces only** — the saved-chart detail screen and the explore screen of a saved chart carry the transit entry. A fresh unsaved `/chart/result` has no transit entry; the chart must be saved first (the anchor must exist before any transit calculation).
- **D-02:** The moment picker opens with **"now" preselected** (device clock + device timezone) — the common case "what's active for me today" is one flow with full date/time editing for any other moment.
- **D-03:** Timezone handling: **device timezone applies to "now"**; an explicit zone picker (reusing the Phase-2 zones list) is always available, with the chart's **birth zone offered as a one-tap shortcut** for historical/future moments.
- **D-04:** DST-ambiguous or nonexistent transit times get **explicit resolution, identical to birth times** — reuse the Phase-2 civil-time classification + tricky-time picker pattern (ambiguous → first/second pass choice; nonexistent → shifted instant with explanation). The app never silently chooses a transit instant.

### Natal Anchoring & Immutability (TRAN-02, TRAN-06)
- **D-05:** Anchor verification is **digest + drift check**: the calculate request carries the anchored revision's birth inputs + target moment; the recomputed natal `input_revision` (sha256[:12]) **must match** the anchor — mismatch is a typed error, never a silent basis swap. Additionally, recomputed natal placements are compared against the stored envelope; any drift (ephemeris/skill version change) **surfaces as a visible warning**. CI's GATE-02 transit fixtures pin the same drift.
- **D-06:** A saved transit snapshot stores the **full immutable response envelope** (recomputed natal chart + `transit_chart` block + complete provenance) **plus anchor ids** (chart id, natal revision id, transit input revision). Reopen = parse-then-trust with zero joins — extends Phase 3 D-02's stored-envelope law to transit artifacts; export-friendly.
- **D-07:** Each saved transit moment is an **independent immutable snapshot** — "today", "next birthday", "that week in March" coexist as separate records anchored to the natal revision. Changing the moment = a new calculation; nothing ever mutates. No moment-revision-chain concept.
- **D-08:** Transits anchor to the chart's **latest revision by default**, and are **explicitly anchorable to an older revision** when launched from that revision's read-only history view (Phase 3 D-07). The chosen natal basis is visible in the transit surface header. Prior snapshots always keep their original basis.

### Bi-Wheel & Contact Inspection (TRAN-03, TRAN-04, TRAN-05)
- **D-09:** Bi-wheel layout follows astrological convention: **natal inner ring** (bodies, natal houses, shared natal-anchored zodiac), **transiting bodies on the outer ring**, cross-chart **contact chords running between the rings**. Extends the Phase-4 pure geometry module with a second body ring — no renderer rewrite.
- **D-10:** The comparison lives on a **dedicated route** (e.g. `/transit/explore`) that composes the SAME Phase-4 building blocks — geometry module, wheel canvas, fact panel, synchronized lists, Simple↔Technical toggle, accessible overlay — plus transit-specific chrome (moment header, contacts list). Natal explore stays natal-only (Phase 4 D-01 law); id-style params only, never envelopes through router params.
- **D-11:** Contact evidence is **one flat orb-sorted list** (tightest first) with `exact` (<0.05°) flagged at top and applying/separating marked with non-hue tokens. Selecting a contact highlights **both bodies + the chord** in the wheel; the fact panel shows **both sides** — the transiting body's facts AND the natal body's natal context (sign, house, dignity where present). Two-way wheel↔list sync per Phase 4 D-10's shared-selection law.
- **D-12:** Simple↔Technical parity with one exception: **Simple keeps a plain-language motion marker** ("strengthening" / "easing") on contacts — applying/separating is core transit meaning, not deep-technical detail — while orb numbers, exactness thresholds, and absolute degrees stay Technical-only. Plain phrasings join the evidence-vocabulary module + glossary (Phase 4 D-14/D-15 system).

### Workspace Integration (TRAN-06)
- **D-13:** Saved transit snapshots surface in a **"Transits" section inside the saved-chart detail** (moment label, date, anchor revision). The home workspace list stays **charts-only** — transits belong to their chart; identity = natal chart.
- **D-14:** **Ephemeral-first, explicit save**: calculate → inspect the full bi-wheel/contacts immediately → explicit "Save transit" CTA opens a label prompt with a smart default (e.g. "Transits · Aug 30"), mirroring Phase 3 D-10's chart-save pattern. Nothing is stored the user didn't ask to store.
- **D-15:** **Transits work on untimed charts with honest degradation** (Phase 2 D-10 law): planet-to-planet contacts only — no natal-angle contacts, no natal-house assignment for transit placements — with an explicit note explaining exactly why. No invented noon chart (the calculator natively degrades this way).
- **D-16:** Transit snapshots are included in **both exports**: single-chart export (WORK-07 pattern) includes the chart's snapshots alongside its revisions, and /privacy export-all includes every snapshot (PRIV-05 "all personal data" law). Deleting a chart cascades to its snapshots (Phase 3 D-14 law — locked, not re-asked).

### Carried forward unchanged (not re-asked)
- Phase 2 D-12: compact assumptions line + expandable provenance on the transit artifact.
- Phase 4 D-04: web = evidence-only, no wheel canvas (Skia stays web-stubbed; web gets the contacts/placement evidence experience without the bi-wheel).
- Phase 4 D-11/D-12: pinch-zoom + declutter and the accessible overlay apply to the bi-wheel like the natal wheel.
- Phase 4 D-16: uncertainty marking (provisional/dashed treatments) extends to degraded transit factors on untimed charts.

### Agent's Discretion
- API contract shape: extend `CalculateRequest` with reading-type/target fields vs. a dedicated transit endpoint; how target date/time/tz + tricky-time resolution flow through the existing calculator subprocess wrapper and CALC-04 error taxonomy.
- Transit `input_revision` derivation (what exactly hashes: birth inputs + resolved target moment) and the drift-comparison semantics (which natal fields compared, tolerance, warning payload shape).
- Bi-wheel geometry extension details: second-ring radii, chord routing between rings, transit-body glyph/label differentiation from natal bodies, two-ring declutter behavior at zoom.
- Moment-picker component design (reuse/adapt Phase-2 date/time controls), and how the "now" device timezone resolves against the zones list.
- Transit-snapshot DB schema (table, columns, indices, migration) and repository ops, including dedupe semantics (same chart + natal revision + resolved moment → `appended:false` per the Phase-3 pair-dedupe pattern).
- Contacts-list scale handling (the calculator emits every in-orb contact incl. minor aspects per its orb table) and whether/how minor aspects surface.
- Drift-warning presentation (warning card vs. provenance line) and untimed-degradation note copy within the copy-deck discipline.
- Golden transit fixture case selection for the GATE-02 transit half (timed/untimed natal, tricky target instant, representative latitude) through the real API endpoint, joining the existing pytest CI suite.
- Exact route naming/param semantics for the transit surfaces and reopen-by-id flow.
- Copy-deck structure for transit surfaces and the glossary term inventory (transit, applying, separating, exact…).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning & research
- `.planning/ROADMAP.md` §"Phase 5: Natal Transit Workspace" — goal, requirements, success criteria; §Phase 2 criteria note: the GATE-02 transit fixture half completes in Phase 5
- `.planning/REQUIREMENTS.md` — Phase 5 requirement definitions (TRAN-01..06); PRIV-05 export-all law
- `.planning/research/STACK.md` §"astrology-skill Integration Contract" + §"Chart Wheel Strategy" — subprocess isolation, provenance storage, deterministic geometry + renderer split
- `.planning/phases/02-trustworthy-natal-chart/02-CONTEXT.md` — carried decisions: D-08 explicit tricky-time resolution, D-10 unknown-time honesty, D-12 provenance display, D-14 fixture suite design
- `.planning/phases/03-private-local-workspace/03-CONTEXT.md` — carried decisions: D-02 stored envelope IS the evidence, D-06 inputs-change-is-new-revision, D-10 explicit save + label prompt, D-14 deletion cascade
- `.planning/phases/04-semantic-chart-exploration/04-CONTEXT.md` — carried decisions: D-01..D-16 explore-surface laws (geometry module, shared selection, zoom, a11y overlay, Simple↔Technical, trust vocabulary, web = evidence-only)

### Calculator contract (authoritative transit vocabulary)
- `vendor/astrology-skill/tools/birth_to_chart.py` §timing computation (~lines 739–840, 1146–1235) — `compute_cross_aspects` (triggering/natal body, orb, applying/separating presence flags, exact <0.05°), `transit_chart` block assembly (transiting placements assigned to NATAL houses when cusps exist; graceful untimed degradation), target-instant resolution incl. noon-default provisional note
- `vendor/astrology-skill/tools/README.md` §"Timing-type charts" + §"Default orb table" — transit invocation flags (`--reading-type transit --target-date/--target-time/--target-tz`), `transit_chart`/`timing_factors` output shape, per-body orb caps, exact/stationary thresholds

### API surface (extension points)
- `api/lemastra_api/routes/charts.py` — calculate endpoint; `reading_type` currently hardcoded `"natal"` (line ~93) — the transit extension point; provenance envelope assembly
- `api/lemastra_api/schemas.py` — CalculateRequest/CalculateResponse models to extend (or mirror) for transit
- `api/lemastra_api/services/calculator.py` — subprocess wrapper the transit path reuses
- `api/lemastra_api/services/civil_time.py` — civil-time classification reused for transit tricky-time resolution (D-04)
- `api/lemastra_api/routes/places.py` — zones list endpoint backing the transit zone picker (D-03)

### Existing client code
- `src/lib/chart-wheel/geometry.ts` — the pure geometry module D-09 extends with a second body ring; the numeric test surface for bi-wheel goldens
- `src/components/chart/explore/` — wheel-canvas (+ .web stub), fact-panel, evidence-lists, mode-toggle, wheel-a11y-overlay, scroll-target, glossary — the D-10 building blocks
- `src/components/chart/evidence-vocabulary/` (kinds/tokens/phrases) — D-12's plain motion markers join this module
- `src/lib/api-schemas.ts` — zod envelope (`chartDataSchema`, aspect applying/separating presence flags) — transit_chart block contract joins here
- `src/lib/workspace/schema.ts` + `repository.ts` + `export.ts` — charts/chartRevisions tables; repository ops (save/dedupe/cascade-delete/export-all) the transit snapshot table extends (D-06/D-07/D-13/D-16)
- `src/app/chart/saved.tsx` + `src/app/chart/explore.tsx` — the D-01 entry surfaces and D-13 Transits section
- `src/hooks/use-explore-mode.ts` + `use-disclosure.ts` — mode/preference patterns; `src/components/chart/assumptions-line.tsx`/`provenance-details.tsx`/`unavailable-factors.tsx` — provenance/degradation display patterns for D-05/D-15

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Vendor calculator's native transit mode — no new domain math to write; the API already wraps the subprocess with timeouts and provenance
- `src/lib/chart-wheel/geometry.ts` — pure, renderer-agnostic; mini-wheel, canvas, and a11y overlay all consume it today; bi-wheel is a ring extension, not a rewrite
- Phase-4 explore components — wheel canvas with zoom/hit-testing seam, fact panel, synchronized lists with auto-scroll, accessible overlay, Simple↔Technical toggle, glossary
- Evidence-vocabulary module — all four evidence kinds already defined with tokens/phrases; transit surfaces join the tested system
- Workspace repository — save/dedupe/list/cascade-delete/export-all patterns + typed WorkspaceError; transit snapshots extend the same discipline
- Civil-time service + zones list endpoint + Phase-2 tricky-time picker — the D-03/D-04 moment-resolution machinery already exists
- GATE-02 golden-fixture pytest suite (9 natal cases through the real endpoint) — the transit fixture half joins this CI job

### Established Patterns
- Id-style route params only; repository is the sole data source; parse-then-trust on every stored/param payload
- Copy decks per component (`copy.ts`) — no invented strings; governance/consistency tests consume the provider registry (transit calc = existing `lemastra-calculation` provider, no new disclosure surface)
- Explicit save with label prompt; deletion cascades to dependent artifacts; exports carry full envelopes
- Native-first with typed web degradation (WebUnsupported / evidence-only); Skia stays web-stubbed per Phase-4 Metro .web.tsx isolation law
- New deps via `npx expo install` + tilde pins + legitimacy checkpoint (Phase 5 is expected to need none)
- Vitest facades/aliases + per-file act laws; typed-route regeneration before `tsc --noEmit`

### Integration Points
- API: calculate route gains transit reading-type + target-moment inputs (with civil-time resolution); response schema carries `transit_chart`; digest/drift verification per D-05
- Client: `api-schemas.ts` zod extension; new transit routes (moment picker → comparison surface); saved-chart detail gains the Transits section + entry CTA
- Storage: new transit-snapshot table (FK chart + natal revision anchor), repository ops, migration + migration gate
- Workspace exports (single-chart + export-all) include snapshots; delete-chart cascade extends to snapshots
- CI: transit golden fixtures join the api pytest job; client tests join the vitest graph with existing facades

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

*Phase: 5-Natal Transit Workspace*
*Context gathered: 2026-08-30*
