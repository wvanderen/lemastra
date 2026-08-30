# Phase 4: Semantic Chart Exploration - Research

**Researched:** 2026-08-30
**Domain:** Interactive chart-wheel rendering (React Native Skia), gesture-driven zoom, synchronized evidence lists, dual-mode vocabulary, non-visual accessibility — all over the stored calculation envelope
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** The wheel experience lives on a **dedicated exploration route** (one new route, e.g. `/chart/explore`) that both `/chart/result` (fresh calculation) and `/chart/saved` (saved chart) enter. One surface owns wheel + mode toggle + fact panel + synchronized lists; exploration chrome stays separate from result/save/workspace chrome. Route params are id-style (chart/revision id) — never an envelope through router params (03-RESEARCH law, T-03-16).
- **D-02:** **Wheel-first hero composition**: the wheel renders at the top of the explore surface; structured evidence lists follow below. The wheel is the chart's visual face (chart-first identity) — not a segmented toggle hiding one representation, not a secondary illustration.
- **D-03:** Entry point is an **interactive mini-wheel preview card** on `/chart/result` and `/chart/saved` — a tappable static wheel preview (same deterministic geometry, non-interactive) that pushes into the explore surface. The first screen after calculating shows a wheel.
- **D-04:** **Web = evidence, no wheel.** Web renders the full evidence experience (dual views, lists, fact panels, facts) without the graphical wheel, using the capability-card/native-first posture from Phase 3's WebUnsupported pattern. CanvasKit load-time and interaction quality are deferred to the WEB-01 (v2) parity work.
- **D-05:** A **global Simple ↔ Technical segmented toggle** on the explore surface flips the whole experience at once — wheel labels, list rows, and fact panels switch vocabulary/precision together. One inline control with clear state, mirroring the Phase-2 D-09 confidence-control pattern.
- **D-06:** Modes differ in **vocabulary + factor depth**: Simple simplifies terminology and hides deep-technical factors (lots, sect, orb columns, applying/separating state); Technical shows every field the envelope carries at full precision (D°MM′, absolute degrees, orb values). Both modes derive from the same underlying evidence — no separate data path.
- **D-07:** The mode preference is **remembered per device** (versioned-key AsyncStorage, the existing `use-disclosure.ts` pattern); first-run default is Simple.
- **D-08:** Simple mode carries a **tap-to-explain glossary affordance** — unfamiliar terms (trine, orb, sect…) reveal a short static definition inline. Definitions are copy-deck content, never interpretation; progressive disclosure keeps Simple clean.
- **D-09:** Selecting a wheel factor (planet, sign, house, angle, aspect chord) updates an **inline fact panel** adjacent to the wheel with that factor's exact calculated facts. Wheel and evidence stay visible together — selection highlight and its facts read as one unit. No bottom sheet, no navigated fact screen.
- **D-10:** **One shared selection state** across the surface: tapping the wheel highlights AND auto-scrolls the synchronized list to that factor's row; tapping a list row highlights the factor on the wheel and populates the same fact panel. Selection is a single concept (wheel ↔ lists two-way with auto-scroll).
- **D-11:** Dense/overlapping regions are inspected via **pinch-zoom + pan** of the wheel canvas (Gesture Handler + Skia transform); glyph hit-testing keeps working at any zoom; labels declutter at higher zoom. No bespoke focus-mode this phase.
- **D-12:** **Accessible overlay on the wheel**: each wheel factor is also an invisible accessible element positioned over its hit region (labels from the same geometry module) — screen-reader users navigate and select wheel factors exactly like sighted users (WHEEL-05). The synchronized lists remain the structured backup path.
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.

**Phase-boundary reminders (from CONTEXT domain section):** NOT in this phase: transits/bi-wheel (Phase 5), reading plans/interpretation rendering (Phase 6+ — EVID-01 "interpretation" vocabulary slot is defined but renders nothing), reports (Phase 9), web wheel rendering (v2 WEB-01 — web gets evidence-only), new calculation surfaces (the wheel renders the stored envelope; house-system changes go through the Phase-3 revise flow).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WHEEL-01 | Deterministic natal wheel: planets, signs, houses, angles, supported aspects | Pure geometry module porting the in-repo authoritative renderer (`vendor/astrology-skill/tools/chart_diagram.py`) + Skia Canvas render (§ Geometry Pattern; § Standard Stack) |
| WHEEL-02 | Select a visual factor, see its exact calculated facts | Skia tap handling + polar hit-testing against geometry hit regions; inline fact panel from envelope fields (§ Pattern 3; § Code Examples) |
| WHEEL-03 | Zoom/inspect dense wheel without losing overlapping factors | RNGH Pinch+Pan composition over Canvas with shared-value transforms; inverse-transform hit-testing; vendor collision algorithm parameterized by zoom (§ Pattern 4; § Pitfall 3) |
| WHEEL-04 | Structured lists/tables (placements, houses, aspects, orbs, motion) synchronized with wheel | One shared selection state; extends `PlacementList`/copy-deck; new houses + aspects tables (§ Pattern 5) |
| WHEEL-05 | Non-visual semantic access to every wheel factor | Invisible accessible overlay positioned from the same geometry hit regions; canvas hidden from screen readers; lists as structured backup (§ Pattern 6; RN a11y findings) |
| EVID-01 | Distinguish calculated fact / methodological judgment / interpretation / uncertainty | Shared evidence-vocabulary module defining all four kinds now, extending `AssumptionsLine`/`UnavailableFactors` sectional patterns (D-13–D-16; § Pattern 2) |
| EVID-02 | Beginner summaries ↔ technical detail from one evidence base | Global Simple ↔ Technical toggle (D-05–D-08), same envelope data path, versioned-key AsyncStorage preference (§ Pattern 1) |
| A11Y-01 | Navigate core workflow with screen-reader support | Accessible overlay elements with label/state semantics; live-region fact panel; a11y phrasings in the vocabulary module (§ Pattern 6) |
| A11Y-02 | Text scaling; never color alone | RN Text surfaces scale natively; wheel redundancy rules — aspect style by stroke pattern + weight (not hue), provisional by dashed outline + text (D-16); Skia text does not scale (§ Pitfall 8) |
| A11Y-03 | Chart evidence without interpreting the graphical wheel | Synchronized structured lists + fact panel carry every wheel fact semantically; canvas a11y-hidden on the explore surface; web is evidence-only (D-04) |
</phase_requirements>

## Summary

Phase 4 is a **client-only rendering phase**: no API, no database, no new data paths. Everything renders from the stored calculation envelope (`calculateResponseSchema`, parse-then-trust at the repository edge, already built in Phases 2–3). The work decomposes into five technical domains: (1) a **pure, renderer-agnostic geometry module** that converts envelope longitudes into deterministic drawing primitives and hit regions — with the project's own vendored `chart_diagram.py` as the authoritative geometry reference (anchor-rotation at 9 o'clock, CCW longitudes, ring radii, glyph-collision algorithm, Unicode glyph vocabularies); (2) the **first Skia surface in the repo** — an interactive wheel Canvas with pinch-zoom/pan driven by Gesture Handler + Reanimated shared values on the UI thread; (3) **one shared selection state** binding wheel taps, list-row presses, and the inline fact panel; (4) the **shared evidence-vocabulary module** (four kinds, theme tokens + copy deck + a11y phrasings) consumed by every surface; (5) **non-visual access** via an invisible accessible overlay generated from the same geometry hit regions, plus the synchronized lists as the canonical structured path.

The critical verified facts: `@shopify/react-native-skia` **2.6.2 is the Expo SDK 57 pinned version** (`node_modules/expo/bundledNativeModules.json` — the authoritative `npx expo install` source; npm-latest is 2.11.1 and must NOT be installed manually) and is **included in Expo Go** (`inExpoGo: true` on the official Expo SDK 57 docs page), so no dev-client/config-plugin/app.json change is needed. `react-native-gesture-handler` **~2.32.0 is already installed** (a CONTEXT correction — only Skia is new), but it is *unimported*: **`GestureHandlerRootView` is missing from `_layout.tsx` and must be added or all gestures silently no-op**. Reanimated 4.5.1 + worklets 0.10.1 already satisfy Skia's ≥4.0.0/≥0.7.0 integration requirements.

**Primary recommendation:** Build the pure geometry module first (it is the test surface, the mini-wheel preview, and the a11y-overlay source), then the Skia canvas + gesture shell behind a vitest alias facade (the established `expo-sqlite`/device-facade pattern — do NOT pull CanvasKit into tests), then selection/lists/vocabulary/a11y as ordinary RN component work extending Phase-2/3 patterns.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Wheel geometry computation | Client — pure shared module (`src/lib/chart-wheel/`-style) | — | Deterministic, renderer-agnostic primitives consumed by Canvas, mini-wheel, and a11y overlay; the only numerical test surface (STACK "Chart Wheel Strategy" split) |
| Interactive wheel rendering | Client — Skia Canvas (native iOS/Android) | — | Declarative GPU drawing; the single domain Skia is locked for (STACK renderer row) |
| Pinch-zoom / pan | Client — RNGH gestures + Reanimated shared values | — | UI-thread transforms; no React re-render per frame (D-11 law) |
| Tap selection & hit-testing | Client — geometry hit regions (polar) + inverse zoom transform | — | Hit math belongs to the pure module; the canvas only forwards pointer coordinates |
| Fact panel / dual-mode lists / glossary | Client — RN components + copy decks | — | Ordinary RN surfaces extending `PlacementList`/`AssumptionsLine`/`UnavailableFactors`; text scaling works natively (A11Y-02) |
| Evidence-vocabulary (4 kinds) | Client — shared module (tokens + copy + a11y phrasing) | — | D-14/D-15: one module consumed by all surfaces; Phase 6 joins it |
| Mode preference persistence | Client — AsyncStorage (versioned key) | — | D-07; `use-disclosure.ts` pattern, best-effort persistence |
| Chart data access | Client — workspace repository via existing query hooks | — | Id-param law; stored envelope IS the evidence; zero network (D-02 Phase 3) |
| Web degradation | Client — WebUnsupported capability card + evidence-only explore | — | D-04; no CanvasKit/web-Skia configuration this phase |
| Server / API | — (no changes) | — | No new calculation surfaces; house-system changes flow through the Phase-3 revise path |

## Project Constraints (from AGENTS.md)

Extracted actionable directives from `./AGENTS.md` (PROJECT.md/STACK/CONVENTIONS/GSD sections):

- **React Native cross-platform client** (locked stack); Expo SDK 57 stable line; let `npx expo install` select native-package versions (never install latest native deps manually).
- **`dev/astrology-skill` (vendored here at `vendor/astrology-skill`) is the authoritative starting point** for interpretive datasets and methodologies — grounded analysis is the differentiator; the wheel must render its calculator vocabulary verbatim.
- **Trust constraint:** calculated facts and structured evidence must remain distinguishable from generated interpretation — users can see what a reading is based on (this phase's EVID-01 is the structural foundation).
- **Progressive disclosure** for beginners and enthusiasts — neither accessibility nor technical transparency eliminates the other (EVID-02/D-05–D-08 implement this).
- **Privacy readiness:** no architecture assuming birth data/conversations are public — this phase is entirely local; no new telemetry (Phase-3 D-16 telemetry guard still applies; no console/analytics additions).
- **v1 scope:** natal charts and transits only; wheel is natal-only this phase (transits = Phase 5).
- **GSD workflow enforcement:** work enters through GSD commands; direct repo edits outside GSD workflows are forbidden.
- Conventions file states conventions emerge as patterns develop — Phase-4 conventions: copy decks per component, tilde pins, id-style route params, typed-route regeneration, native-first degradation (all established in Phases 1–3 and restated in CONTEXT `code_context`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@shopify/react-native-skia` | **2.6.2** (Expo SDK 57 pin — NOT npm-latest 2.11.1) | Interactive wheel canvas: rings, spokes, glyphs, aspect chords, selection highlight, zoom transform | STACK-locked renderer choice; official Expo SDK 57 third-party library (`inExpoGo: true`); declarative components + Reanimated integration; version compatibility (RN ≥0.79, React ≥19, Reanimated ≥4.0.0, worklets ≥0.7.0) all satisfied by the repo [VERIFIED: expo bundledNativeModules.json + docs.expo.dev/versions/v57.0.0/sdk/skia] |
| `react-native-gesture-handler` | ~2.32.0 (**already installed**) | Pinch + pan + tap gesture composition over the canvas | Expo-bundled version already in package.json; `GestureDetector`/`Gesture.*` API is the RNGH 2.x standard; requires `GestureHandlerRootView` at app root (currently missing — see Pitfall 2) [VERIFIED: package.json + official RNGH docs] |
| `react-native-reanimated` | 4.5.1 (installed) | Shared values driving Skia transforms on the UI thread | Skia's native integration requires Reanimated ≥4.0.0 + worklets ≥0.7.0 — satisfied (worklets 0.10.1 installed). Keeps gesture frames off the React render path (D-11) [VERIFIED: package.json + Skia installation docs] |
| `@react-native-async-storage/async-storage` | 2.2.0 (installed) | Versioned-key Simple/Technical mode preference (D-07) | Existing `use-disclosure.ts` pattern reuse; no new dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` + `@testing-library/react-native` | 4.1.11 / 14.0.1 (installed) | Geometry fixtures, component tests, a11y list-parity tests | All test work; Skia surfaces render behind a vitest alias facade (established pattern) |
| `zod` | ^4.4.3 (installed) | `calculateResponseSchema` re-parse guard if the explore route ever receives unvalidated data | Already enforced at the repository edge; explore route just consumes typed query data |
| `react-native-svg` | 15.15.4 (Expo 57 pin — NOT installed) | SVG projection for reports/goldens | **Reserved for Phase 9 reports / golden-image projection only** — do not introduce this phase (STACK renderer split) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Skia interactive wheel | `react-native-svg` wheel | Simpler for a static wheel (and remains the report-projection plan), but dense interactive drawing + future animated wheel favor Skia — already locked in STACK's alternatives table; do not relitigate |
| Invisible RN accessible overlay | Skia-internal a11y (none exists) | Skia canvas has no screen-reader semantics at all — the RN overlay is the only viable mechanism for D-12 |
| Custom zoom gesture math | RNGH Pinch/Pan | Never hand-roll — RNGH gives focal points, velocity, composition, and native-driven activation for free |

**Installation:**
```bash
# ONLY Skia is new; version comes from Expo SDK 57's bundledNativeModules.json (2.6.2)
npx expo install @shopify/react-native-skia
```

**Version verification (performed this session):**
- `node_modules/expo/bundledNativeModules.json` → `"@shopify/react-native-skia": "2.6.2"`, `"react-native-gesture-handler": "~2.32.0"`, `"react-native-reanimated": "4.5.1"`, `"react-native-worklets": "0.10.1"` [VERIFIED: local Expo SDK 57 install]
- `npm view @shopify/react-native-skia version` → `2.11.1` (dist-tag latest, modified 2026-08-23) — **latest ≠ Expo-compatible**; installing it manually would break Expo Go (native binaries in Expo Go are built for 2.6.2) [VERIFIED: npm registry]
- `npm view react-native-gesture-handler version` → `3.2.1` — v3 line exists upstream; the repo correctly stays on the Expo-pinned ~2.32.x [VERIFIED: npm registry]
- No postinstall/install scripts on `@shopify/react-native-skia` (official docs: "No `postinstall` script is required"; registry scripts empty) [VERIFIED: npm registry + official installation docs]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@shopify/react-native-skia` | npm | ~5+ yrs (project); latest publish 2026-08-23 | 1,365,750/wk | github.com/Shopify/react-native-skia | SUS ("too-new" heuristic on latest publish) | Approved with checkpoint — install Expo-pinned **2.6.2** via `npx expo install`; planner adds the repo's standard dependency-legitimacy `checkpoint:human-verify` (03-09 precedent) before install |
| `react-native-gesture-handler` | npm | ~8 yrs | 7,950,390/wk | github.com/software-mansion/react-native-gesture-handler | SUS ("too-new" heuristic) | No action — **already installed** at ~2.32.0 by Expo scaffolding in Phase 1; no install task exists |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@shopify/react-native-skia` — the seam's "too-new" flag keys on the latest version's recent publish date. Mitigating evidence: Expo officially documents it as an SDK 57 third-party library with `inExpoGo: true` [VERIFIED: docs.expo.dev/versions/v57.0.0/sdk/skia], Shopify-maintained, 1.36M weekly downloads, canonical repo, no install scripts, and the version actually installed (2.6.2) is selected by Expo's own manifest, not by us. The planner should still gate the single install behind the human-verify checkpoint per house convention.

*No other new packages. Any glyph font asset (see Assumption A1) goes through the same legitimacy checkpoint.*

## Architecture Patterns

### System Architecture Diagram

```
                      /chart/result  /chart/saved
                            │  (D-03 mini-wheel preview card —
                            │   static render of same geometry)
                            ▼
              router.push /chart/explore?id={chartId}[&revision={revId}]
                            │
                            ▼
        ┌───────────────────────────────────────────────────┐
        │  /chart/explore  (one surface, id-param law)      │
        │                                                   │
        │  repository query (useWorkspaceChart /            │
        │  useRevisionContent — zero network, envelope      │
        │  already zod-parsed at repository edge)           │
        │                            │                      │
        │                            ▼                      │
        │  ┌───────────── PURE GEOMETRY MODULE ──────────┐  │
        │  │ envelope → {rings, cusps, glyph anchors,    │  │
        │  │  aspect chords, labels, hit regions,        │  │
        │  │  z-order} — deterministic, no React/Skia    │  │
        │  └──────┬──────────────┬──────────────┬────────┘  │
        │         ▼              ▼              ▼           │
        │   Skia Canvas     a11y overlay    mini-wheel      │
        │   (zoom/pan via   (invisible      preview card    │
        │   RNGH+Reanimated accessible      (result/saved)  │
        │   shared values,  elements over   static render)  │
        │   tap → inverse  hit regions)                     │
        │         │  hit region match                        │
        │         ▼                                           │
        │  ONE SHARED SELECTION STATE  ◄──── list row press │
        │         │                    (auto-scroll sync)    │
        │         ▼                                           │
        │  Inline fact panel (exact envelope facts,          │
        │   live-region) + evidence lists (placements,       │
        │   houses, aspects) + Simple↔Technical toggle       │
        │         │                                           │
        │         ▼                                           │
        │  Evidence-vocabulary module (4 kinds: calculated/  │
        │   judgment/interpretation-defined-only/uncertainty)│
        │   consumed by wheel + lists + panel + assumptions  │
        └───────────────────────────────────────────────────┘
                            │
                            ▼  Platform.OS === "web"
              WebUnsupported-style capability card + full
              evidence experience, NO canvas (D-04; WEB-01 v2)
```

Trace the primary use case: user taps the mini-wheel preview on `/chart/saved` → explore route loads the chart by id from the repository → geometry module converts the stored envelope to primitives → Skia renders the wheel → a pinch spreads dense glyphs → a tap hit-tests through the inverse zoom transform → shared selection updates → fact panel shows exact facts and the placements list auto-scrolls to the matching row. A screen-reader user performs the same selection through the invisible overlay elements or the lists.

### Recommended Project Structure
```
src/
├── lib/
│   └── chart-wheel/              # PURE geometry module (no RN/Skia imports)
│       ├── geometry.ts           #   envelope → rings/cusps/anchors/chords/labels/hit regions/z-order
│       ├── collision.ts          #   glyph declutter (vendor algorithm, zoom-parameterized)
│       ├── glyphs.ts             #   body/sign/aspect → glyph char + a11y name vocabularies
│       └── geometry.test.ts      #   golden numeric fixtures (never screenshots alone)
├── components/
│   └── chart/
│       ├── explore/              # the explore surface family
│       │   ├── wheel-canvas.tsx      # Skia canvas + gestures + zoom transform
│       │   ├── wheel-a11y-overlay.tsx# invisible accessible elements from hit regions
│       │   ├── fact-panel.tsx        # inline exact-facts panel (live region)
│       │   ├── evidence-lists.tsx    # placements/houses/aspects tables (synced)
│       │   ├── mode-toggle.tsx       # Simple ↔ Technical segmented control
│       │   ├── glossary.tsx          # tap-to-explain terms (Simple mode)
│       │   ├── mini-wheel-card.tsx   # D-03 preview (static, non-interactive)
│       │   └── copy.ts               # explore copy deck + glossary definitions
│       └── evidence-vocabulary/  # D-14/D-15 shared module
│           ├── kinds.ts          #   four evidence kinds (typed)
│           ├── tokens.ts         #   theme tokens per kind
│           └── phrases.ts        #   copy + a11y phrasings per kind
├── hooks/
│   └── use-explore-mode.ts       # D-07 versioned-key AsyncStorage preference
└── app/chart/
    └── explore.tsx               # the route (id-param law; D-01)
scripts/vitest/
└── skia-facade/                  # test facade for @shopify/react-native-skia
    └── index.ts                  #   no-op Canvas/Group/shapes/Text/matchFont surface
```
(Exact names are discretion; the seams — pure geometry / canvas / overlay / vocabulary / facade — are the load-bearing structure.)

### Pattern 1: Global Simple ↔ Technical Mode (D-05–D-08)
**What:** One segmented control flips vocabulary + factor depth everywhere on the explore surface; the preference persists per device.
**When to use:** The explore surface only (result/saved keep their existing Phase-2 surfaces plus the mini-wheel card).
**Shape:**
- `use-explore-mode.ts` mirrors `use-disclosure.ts`: versioned key `@lemastra:explore.mode.v1`, best-effort read, safe-persist write (storage failure never blocks the UI), first-run default `"simple"` (D-07).
- Mode is ONE React state passed down as a prop — not context, not two component trees (D-06: same data path; only vocabulary/precision/hidden-factors differ).
- Simple hides: lots, sect, orb columns, applying/separating state (D-06 list). Everything hidden in Simple must still exist in Technical from the SAME envelope fields — no recomputation.
- Toggle component mirrors `confidence-control.tsx`'s inline radiogroup/segmented semantics with `accessibilityState={{ selected }}` — never color alone.
- Glossary (D-08): term → short static definition from the copy deck; definitions are labels, never interpretation (T-02-34 law extends here).

### Pattern 2: Shared Evidence-Vocabulary Module (D-13–D-15)
**What:** One module defines the four evidence kinds — `calculated` / `judgment` / `interpretation` / `uncertainty` — with theme tokens, copy-deck strings, and a11y phrasings.
**When to use:** Every Phase-4 surface renders kinds through this module; Phase 6's interpretation output joins it later.
**Shape:**
- `calculated`: renders plain (the majority) — no badge, no marker.
- `judgment`: sectional treatment extending `AssumptionsLine` (labeled section: house system, zodiac, ephemeris, orb policy).
- `uncertainty`: extends `UnavailableFactors`/provisional cards + the on-wheel dashed treatment (D-16).
- `interpretation`: kind, copy, and a11y phrasing are DEFINED now but nothing renders them until Phase 6 — enforce with a test that the renderer path for this kind is unreachable/empty (D-15).
- No per-row source badges, no legend the user must learn (D-13).

### Pattern 3: Pure Geometry → Hit Regions → Selection (WHEEL-01/02/05)
**What:** The geometry module consumes the parsed envelope and emits deterministic primitives + hit regions; ALL consumers (canvas, overlay, mini-wheel, tests) share it.
**Core math (authoritative port from `vendor/astrology-skill/tools/chart_diagram.py`):**
```typescript
// Source: vendor/astrology-skill/tools/chart_diagram.py (render_svg/lon_to_angle/_polar)
// anchor = 1st-house cusp longitude if houses exist, else ascendant, else 0
const lonToAngle = (lon: number, anchorLon: number) =>
  ((lon - anchorLon) % 360 + 360) % 360 * (Math.PI / 180) + Math.PI;
const polar = (cx: number, cy: number, angle: number, r: number) =>
  ({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) });  // Y flipped (screen coords)
```
- Ring radii (at 720 base size, scale linearly): outer rim 330 · sign band 302→252 · planet ring 210 · aspect-chord circle 130.
- Sign spokes every 30° from anchor; sign glyphs at mid-sign (+15°); Asc/Dsc (asc+180), MC/IC (mc+180) markers; aspect chords join the two bodies' chord-circle points.
- **Hit regions in base coordinates:** signs & houses = annulus sectors (angle range + radius band); planets = circles at (possibly decluttered) glyph anchors; aspect chords = thick line segments (point-to-segment distance threshold); angles = circle markers. Polar hit-testing (angle+radius) is the natural wheel test.
- Unknown-time charts: no houses ring, no angle markers, no sect/lots (absent envelope keys ⇒ absent geometry — Phase-2 D-10 honesty; D-16).
- Z-order (bottom→top): rings/spokes → house lines → aspect chords → planet leader lines → glyphs/labels → selection highlight.

### Pattern 4: Zoom = Shared Values + Inverse-Transform Hit-Testing (WHEEL-03, D-11)
**What:** Pinch/pan mutate Reanimated shared values feeding a Skia `Group` transform; taps inverse-transform through the live zoom state before hit-testing.
**When to use:** The interactive wheel only (mini-wheel and overlay use base coordinates).
**Shape:**
```typescript
// Source: shopify.github.io/react-native-skia/docs/animations/gestures +
// software-mansion RNGH gesture-composition docs (verified this session)
const scale = useSharedValue(1); const savedScale = useSharedValue(1);
const offset = useSharedValue({ x: 0, y: 0 }); const savedOffset = useSharedValue({ x: 0, y: 0 });

const pan = Gesture.Pan().onUpdate((e) => {
  offset.value = { x: savedOffset.value.x + e.translationX, y: savedOffset.value.y + e.translationY };
}).onEnd(() => { savedOffset.value = offset.value; });

const pinch = Gesture.Pinch().onUpdate((e) => {
  scale.value = clamp(savedScale.value * e.scale, MIN_ZOOM, MAX_ZOOM);
}).onEnd(() => { savedScale.value = scale.value; });

<GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
  <Canvas style={...}>
    <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}
           origin={{ x: cx, y: cy }}>          {/* wheel center — see Pitfall 1 */}
      {/* geometry primitives */}
    </Group>
  </Canvas>
</GestureDetector>
```
- Tap selection composes via `Gesture.Exclusive(tap, ...)` or `Gesture.Tap()` alongside the transforms (tap doesn't fight pinch/pan).
- On tap: `p = inverseTransform(pointer, {offset, scale, origin})` (plain math, same formula in the pure module so it's unit-testable) → polar hit-test against base hit regions. **Hit-testing keeps working at any zoom** (D-11).
- Clamp scale (e.g., 1–4×) and clamp pan so the wheel can't be lost off-canvas.
- Declutter tiers by zoom (discretion): base = glyphs only; mid = +degree labels; high = +minute ticks / full cusp numbers. Reuse the vendor collision algorithm with `min_angular_distance` shrinking as scale grows (collision.ts parameterized, not rewritten).

### Pattern 5: One Shared Selection State (WHEEL-04, D-10)
**What:** A single discriminated-union selection value (`{kind:'planet', body} | {kind:'sign', sign} | {kind:'house', house} | {kind:'angle', which} | {kind:'aspect', index}`) drives wheel highlight + fact panel + list auto-scroll.
**Shape:**
- Wheel tap → set selection → highlight primitive (accent ring/outline, not hue-only) + fact panel renders exact envelope facts + matching list row scrolls into view.
- List press → same selection → wheel highlights (canvas reads selection as an ordinary prop → React state change on selection events is fine; only *gesture frames* stay off the render path).
- Fact panel sentences reuse `splitDegreeMinutes`/`formatDegreeMinutes`/`spokenDegrees` — one degree split feeds visual AND spoken facts (A-UI-4 law).
- Auto-scroll guard: programmatic scrolls must not re-trigger selection feedback loops (scroll-end → "selection" → scroll…) — anchor selection to user intent, not scroll position (see Pitfall 9).

### Pattern 6: Accessible Overlay + Canvas Hiding (WHEEL-05, A11Y-01/02/03)
**What:** Every wheel factor exists as an invisible accessible element positioned over its hit region; the raw canvas is hidden from screen readers.
**Shape (RN 0.86 a11y API — verified against official docs):**
```tsx
// Source: reactnative.dev/docs/accessibility (0.86/0.87, fetched 2026-08-30)
<View>  {/* wheel container */}
  <View importantForAccessibility="no-hide-descendants"   // Android
        accessibilityElementsHidden={true}>               // iOS
    <Canvas … />                                          {/* decorative to a11y */}
  </View>
  {hitRegions.map((region) => (
    <Pressable key={region.id}
      onPress={() => select(region.factor)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected(region.factor) }}
      accessibilityLabel={a11yPhrase(region.factor)}     // same facts as the panel (A-UI-4)
      style={[styles.overlayElement, { left: region.x, top: region.y,
                width: region.w, height: region.h }]}     // opacity 0 / transparent
    />
  ))}
</View>
```
- Overlay labels come from the same geometry + vocabulary module (D-12) — list-parity tests assert overlay ↔ list ↔ panel agree.
- Fact panel updates announce via `accessibilityLiveRegion="polite"` (Android) / `aria-live="polite"`.
- The overlay renders at base geometry (unzoomed) positions; it is invisible and linearly navigated, so it need not track live zoom — the lists remain the canonical non-visual path (A11Y-03), the overlay provides the "same place, same gesture" experience (WHEEL-05).
- Web (D-04): no canvas at all — evidence-only surfaces + capability card (`WebUnsupported` posture).

### Anti-Patterns to Avoid
- **Envelope through router params** — id params only (T-03-16 law); the repository is the only data source.
- **Recomputing any astrological fact client-side** (aspects, houses, dignities) — the stored envelope IS the evidence; the geometry module only *positions* emitted facts.
- **React state per gesture frame** — zoom/pan live in shared values; React re-renders only on selection/mode changes.
- **Color-only differentiation** — aspect types and provisional factors need stroke-pattern/weight/outline + text redundancy (A11Y-02).
- **Invented copy** — every string joins a copy deck; glossary definitions are deck content (T-02-34 extension).
- **Skia imports inside the pure geometry module** — it must stay testable in plain Node (vitest) and consumable by non-canvas renderers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Gesture recognition (pinch/pan/tap) | Manual touch-event math on the canvas | `react-native-gesture-handler` `Gesture.Pinch/Pan/Tap` + `Gesture.Simultaneous/Exclusive` | Focal points, velocity, activation thresholds, composition, native-driven performance — all solved |
| Zoom animation state | per-frame `setState` or RN `Animated` | Reanimated shared values feeding Skia props | UI-thread updates; Skia integration requires Reanimated ≥4 anyway |
| Wheel geometry conventions | Inventing ring layout / anchor rotation / collision rules | Port `vendor/astrology-skill/tools/chart_diagram.py` math | The project's own authoritative renderer; identical vocabulary (body/sign strings match the envelope exactly) |
| Degree formatting | Second `degree → D°MM′` implementation | Reuse `splitDegreeMinutes`/`formatDegreeMinutes`/`spokenDegrees` from `placement-list.tsx` | One split feeds visual + spoken facts (A-UI-4); duplicate formatters drift |
| Data loading on the explore route | New fetch/storage path | `useWorkspaceChart` / `useRevisionContent` query hooks | Parse-then-trust + id-param law already enforced there (D-02/D-07 Phase 3) |
| Mode preference persistence | New storage abstraction | Versioned-key AsyncStorage (`use-disclosure.ts` pattern) | Established, safe-persist, versioned for content changes (D-07) |
| Screen-reader semantics for canvas | Canvas-internal labels (none exist) | RN accessible overlay elements (Pattern 6) | Skia canvas has zero a11y semantics; RN elements are the only screen-reader surface |

**Key insight:** the riskiest novelty in this phase is the single new native dependency and first canvas — everything else is extending proven in-repo patterns. The geometry module being pure is what keeps the whole phase testable without CanvasKit.

## Common Pitfalls

### Pitfall 1: Skia transform origin and units differ from React Native
**What goes wrong:** Wheel zoom/rotation behaves wildly — scaling flies toward the top-left corner; rotations are the wrong size.
**Why it happens:** Skia `Group` transform origin defaults to **top-left** (RN defaults to center) and rotations are in **radians** (RN uses degrees). [VERIFIED: official Skia Group docs]
**How to avoid:** Pass `origin={{ x: cx, y: cy }}` (wheel center) on the zoom `Group`; convert degrees→radians once in the geometry module (emit radians everywhere).
**Warning signs:** pinch zooms the wheel off-screen; selection highlight offset from glyphs.

### Pitfall 2: Gestures silently no-op without GestureHandlerRootView
**What goes wrong:** Pinch/pan/tap on the canvas do nothing at all; no error.
**Why it happens:** RNGH 2.x requires `GestureHandlerRootView` wrapping the app. The package is **installed but unimported** in this repo — `_layout.tsx` has no root wrapper today. [VERIFIED: package.json shows rngh installed; `rg` shows zero imports in src; RNGH root-view docs mandate the wrapper]
**How to avoid:** First gesture task adds `<GestureHandlerRootView style={{flex:1}}>` inside `QueryProvider` (or wrapping it) in `_layout.tsx`; existing screens are unaffected (no RNGH usage today — verified by grep).
**Warning signs:** GestureDetector callbacks never fire on device while pressables still work.

### Pitfall 3: Installing npm-latest Skia (2.11.1) instead of the Expo-pinned 2.6.2
**What goes wrong:** Native mismatch crashes on launch in Expo Go (or at first canvas render).
**Why it happens:** `npm install @shopify/react-native-skia` grabs dist-tag latest (2.11.1). Expo Go's bundled native binary is built against the SDK-57 manifest version (2.6.2) from `bundledNativeModules.json`.
**How to avoid:** ALWAYS `npx expo install @shopify/react-native-skia` (selects 2.6.2); tilde-pinned per house convention.
**Warning signs:** version in package.json differs from 2.6.2 / `npx expo-doctor` dependency warnings.

### Pitfall 4: Android glyph tofu (missing Unicode coverage)
**What goes wrong:** Planet/sign glyphs render as □ on Android.
**Why it happens:** Sign glyphs (U+2648–2653) are broadly covered, but Node (U+260A/B), Chiron (U+26B7), Lilith (U+26B8) coverage in Android system fonts is uncertain [ASSUMED — A1]. iOS covers the ranges via Apple Symbols. The vendor SVG renderer relies on desktop font stacks, which says nothing about Android devices.
**How to avoid:** Wave-0 spike: render the full glyph vocabulary on Android (Expo Go) + iOS; if tofu, either bundle an OFL astrology font (through the dependency-legitimacy checkpoint — discretion allows this) or degrade glyphs to text abbreviations in the affected slot.
**Warning signs:** □ boxes anywhere in the wheel on device.

### Pitfall 5: Selection breaks when zoomed (screen-vs-base coordinates)
**What goes wrong:** Taps select the wrong factor or nothing after pinching/panning.
**Why it happens:** Pointer coordinates arrive in canvas/screen space; hit regions live in base wheel coordinates.
**How to avoid:** Inverse-transform the tap point through the live `{offset, scale, origin}` state before polar hit-testing; implement the inverse as a pure function with its own unit tests (including zoomed/panned cases).
**Warning signs:** selection works at 1× zoom only.

### Pitfall 6: Vertical ScrollView steals wheel pan
**What goes wrong:** Trying to pan the wheel scrolls the page instead (the explore surface scrolls vertically — wheel hero + lists below).
**Why it happens:** Parent ScrollView and the canvas Pan gesture compete; the scroll responder wins by default.
**How to avoid:** RNGH activation thresholds on the wheel pan (e.g. `activeOffsetX/-Y` small, `failOffsetY` tuned) or `simultaneousWithExternalGesture`; keep the a11y overlay/list path unaffected (scroll works normally there).
**Warning signs:** wheel panning flaky or jumpy on device; works in isolation, fails inside the page.

### Pitfall 7: Aspect/provisional meaning carried by color alone
**What goes wrong:** A11Y-02 violation — color-blind users can't distinguish aspect types or provisional factors.
**Why it happens:** The vendor renderer's per-aspect color palette (its SVG context has no a11y contract) tempts a direct port.
**How to avoid:** Line style per aspect family (solid/dashed/dotted + weight) with the type ALSO stated in text (fact panel/list row); provisional factors get the dashed glyph outline + text redundancy (D-16).
**Warning signs:** any wheel state whose only differentiator is hue.

### Pitfall 8: Skia text doesn't scale with user font settings
**What goes wrong:** With OS text scaling raised, list/panel text grows but wheel-internal labels don't — feels broken if the wheel were the ONLY source of a fact.
**Why it happens:** Skia `Text` is canvas drawing, outside RN's `allowFontScaling` system. [CITED: Skia text docs — matchFont/Text have no scaling hook]
**How to avoid:** Every wheel-internal label is redundant by design: facts live in panel/lists (RN Text, scales natively); the wheel is position+identity, not the sole text surface (A11Y-03). Optionally scale wheel fonts with `PixelRatio.getFontScale()` manually if desired (discretion).
**Warning signs:** wheel labels asserted as the only carrier of any fact.

### Pitfall 9: Auto-scroll feedback loops (D-10)
**What goes wrong:** List press → wheel highlights → programmatic scroll → scroll handler "selects" the centered row → scroll again — jitter/loop.
**Why it happens:** Treating scroll position as a selection event.
**How to avoid:** Selection changes ONLY on explicit user intent (tap/press/overlay activate); programmatic `scrollTo` sets a guard flag (or uses non-observing APIs); unit-test the loop-free contract.
**Warning signs:** lists twitching after a selection; redundant announcements.

### Pitfall 10: Stale typed routes after adding /chart/explore
**What goes wrong:** `tsc --noEmit` fails on the new route or pushes to it.
**Why it happens:** Typed routes regenerate only via dev-server boot (01-02 law: `expo export` no longer regenerates them).
**How to avoid:** Route task ordering: add route → run dev server (or `expo customize tsconfig`-equivalent regen step) → then typecheck. Register `chart/explore` in `_layout.tsx` Stack.
**Warning signs:** `.expo/types/router.d.ts` older than the route file.

### Pitfall 11: Copy-deck law violations on new surfaces
**What goes wrong:** Invented strings (mode labels, glossary definitions, zoom hints) drift from approved copy; tests can't pin them.
**Why it happens:** New surface = many new strings; glossary especially feels "content-ish".
**How to avoid:** Every string lands in `explore/copy.ts` (or vocabulary `phrases.ts`); glossary definitions are deck content reviewed as copy, never interpretation (D-08, T-02-34).
**Warning signs:** literals inside components.

## Code Examples

### Geometry: envelope longitude → wheel point (authoritative port)
```typescript
// Source: vendor/astrology-skill/tools/chart_diagram.py lines 284-286, 345-357 (in-repo authority)
export interface WheelLayout { size: number; cx: number; cy: number; anchorLon: number; }

export function anchorLongitude(chart: ChartData): number {
  const firstCusp = chart.house_cusps?.find((c) => c.house === 1);
  if (firstCusp) return firstCusp.absolute_degree % 360;
  if (chart.ascendant) return chart.ascendant.absolute_degree % 360;
  return 0; // unknown-time chart: 0° Aries anchored at 9 o'clock (same as vendor fallback)
}

export function lonToAngle(lon: number, anchorLon: number): number {
  return ((((lon - anchorLon) % 360) + 360) % 360) * (Math.PI / 180) + Math.PI;
}

export function polar(cx: number, cy: number, angle: number, r: number) {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}
```

### Declutter: vendor collision algorithm (ported shape)
```typescript
// Source: vendor/astrology-skill/tools/chart_diagram.py lines 464-483
// sort placements by longitude; keep 12° min angular separation per radius level
const MIN_ANGULAR_DISTANCE = (12 * Math.PI) / 180; // parameterize by zoom (discretion)
const RADIUS_STEP = 24; const MAX_LEVEL = 4;      // at 720 base size
// for each placement (by ascending longitude): start at level 0; if another
// positioned glyph sits within MIN_ANGULAR_DISTANCE on the same level, bump
// this glyph one level INWARD (planet_r - level*RADIUS_STEP) and recheck.
```

### Fact panel sentence — reuse the one degree split (A-UI-4)
```typescript
// Source: src/components/chart/placement-list.tsx (existing) + chart/copy.ts
const { degrees, minutes } = splitDegreeMinutes(placement.degree);
// Visual: `${placement.sign} ${formatDegreeMinutes(placement.degree)}`
// Spoken: spokenDegrees(degrees, minutes) — same split, sentences agree
```

### Aspect chord hit region (point-to-segment distance)
```typescript
// Pure module: a "thick segment" hit region per aspect chord
function distanceToSegment(p: Pt, a: Pt, b: Pt): number { /* standard projection math */ }
export function aspectChordHit(chords: Chord[], p: Pt, threshold = 12): AspectRef | null {
  // nearest chord within threshold wins; ties broken by z-order (topmost)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RNGH `Gesture detector` components / v1 API | `Gesture.*` builders + `GestureDetector` | RNGH 2.x (current docs) | Use builder API for all Phase-4 gestures; per-view APIs are legacy |
| Reanimated 3.x for Skia | Reanimated 4.x + react-native-worklets (≥0.7) required by Skia native integration | Skia ≥2.x on RN ≥0.79 | Repo already on 4.5.1/0.10.1 — nothing to do |
| Jest + CanvasKit mocks for Skia testing | Official `jestEnv.js`/`jestSetup.js` (CanvasKit-backed) | current | Jest-specific; for the repo's vitest setup, prefer a no-op alias facade (house pattern) over loading CanvasKit Wasm in tests |
| Accessibility `accessibilityRole/State` pairs | Same API (stable) + `aria-*` aliases on 0.86 | — | Stick with the established `accessibility*` props used across Phases 1–3 |
| `experimental_accessibilityOrder` | — | experimental (0.86/0.87 docs) | Avoid; linear DOM order + overlay ordering suffices |

**Deprecated/outdated:**
- Legacy RNGH wrapped-components (`PanGestureHandler` etc.) — use `GestureDetector`.
- `react-native-svg` for the interactive wheel — reserved for report projection only (STACK).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Android system fonts may lack Node/Chiron/Lilith glyphs (U+260A/B, U+26B7/26B8); sign glyphs U+2648–2653 broadly covered | Pitfall 4, Standard Stack notes | Tofu boxes on Android wheel — mitigated by the Wave-0 glyph spike + bundled-font/text-fallback path (discretion already allows both) |
| A2 | Explore route names/params: `/chart/explore?id={chartId}` with optional `?revision={revisionId}` (latest by default) | Pattern 3, structure | Naming is explicit discretion (CONTEXT); any id-style choice is compliant — planner decides freely |
| A3 | Overlay at base (unzoomed) geometry positions is acceptable for screen readers (invisible, linear navigation; lists are the canonical path) | Pattern 6 | If product wants focus-rect tracking under zoom, overlay transforms must mirror zoom shared values (small additive task, no architecture change) |
| A4 | Zoom clamp range 1–4× and tiered declutter thresholds are reasonable starting values | Pattern 4 | Tuning-only risk; values are parameters, tests assert behavior not constants |

**Everything else in this research was verified this session** against the local Expo SDK 57 install, the npm registry, official Shopify/Software Mansion/Expo/React Native documentation, or the repo's own code and vendored skill.

## Open Questions (RESOLVED)

1. **Android glyph coverage (A1)** — *(RESOLVED → 04-07 Task 3)*
   - What we know: iOS covers the astrological Unicode ranges; Android coverage of the rarer glyphs is uncertain.
   - What's unclear: actual rendering on target Android devices/Expo Go.
   - Recommendation: Wave-0 spike task renders the glyph vocabulary on Android; fallback decision (bundled OFL font through the legitimacy gate vs text abbreviations) is pre-authorized by the discretion area.
   - Resolution: 04-07 Task 3 blocking on-device checkpoint verifies glyph rendering (fallback abbreviations pre-built in 04-01 Task 3 glyphs.ts; bundled-font path legitimacy-gated).

2. **Declutter tiers and zoom clamps (A4)** — *(RESOLVED → 04-05)*
   - What we know: vendor algorithm + linear zoom parameterization works.
   - What's unclear: exact thresholds that feel right at phone sizes.
   - Recommendation: implement as named constants; on-device UAT tunes them (no schema/data impact).
   - Resolution: 04-05 Task 2 implements tiers/clamps as named constants with behavior-parameterized tests (monotonicity, denser packing at zoom); on-device tuning at the 04-07 Task 3 checkpoint.

3. **List auto-scroll mechanism** — *(RESOLVED → 04-04 scroll-target.ts)*
   - What we know: D-10 requires two-way sync; loop-guard contract is defined.
   - What's unclear: FlatList `scrollToIndex` vs ScrollView ref anchoring for the three tables.
   - Recommendation: planner picks the mechanism that keeps the vitest/RNTL seam mockable (03-05 pressable-host law applies).
   - Resolution: 04-04 Task 2 delivers pure `scroll-target.ts` (`scrollTargetFor`) — computation stays out of RN scrolling mechanics; the scroll seam is spied/mockable in tests per the 03-05 law.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@shopify/react-native-skia` | Interactive wheel | ✗ (not yet installed — the phase's ONE new package) | 2.6.2 via `npx expo install` | — |
| `react-native-gesture-handler` | Zoom/pan/tap gestures | ✓ (installed) | ~2.32.0 | — |
| `react-native-reanimated` / `react-native-worklets` | UI-thread transforms | ✓ (installed) | 4.5.1 / 0.10.1 | — |
| Expo Go runtime | Device/simulator verification incl. Skia native binaries | ✓ (project runs on Expo Go since Phase 1; Skia `inExpoGo: true`) | SDK 57 | — |
| Node/npm/vitest toolchain | All tests + typecheck | ✓ | per repo (`npm test` green through Phase 3) | — |

**Missing dependencies with no fallback:** none (Skia install is a planned task, not a blocker).
**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.11 + @testing-library/react-native 14.0.1 (`/pure`, RN shim, act-queue laws) |
| Config file | `vitest.config.ts` (aliases: RN facade, expo-sqlite, device facades) |
| Quick run command | `npx vitest run src/lib/chart-wheel/geometry.test.ts` (or any single file) |
| Full suite command | `npm test` (vitest run) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WHEEL-01 | Geometry determinism: anchor at π, ring radii, spokes at 30°, chord anchors, unknown-time omissions (no houses ring/angles) | unit (pure module) | `npx vitest run src/lib/chart-wheel/geometry.test.ts` | ❌ Wave 0 |
| WHEEL-02 | Tap → hit region → selection → fact panel shows exact envelope facts | unit (hit-testing math) + component (panel) | `npx vitest run src/__tests__/wheel-selection.test.tsx` | ❌ Wave 0 |
| WHEEL-03 | Inverse-transform hit-testing at zoom≠1; declutter level changes with scale; collision keeps 12° separation | unit (pure module) | `npx vitest run src/lib/chart-wheel/geometry.test.ts -t zoom` | ❌ Wave 0 |
| WHEEL-04 | Three evidence tables render envelope fields; selection syncs wheel↔list both ways without loops | component (RNTL, mocked repository + Skia facade) | `npx vitest run src/__tests__/explore-surface.test.tsx` | ❌ Wave 0 |
| WHEEL-05 / A11Y-01 | Overlay element per wheel factor; labels == fact-panel sentences; canvas a11y-hidden; selected state conveyed | component (a11y list-parity) | `npx vitest run src/__tests__/wheel-a11y-parity.test.tsx` | ❌ Wave 0 |
| EVID-01 | Four kinds defined; judgment in assumption sections; uncertainty cards + on-wheel treatment; interpretation kind renders NOTHING | unit + component | `npx vitest run src/__tests__/evidence-vocabulary.test.ts` | ❌ Wave 0 |
| EVID-02 | Simple↔Technical flip changes vocabulary/depth together; Simple hides lots/sect/orb/applying; same data path; preference persists (versioned key, default Simple) | component + hook | `npx vitest run src/__tests__/explore-mode.test.tsx` | ❌ Wave 0 |
| A11Y-02 | Aspect style not hue-only (style/weight per family + text); provisional dashed + text; RN text surfaces scale (default allowFontScaling preserved) | unit (style tokens) + component | `npx vitest run src/__tests__/evidence-vocabulary.test.ts` | ❌ Wave 0 |
| A11Y-03 | Web explore renders evidence-only + capability card; no canvas mount on web | component (Platform mock) | `npx vitest run src/__tests__/explore-web.test.tsx` | ❌ Wave 0 |
| D-03 | Mini-wheel preview card mounts on result/saved; static (non-interactive); pushes explore route | component | `npx vitest run src/__tests__/mini-wheel-card.test.tsx` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted file(s) from the table above (`npx vitest run <file>`)
- **Per wave merge:** `npm test` (full suite — includes all Phase 1–3 regression tests)
- **Phase gate:** full suite green + `tsc --noEmit` (after typed-routes regen) before `/gsd-verify-work`; on-device UAT for gestures/glyphs (simulator can't run VoiceOver — use Accessibility Inspector/real device per RN docs)

### Wave 0 Gaps
- [ ] `scripts/vitest/skia-facade/index.ts` + vitest.config.ts alias — no-op surface for `Canvas, Group, Circle, Line, Path, Text, matchFont, Skia` (exactly what components consume; per-file vi.mocks keep precedence — established facade law)
- [ ] `src/lib/chart-wheel/` pure module skeleton + first golden numeric fixtures (known Timed envelope + Unknown envelope from existing test fixtures `src/test/fixtures`)
- [ ] On-device glyph spike (Android + iOS) resolving A1 before label implementation locks in
- [ ] Route + `GestureHandlerRootView` wiring (Pitfall 2, Pitfall 10) — tiny, unblocks all gesture work

## Security Domain

`security_enforcement: true`, ASVS level 1, block on `high` (config). This phase adds **no network surface, no auth, no crypto, no new data store** — it renders already-validated local data. No threat-model entries rise above informational.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surfaces this phase (local-only rendering) |
| V3 Session Management | no | None |
| V4 Access Control | no | No multi-user/data-sharing surface; repository ownership unchanged |
| V5 Input Validation | yes (edge case) | Route params are id-style strings consumed through existing zod-parsed repository reads (parse-then-trust, D-02) — no new unvalidated input path; never an envelope through params (T-03-16) |
| V6 Cryptography | no | None |
| V14 Config | yes (inherited) | GATE-06 posture unchanged: no secrets in client; adding Skia introduces no keys/config (verified: no install scripts, no app.json plugin) |

### Known Threat Patterns for React Native rich-canvas clients

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Deep-link/route param injection | Tampering | Id-param law: params are repository lookup keys, never rendered data (unknown id → typed redirect, Phase-3 pattern) |
| Supply-chain (new native package) | Tampering/Elevation | Legitimacy gate + `npx expo install` version pin (2.6.2) + no-install-scripts verification (done this session); human-verify checkpoint before install |
| Sensitive-data leakage via telemetry/logs | Information Disclosure | Phase-3 D-16 telemetry guard still enforced by CI; this phase adds zero logging of chart payloads; wheel renders on-device only |
| Prototype/pollution via envelope parsing | Tampering | Envelope already zod-validated at the repository edge before any Phase-4 component receives it |

## Sources

### Primary (HIGH confidence)
- `vendor/astrology-skill/tools/chart_diagram.py` — the authoritative wheel geometry: anchor rotation, polar mapping, ring radii, collision algorithm, glyph vocabularies (in-repo, read in full)
- `node_modules/expo/bundledNativeModules.json` — Expo SDK 57 version pins: skia 2.6.2, rngh ~2.32.0, reanimated 4.5.1, worklets 0.10.1
- `docs.expo.dev/versions/v57.0.0/sdk/skia` — Skia official Expo SDK 57 page: `inExpoGo: true`, install command (fetched 2026-08-30)
- `shopify.github.io/react-native-skia/docs/getting-started/installation` — compatibility matrix (RN ≥0.79, React ≥19, Reanimated ≥4/worklets ≥0.7), no postinstall, bundle-size (+6 MB iOS / +4 MB Android), Jest/CanvasKit mocks, Graphite/`@next` channel warning (fetched 2026-08-30)
- `shopify.github.io/react-native-skia/docs/animations/gestures`, `/docs/group`, `/docs/text/text` (via Context7 `/websites/shopify_github_io_react-native-skia`) — GestureDetector-over-Canvas, shared-value props, transform origin/radians, element-tracking overlay pattern, matchFont/useFonts
- `reactnative.dev/docs/accessibility` (0.86/0.87) — accessible/label/role/state, `importantForAccessibility="no-hide-descendants"`, `accessibilityElementsHidden`, live regions, `experimental_accessibilityOrder` status, VoiceOver/TalkBack testing guidance (fetched 2026-08-30)
- RNGH docs via Context7 `/software-mansion/react-native-gesture-handler` — Gesture.Simultaneous(Pan, Pinch), savedScale/savedOffset pattern, GestureHandlerRootView requirement, composition semantics (Race/Exclusive/Simultaneous)
- Repo code (read this session): `api-schemas.ts`, `placement-list.tsx`, `assumptions-line.tsx`, `unavailable-factors.tsx`, `confidence-control.tsx`, `use-disclosure.ts`, `use-workspace.ts`, `repository.ts`, `result.tsx`, `saved.tsx`, `revision.tsx`, `_layout.tsx`, `vitest.config.ts`, `src/test/setup.ts`, `theme.ts`, `copy.ts` files, facade examples under `scripts/vitest/`

### Secondary (MEDIUM confidence)
- npm registry metadata (`npm view`) — @shopify/react-native-skia 2.11.1 latest (2026-08-23), maintainers, repository, empty scripts; react-native-gesture-handler 3.2.1 latest
- GSD `package-legitimacy check` — SUS verdicts ("too-new" heuristic) with download/repo/deprecated signals, interpreted against the primary evidence above

### Tertiary (LOW confidence)
- Android system-font astrological-glyph coverage (A1) — training-knowledge-based, explicitly flagged for the Wave-0 spike

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified against the local Expo SDK 57 install, npm registry, and official Expo/Skia docs; only one new package, Expo-Go-compatible
- Architecture: HIGH — geometry ported from the in-repo authoritative renderer; all integration points verified in code (routes, hooks, repository, test facades)
- Pitfalls: HIGH for toolchain pitfalls (root view, version pin, transform origin — all doc-verified); MEDIUM for the Android glyph issue (flagged as assumption with spike)

**Research date:** 2026-08-30
**Valid until:** 2026-09-29 (stable stack; re-check only if Expo SDK 58 or Skia major lands)


