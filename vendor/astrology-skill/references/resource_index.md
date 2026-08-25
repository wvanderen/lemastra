# Resource Index

Use this index to locate bundled interpretation resources and to name new modules consistently. Prefer the most specific implemented module that matches the supplied chart data; when no exact module exists, fall back to a broader implemented module and record the missing exact resource in the reading plan.

## Status key

- Implemented: file or directory exists in this repository.
- Planned: supported by the skill contract or roadmap, but not yet present.

## Maintenance decision

Do not add a generated index helper yet. The repository currently has a
moderate reference set, and this index is intentionally more than a deterministic
file listing: it preserves retrieval guidance, planned categories, examples,
and category-specific naming notes that would need extra metadata to regenerate
without losing context.

Maintain this file manually until the maintenance burden clearly exceeds the
cost of generator upkeep. Reconsider a deterministic, tested generator if the
reference set grows enough that routine additions regularly leave the index
stale, or if future validation work already introduces structured metadata for
resource categories.

Do not add a separate module-name validator yet. Current module names already
match the documented directory and filename patterns, and repository history
does not show recurring rename or naming-fix churn. Keep naming expectations in
this index for now. Reconsider a validator if future additions repeatedly drift
from the expected directories, lowercase names, snake_case multiword names,
ordinal house labels, or planet/aspect/condition patterns documented below.

Manual maintenance rules:

- When adding, moving, or deleting a reference module, update the matching
  implemented list and planned-module section in the same change.
- Keep implemented entries as explicit paths so retrieval remains easy to audit.
- Preserve category guidance, examples, naming patterns, and fallback notes by
  editing them directly rather than replacing the index with a raw file tree.
- Move files from planned to implemented as soon as they exist.
- Use `find references -type f -name '*.md' | sort` or `rg --files references`
  as a quick drift check before review.

## Implemented modules

### Foundations

Foundational references support synthesis, guardrails, and revision passes.

- `references/foundations/interpretive_principles.md`
- `references/foundations/synthesis_rules.md`
- `references/foundations/ethics_and_scope.md`
- `references/source_canon_and_rights_ledger.md` for source-family selection,
  edition rights, acquisition URLs, and doctrine coverage before enriching
  reference modules from historical sources.
- `references/reference_gap_matrix.md` for a prioritized audit of every reference
  category against the source canon, including current depth, missing classical
  and modern doctrine, synthesis-modifier gaps, source candidates, risk,
  priority, the first enrichment wave, and modules that should stay compact.
- `references/classical_doctrine_notes.md` for distilled classical doctrine
  (Ptolemy, Valens, Lilly, with Firmicus and medieval sources as cross-checks)
  keyed to book/chapter and page ranges, with provenance tags separating direct
  source claims from modern synthesis. Read during module authoring in Phases
  5-7, then paraphrase the doctrine into the target module; do not load it
  during a normal reading pass. Phase 5 has applied this doctrine to the seven
  traditional planets, the twelve signs, the twelve houses, and the five aspect
  types. Phase 6 has applied it to the thirteen planet-condition modules
  (essential and minor dignity, sect, angularity, retrograde, and
  combustion/cazimi/under-beams orb precision), the three classical-focused
  tradition modules (deeper sect, reception, and bonification/maltreatment
  vocabulary), the seven rulership modules, and the five prioritized planet-pair
  aspect pairs; each enriched module carries a one-line `## Source notes` pointer
  back to this file and `modern_language_notes.md`. Phase 7 has applied it to the
  annual profection reading type (classical time-lord framing) and the
  resources, home, creative work, health routines, and spirituality synthesis
  patterns (classical and modern paths, mixed-testimony resolution, and
  incomplete-birth-time guidance); each enriched module likewise carries a
  `## Source notes` pointer.
- `references/modern_language_notes.md` for distilled public-domain modern
  language (Alan Leo 1899/1906/1913, with Raphael as a popular-modern witness)
  keyed to edition and chapter, with provenance tags separating historical
  modern doctrine from contemporary synthesis choices. Use it to enrich planet,
  sign, house, aspect, rulership, and synthesis modules with psychological,
  archetypal, developmental, and humane vocabulary; read it during module
  authoring, then paraphrase into the target module. Do not load it during a
  normal reading pass.
- `references/foundations/birth_time_uncertainty.md` for missing, rounded,
  approximate, rectified, or low-confidence birth times.
- `references/foundations/aspect_precision.md` for supplied aspects with
  missing orbs, unclear exactness, unknown applying/separating status, or other
  partial precision.
- `references/foundations/anti_patterns.md` for validation or revision passes
  when a reading sounds generic, list-like, overconfident, or unsupported.

### Traditions

Use these when `tradition_mode` is `classical`, `modern`, or `blended`.

- `references/traditions/classical.md`
- `references/traditions/classical/dignities.md`
- `references/traditions/classical/sect.md`
- `references/traditions/classical/bonification_maltreatment.md`
- `references/traditions/modern.md`
- `references/traditions/modern/psychological_framing.md`
- `references/traditions/modern/outer_planets.md`
- `references/traditions/modern/archetypal_language.md`

### Planets

Planet core modules define baseline function, motivations, topics, and interpretive cautions, plus Ptolemaic elemental nature (hot/cold/moist/dry) and explicit sect membership for the seven traditional planets.

- `references/planets/sun.md`
- `references/planets/moon.md`
- `references/planets/mercury.md`
- `references/planets/venus.md`
- `references/planets/mars.md`
- `references/planets/jupiter.md`
- `references/planets/saturn.md`
- `references/planets/uranus.md`
- `references/planets/neptune.md`
- `references/planets/pluto.md`

### Signs

Sign modules define style, temperament, modality, element, ruler, polarity, and
interpretive cautions, plus a compact Ptolemaic sign-powers layer (sign category,
gender, commanding/obeying pair, seasonal temperament, bodily correspondence)
and optional modern co-ruler notes for Scorpio, Aquarius, and Pisces.

- `references/signs/aries.md`
- `references/signs/taurus.md`
- `references/signs/gemini.md`
- `references/signs/cancer.md`
- `references/signs/leo.md`
- `references/signs/virgo.md`
- `references/signs/libra.md`
- `references/signs/scorpio.md`
- `references/signs/sagittarius.md`
- `references/signs/capricorn.md`
- `references/signs/aquarius.md`
- `references/signs/pisces.md`

### Houses

House modules define topics, angularity, life areas, rulership interaction, and
interpretive scope, plus classical house doctrine (planetary joys, turned-house
use for horary and synastry, and the aspect-to-ascendant place-quality rationale).

- `references/houses/1st.md`
- `references/houses/2nd.md`
- `references/houses/3rd.md`
- `references/houses/4th.md`
- `references/houses/5th.md`
- `references/houses/6th.md`
- `references/houses/7th.md`
- `references/houses/8th.md`
- `references/houses/9th.md`
- `references/houses/10th.md`
- `references/houses/11th.md`
- `references/houses/12th.md`

### Reading types

Use the module matching the requested `reading_type` when it exists.

- `references/reading_types/natal.md`
- `references/reading_types/annual_profection.md` for profected house, Lord of
  the Year, classical time-lord framing, and transits to the Lord of the Year.
- `references/reading_types/horary.md`
- `references/reading_types/solar_return.md`
- `references/reading_types/synastry.md`
- `references/reading_types/synastry_examples.md` for Moon-Saturn, Venus-Mars,
  Sun-Moon, and Mars-Mercury synastry synthesis language.
- `references/reading_types/transit.md`
- `references/reading_types/transit_examples.md` for Saturn-to-Moon,
  Jupiter-to-Sun, Mars-to-Ascendant, and Pluto-to-angle transit synthesis
  language.
- `references/reading_types/mundane.md` for collective, political, market,
  weather, agricultural, or event focus, covering ingress charts (especially
  the Aries ingress), lunations and eclipses, Jupiter-Saturn great
  conjunctions, outer-planet ingresses and transits, the collective entity's
  chart ruler and angular planets, classical and modern synthesis paths, and
  strong event-certainty and fear-based-language guardrails.
- `references/reading_types/mundane_examples.md` for Aries ingress and
  Jupiter-Saturn great conjunction synthesis language, with classical and
  modern paths, mixed-testimony resolution, and grounded uncertainty and scope
  language.

### Synthesis patterns

Use synthesis patterns to combine repeated chart factors around the user's
topic before drafting the final interpretation. The topic patterns
(resources, home, creative work, health routines, spirituality, vocation,
relationships, consulting, and professional collaboration) carry classical and
modern synthesis paths, mixed-testimony resolution, and incomplete-birth-time
guidance; the narrower patterns (strengths, conflict, timing) stay compact.
`timing.md` also separates supplied timing data from derived calculation.
The `mundane_`-prefixed patterns (governance, markets, conflict) are
collective-scoped: load them after `references/reading_types/mundane.md` for
mundane readings on those topics; they carry the same enriched structure with
missing-location guidance replacing incomplete-birth-time guidance.

- `references/synthesis_patterns/conflict.md`
- `references/synthesis_patterns/mundane_governance.md` for collective governance, leadership, the executive, heads of state, legitimacy, and institutions of authority, with classical and modern synthesis paths, mixed-testimony resolution, missing-location guidance, and strong event-certainty and fear-based-language cautions. Load after `references/reading_types/mundane.md`.
- `references/synthesis_patterns/mundane_markets.md` for collective resources, treasuries, revenue, currency, debt, commodities, trade, and markets, with classical and modern synthesis paths, mixed-testimony resolution, missing-location guidance, and strong event-certainty and fear-based-language cautions. Load after `references/reading_types/mundane.md`.
- `references/synthesis_patterns/mundane_conflict.md` for foreign relations, diplomacy, alliances, open adversaries, war, covert hostility, and relations between nations and institutions, with classical and modern synthesis paths, mixed-testimony resolution, missing-location guidance, and strong event-certainty and fear-based-language cautions. Load after `references/reading_types/mundane.md`.
- `references/synthesis_patterns/consulting_advisory_vocation.md`
- `references/synthesis_patterns/creative_work.md`
- `references/synthesis_patterns/health_routines.md`
- `references/synthesis_patterns/home.md`
- `references/synthesis_patterns/professional_collaboration.md`
- `references/synthesis_patterns/relationships.md`
- `references/synthesis_patterns/resources.md`
- `references/synthesis_patterns/spirituality.md`
- `references/synthesis_patterns/strengths.md`
- `references/synthesis_patterns/timing.md`
- `references/synthesis_patterns/vocation.md`

### Aspects

Aspect type modules describe the aspect's general interpretive mechanics, plus a light classical aspect-theory layer (configuring signs, bodily vs sign-based judgment, dexter/sinister, witnessing/testimony).

- `references/aspects/conjunction.md`
- `references/aspects/opposition.md`
- `references/aspects/square.md`
- `references/aspects/trine.md`
- `references/aspects/sextile.md`

Planet pair aspect modules describe exact combinations. The five prioritized
pairs (Sun-Moon, Moon-Saturn, Venus-Mars, Venus-Saturn, Mars-Saturn) carry
classical notes, modern psychological notes, constructive and shadow
expression, and reading-type guidance toward the `mars_square_moon` exemplar
depth; other pairs remain compact starters that compose from the aspect-type
and planet modules.

- `references/aspects/by_planet_pair/sun_conjunction_moon.md`
- `references/aspects/by_planet_pair/sun_square_moon.md`
- `references/aspects/by_planet_pair/sun_opposition_moon.md`
- `references/aspects/by_planet_pair/moon_conjunction_saturn.md`
- `references/aspects/by_planet_pair/moon_square_saturn.md`
- `references/aspects/by_planet_pair/moon_opposition_saturn.md`
- `references/aspects/by_planet_pair/venus_conjunction_mars.md`
- `references/aspects/by_planet_pair/venus_square_mars.md`
- `references/aspects/by_planet_pair/venus_opposition_mars.md`
- `references/aspects/by_planet_pair/mars_conjunction_saturn.md`
- `references/aspects/by_planet_pair/mars_square_saturn.md`
- `references/aspects/by_planet_pair/mars_opposition_saturn.md`
- `references/aspects/by_planet_pair/mercury_conjunction_jupiter.md`
- `references/aspects/by_planet_pair/mercury_trine_jupiter.md`
- `references/aspects/by_planet_pair/mercury_square_jupiter.md`
- `references/aspects/by_planet_pair/mercury_opposition_jupiter.md`
- `references/aspects/by_planet_pair/mercury_trine_saturn.md`
- `references/aspects/by_planet_pair/sun_square_saturn.md`
- `references/aspects/by_planet_pair/venus_conjunction_saturn.md`
- `references/aspects/by_planet_pair/venus_square_saturn.md`
- `references/aspects/by_planet_pair/venus_opposition_saturn.md`
- `references/aspects/by_planet_pair/mars_conjunction_mercury.md`
- `references/aspects/by_planet_pair/mars_conjunction_moon.md`
- `references/aspects/by_planet_pair/mars_square_moon.md`
- `references/aspects/by_planet_pair/mars_opposition_moon.md`
- `references/aspects/by_planet_pair/mars_opposition_jupiter.md`

### Planet Conditions

Use these when a supplied planet condition includes dignity, debility, sect,
visibility, motion, or minor essential dignity. Each module pairs a
non-moralizing interpretive effect with a classical-doctrine layer and, for the
solar conditions, Lilly's orb conventions (combustion within about 8°30′,
cazimi within about 17′, under the beams toward 17°). Pair exact modules with
`references/traditions/classical/dignities.md` for classical or blended readings
that need broader doctrine; never derive an orb or minor dignity from missing
data.

- `references/placements/planet_condition/domicile.md`
- `references/placements/planet_condition/exaltation.md`
- `references/placements/planet_condition/detriment.md`
- `references/placements/planet_condition/fall.md`
- `references/placements/planet_condition/triplicity.md`
- `references/placements/planet_condition/term.md`
- `references/placements/planet_condition/face.md`
- `references/placements/planet_condition/sect.md`
- `references/placements/planet_condition/angularity.md`
- `references/placements/planet_condition/retrograde.md`
- `references/placements/planet_condition/combustion.md`
- `references/placements/planet_condition/cazimi.md`
- `references/placements/planet_condition/under_beams.md`

### Rulerships

Use these when a planet is explicitly supplied as ruler of a house. Each module
distinguishes the ruled-house topics from the ruler's own house placement and
includes a condition-modifiers section (dignity and debility, sect, aspects and
testimony). Retrieve the planet module, then use the section for the ruled
house, and combine it with the ruler's actual sign, house placement, dignity,
sect, reception, and aspects.

- `references/rulerships/sun.md`
- `references/rulerships/moon.md`
- `references/rulerships/mercury.md`
- `references/rulerships/venus.md`
- `references/rulerships/mars.md`
- `references/rulerships/jupiter.md`
- `references/rulerships/saturn.md`

### Templates

Use templates when creating new composable interpretation modules.

- `references/templates/interpretation_module_template.md`
- `references/templates/rulership_module_template.md`

### Planet in sign placements

Use for exact planet-sign combinations.

- `references/placements/planet_in_sign/mercury_gemini.md`
- `references/placements/planet_in_sign/mars_cancer.md`
- `references/placements/planet_in_sign/mars_virgo.md`

### Planet in house placements

Use for exact planet-house combinations.

- `references/placements/planet_in_house/saturn_10th.md`
- `references/placements/planet_in_house/mercury_10th.md`

## Planned modules

These categories are supported by the skill workflow and should be added with the naming conventions below.

### Planets

Planet core modules define baseline function, motivations, topics, and interpretive cautions.

- Directory: `references/planets/`
- Pattern: `references/planets/{planet}.md`
- Example: `references/planets/mars.md`
- Planned names: none

### Signs

Sign modules define style, temperament, modality, element, and expression.

- Directory: `references/signs/`
- Pattern: `references/signs/{sign}.md`
- Example: `references/signs/cancer.md`
- Planned names: none

### Planet in sign placements

Use for exact planet-sign combinations.

- Directory: `references/placements/planet_in_sign/`
- Pattern: `references/placements/planet_in_sign/{planet}_{sign}.md`
- Example: `references/placements/planet_in_sign/mars_cancer.md`
- Naming: lowercase planet, underscore, lowercase sign.

### Planet in house placements

Use for exact planet-house combinations.

- Directory: `references/placements/planet_in_house/`
- Pattern: `references/placements/planet_in_house/{planet}_{house}.md`
- Example: `references/placements/planet_in_house/saturn_10th.md`
- Naming: lowercase planet, underscore, ordinal house number (`1st` through `12th`).

### Rulerships

Use for house ruler and rulership-based synthesis. Rulership modules are
planet-led: retrieve the module for the planet that rules the relevant house,
then read that planet's section for the specific house being ruled. Combine it
with the ruler's actual sign, house placement, dignity, sect, reception, and
aspects from separate modules.

- Directory: `references/rulerships/`
- Pattern: `references/rulerships/{planet}.md`
- Example: `references/rulerships/mars.md`
- Naming: lowercase planet name.
- Template: `references/templates/rulership_module_template.md`
- Do not create `ruler_of_{source_house}_in_{target_house}` files. Those modules
  are too narrow for this skill's compositional model.

### Conditions

Use for dignity, debility, sect, reception, angularity, retrograde condition, combustion, visibility, bonification, maltreatment, and related condition modifiers. Retrieve exact modules when a condition is explicitly supplied; do not derive dignity tables or minor dignities from missing data.

- Directory: `references/placements/planet_condition/`
- Pattern: `references/placements/planet_condition/{condition}.md`
- Examples: `references/placements/planet_condition/fall.md`, `references/placements/planet_condition/sect.md`, `references/placements/planet_condition/retrograde.md`
- Implemented dignity and debility names: `domicile`, `exaltation`, `detriment`, `fall`, `triplicity`, `term`, `face`
- Implemented condition names: `sect`, `angularity`, `retrograde`, `combustion`, `cazimi`, `under_beams`
- Naming: lowercase snake_case condition name.

### Aspects

Aspect type modules describe the aspect's general interpretive mechanics.

- Directory: `references/aspects/`
- Pattern: `references/aspects/{aspect_type}.md`
- Examples: `references/aspects/conjunction.md`, `references/aspects/square.md`
- Planned aspect type names: none

Planet pair aspect modules describe exact combinations.

- Directory: `references/aspects/by_planet_pair/`
- Pattern: `references/aspects/by_planet_pair/{planet1}_{aspect}_{planet2}.md`
- Example: `references/aspects/by_planet_pair/mars_square_moon.md`
- Naming: lowercase planet, aspect type, lowercase planet, separated by underscores. Preserve the order used by the source chart data unless a module already exists in the reverse order.

### Traditions

Tradition modules describe method-specific rules and language.

- Current broad pattern: `references/traditions/{tradition}.md`
- Current examples: `references/traditions/classical.md`, `references/traditions/modern.md`
- Focused pattern: `references/traditions/{tradition}/{topic}.md`
- Implemented focused examples: `references/traditions/classical/dignities.md`, `references/traditions/classical/sect.md`, `references/traditions/classical/bonification_maltreatment.md`
- Implemented focused examples: `references/traditions/modern/psychological_framing.md`, `references/traditions/modern/outer_planets.md`, `references/traditions/modern/archetypal_language.md`
- Naming: lowercase tradition directory, lowercase snake_case topic file.

### Reading types

Reading type modules define retrieval priorities, uncertainty rules, and synthesis emphasis for a request type.

- Directory: `references/reading_types/`
- Pattern: `references/reading_types/{reading_type}.md`
- Implemented: `references/reading_types/natal.md`
- Implemented: `references/reading_types/annual_profection.md`
- Implemented: `references/reading_types/horary.md`
- Implemented: `references/reading_types/solar_return.md`
- Implemented: `references/reading_types/synastry.md`
- Implemented focused examples: `references/reading_types/synastry_examples.md`
- Implemented: `references/reading_types/transit.md`
- Implemented: `references/reading_types/electional.md`
- Implemented: `references/reading_types/mundane.md` for collective,
  political, market, weather, agricultural, or event focus, covering ingress
  charts (especially the Aries ingress), lunations and eclipses,
  Jupiter-Saturn great conjunctions, outer-planet ingresses and transits, the
  collective entity's chart ruler and angular planets, classical and modern
  synthesis paths, and strong event-certainty and fear-based-language
  guardrails.
- Implemented focused examples: `references/reading_types/transit_examples.md`
- Implemented focused examples: `references/reading_types/mundane_examples.md`
  for Aries ingress and Jupiter-Saturn great conjunction synthesis language.
- Planned: none
- Naming: lowercase snake_case reading type.

### Synthesis patterns

Synthesis pattern modules describe how to combine repeated chart factors around a topic or interpretive problem.

- Directory: `references/synthesis_patterns/`
- Pattern: `references/synthesis_patterns/{topic}.md`
- Examples: `references/synthesis_patterns/vocation.md`, `references/synthesis_patterns/consulting_advisory_vocation.md`, `references/synthesis_patterns/professional_collaboration.md`, `references/synthesis_patterns/relationships.md`, `references/synthesis_patterns/resources.md`, `references/synthesis_patterns/mundane_governance.md`, `references/synthesis_patterns/mundane_markets.md`, `references/synthesis_patterns/mundane_conflict.md`
- Naming: lowercase snake_case topic name. Collective or mundane-scoped patterns use a `mundane_` prefix to distinguish them from individual-scope patterns that share a root topic (`mundane_markets.md` vs `resources.md`; `mundane_conflict.md` vs `conflict.md`).

## Naming rules

- Use lowercase filenames.
- Use snake_case for multiword names.
- Use ordinal house labels: `1st`, `2nd`, `3rd`, `4th`, `5th`, `6th`, `7th`, `8th`, `9th`, `10th`, `11th`, `12th`.
- Use exact planet and sign names rather than glyphs or abbreviations.
- Keep one interpretive unit per file so modules remain composable.
- Prefer exact modules over broad modules during retrieval, but do not invent missing chart data to reach an exact module.
