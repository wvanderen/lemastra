# Forward Test Findings: td-e68ad8

Date: 2026-06-16

## Method

Four fresh agent contexts tested the structured prompts in
`tests/forward_testing/structured_reading_prompts.md`. Each tester received the
skill path and one raw chart-data prompt only. No expected answers or evaluation
targets were included in the prompt.

Each result was evaluated for:

- Resource selection: whether the agent used the skill workflow and matched
  resources to the supplied reading type, topic, and chart factors.
- Synthesis: whether the answer combined factors into a coherent judgment
  rather than listing placements.
- Weighting: whether the answer prioritized the user question, reading type,
  angles/rulers when usable, exact aspects, condition, and repeated testimony.
- Uncertainty: whether the answer named missing data, precision limits, and
  confidence boundaries in proportion to their importance.
- Guardrails: whether the answer avoided fatalism, diagnosis, event certainty,
  and astrology-only advice for high-stakes decisions.

## Results

### Natal Vocation

Result: Passed with minor resource gaps.

- Resource selection included natal, vocation, Mercury/Gemini/10th, house,
  condition, aspect, dignity, sect, and modern framing resources.
- Synthesis correctly centered Mercury in Gemini in the 10th conjunct the MC as
  the strongest testimony, with operations as support and consulting as viable
  when structured.
- Weighting followed the chart hierarchy: user question, 10th/MC, Mercury as
  Ascendant and 10th ruler, exact aspects, Saturn/6th and resource testimony.
- Guardrails were adequate: the reading avoided telling the user to quit or
  make financial decisions from astrology alone.
- Gap exposed: choice-based vocation prompts benefit from explicit instruction
  to rank supplied options as testimony, not advice.

### Transit

Result: Passed with a procedural ambiguity.

- Resource selection included transit, transit examples, Moon/Saturn, aspect,
  house, rulership, sect, timing, home, and modern framing resources.
- Synthesis treated Saturn conjunct natal Moon as the main timing factor, then
  used natal Moon-Saturn opposition as the reactivated pattern and Mars as a
  short activator.
- Weighting kept the exact Saturn-Moon transit ahead of the briefer Mars
  trigger.
- Guardrails were strong: no event prediction, no invented pass sequence, and
  clear symbolic timing language.
- Gap exposed: the skill needed clearer guidance on sign symbolism versus
  dignity or condition when a transiting planet's sign is supplied but dignity
  is not.

### Synastry

Result: Passed with a useful context-framing update.

- Resource selection included synastry, synastry examples, aspect resources,
  planet resources, and relevant house context.
- Synthesis focused on the four close inter-chart aspects and translated them
  into collaboration dynamics: accountability, aesthetic charge, critique,
  authorship, pace, and boundaries.
- Weighting respected the user's non-romantic creative-partnership context and
  gave Moon-Saturn, Venus-Mars, Mars-Mercury, and Sun-Moon proportional weight.
- Guardrails were strong: no compatibility score, no claims about hidden
  feelings, and no romantic default.
- Gap exposed: synastry guidance should explicitly preserve non-romantic
  containers and distinguish natal houses from unavailable house overlays.

### Incomplete Data

Result: Passed with a useful partial-reading update.

- Resource selection included natal, birth-time uncertainty, aspect precision,
  vocation, health routines, conflict, dignity, and relevant planet/sign/aspect
  resources.
- Synthesis named the unknown birth time first, then interpreted stable factors:
  Mars opposite domicile Jupiter, Mercury in Capricorn, wide Mercury-Saturn, Sun
  in Sagittarius, and broad Moon-in-Virgo caveats.
- Weighting correctly excluded MC, houses, house rulers, angles, angularity,
  chart ruler, and sect.
- Guardrails were strong: no diagnosis, no concrete career verdict, and clear
  limits around burnout language.
- Gap exposed: natal and birth-time references needed example language for
  vocation questions without houses or angles.

## Updates Made

- `SKILL.md`: added explicit retrieval for birth-time uncertainty, choice-based
  option ranking guidance, incomplete-data weighting guidance, transit
  sign-symbolism versus dignity guidance, and non-romantic synastry context
  guidance.
- `references/reading_types/transit.md`: clarified supplied sign symbolism
  versus unsupplied dignity or timing sequences, and added retrieval guidance
  for transits that reactivate natal aspects involving the same planet pair.
- `references/reading_types/synastry.md`: added non-romantic relationship
  container guidance, house-overlay data limits, and professional/creative
  synastry retrieval guidance.
- `references/reading_types/natal.md`: added vocation-without-birth-time
  guidance.
- `references/foundations/birth_time_uncertainty.md`: added standard language
  for vocation readings without houses or angles.

## Deferred Reference Gaps

The tests also suggested future exact modules, but those were deferred because
they would introduce new interpretive material and deserve separate research:

- `references/aspects/by_planet_pair/mercury_trine_jupiter.md`
- `references/aspects/by_planet_pair/mercury_trine_saturn.md`
- `references/aspects/by_planet_pair/sun_square_saturn.md`
- `references/aspects/by_planet_pair/mars_conjunction_mercury.md`
- `references/aspects/by_planet_pair/mars_opposition_jupiter.md`
- `references/placements/planet_in_sign/mercury_gemini.md`
- `references/placements/planet_in_sign/mars_virgo.md`
- `references/placements/planet_in_house/mercury_10th.md`
- A consulting/advisory vocation synthesis pattern.
- A creative/professional collaboration synastry synthesis pattern.
