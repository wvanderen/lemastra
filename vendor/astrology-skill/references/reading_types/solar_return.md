# Solar Return Readings

Solar return readings interpret the chart cast for the Sun's annual return to
its natal position. They describe the symbolic emphasis of one birthday-to-
birthday year: what becomes more visible, active, pressured, developmental, or
available during the return year. They do not replace the natal chart. The
natal chart describes enduring temperament, capacity, and life patterns; the
solar return describes annual activation and emphasis within that natal
context.

## Data source

The solar-return chart is **computed by the bundled tool**, not derived by the
skill:

    python3 tools/birth_to_chart.py --reading-type solar_return \
        --date <birth> --time <birth> --lat/--lon/--tz <birth> \
        --target-date <return-year> [--return-lat L --return-lon L]

It arrives in `chart_data.solar_return` as `return_moment_utc`, SR
`ascendant`/`midheaven`/`house_cusps`, `chart_ruler`, SR `sect`, SR
`placements`/`aspects`, and `natal_contacts` (SR planets → natal planets and
angles), with a summary in `chart_data.timing_factors`. The return moment is
the UT at which the transiting Sun returns to its natal longitude, cast at the
return location (defaults to the birth location; solar-return houses are
location-sensitive). It requires a known birth time to anchor the natal Sun.
If an externally computed return chart is supplied instead, consume the same
shape per `docs/end_to_end.md`.

## Baseline factors

- Solar return Ascendant, Ascendant ruler, and the condition of the chart ruler.
- Solar return Sun condition: house, sign, dignity or debility when used,
  aspects, angularity, sect relevance when supplied, and its relationship to
  natal Sun themes.
- Angular planets in the solar return chart, especially planets close to the
  Ascendant, Descendant, MC, or IC.
- Planets in the solar return 1st, 4th, 7th, and 10th houses when the return
  location and time are reliable.
- Solar return Moon condition for emotional focus, pacing, bodily needs, and
  changeability during the year.
- Repeated emphasis by house, ruler, planet, modality, element, aspect pattern,
  or angle across the solar return and natal chart.
- Contacts between solar return planets and natal planets, angles, chart ruler,
  luminaries, and topic rulers.
- Natal promise for the user's question: natal house, ruler, planet condition,
  aspects, dignity, sect, and repeated natal testimony.
- Return location, birth location, timezone handling, house system, and whether
  the supplied chart is a natal-location or relocated solar return.

## Annual emphasis, not permanent character

- Read solar return factors as year-specific emphasis, not as a permanent
  rewrite of natal character.
- Never treat the solar return chart as standalone fate. Anchor every major
  solar return claim in natal promise, the user's lived context, repeated
  testimony, or a clearly stated confidence limit.
- The solar return Ascendant describes the tone, posture, visibility, and
  developmental entry point for the return year. It should not replace the
  natal Ascendant as the user's baseline identity pattern.
- The solar return chart ruler describes how the year tends to move, where the
  user's attention is pulled, and what condition shapes agency during the year.
  It does not replace the natal chart ruler as the enduring life-ruler pattern.
- The solar return Sun highlights vitality, visibility, purpose, confidence,
  leadership, creative focus, or life direction for the year. It does not
  redefine the natal Sun.
- Angular planets in the solar return can dominate the year's foreground, but
  they should be interpreted as temporary prominence, activation, or urgency.
- When solar return symbolism conflicts with natal symbolism, preserve the
  natal baseline and describe the return chart as a temporary season of
  development, pressure, practice, opportunity, or attention.

## Synthesis order

1. Start with the natal baseline for the user's question: relevant natal
   houses, rulers, planets, angularity, luminaries, chart ruler, and repeated
   natal testimony.
2. Read the solar return Ascendant and chart ruler next. The return chart
   ruler is the year's operating planet: assess its house, sign, condition,
   angularity, aspects, and contacts to natal planets or angles before moving
   to less central return placements.
3. Read the solar return Sun and Moon as annual vitality and emotional pacing.
   Prioritize their houses, aspects, angularity, dignity or debility when used,
   and contacts to natal luminaries, the natal chart ruler, or the topic ruler.
4. Bring in angular solar return planets, especially those close to the
   Ascendant, Descendant, MC, or IC. Angular planets can dominate the year's
   foreground, but they need natal connection or repeated testimony before
   becoming the main storyline.
5. Rank natal contacts above isolated solar return symbolism. Close contacts
   from return planets or return angles to natal angles, luminaries, chart
   ruler, time lord, or topic ruler are usually more important than a vivid
   return placement with no natal anchor.
6. Synthesize by repetition: the strongest annual theme is the topic repeated
   by natal promise, return chart ruler, Sun or Moon, angular planets, house
   emphasis, and natal contacts.

## Linking return chart to natal chart

- First establish the natal promise for the topic. A solar return can activate,
  spotlight, stress, support, or redirect a natal theme, but it should not be
  read as creating a life topic from nothing.
- Compare the solar return Ascendant and its ruler to the natal houses and
  natal planets they contact. These links show where the year's tone enters the
  permanent chart.
- Read solar return house emphasis through the corresponding natal houses,
  rulers, and natal topic structure. For example, a busy solar return 10th
  house matters more for vocation when natal career factors are also activated.
- Prioritize solar return planets conjunct or closely aspecting natal angles,
  luminaries, chart ruler, or the ruler of the user's question.
- Note when the solar return angles fall on natal planets or natal house axes.
  This can bring natal material into annual focus when birth time and return
  location are reliable.
- Weigh the natal condition of contacted planets. A return contact to a
  well-supported natal factor may describe growth, integration, or visibility;
  contact to a stressed natal factor may describe work, repair, pressure, or
  greater need for support.
- Repetition increases relevance: a solar return angular planet, its natal
  contact, house emphasis, and ruler testimony all pointing to the same topic
  outweigh an isolated placement.

## Location and relocation uncertainty

- If the chart explicitly states a return location, use that location and note
  whether it is the birth location, current residence, travel location, or other
  specified place when known.
- If the user supplies both natal-location and relocated solar return charts,
  compare stable themes first, then treat differences in Ascendant, houses,
  angles, angularity, and house rulers as location-sensitive.
- Relocated solar return houses and angles are interpretive variables, not
  certainties about outcome. Present them as possible shifts in emphasis unless
  the return location is known and the chart data clearly supports them.
- If the return location is unspecified, do not assume relocated or
  natal-location calculation. State that angle, house, chart ruler, and
  angular-planet claims are provisional because solar return houses can change
  by location.
- When location is unspecified, prioritize factors that remain stable across
  locations: solar return planetary sign placements, interplanetary aspects,
  solar return contacts to natal planets by degree, and repeated natal links.
- If the user is asking about relocation effects, retrieve or request both
  versions when available. Distinguish shared annual themes from topics that
  depend on the chosen return location.
- Do not use relocated houses to make firm predictions when the return location
  may be wrong or when the person did not spend the return moment in the
  supplied location.

## Data quality limits

- If the solar return date, time, timezone, or location is missing, avoid firm
  claims about Ascendant, houses, angularity, chart ruler, MC/IC, or planets
  near angles.
- If the natal birth time is missing, approximate, rounded, or uncertain, avoid
  confident claims about solar return contacts to natal angles, natal house
  overlays, natal house rulers, or angle-to-angle links.
- If house system is unspecified, use the chart's supplied houses without
  treating them as method-neutral. Note that quadrant systems can shift house
  emphasis, especially near cusps, high latitudes, and planets close to angles.
- If exact degrees and orbs are missing, use broad annual themes only and avoid
  ranking contacts as central unless the chart data identifies them as close.
- If the solar return chart is calculated for a different location than the user
  expected, name the discrepancy and keep location-sensitive interpretation
  tentative.

## Avoiding event certainty

- Frame solar returns as annual themes, foregrounded life areas, symbolic
  weather, and developmental invitations rather than guaranteed events.
- Do not predict pregnancy, death, illness, accidents, legal outcomes,
  investments, job loss, relationship endings, or other high-stakes outcomes as
  solar-return-derived certainty.
- Prefer language such as "this year may emphasize," "one likely focus is,"
  "this can correlate with," "watch for themes around," and "this is better
  treated as an annual emphasis than a fixed outcome."
- When the return chart looks intense, describe constructive responses,
  preparation, support-seeking, boundaries, and choice points. Avoid fear-based
  language, fatalism, or claims that a return year is inherently good or bad.

## Retrieval guidance

- Always retrieve this solar return module for `reading_type: solar_return`,
  then retrieve foundations, the requested tradition module, and the natal
  module.
- Retrieve natal topic factors before solar return synthesis: natal Ascendant,
  chart ruler, luminaries, relevant houses and house rulers, angular planets,
  and repeated natal testimony tied to the user's question.
- Prioritize solar return chart ruler, Sun, Moon, angular planets, and close
  natal contacts, after establishing the natal baseline and location
  reliability.
- For topic questions, retrieve the relevant natal house and ruler first, then
  the solar return house, ruler, angular contacts, and solar return planets
  contacting the natal topic ruler.
- When exact modules are missing, fall back to broader planet, house, aspect
  type, tradition, ethics, and synthesis resources rather than inventing missing
  solar return rules.
- For location-sensitive solar return questions, first check whether the return
  location is specified and reliable. If not, retrieve non-location-dependent
  contacts first and state the confidence limit in the reading plan.
