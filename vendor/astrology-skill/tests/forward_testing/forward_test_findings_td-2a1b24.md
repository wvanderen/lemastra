# Forward Test Findings: td-2a1b24 (Phase 8 validation)

Date: 2026-06-19

## Scope and method

This pass validates the skill after the Phase 3-7 deep-research expansion
(classical doctrine notes, modern language notes, gap matrix, and enrichment
waves for planets, signs, houses, aspect types, planet-pair aspects,
conditions, rulerships, classical/modern focused traditions, the annual
profection reading type, and five topic synthesis patterns).

The previous forward test (`forward_test_findings_td-e68ad8.md`, 2026-06-16)
ran four fresh agent contexts against the *pre-expansion* skill and produced
the structured prompts in `structured_reading_prompts.md`. This Phase 8 pass
re-runs those same five prompts against the *enriched* corpus using a
single-context retrieval walkthrough. A second implementer-agnostic,
four-context blind pass was not feasible inside this session and is filed as
follow-up TD `td-<new>` (see "Follow-up TDs" below).

The single-context walkthrough is still useful for drift detection because
retrieval from this skill is deterministic given `SKILL.md`'s workflow and
resource-selection rules. For each prompt the pass:

1. Parsed `reading_type`, `tradition_mode`, `tone`, and explicit chart factors.
2. Walked the `SKILL.md` workflow to enumerate the modules the agent should
   load, in order.
3. Checked that every retrieved module exists, composes with the others
   without contradiction, and does not introduce drift (over-length,
   over-generic, deterministic, poorly sourced, or hard-to-retrieve content).
4. Re-ran `quick_validate.py` (PASS) and a `find`-based drift check between
   `references/resource_index.md` and the files on disk.

## Structural validation

- `python3 quick_validate.py` -> `PASS: SKILL.md metadata is valid`.
- `find references -type f -name '*.md'` matches the implemented-modules list
  in `references/resource_index.md` exactly. The only file on disk not named
  as an implemented module is `resource_index.md` itself, which is the index
  and is intentionally self-referential rather than a content module.
- Module counts match the gap-matrix summary table (foundations 6, traditions
  broad 2, classical focused 3, modern focused 3, planets 10, signs 12,
  houses 12, aspect types 5, planet-pair aspects 26, planet-in-sign 3,
  planet-in-house 2, conditions 13, rulerships 7, reading types 9, synthesis
  patterns 12; 125 doctrine/anchor modules plus templates and meta).

## Source-notes drift found and fixed in this pass

The resource-index contract states that every Phase 5-7 enriched module
carries a one-line `## Source notes` pointer back to
`classical_doctrine_notes.md` and `modern_language_notes.md`. Before this
pass, four enriched-or-adjacent modules broke that contract. Fixed:

- `references/aspects/by_planet_pair/mars_square_moon.md` — the named depth
  exemplar that every other prioritized planet-pair module is patterned on
  was missing its `## Source notes` pointer. Added Ptolemy/Valens attribution
  plus a modern-language pointer, matching the other 15 prioritized pair
  modules.
- `references/traditions/modern/psychological_framing.md`,
  `references/traditions/modern/outer_planets.md`, and
  `references/traditions/modern/archetypal_language.md` — the three
  modern-focused tradition modules lacked source pointers even though the
  gap matrix routes their vocabulary through the public-domain Alan Leo /
  Raphael / Sepharial corpus. Added pointers; for outer planets the note is
  explicit that significations postdate those authors and are paraphrased at
  a high level only.

Doc-drift fix: `references/reference_gap_matrix.md` said "Prioritize Sun-Moon,
Moon-Saturn, Venus-Mars, Venus-Saturn, Mars-Saturn, **Mars-Moon** first" and
"bring the **six** most-frequently-retrieved pairs toward the exemplar", while
`references/resource_index.md` and the actual enrichment cover **five**
prioritized pairs (15 deep modules). The sixth pair, Mars-Moon, is represented
only by the `mars_square_moon` exemplar; its conjunction and opposition are
deliberately compact starters. Reconciled the gap matrix to match the index
and the on-disk reality.

## Prompt-by-prompt walkthrough

### 1. Natal Vocation prompt

Retrieval path: foundations (`interpretive_principles`, `synthesis_rules`,
`ethics_and_scope`) -> `reading_types/natal` -> `traditions/classical` and
`traditions/modern` (blended) -> `traditions/classical/dignities` and
`traditions/classical/sect` (Saturn domicile, Mercury domicile, day sect) ->
`placements/planet_condition/{domicile,fall,detriment}` -> `planets/{mercury,
saturn,jupiter,venus,mars,sun,moon}` -> `signs/{gemini,taurus,capricorn,
aquarius,cancer,libra}` -> `houses/{10,6,9,2,11,8,5}` -> `rulerships/{mercury,
saturn,sun,moon,venus,mars,jupiter}` -> `placements/planet_in_sign/mercury_gemini`
(Mercury domicile in Gemini, exact match) -> `placements/planet_in_house/
mercury_10th` (exact match for the conjunct-MC testimony) ->
`aspects/by_planet_pair/{mercury_trine_jupiter,mercury_trine_saturn,
sun_square_saturn,venus_opposition_jupiter is not implemented; closest is
aspects/opposition + planets/venus + planets/jupiter}` ->
`synthesis_patterns/vocation` and `synthesis_patterns/consulting_advisory_vocation`
(operations vs. teaching/writing vs. consulting) -> optional
`synthesis_patterns/resources` (Taurus Sun, 2nd-house Jupiter).

Result: Passed. The enriched planet, sign, house, condition, rulership, and
synthesis modules compose without contradiction. The vocation and
consulting-advisory patterns now carry explicit classical and modern paths
plus mixed-testimony resolution, which directly serves the three-way
"operations vs. teaching/writing vs. consulting" choice. Two new exact modules
surfaced by the enriched retrieval chain as already-implemented and well-routed
(`mercury_gemini`, `mercury_10th`); no new gaps.

Drift watch: none. The single Venus-Jupiter opposition falls back cleanly to
`aspects/opposition` + `planets/{venus,jupiter}`, which is the intended
compositional behavior. No bloat or contradiction in the loaded set.

### 2. Transit prompt

Retrieval path: foundations (including `birth_time_uncertainty` for the
recorded birth time and `aspect_precision` for the applying/separating data)
-> `reading_types/transit` -> `reading_types/transit_examples` (Saturn-to-Moon
trigger matches) -> `placements/planet_in_sign` is not applicable (Pisces
Moon, Virgo Saturn; no exact module; fall back to `planets/{moon,saturn}` +
`signs/{pisces,virgo}`) -> `houses/{4,10}` -> `rulerships/{moon,saturn}` ->
`aspects/by_planet_pair/moon_opposition_saturn` (natal aspect, exact match) ->
`synthesis_patterns/timing` -> `synthesis_patterns/home` (4th-house Moon,
Saturn-to-Moon transit to the home/family field).

Result: Passed. Phase 7's enrichment of `home.md` (now 154 lines with
classical/modern paths and incomplete-birth-time guidance) and Phase 6's
deepening of `moon_opposition_saturn` give the transit reading a much richer
anchor than the pre-expansion baseline without introducing determinism or
event prediction. The transit_examples module continues to provide
Saturn-to-Moon language. `timing.md` keeps supplied vs. derived timing data
separate. No drift.

### 3. Synastry prompt (creative-collaboration container)

Retrieval path: foundations -> `reading_types/synastry` ->
`reading_types/synastry_examples` (Moon-Saturn, Venus-Mars, Mars-Mercury,
Sun-Moon all match) -> `aspects/by_planet_pair/{moon_conjunction_saturn,
venus_opposition_mars,mars_conjunction_mercury,sun_conjunction_moon}` ->
`planets/{sun,moon,mercury,venus,mars,saturn}` for both charts ->
`synthesis_patterns/professional_collaboration` (the user explicitly frames
the bond as a creative partnership, not romance) -> optional
`synthesis_patterns/creative_work` and `synthesis_patterns/conflict`.

Result: Passed. The non-romantic routing in `SKILL.md` and
`reading_types/synastry.md` correctly fires before any romance-coded
synthesis. `professional_collaboration.md` (115 lines, Phase 7 enriched with
classical and modern paths) composes cleanly with `creative_work.md` for the
authorship/aesthetic dimension. The four prioritized planet-pair modules are
all in the deep set and provide constructive/shadow expression plus
collaboration-aware reading-type guidance. No drift; the
"collaboration not romance" framing survives the whole retrieval chain.

### 4. Incomplete-Data prompt (no birth time, vocation + burnout)

Retrieval path: foundations, with `birth_time_uncertainty` loaded first per
`SKILL.md` step 4 -> `reading_types/natal` -> `traditions/{classical,modern}`
and `traditions/classical/{dignities,sect}` are loaded but sect is "unknown"
so the modules' "do not infer sect" guardrails apply -> `planets/{sun,moon,
mercury,venus,mars,jupiter,saturn}` -> `signs/{sagittarius,virgo,capricorn,
scorpio,pisces,gemini}` -> `placements/planet_condition/{domicile,fall}` for
the supplied Jupiter domicile and Saturn fall -> no houses, no rulerships,
no planet-in-house modules (correctly excluded) -> `aspects/by_planet_pair/
mars_opposition_jupiter` (exact match) + `aspects/opposition` for the wide
Mercury-Saturn (9° orb, no applying/separating -> also load `aspect_precision`)
-> `synthesis_patterns/vocation` and `synthesis_patterns/consulting_advisory_
vocation` -> `synthesis_patterns/conflict` and `synthesis_patterns/strengths`
for the burnout framing.

Result: Passed. Phase 7 enriched `consulting_advisory_vocation.md` and the
`vocation.md` pattern now carry explicit incomplete-birth-time guidance that
matches this prompt's "say what cannot be judged without houses" instruction.
Phase 6's enrichment of `fall.md` (Saturn in Gemini fall) and `domicile.md`
(Jupiter in Pisces domicile) gives the partial reading concrete condition
language. `mars_opposition_jupiter.md` is one of the deferred compact
starters and composes cleanly with `planets/{mars,jupiter}` and
`aspects/opposition`. No drift; the data-limit-first weighting guidance in
`SKILL.md` and `natal.md` is honored.

### 5. Annual Profection prompt (timing-focused)

Retrieval path: foundations -> `reading_types/annual_profection` (Phase 7
enriched, 241 lines with classical time-lord framing, supplied-vs-derived
distinction, and Lord-of-the-Year weighting) -> `reading_types/transit`
(needed for the supplied Jupiter return and Saturn-to-Venus transits to the
Lord of the Year) -> `traditions/{classical,modern}` and
`traditions/classical/{dignities,sect}` (night sect, Venus domicile, Mars
exaltation, Jupiter exaltation) -> `placements/planet_condition/{domicile,
exaltation,sect,angularity}` -> `planets/{jupiter,saturn,venus,mars,sun,moon,
mercury}` -> `signs/{scorpio,cancer,taurus,gemini,pisces,aries,capricorn}` ->
`houses/{5,9,3,7,8,6}` -> `rulerships/{jupiter,saturn,venus,mars,sun,moon,
mercury}` -> `aspects/{trine,opposition}` -> `synthesis_patterns/timing` and
`synthesis_patterns/resources` (the user names "work and resources").

Result: Passed. The Phase 7 expansion of `annual_profection.md` is the single
biggest enrichment in this prompt's retrieval chain and it composes well:
the time-lord framing, the supplied-vs-derived timing boundary, and the
Lord-of-the-Year natal-condition weighting are all internally consistent and
cite Valens and Lilly in the source-notes pointer. The supplied Jupiter
return transit is correctly read as a transit *to* the Lord of the Year
rather than as a standalone event, which is exactly the framing the enriched
module prescribes. No drift; no bloat; no event certainty.

## Cross-cutting findings

- Length discipline: the longest doctrine modules (`annual_profection` 241,
  `synastry` 239, `transit_examples` 203, `relationships` 189, `transit` 183,
  `solar_return` 177, `electional` 175, `spirituality` 164, `health_routines`
  162, `creative_work` 159, `resources` 157, `synastry_examples` 157,
  `home` 154, `mars_square_moon` 152) are all well-structured with clear
  section anchors. None has crossed into monograph territory or become hard
  to scan. No pruning needed on length grounds.
- Tone discipline: a targeted `rg` pass for deterministic, fear-based, or
  medicalizing language (`always will`, `inevitably cause`, `is doomed`,
  `guaranteed to`, `fated`, `destined to`, `cannot avoid`, `cursed`,
  `incurable`, `barren`, `lunatic`, etc.) returned only two hits, both in
  anti-deterministic guardrail context. No drift.
- Retrieval clarity: every retrieval chain above resolves to existing
  modules or falls back compositionally to broader modules as designed. No
  ambiguity where two enriched modules give contradictory guidance for the
  same chart factor.
- Source provenance: `references/source_canon_and_rights_ledger.md` is
  accurate, includes Vettius Valens explicitly, and carries edition-level
  rights notes for every source family used in Phases 3-7. No enriched
  module quotes a modern copyrighted translation; every source-notes pointer
  paraphrases and cites the older source family.

## Modules considered for pruning

None pruned. The acceptance criterion "modules are pruned where source
richness harms composability or retrieval clarity" was checked against every
enriched category; in each case the source richness aided composability
(exact modules reduce broad-module fallback) or was scoped to
authoring-only artifacts (`classical_doctrine_notes.md` 618 lines,
`modern_language_notes.md` 468 lines, `reference_gap_matrix.md` 452 lines,
`resource_index.md` 435 lines) that are explicitly not loaded during a
reading pass. Pruning any of them would remove retrieval guidance or
provenance rather than improve clarity.

## Deferred to follow-up TDs

These items are real but out of scope for a validation-only pass because
each would introduce new interpretive or bibliographic work that deserves
its own research-and-authoring task.

- `td-<new>` Add `## Source notes` pointers to the three outer-planet core
  modules (`planets/{neptune,pluto,uranus}.md`). Outer-planet significations
  postdate the public-domain modern corpus catalogued in
  `modern_language_notes.md`, so the source note must be honest about the
  gap between adjacent PD vocabulary and contemporary outer-planet
  synthesis. Medium effort; low risk.
- `td-<new>` Add `## Source notes` pointers to the five on-demand placement
  exemplars (`placements/planet_in_sign/{mercury_gemini,mars_cancer,
  mars_virgo}.md`, `placements/planet_in_house/{mercury_10th,saturn_10th}.md`).
  These pre-date the Phase 5-7 enrichment waves and missed the source-notes
  contract. Low effort; low risk.
- `td-<new>` Re-run the four-context blind forward test (matching the
  td-e68ad8 method) against the post-expansion corpus to catch
  single-walkthrough-blind drift this pass cannot see. Validation-only; no
  reference authoring.
