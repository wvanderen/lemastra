# Phase 4: Semantic Chart Exploration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-30
**Phase:** 04-semantic-chart-exploration
**Areas discussed:** Wheel surface & navigation, Beginner/technical dual view, Selection/zoom/inspection, Trust labeling visual language

---

## Wheel surface & navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated explore route | New /chart/explore route both result and saved screens link into; one surface owns wheel + dual views + synchronized lists | ✓ |
| Embed in both screens | Wheel + evidence composition embedded directly in /chart/result and /chart/saved | |
| Saved detail only | Wheel lives only in saved-chart detail; fresh result keeps today's list | |

**User's choice:** Dedicated explore route
**Notes:** Recommended — exploration chrome stays separate from result/save/workspace chrome.

| Option | Description | Selected |
|--------|-------------|----------|
| Wheel-first hero | Wheel renders as the hero at top; structured evidence lists below | ✓ |
| Segmented toggle | Wheel \| Lists segmented control, one visible at a time | |
| Lists-first | Lists stay primary; wheel is an expandable optional visual | |

**User's choice:** Wheel-first hero
**Notes:** Matches the product's chart-first identity.

| Option | Description | Selected |
|--------|-------------|----------|
| Mini-wheel preview card | Interactive-feel tappable static wheel preview on result + saved pushing into explore | ✓ |
| Text CTA only | Plain "Explore chart" action, no preview graphic | |
| Auto-enter explore | Calculation lands directly in explore; result shrinks to save/confirm | |

**User's choice:** Mini-wheel preview card
**Notes:** The wow moment starts on the result screen itself; the result screen keeps its identity/save role.

| Option | Description | Selected |
|--------|-------------|----------|
| Web = evidence, no wheel | Web renders full evidence experience without the graphical wheel; capability-card posture; CanvasKit deferred to v2 WEB-01 | ✓ |
| Try CanvasKit now | Attempt Skia/CanvasKit on web this phase gated on a research spike | |
| SVG wheel on web | Web renders its own SVG wheel implementation this phase | |

**User's choice:** Web = evidence, no wheel
**Notes:** Native-first precedent from Phase 3; WEB-01 parity is v2.

---

## Beginner/technical dual view

| Option | Description | Selected |
|--------|-------------|----------|
| Global mode toggle | Simple ↔ Technical segmented control flips the whole experience at once (mirrors D-09 confidence-control pattern) | ✓ |
| Per-section expansion | Every section shows beginner summary with expandable technical layer (AssumptionsLine→ProvenanceDetails pattern everywhere) | |
| Both combined | Global toggle sets default state; sections individually expandable against it | |

**User's choice:** Global mode toggle
**Notes:** One inline control, clear state; flipping the whole view means one tap.

| Option | Description | Selected |
|--------|-------------|----------|
| Vocabulary + factor depth | Simple hides deep-technical factors (lots, sect, orb columns, applying/separating); Technical shows every envelope field at full precision | ✓ |
| Vocabulary only | Same factors/columns both modes; only labels and degree precision change | |
| Framing sentences too | Beginner mode adds a plain-language framing sentence per factor (still facts, no interpretation) | |

**User's choice:** Vocabulary + factor depth
**Notes:** Both modes derive from the same underlying evidence — no separate data path.

| Option | Description | Selected |
|--------|-------------|----------|
| Remembered per device | Mode persists via versioned-key AsyncStorage (use-disclosure pattern); default Simple | ✓ |
| Always start Simple | Every session starts in Simple; preference in-memory only | |
| Inferred default | Session-start default derived from context (e.g. Rectified → Technical) | |

**User's choice:** Remembered per device
**Notes:** Enthusiasts never re-flip the toggle.

| Option | Description | Selected |
|--------|-------------|----------|
| Tap-to-explain | Unfamiliar terms carry a tap affordance revealing a short static definition inline | ✓ |
| Always-on helper text | One-line helper text under dense rows/sections in Simple mode | |
| Legend section | One "What am I looking at?" help section explains everything in one place | |
| You decide | Leave glossary affordance choice to planning/research within copy-deck discipline | |

**User's choice:** Tap-to-explain
**Notes:** Definitions are static copy-deck content, never interpretation.

---

## Selection, zoom & inspection

| Option | Description | Selected |
|--------|-------------|----------|
| Inline fact panel | Persistent detail region beside/below the wheel updates with selected factor's exact facts; wheel + facts visible together | ✓ |
| Bottom sheet | Dismissable sheet slides over content; covers the wheel; new dependency | |
| Navigated fact screen | Selection navigates to a dedicated fact screen; breaks exploration flow | |

**User's choice:** Inline fact panel
**Notes:** Selection highlight and its evidence read as one unit — strong for the trust story.

| Option | Description | Selected |
|--------|-------------|----------|
| Two-way + auto-scroll | One shared selection state; wheel tap highlights and auto-scrolls list; list tap highlights wheel and fills panel | ✓ |
| Two-way, no scroll | Highlights flow both ways but lists never auto-scroll | |
| Independent | Wheel and lists keep independent selections | |

**User's choice:** Two-way + auto-scroll
**Notes:** Selection is a single concept across the surface.

| Option | Description | Selected |
|--------|-------------|----------|
| Pinch-zoom + pan | Pinch-to-zoom and pan the canvas directly; hit-testing at any zoom; labels declutter | ✓ |
| Focus mode | Tapping a dense cluster zooms into that sector with animation; needs cluster detection | |
| Both | Pinch-zoom AND guided focus mode | |

**User's choice:** Pinch-zoom + pan
**Notes:** Expected gesture vocabulary; aligned with STACK's Skia+gestures plan.

| Option | Description | Selected |
|--------|-------------|----------|
| Accessible overlay | Each wheel factor is also an invisible accessible element over its hit region; screen-reader users select like sighted users | ✓ |
| Lists are the path | Wheel canvas carries one summary label; synchronized lists + panel are the non-visual representation | |
| You decide via research | Overlay-vs-lists decided after research evaluates overlay complexity on both platforms | |

**User's choice:** Accessible overlay
**Notes:** STACK's gesture layer row already anticipates accessibility overlays.

---

## Trust labeling visual language

| Option | Description | Selected |
|--------|-------------|----------|
| Sectional + markers | Facts plain; judgments in labeled assumption sections; uncertainty via distinct card/marker treatments — extends existing patterns | ✓ |
| Per-row badges | Every row/glyph/panel carries a small source tag | |
| Token legend system | Shape+text token legend across all surfaces with an on-surface legend | |

**User's choice:** Sectional + markers
**Notes:** Typographic hierarchy does the work — no badge clutter on ordinary calculated facts.

| Option | Description | Selected |
|--------|-------------|----------|
| Shared module now | One evidence-vocabulary module (tokens, copy, a11y phrasing) consumed by wheel, lists, panel, assumptions | ✓ |
| Per-surface, unify later | Each surface styles its own trust distinctions; unify when interpretation lands | |

**User's choice:** Shared module now
**Notes:** Phase 6's interpretation joins an existing system instead of inventing a parallel one.

| Option | Description | Selected |
|--------|-------------|----------|
| Marked on wheel | Provisional factors get distinct on-wheel treatment (e.g. dashed outline) with text redundancy in panel; unavailable factors have no geometry | ✓ |
| Lists only | Wheel renders pure calculated geometry; uncertainty distinctions live in lists/panel/cards | |
| You decide | On-wheel uncertainty treatment left to UI-design/research constrained by A11Y-02 | |

**User's choice:** Marked on wheel
**Notes:** Never color alone (A11Y-02); Phase-2 D-10 honesty for absent factors.

| Option | Description | Selected |
|--------|-------------|----------|
| Define all four now | Vocabulary module defines fact/judgment/interpretation/uncertainty incl. interpretation copy; nothing renders the 4th kind yet | ✓ |
| Three kinds only | Build only what Phase 4 renders; add interpretation in Phase 6 | |

**User's choice:** Define all four now
**Notes:** EVID-01's full sentence stays coherent; Phase 6 slots into a tested system.

---

## the agent's Discretion

- Geometry-module API shape; mini-wheel preview and a11y overlay both consume it
- Glyph rendering approach (unicode glyphs vs drawn paths; font assets through the legitimacy checkpoint)
- Aspect-chord styling and orb-based emphasis (calculator's emitted aspects are the complete source)
- Label decluttering/collision strategy across zoom levels
- Zoom implementation details (Reanimated shared values, gesture composition)
- Copy-deck structure and glossary term inventory
- Explore-route naming and revision-vs-latest param semantics
- Golden geometry fixtures and a11y list-parity testing approach
- Skia + Gesture Handler installation via `npx expo install`

## Deferred Ideas

None — discussion stayed within phase scope.
