# Mundane reading — entry fragment

Applies when `reading_type` is `mundane`. Append this framing to
`prompts/entry/_reading.md`. This fragment adds **framing only**; it never
casts ingress, lunation, eclipse, great-conjunction, or foundation charts,
and it never predicts events.

## Chart-data emphasis

- The **entity or field** the chart describes (nation, city, region, market
  sector, institution, religion, or the collective itself) carried in
  `user_question`; do not generalize the entity beyond what is named.
- The **chart type and moment** the user supplied — Aries or other cardinal
  ingress, lunation, eclipse, Jupiter-Saturn great conjunction, outer-planet
  ingress or station, or a foundation/inception chart — and whether the chart
  is a period chart (ingress/lunation/eclipse/conjunction) or a natal-like
  foundation chart.
- **Location** the chart is set for (capital, affected city, market center),
  and **chart time, timezone, and date reliability**, since the Ascendant,
  MC/IC, houses, and angularity all depend on them.
- The **Ascendant** (the collective entity) and the **chart ruler** (the
  entity's significator for the period): sign, house, condition, and aspects.
- **Angular planets** (1st, 4th, 7th, 10th) and the **mundane houses**
  relevant to the topic (10th government, 2nd treasury, 4th land, 7th foreign
  relations, 9th religion/law, 11th legislature, 12th hidden matters, 6th
  public health).
- `chart_data.timing_factors[]` entries where `technique` is `transit` or
  `annual_profection` that activate the period chart, and any supplied
  outer-planet positions, ingresses, stations, or major aspects.

## Framing for the reading

- State the entity, the chart type, and the location explicitly before judging;
  if any of the three is missing, name the limit and fall back to
  location-stable testimony rather than inventing it.
- Keep the entity's stated scope; do not generalize a city reading to a nation
  or a market-sector reading to a political outcome.
- Separate a foundation/inception chart (the entity's enduring temperament)
  from a period chart (a season of emphasis); anchor period-chart claims in
  the foundation chart when one exists.
- Treat every mundane chart as symbolic weather — emphasis, pressure,
  exposure, reorientation of collective attention — **never** as foreknowledge
  of events. Do not predict elections, leadership changes, conflict, market
  moves, currency, disasters, or public-health outcomes, and do not present
  eclipses, great conjunctions, or outer-planet contacts as omens.
- Carry `user_question` as the top-weighted topic filter on the mundane houses.
- Load `references/reading_types/mundane.md`; load
  `references/synthesis_patterns/mundane_governance.md`,
  `mundane_markets.md`, or `mundane_conflict.md` after it when the topic
  matches, and keep all high-stakes framing within
  `references/foundations/ethics_and_scope.md`. Selection is owned by
  `SKILL.md`; this fragment only names it.
