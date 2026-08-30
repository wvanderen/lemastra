# Phase 4: Semantic Chart Exploration - Context

**Gathered:** 2026-08-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Users explore a calculated natal chart as a deterministic interactive wheel (planets, signs, houses, angles, aspect chords) plus the same evidence through synchronized structured lists — with tap-to-inspect exact facts, pinch-zoom for dense regions, a beginner/technical dual view over one evidence base, and non-visual access to every wheel factor. Calculated facts, methodological judgments, and uncertainty stay visually distinguishable everywhere they appear. Requirements: WHEEL-01..05, EVID-01, EVID-02, A11Y-01, A11Y-02, A11Y-03.

NOT in this phase: transits/bi-wheel (Phase 5), reading plans/interpretation (Phase 6+ — the EVID-01 "interpretation" vocabulary slot is defined but renders nothing), reports (Phase 9), web wheel rendering (v2 WEB-01 — web gets evidence-only), new calculation surfaces (the wheel renders the stored envelope; house-system changes go through the Phase-3 revise flow).

</domain>

<decisions>
## Implementation Decisions

### Wheel Surface & Navigation
- **D-01:** The wheel experience lives on a **dedicated exploration route** (one new route, e.g. `/chart/explore`) that both `/chart/result` (fresh calculation) and `/chart/saved` (saved chart) enter. One surface owns wheel + mode toggle + fact panel + synchronized lists; exploration chrome stays separate from result/save/workspace chrome. Route params are id-style (chart/revision id) — never an envelope through router params (03-RESEARCH law, T-03-16).
- **D-02:** **Wheel-first hero composition**: the wheel renders at the top of the explore surface; structured evidence lists follow below. The wheel is the chart's visual face (chart-first identity) — not a segmented toggle hiding one representation, not a secondary illustration.
- **D-03:** Entry point is an **interactive mini-wheel preview card** on `/chart/result` and `/chart/saved` — a tappable static wheel preview (same deterministic geometry, non-interactive) that pushes into the explore surface. The first screen after calculating shows a wheel.
- **D-04:** **Web = evidence, no wheel.** Web renders the full evidence experience (dual views, lists, fact panels, facts) without the graphical wheel, using the capability-card/native-first posture from Phase 3's WebUnsupported pattern. CanvasKit load-time and interaction quality are deferred to the WEB-01 (v2) parity work.

### Beginner/Technical Dual View (EVID-02)
- **D-05:** A **global Simple ↔ Technical segmented toggle** on the explore surface flips the whole experience at once — wheel labels, list rows, and fact panels switch vocabulary/precision together. One inline control with clear state, mirroring the Phase-2 D-09 confidence-control pattern.
- **D-06:** Modes differ in **vocabulary + factor depth**: Simple simplifies terminology and hides deep-technical factors (lots, sect, orb columns, applying/separating state); Technical shows every field the envelope carries at full precision (D°MM′, absolute degrees, orb values). Both modes derive from the same underlying evidence — no separate data path.
- **D-07:** The mode preference is **remembered per device** (versioned-key AsyncStorage, the existing `use-disclosure.ts` pattern); first-run default is Simple.
- **D-08:** Simple mode carries a **tap-to-explain glossary affordance** — unfamiliar terms (trine, orb, sect…) reveal a short static definition inline. Definitions are copy-deck content, never interpretation; progressive disclosure keeps Simple clean.

### Selection, Zoom & Inspection (WHEEL-02/03/04/05, A11Y-03)
- **D-09:** Selecting a wheel factor (planet, sign, house, angle, aspect chord) updates an **inline fact panel** adjacent to the wheel with that factor's exact calculated facts. Wheel and evidence stay visible together — selection highlight and its facts read as one unit. No bottom sheet, no navigated fact screen.
- **D-10:** **One shared selection state** across the surface: tapping the wheel highlights AND auto-scrolls the synchronized list to that factor's row; tapping a list row highlights the factor on the wheel and populates the same fact panel. Selection is a single concept (wheel ↔ lists two-way with auto-scroll).
- **D-11:** Dense/overlapping regions are inspected via **pinch-zoom + pan** of the wheel canvas (Gesture Handler + Skia transform); glyph hit-testing keeps working at any zoom; labels declutter at higher zoom. No bespoke focus-mode this phase.
- **D-12:** **Accessible overlay on the wheel**: each wheel factor is also an invisible accessible element positioned over its hit region (labels from the same geometry module) — screen-reader users navigate and select wheel factors exactly like sighted users (WHEEL-05). The synchronized lists remain the structured backup path.

### Trust Labeling (EVID-01)
- **D-13:** Primary mechanism is **sectional + marker treatments**: calculated facts (the majority) render plain; methodological judgments live in clearly-labeled assumption sections (extends `AssumptionsLine`); uncertainty keeps distinct card/marker treatments (extends `UnavailableFactors`/provisional factors). No per-row source badges; no user-learned token legend.
- **D-14:** The trust vocabulary is a **shared evidence-vocabulary module now** — one module (theme tokens, copy-deck strings, a11y phrasings) consumed by wheel, lists, fact panel, and assumptions, so Phase 6's interpretation joins an existing system instead of inventing a parallel one.
- **D-15:** The shared module **defines all four evidence kinds now** — calculated fact / methodological judgment / interpretation / uncertainty — including copy and a11y phrasing for the interpretation kind. Nothing renders the interpretation kind until Phase 6.
- **D-16:** **Uncertainty is marked on the wheel itself** — provisional factors get a distinct on-wheel treatment (e.g. dashed glyph/label outline) with text redundancy in the fact panel; never color alone (A11Y-02). Unavailable factors simply have no wheel geometry (Phase-2 D-10 honesty: no houses ring without a birth time), with the unavailable cards carrying the why.

### the agent's Discretion
- Geometry-module API shape (rings, cusps, glyph anchors, aspect chords, labels, hit regions, z-order) — pure and deterministic per STACK's renderer split; the mini-wheel preview (D-03) and the a11y overlay (D-12) both consume it.
- Glyph rendering approach (unicode astrology glyphs vs drawn paths; any font asset goes through the dependency-legitimacy checkpoint).
- Aspect-chord line styling per aspect type and any orb-based emphasis — the calculator's emitted aspects are the complete source; no client-side aspect recomputation.
- Label decluttering/collision strategy across zoom levels.
- Zoom implementation details (Reanimated shared values on the UI thread, gesture composition — no full React re-render per gesture frame).
- Copy-deck structure for the new surfaces and the glossary term inventory (Simple mode).
- Exact explore-route naming and revision-vs-latest param semantics (latest by default; the revision chain stays read-only per Phase 3 D-07).
- Golden geometry fixtures (deterministic primitives asserted numerically; screenshots never the sole assertion) and a11y list-parity test approach within the existing vitest + RNTL setup.
- Installing `@shopify/react-native-skia` + `react-native-gesture-handler` via `npx expo install` with the tilde-pin/legitimacy conventions.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project planning & research
- `.planning/ROADMAP.md` §"Phase 4: Semantic Chart Exploration" — goal, requirements, success criteria
- `.planning/REQUIREMENTS.md` — Phase 4 requirement definitions (WHEEL-01..05, EVID-01/02, A11Y-01/02/03)
- `.planning/research/STACK.md` §"Chart Wheel Strategy" — locked renderer split: deterministic geometry module + Skia interactive renderer; SVG projection reserved for reports/goldens. Client stack rows: React Native Skia, Reanimated (4.x, installed 4.5.1), Gesture Handler, and the "wheel renderer" alternatives-considered entry
- `.planning/phases/02-trustworthy-natal-chart/02-CONTEXT.md` — carried decisions: D-10 unknown-time factor omissions, D-12 progressive-disclosure display pattern, D-13 structured-list result view
- `.planning/phases/03-private-local-workspace/03-CONTEXT.md` — carried decisions: D-02 stored envelope IS the evidence (never recalculate), D-03 native-first adapter posture, D-07 revision history read-only

### Calculator contract (authoritative factor vocabulary)
- `vendor/astrology-skill/assets/schemas/chart_input_schema.json` — the chart factor contract the envelope mirrors (placements, angles, cusps, aspects, sect, lots, availability)
- `src/lib/api-schemas.ts` — the zod envelope the wheel renders: `chartDataSchema` (ascendant/midheaven/house_cusps optional per unknown-time, `aspects` with applying/separating presence flags, `unavailable_factors`/`provisional_factors` for D-16)

### Existing code
- `src/app/chart/saved.tsx` + `src/app/chart/result.tsx` — the two screens D-03's mini-wheel preview card joins; id-param law (repository is the only data source)
- `src/components/chart/placement-list.tsx` — D°MM′ degree formatting (`splitDegreeMinutes`/`formatDegreeMinutes`), a11y label phrasing, card treatment the new lists extend
- `src/components/chart/assumptions-line.tsx`, `provenance-details.tsx`, `unavailable-factors.tsx` — the sectional patterns D-13 extends
- `src/components/birth/confidence-control.tsx` — the inline segmented-control pattern D-05 mirrors
- `src/hooks/use-disclosure.ts` — versioned-key AsyncStorage pattern D-07 reuses
- `src/constants/theme.ts` + `src/components/themed-text.tsx`/`themed-view.tsx` — themed primitives and Spacing tokens for new surfaces
- `src/components/workspace/web-unsupported.tsx` — the capability-card pattern D-04's web degradation follows

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `calculateResponseSchema` (zod) — parse-then-trust contract; the explore route validates the stored envelope before rendering, exactly like `/chart/saved` does
- `src/lib/workspace/` repository + `useWorkspaceChart` — the explore route reads chart detail by id through the existing query layer (zero network, envelope is evidence)
- `splitDegreeMinutes`/`formatDegreeMinutes` — one degree-split feeding visual and spoken facts (A-UI-4 law: visual and a11y sentences agree)
- Result-screen components (`PlacementList`, `AssumptionsLine`, `ProvenanceDetails`, `UnavailableFactors`) — compose the evidence lists below the wheel
- `react-native-reanimated` 4.5.1 — already installed; Skia integration requirement satisfied, only `@shopify/react-native-skia` + `react-native-gesture-handler` are new

### Established Patterns
- New deps via `npx expo install`; tilde pins authoritative; legitimacy checkpoint for any new package/font asset
- Copy decks per component (`copy.ts`) — no invented strings; glossary definitions and Simple-mode vocabulary join the decks
- Typed routes: regenerate after route changes before `tsc --noEmit`
- Id-style route params — envelopes never travel through router params
- Native-first with typed capability degradation on web (WebUnsupported pattern)
- Vitest + RNTL `/pure` with the RN shim, facade mocks, and act-queue laws from Phases 1–3 — new component tests join this graph (Skia canvas likely needs a facade/mock seam)

### Integration Points
- New `/chart/explore` route reading chart/revision ids (repository lookup, not params-carried data)
- `/chart/result` and `/chart/saved` each gain the mini-wheel preview card above the placement list
- New geometry module (pure, renderer-agnostic) + Skia canvas component + accessible overlay — the first Skia code in the repo
- New shared evidence-vocabulary module consumed by all new evidence surfaces (and by Phase 6 later)
- The mode preference (D-07) persists via the `use-disclosure.ts` AsyncStorage pattern

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

*Phase: 4-Semantic Chart Exploration*
*Context gathered: 2026-08-30*
