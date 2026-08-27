# Reference Gap Matrix

Use this matrix to prioritize enrichment of the bundled reference library. It
compares every implemented reference category against the source canon
(`references/source_canon_and_rights_ledger.md`), the retrieval contract in
`SKILL.md`, the naming/coverage notes in `references/resource_index.md`, the
`ROADMAP.md` phase structure, and the templates in `references/templates/`.

This is a planning artifact, not doctrine. It records where depth is thin,
which source families can safely fill the gap, and which modules should stay
compact. Draw the doctrine itself in the Phase 3 and Phase 4 extraction tasks,
not here.

## How to use

- Before enriching a module, read its row, confirm the source family in the
  rights ledger, and follow the ledger's extraction and paraphrase rules.
- Priority tiers are now mostly `P3` (keep-compact / spot-fix) because the
  Phase 5/6/7 enrichment waves have landed; `P2` marks the residual on-demand
  gaps (traditions focused, planet-pair starters, rulerships, planet-in-sign/
  house exemplars, compact synthesis patterns). New enrichment should be
  driven by forward-test evidence, not a pre-planned sweep.
- Prefer depth and consistency over breadth. The skill's compositional model
  already falls back from an exact module to broader planet, sign, house,
  aspect-type, and synthesis modules, so coverage gaps are lower-risk than
  depth gaps in frequently retrieved modules.

## Vocabulary

- Vocabulary: `Starter` (thin skeleton), `Moderate` (serviceable,
  template-complete), `Rich` (already deepened with prose and worked
  modifiers), `Mixed` (varies by file).
- Priority: `P2 on-demand`, `P3 keep-compact`. (`P0 first-wave` and
  `P1 second-wave` are retired — the waves landed; see "Enrichment waves".)
- Risk: `Low` (safe to enrich with paraphrase), `Medium` (watch for bloat, tone
  drift, or copyright), `High` (ethics-sensitive, copyright-sensitive, or bloat-
  prone; enrich carefully and narrowly).

## Summary matrix

| Category | Modules | Depth | Coverage | Priority | Risk | Headline gap |
| --- | --- | --- | --- | --- | --- | --- |
| Foundations | 6 | Mixed | Full | P3 | Low | Anchors intentionally terse; only light spot-enrich |
| Traditions, broad | 2 | Starter | Full | P3 | Low | Routing stubs; weight belongs in focused modules |
| Traditions, classical focused | 3 | Moderate | Core only | P2 | Medium | Classical condition/aspect/reception doctrine deepened; remaining sect-trigon-lord and reception-mechanics gaps |
| Traditions, modern focused | 3 | Starter | Core only | P2 | Medium | Public-domain modern psychological language still under-developed vs planet modules |
| Planets | 10 | Rich | Full (7 trad + 3 outer) | P3 | Low | Classical notes + modern psychological notes landed across all 10; sect-depth varies (3–8 mentions each) |
| Signs | 12 | Rich | Full | P3 | Low | Ptolemaic sign-powers (commanding/obeying, gender, temperament, bodily) landed; modern co-ruler notes on Scorpio/Aquarius/Pisces |
| Houses | 12 | Rich | Full | P3 | Low | Classical notes (joys, turned/derived houses, benefic/malefic) landed; cross-links into synastry/horary/profection optional |
| Aspect types | 5 | Rich | Full | P3 | Low | Classical aspect-theory layer (configuring, witnessing, bodily/sign-based) landed |
| Planet-pair aspects | 26 | Mixed (16 Classical) | Partial pairs | P2 | Medium | 16 of 26 carry Classical notes; bring remaining toward exemplar depth selectively |
| Planet in sign | 3 | Moderate | 3 of 120 | P2 | Low | On-demand exemplar strategy; do not fill all 120 |
| Planet in house | 2 | Moderate | 2 of 120 | P2 | Low | On-demand exemplar strategy; do not fill all 120 |
| Conditions | 13 | Rich | Full names | P3 | Low | Classical notes landed across all 13 (dignity, sect, combustion/cazimi orb precision) |
| Rulerships | 7 | Moderate | 7 traditional | P2 | Medium | Outer-planet modern rulership notes missing |
| Reading types | 11 | Rich | Full | P3 | Low | Already deepened; includes Phase 7 mundane + mundane_examples |
| Synthesis patterns | 15 | Mixed | Broad | P2/P3 | Medium | 3 mundane patterns (governance/markets/conflict) added Phase 7; enrich compact ones selectively |

Counts: 130 reference modules across the 15 categories (Phase 7 mundane
+ mundane synthesis patterns landed) plus templates and this matrix.

## Category detail

### Foundations

- Modules: `interpretive_principles`, `synthesis_rules`, `ethics_and_scope`,
  `anti_patterns`, `birth_time_uncertainty`, `aspect_precision`.
- Current depth: Mixed. `anti_patterns` (6.2 KB) and `birth_time_uncertainty`
  (6.5 KB) are already rich; `interpretive_principles` (2.0 KB) and
  `ethics_and_scope` (2.0 KB) are intentionally compact anchors.
- Missing classical doctrine: none load-bearing. Ethics anchors should stay
  tradition-neutral.
- Missing modern language: none load-bearing.
- Missing synthesis modifiers: `synthesis_rules` could cross-reference the
  timing-pattern weighting once; optional.
- Source candidates: not source-bound. Cross-check `ethics_and_scope` against
  the rights-ledger cautions when tone is adapted from historical sources.
- Risk: Low. Bloat risk if anchors grow.
- Priority: P3 keep-compact. Enrich only the `anti_patterns` and
  `birth_time_uncertainty` modules if forward testing exposes new drift.

### Traditions, broad

- Modules: `traditions/classical.md`, `traditions/modern.md`.
- Current depth: Starter (~0.6 KB each); emphasis + cautions only.
- Missing classical doctrine: deliberately delegated to focused modules.
- Missing modern language: deliberately delegated to focused modules.
- Missing synthesis modifiers: none; these are routing fallbacks.
- Source candidates: none directly; point to focused modules and the rights
  ledger.
- Risk: Low. Broad stubs should stay compact so focused modules carry weight.
- Priority: P3 keep-compact. Keep as fallback routing; do not fold focused
  doctrine back in.

### Traditions, classical focused

- Modules: `classical/dignities`, `classical/sect`, `classical/bonification_maltreatment`.
- Current depth: Moderate (Phase 6 `td-fb39c1` deepened `dignities` and
  `bonification_maltreatment`; `sect` retains the deepest classical content).
- Missing classical doctrine: sect-trigon / triplicity-lord mechanics as a
  sect-adjacent timing idea; a fuller reception-mechanics treatment with
  mutual-reception examples; remaining bonification/maltreatment vocabulary
  (enclosure, witnessing, hurling rays, dexter/sinister aspects) is present
  but could be expanded.
- Missing modern language: translation notes so classical terms stay readable
  in blended readings.
- Missing synthesis modifiers: how sect and reception modify planet-in-house,
  rulership, and aspect modules (cross-links).
- Source candidates: Ptolemy (sect-adjacent diurnal/nocturnal, dignities,
  aspects — Strong); Valens (practical sect/time-lord use — Strong, paraphrase
  only); Lilly (reception, application/separation, dignity/debility — Strong,
  PD English).
- Risk: Medium. Sect and reception are easy to flatten or modernize past
  recognition; keep terminology distinct per ledger cautions.
- Priority: P2 on-demand. Core condition/aspect/reception doctrine has landed;
  remaining gaps are sect-trigon-lord depth and reception worked examples.

### Traditions, modern focused

- Modules: `modern/psychological_framing`, `modern/outer_planets`,
  `modern/archetypal_language`.
- Current depth: Starter (1.8–2.2 KB).
- Missing classical doctrine: none required; keep modern modules tradition-
  aware so blended readings stay grounded.
- Missing modern language: richer, public-domain modern psychological and
  archetypal vocabulary; early twentieth-century character/synthesis language
  adapted to non-deterministic framing; clearer outer-planet integration rules.
- Missing synthesis modifiers: how outer planets modify planet, sign, house,
  and aspect modules only when angular, exact, repeated, or requested.
- Source candidates: Alan Leo PD corpus (Strong for psychological language;
  verify edition <=1930 per ledger); Raphael/Cross and Sepharial (Some, as
  secondary modern-popular witnesses).
- Risk: Medium. Theosophical, gendered, and moralizing tone in PD modern
  sources needs adaptation to the skill's ethics style.
- Priority: P2 on-demand (Phase 7).

### Planets

- Modules: all ten cores (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn,
  Uranus, Neptune, Pluto).
- Current depth: Moderate and uniform (~4.3–4.9 KB, ~100–107 lines each);
  Phase 5 (`td-722c1d`) added `## Classical notes` (planetary natures,
  benefic/malefic baseline, congenial/enmity, sect role) and
  `## Modern psychological notes` to all ten, including the three outer
  planets.
- Missing classical doctrine: sect-depth is uneven across the set
  (3–8 mentions each); Valens-style practical combinations could deepen the
  seven traditional planets.
- Missing modern language: outer-planet modern framing present; could be
  deepened further from PD modern sources if forward testing surfaces a gap.
- Missing synthesis modifiers: cross-links to condition, rulership, and
  planet-pair modules are present but could name the most common modifier
  chains more tightly.
- Source candidates: Ptolemy (Strong); Valens (Strong, paraphrase); Lilly
  (Strong for the seven traditional planets); Alan Leo (Strong for outer
  planets and psychological framing).
- Risk: Low. Modules are stable and template-bound; enrichment is additive.
- Priority: P3 spot-fix only. Classical and modern layers have landed; deepen
  only on forward-test evidence.

### Signs

- Modules: all twelve.
- Current depth: Rich (~59 lines each on average). Phase 5 (`td-722c1d`)
  added a `## Classical sign-powers` section to all twelve —
  commanding/obeying sign pairs, masculine/feminine gender, equinoctial/
  solstitial/solid/bicorporeal category, hot/cold/moist/dry temperament, and
  bodily (melothesia) correspondence. Scorpio, Aquarius, and Pisces carry a
  `## Modern co-ruler note` (Pluto, Uranus, Neptune) framed as optional
  modern testimony.
- Missing classical doctrine: minor — decan/face and triplicity-by-sect could
  be named where relevant, but the load-bearing Ptolemaic sign-powers are in.
- Missing modern language: modern co-ruler notes are present on the three
  outer-ruled signs; the other nine rely on traditional rulership by design.
- Missing synthesis modifiers: how sign qualities modify dignity, reception,
  and aspect (e.g. commanding/obeying pair dynamics, aspect reception by sign)
  could be cross-linked from the aspect and condition modules.
- Source candidates: Ptolemy Tetrabiblos Book I (Strong; PD via non-renewal
  per ledger); Lilly (Strong for sign-ruler practice); Alan Leo (Strong for
  modern ruler nuance).
- Risk: Low–Medium. Signs are high-frequency reference cards; keep the
  classical layer compact rather than growing into a glossary, and keep
  modern-ruler notes clearly optional.
- Priority: P3 spot-fix only. The first-wave P0 work has landed; revisit only
  if forward testing surfaces a concrete gap.

### Houses

- Modules: all twelve.
- Current depth: Rich (~65 lines each on average). Phase 5 (`td-722c1d`)
  added a `## Classical notes` section to all twelve covering classical topic
  lists, planetary joys, turned/derived houses (with worked examples such as
  the 3rd from the 7th = 9th), benefic/malefic pressure, and the angle/
  succedent/cadent strength gradation. A `## Modern notes` section carries
  the developmental framing.
- Missing classical doctrine: minor — the turned-house doctrine is present;
  remaining work is cross-linking derived houses into the synastry, horary,
  and profection reading-type modules where they are consumed.
- Missing modern language: psychological framing of each house as a
  developmental field is already present in `## Modern notes`.
- Missing synthesis modifiers: how house strength modifies planets, rulers,
  and aspects; how turned houses feed synastry, horary, and profection
  modules (cross-links rather than new doctrine).
- Source candidates: Valens (Some–Strong for practical houses); Firmicus
  (Strong for houses, tone caution); Lilly (Strong for houses, horary turned
  houses); Bonatti (Strong for questions/turned houses).
- Risk: Low–Medium. Fatalistic and status-conscious classical house language
  needs adaptation; turned-house doctrine must stay clearly tied to supplied
  reading type.
- Priority: P3 spot-fix only. The first-wave P0 work has landed; revisit only
  on forward-test evidence.

### Aspect types

- Modules: conjunction, opposition, square, trine, sextile.
- Current depth: Rich (~4.2–5.0 KB); Phase 6 (`td-fb39c1`) added a
  `## Classical aspect theory` section to all five — configuring/hearing-seeing
  signs, bodily vs. sign-based aspects, witnessing and testimony language, and
  the solar co-presence forms (combustion/cazimi/under-beams).
- Missing classical doctrine: minor — dexter/sinister (right/left) ray
  mechanics could be named more explicitly where forward testing surfaces it.
- Missing modern language: minimal; aspect-type modules are mechanics, not
  psychological content.
- Missing synthesis modifiers: cross-link to `aspect_precision.md` and the
  applying/separating timing notes in planet-pair modules.
- Source candidates: Ptolemy (Strong); Valens (Strong for practical aspect
  use); Lilly (Strong for applying/separation and reception in aspects).
- Risk: Low. Modules are stable; enrichment is a light classical layer.
- Priority: P3 keep-compact. The optional classical layer has landed; do not
  bloat.

### Planet-pair aspects

- Modules: 26 in `aspects/by_planet_pair/`; one rich exemplar
  (`mars_square_moon.md`, 8.0 KB), 25 starters (~2.2–2.8 KB). Phase 6
  (`td-fb39c1`) added `## Classical notes` to 16 of the 26 and kept the
  dedicated transit and synastry sections across the set.
- Current depth: Mixed. 16 of 26 carry `## Classical notes`; 10 remain at the
  starter depth. All 26 already include dedicated transit and synastry
  sections plus inline reception and sect coverage, so the gap is depth and
  modifier richness in the remaining starters, not missing structure.
- Missing classical doctrine: reception-led cooperation vs. friction
  judgments; applying/separating and dexter/sinister timing; sect-modified
  benefic/malefic contact; enclosure and witnessing language for hard pairs
  — present in the 16 enriched, absent in the 10 starters.
- Missing modern language: developmental and regulatory framing consistent
  with the `mars_square_moon` exemplar across natal, transit, and synastry.
- Missing synthesis modifiers: house-ruled/occupied routing, dignity and
  reception modifiers, and reading-type-specific weighting in the starters.
- Source candidates: Ptolemy (Strong); Valens (Strong for combinations);
  Lilly (Strong, PD English for aspect/reception mechanics); Alan Leo (Some
  for relational psychological framing).
- Risk: Medium. Twenty-six files; bring the most-frequently-retrieved pairs
  toward exemplar depth rather than enriching all uniformly. Watch tone in
  relational pairs (synastry ethics).
- Priority: P2 on-demand. Prioritize the remaining starters toward the
  `mars_square_moon` depth exemplar when forward testing surfaces them. Mars-
  Moon is represented by the exemplar itself (`mars_square_moon.md`); the
  Mars-Moon conjunction and opposition remain compact starters that compose
  from the aspect-type and planet modules.
- Coverage note: named P2-E3-TD2 pairs are complete (Sun-Moon, Moon-Saturn,
  Venus-Mars, Mars-Saturn, Mercury-Jupiter, Venus-Saturn, Mars-Moon each have
  conjunction/square/opposition where applicable). Missing pairs (e.g.,
  Jupiter-Saturn, Sun-Jupiter, Moon-Venus) are on-demand; the compositional
  fallback to aspect-type + planet modules covers them.

### Planet in sign placements

- Modules: 3 of 120 (`mercury_gemini`, `mars_cancer`, `mars_virgo`).
- Current depth: Moderate (4.4–5.0 KB), template-complete exemplars.
- Missing classical doctrine: dignity/debility-specific treatment per
  combination (e.g., fall, domicile, exaltation, detriment effects in sign).
- Missing modern language: psychological integration notes per combination.
- Missing synthesis modifiers: house, ruler, sect, aspect, and reception
  modifiers per the template.
- Source candidates: Valens (Strong for planet-in-sign delineation); Lilly
  (Strong); Alan Leo (Strong for modern character language).
- Risk: Low. On-demand; adding modules is low-risk but low-priority.
- Priority: P2 on-demand (Phase 5). Do not fill all 120; add only
  high-frequency or high-doctrine combinations when forward testing or user
  requests surface them.

### Planet in house placements

- Modules: 2 of 120 (`saturn_10th`, `mercury_10th`).
- Current depth: Moderate (4.9–5.6 KB), template-complete exemplars.
- Missing classical doctrine: angularity-specific and topic-specific
  classical treatment per combination.
- Missing modern language: developmental framing of the planet-house field.
- Missing synthesis modifiers: ruler, sect, dignity, aspect, and reception
  modifiers per the template.
- Source candidates: Valens (Some–Strong); Firmicus (Strong, tone caution);
  Lilly (Strong); Bonatti (Strong for angular and question houses).
- Risk: Low. On-demand.
- Priority: P2 on-demand (Phase 5). Same exemplar strategy as planet-in-sign.

### Conditions (planet_condition)

- Modules: 13 — domicile, exaltation, detriment, fall, triplicity, term, face,
  sect, angularity, retrograde, combustion, cazimi, under_beams.
- Current depth: Rich (~64 lines each on average). Phase 6 (`td-fb39c1`)
  added a `## Classical notes` section to all 13 — triplicity-by-sect, bound/
  term and face/decan roles, peregrine judgment, cazimi/combustion/under-beams
  orb precision with Lilly convention attribution, retrograde and station
  meaning, and angularity strength gradation. Only `cazimi`, `combustion`,
  and `under_beams` cited specific orb numbers before; all conditions now
  carry classical depth.
- Missing classical doctrine: minor — per-condition cross-links into planet,
  rulership, and timing modules could be tightened, but the doctrine itself
  has landed.
- Missing modern language: developmental translation of each condition (e.g.,
  fall as lowered recognition, exaltation as aspirational pressure) is lightly
  present; could be deepened.
- Missing synthesis modifiers: how each condition modifies planet, rulership,
  aspect, and timing modules; interaction with sect and reception; the "do
  not derive minor dignity from missing data" guardrail (present in
  `dignities.md`, repeated per condition where relevant).
- Source candidates: Ptolemy (Strong for dignities/aspects); Valens (Strong for
  practical condition); Firmicus (Strong, tone caution); Lilly (Strong for
  combustion/cazimi/reception/retrograde, PD English); Bonatti (Strong for
  condition and questions).
- Risk: Medium. Combustion/cazimi orb numbers are convention-sensitive; the
  source attribution is in place and the skill's "do not derive missing data"
  rule is preserved.
- Priority: P3 spot-fix only. The first-wave P0 work has landed; revisit only
  on forward-test evidence.

### Rulerships

- Modules: 7 — Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn
  (planet-led, house-by-house).
- Current depth: Moderate (3.5–4.0 KB).
- Missing classical doctrine: reception and mutual-reception effects on the
  ruled house; turned-house rulership links for horary and synastry; sect and
  dignity effects on the ruler's administration.
- Missing modern language: outer-planet rulership notes (Uranus, Neptune,
  Pluto) for modern or blended charts where an outer planet is the supplied
  modern ruler of a house — framed as optional modern testimony, not default.
- Missing synthesis modifiers: cross-links to the ruler's placement, dignity,
  reception, and aspect modules are present; could be tightened.
- Source candidates: Ptolemy (Strong); Valens (Strong); Lilly (Strong,
  PD English); Bonatti (Strong for questions/rulers); Alan Leo (Some for
  outer-planet modern rulership).
- Risk: Medium. Do not assert natural-house rulership as chart-specific; keep
  modern outer rulers clearly optional and tied to supplied data.
- Priority: P2 on-demand (Phase 6).

### Reading types

- Modules: 11 — natal, transit, transit_examples, synastry, synastry_examples,
  solar_return, annual_profection, horary, electional, mundane,
  mundane_examples. The two mundane modules landed in Phase 7 (`td-bd5aa7`).
- Current depth: Rich (4.9–13.9 KB); the deepest category. The mundane module
  is the longest, carrying the event-certainty and fear-based-language
  guardrails that make it scope-sensitive.
- Missing classical doctrine: minimal; horary and electional already lean on
  Lilly-style method. Could add Valens time-lord framing to annual_profection.
- Missing modern language: minimal; natal and synastry already integrate
  modern framing, and mundane carries the modern outer-planet layer.
- Missing synthesis modifiers: cross-links to the timing, relationships,
  vocation, and mundane synthesis patterns are present.
- Source candidates: Lilly (Strong for horary/electional, PD English); Valens
  (Strong for profections/time-lords, paraphrase); Ptolemy (Some for
  directions/returns and the classical mundane universal doctrine).
- Risk: Low. Bloat risk if these grow further.
- Priority: P3 keep-compact / spot-fix only. Enrich only if forward testing
  finds a concrete gap.

### Synthesis patterns

- Modules: 15 — vocation, consulting_advisory_vocation,
  professional_collaboration, relationships, resources, home, creative_work,
  health_routines, spirituality, conflict, strengths, timing, plus the three
  Phase 7 (`td-bd5aa7`) mundane patterns: mundane_governance, mundane_markets,
  mundane_conflict.
- Current depth: Mixed. Seven rich (vocation, consulting,
  professional_collaboration, relationships, and the three mundane patterns);
  eight compact starters (2.4–2.7 KB).
- Missing classical doctrine: classical topic routing for the compact
  patterns (e.g., home = 4th, resources = 2nd, creative_work = 5th, health =
  6th) is implied; could be stated with ruler and aspect testimony.
- Missing modern language: developmental framing for the compact patterns.
- Missing synthesis modifiers: retrieval order, primary vs. secondary
  testimony, and uncertainty cautions are present but thin in the eight
  starters; the three mundane patterns carry the event-certainty and
  fear-based-language limits explicitly.
- Source candidates: Ptolemy (Strong for natal topics and the classical
  mundane universal doctrine); Valens (Strong); Lilly (Strong for topic
  questions); Alan Leo (Strong for synthesis/character language).
- Risk: Medium. Eight compact patterns could be enriched selectively; keep
  narrow ones (strengths, conflict, timing) compact if inherently focused.
- Priority: P2/P3. Enrich the topic patterns that forward testing shows are
  under-served; leave the rest compact.

## Enrichment waves (landed)

The waves below were the prioritization that drove Phase 5/6/7 enrichment.
They have shipped; this section is retained as the audit trail of what each
phase delivered and where the residual gaps now sit. New waves are on-demand,
driven by forward-test evidence, not by a pre-planned sweep.

P0 first-wave (landed):

- Signs (Phase 5, `td-722c1d`, shipped): added `## Classical sign-powers`
  (commanding/obeying, masculine/feminine pairs, solid/bicorporeal,
  hot/cold/moist/dry temperament, bodily correspondence) to all twelve, and
  `## Modern co-ruler note` to Scorpio, Aquarius, Pisces. Source: Ptolemy
  Tetrabiblos Book I (PD Robbins/Ashmand); Alan Leo for modern nuance.
- Houses (Phase 5, `td-722c1d`, shipped): added `## Classical notes`
  (classical topic depth, planetary joys, derived/turned houses,
  aversion-to-ascendant, angle/succedent/cadent strength) to all twelve.
  Source: Valens, Firmicus, Lilly, Bonatti.
- Conditions (Phase 6, `td-fb39c1`, shipped): added `## Classical notes` to
  all 13 with classical doctrine and combustion/cazimi/under-beams orb
  precision (Lilly convention attribution). Source: Ptolemy, Valens, Lilly,
  Bonatti.

P1 second-wave (landed, partial):

- Classical focused traditions (Phase 6, `td-fb39c1`, shipped): deepened
  `dignities` and `bonification_maltreatment`; sect-trigon-lord depth and
  fuller reception worked examples remain as on-demand follow-ups.
- Planets (Phase 5, `td-722c1d`, shipped): added `## Classical notes` and
  `## Modern psychological notes` to all ten. Sect-depth is uneven (3–8
  mentions each) and is the residual on-demand gap.
- Planet-pair aspects (Phase 6, `td-fb39c1`, partial): 16 of 26 now carry
  `## Classical notes`. The remaining 10 starters compose from the aspect-
  type and planet modules; bring them toward the `mars_square_moon` exemplar
  only when forward testing surfaces them.
- Aspect types (Phase 6, `td-fb39c1`, shipped): added `## Classical aspect
  theory` to all five.

P2 reading-type and synthesis extension (landed):

- Mundane reading type (Phase 7, `td-bd5aa7`, shipped): added
  `reading_types/mundane.md` and `mundane_examples.md`, plus the three
  synthesis patterns `mundane_governance.md`, `mundane_markets.md`,
  `mundane_conflict.md`, with the event-certainty and fear-based-language
  guardrails.

## Modules to keep compact

Do not enrich these beyond spot-fixes; they are intentionally terse, already
rich, or inherently narrow. Enriching them raises bloat or drift risk without
proportional retrieval value.

- Foundations anchors: `interpretive_principles`, `ethics_and_scope`,
  `synthesis_rules`. Terse routing anchors by design.
- Traditions broad stubs: `classical.md`, `modern.md`. Routing fallbacks;
  focused modules carry the doctrine.
- Aspect types: now rich with the classical layer; keep compact.
- Reading types: already rich (mundane included); spot-fix only on
  forward-test evidence.
- Synthesis patterns `timing`, `strengths`, `conflict`: decent or inherently
  narrow; enrich only if testing shows a gap. The three mundane synthesis
  patterns are rich by design (they carry the scope guardrails).
- Planet-in-sign and planet-in-house: keep the on-demand exemplar strategy;
  do not attempt all 120 + 120 combinations. The compositional fallback to
  planet + sign + house modules covers unlisted combinations by design.

## Coverage strategy for placements and planet-pair aspects

The skill is compositional, not exhaustive. Exact planet-in-sign,
planet-in-house, and planet-pair modules are preferred when they exist but are
not required: the retrieval contract falls back to planet + sign, planet +
house, and aspect-type + planet modules. Therefore:

- Treat placement and planet-pair coverage gaps as on-demand, not as a wave.
- Add a new exact module only when (a) forward testing or repeated user
  requests surface the gap, (b) the combination carries distinctive doctrine
  not recoverable from the broader modules, and (c) it follows the template.
- Record any on-demand addition in `references/resource_index.md` in the same
  change, per the index maintenance rules.

## Research pass

Logged with `td log` for `td-67c460` (initial matrix) and refreshed with
`td log` for `td-76f5e0` (Phase B.2 reconciliation). Local files consulted:
`SKILL.md`, `ROADMAP.md`, `docs/e2e_validation_plan.md`, `references/resource_index.md`,
`references/source_canon_and_rights_ledger.md`,
`references/templates/interpretation_module_template.md`,
`references/templates/rulership_module_template.md`, and a representative
sample across every reference category (planets, signs, houses, aspect types,
planet-pair aspects, conditions, rulerships, reading types, synthesis
patterns, foundations, and traditions). Depth and coverage confirmed with
`find`, `wc -c`/`wc -l`, and targeted `grep` for section headings and
doctrine terms.

The `td-76f5e0` refresh reconciled the matrix against the post-Phase-5/6/7
on-disk modules: confirmed `## Classical sign-powers` in 12/12 signs,
`## Classical notes` in 12/12 houses and 13/13 conditions, `## Classical notes`
+ `## Modern psychological notes` in 10/10 planets, `## Classical aspect
theory` in 5/5 aspect types, `## Classical notes` in 16/26 planet-pair
aspects, `## Modern co-ruler note` in the three outer-ruled signs, the
Phase 7 `mundane` + `mundane_examples` reading-type modules, and the three
Phase 7 mundane synthesis patterns. No new doctrine was authored; this is a
planning-artifact reconciliation only. The drift guard
(`tests/structure/gap_matrix_drift.py`) asserts the summary table stays
consistent with the disk and is green after this refresh.

Source-canon references used: the Phase 1 rights ledger
(`references/source_canon_and_rights_ledger.md`, task `td-ef5c84`), which vets
Ptolemy Tetrabiblos, Vettius Valens Anthologies, Firmicus, medieval Arabic and
Latin sources, Bonatti, Lilly Christian Astrology, and public-domain modern
sources (Alan Leo, Raphael/Cross, Sepharial) with edition, rights posture, and
doctrinal strengths.

External confirmations: the LacusCurtius Robbins Tetrabiblos table of contents
(PD via non-renewal per the ledger) returned HTTP 200 and lists Ptolemy Book I
chapters 11 (solid/bicorporeal signs), 12 (masculine/feminine signs), and 14
(commanding and obeying signs); the sign-powers doctrine they define was
extracted into the sign modules in Phase 5 (`td-722c1d`). Network access was
confirmed available; external lookups were kept targeted to the load-bearing
doctrine-to-source mappings for this gap matrix. Deeper per-source extraction
belongs to Phase 3 (`td-3b52ed`) and Phase 4 (`td-b9588a`).
