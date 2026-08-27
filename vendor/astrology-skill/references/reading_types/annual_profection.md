# Annual Profection Readings

Annual profection readings identify the natal house activated for a given age
year and interpret that activation through the Lord of the Year, the natal
chart, and current timing factors. They describe a birthday-to-birthday annual
emphasis: which topics become more visible, demanding, supportive, or
developmental during the profection year. They do not replace the natal chart.
The natal chart describes enduring capacity, condition, and topic structure;
annual profections show which natal topics are activated for the year.

## Data source

The profected house, profected sign, Lord of the Year, and the Lord's natal
condition are **computed by the bundled tool**, not derived by the skill:

    python3 tools/birth_to_chart.py --reading-type annual_profection \
        --date <birth> --time <birth> --lat/--lon/--tz <birth> \
        --target-date <profection-year-start>

They arrive in `chart_data.timing_factors` as `active_house`, `profected_sign`,
`time_lord`, and `lord_of_the_year_natal` (whole-sign, counted from the natal
Ascendant; the Lord is the classical domicile ruler). This preserves
`SKILL.md`'s rule that the skill "does not calculate profections" — the
derivation lives in the calculation tool (stage 1), and the skill interprets
its output. If the timing data arrives from an external tool instead, consume
the same fields; external-tool charts conform to the same schema
(`docs/end_to_end.md`). When the chart is untimed, only the age-based house
number is available; do not invent a profected sign or Lord.

## Baseline factors

- Exact age at the relevant birthday, including whether the birthday has
  already occurred for the year being read.
- Profected house by age, counted from the natal Ascendant or 1st house when
  the birth time and house structure are reliable.
- Topics of the profected house, including planets placed there and any
  repeated natal testimony tied to that house.
- Lord of the Year: the traditional ruler of the profected sign or house, its
  natal house, sign, dignity or debility when used, sect relevance, aspects,
  angularity, reception, and overall condition.
- Natal condition of the Lord of the Year before considering annual triggers.
- Transits to the Lord of the Year, especially conjunctions, hard aspects,
  stations, retrograde passages, lunations, eclipses, and Jupiter or Saturn
  contacts when exact data is supplied.
- Transits through the profected house and transits by the Lord of the Year.
- Solar return or other annual timing factors only as supporting testimony, not
  as replacements for the profection structure.
- Repetition across the profected house, Lord of the Year, natal topic ruler,
  transits, and the user's stated question.

## Profected house and activated topics

- The profected house names the year's primary topical field. Interpret its
  topics as activated, not automatically improved or harmed.
- Treat the profected house as the reading's headline before describing any
  transits. The year is first about the natal topics of that house; timing
  triggers describe how and when those topics are stirred.
- Begin with the house topics themselves, then refine by planets in that natal
  house, the condition of those planets, and their relationship to the user's
  question.
- Houses with strong natal support may describe growth, visibility, progress,
  or integration when activated. Houses with more difficult natal testimony may
  describe repair, responsibility, pressure, boundary work, or a need for
  support.
- If the profected house contains natal planets, those planets become more
  prominent during the year. Read them through their natal condition and their
  relationship to the Lord of the Year.
- If the activated house is angular, the year's topics may become more visible
  or externally consequential. If cadent, the topics may be quieter,
  preparatory, reflective, or logistical unless other timing factors bring them
  forward.
- Do not treat a profected 6th, 8th, or 12th house year as inherently bad.
  Describe practical themes, support needs, and constructive responses without
  fatalistic language.

## Lord of the Year

- The Lord of the Year is the primary annual ruler. Its natal condition shows
  the quality, resources, constraints, and style through which the activated
  house is expressed.
- After naming the profected house, make the Lord of the Year the next
  priority. Do not let an unrelated dramatic transit, solar return placement,
  or general planet-year keyword outrank the ruler that carries the profected
  house.
- Read the Lord of the Year's natal house as a secondary topic field for the
  year. For example, a 10th-house profection ruled by a planet in the 2nd can
  link career visibility with income, values, or resource management.
- Assess dignity, debility, sect, reception, angularity, combustion,
  retrograde condition, bonification, maltreatment, and close aspects when the
  chosen tradition and supplied data support those factors.
- A well-supported Lord of the Year can describe coherence, assistance, skill,
  opportunity, or clearer access to the year's topics.
- A stressed Lord of the Year can describe effort, delay, strain, conflict,
  repair, or the need for careful choices. It should not be read as guaranteed
  failure.
- If the Lord of the Year is also the natal chart ruler, sect light, or ruler
  of the user's question, increase its interpretive weight.

## Classical time-lord framing

Annual profections belong to the broader classical family of time-lord
("chronocrator") techniques, in which a sequence of ruling planets governs
successive periods and gives each period its planetary character. The profected
house and its Lord of the Year are the profection-specific form of that idea: the
Lord of the Year is the period ruler whose natal condition colors the whole
birthday-to-birthday year.

- Treat the Lord of the Year as the year's ruling planet. Its dignity, sect,
  reception, house, and aspects describe the tone, cooperativeness, and
  constraints of the period, not a verdict on the year's outcome.
- Some traditions further divide the year into sub-periods or month-lords drawn
  from the same sign or from sect order. Use those only when the supplied data
  or the user explicitly names them; do not calculate sub-rulers, bound lords,
  or month-lords from a sign alone.
- When several timing techniques agree — a profected house, its Lord of the
  Year, a concurrent transit, a solar return emphasis, or another supplied
  time-lord — treat the agreement as stronger testimony about the period's
  themes, never as proof of a specific event.
- Keep the framing non-deterministic. A time-lord names which planet's
  significations are foregrounded for the year; it does not ordain what must
  happen. A difficult Lord of the Year describes the work, constraint, or repair
  the period tends to surface, with agency, support, and choice intact.
- If the source supplies a different time-lord scheme (decennials,
  distributions, zodiacal releasing, firdaria, or dasha-style periods) instead of
  profections, name the scheme, use its supplied period ruler, and do not mix
  periods from different systems without labeling the combination.

## Linking profection to natal chart data

- First establish the natal promise for the activated house and the user's
  question. Profection activates natal material; it does not create a topic
  from nothing.
- Synthesize in this order: profected house topics, planets in that house, Lord
  of the Year natal condition, the Lord's natal house topics, aspects involving
  the Lord, and then current transits to or from the Lord.
- Translate the Lord of the Year's natal condition into the annual storyline:
  its sign and house describe where and how the year operates, its dignity or
  debility describes ease, leverage, or friction, its sect condition describes
  whether its significations tend to cooperate with the chart's baseline, and
  its close aspects describe allies, pressures, or competing topics that travel
  with the year.
- When the Lord is natally strong but currently under hard transit, frame the
  year as an activated capacity meeting temporary pressure, testing, or
  responsibility. When the Lord is natally stressed but currently supported,
  frame the year as a chance to work with difficult natal material through
  help, repair, timing, or clearer strategy.
- Connect the Lord's natal house back to the profected house with plain topic
  language. For example, a 7th-house profection ruled by a Lord in the 10th may
  connect partnership themes with public role, career, visibility, or authority.
- Compare the profected house to the natal house relevant to the user's
  question. If they match or strongly connect by ruler, aspect, or repeated
  testimony, the reading can make that topic more central.
- Weigh the natal condition of all activated planets. Supportive natal factors
  may describe capacity and available help; strained natal factors may describe
  growth edges, obligations, or recurring patterns requiring care.
- Use repetition to rank importance. The profected house, Lord of the Year,
  natal topic ruler, and transits all pointing to the same life area outweigh
  an isolated annual factor.
- If solar return data is available, use it to confirm, nuance, or time the
  profection themes. Do not let a dramatic solar return placement override the
  profected house and Lord of the Year without repeated testimony.

## Transits to the Lord of the Year

- Prioritize exact or repeated transits to the Lord of the Year, especially
  from Saturn, Jupiter, Mars, eclipses, stations, and outer planets when those
  are part of the reading tradition.
- Transits to the Lord of the Year often describe when the year's themes become
  more active, pressured, visible, clarified, or supported.
- Read transits to the Lord of the Year as modifiers of the annual ruler, not
  replacements for it. They can heat, cool, delay, assist, intensify, reveal,
  or time the Lord's natal topics, but they should remain anchored to the
  profected house and the Lord's natal condition.
- Benefic or supportive contacts to the Lord may describe help, openings,
  protection, repair, or increased coherence around the annual themes. Hard or
  malefic contacts may describe labor, limits, conflict, urgency, separation,
  inflammation, or consequences, especially when they repeat natal stress.
- A transit that repeats the Lord's natal condition deserves extra weight. For
  example, transiting Saturn contacting a natally Saturn-conditioned Lord may
  emphasize responsibility and consolidation; Jupiter contacting a Lord with
  natal benefic support may emphasize growth, assistance, or opportunity.
- Transiting contacts to the natal Lord of the Year usually matter more than
  unrelated transits that do not touch the profection structure.
- Transits by the Lord of the Year can act as annual triggers, especially when
  the planet changes sign, stations, crosses angles, returns to natal
  condition, or contacts the activated house ruler or topic ruler.
- Inner-planet transits can time short windows, but they should be framed as
  activators of the larger annual pattern rather than standalone guarantees.
- When exact degrees, orbs, or dates are missing, describe broad periods and
  thematic emphasis rather than precise timing.

## Age and birthday timing uncertainty

- If the user's exact age is missing, request or infer only the minimum needed
  from supplied birth date and target date. Do not guess the profected house
  from vague age language.
- If the target date is near the birthday and it is unclear whether the
  birthday has occurred, state that the profection may be shifting between two
  houses and interpret both briefly as a transition zone.
- If the birth date is supplied without birth time, the age-based annual count
  can still be calculated, but Ascendant-based house topics, house rulers, and
  angularity may be unreliable.
- If birth time is missing, approximate, rounded, or uncertain, avoid confident
  claims about the natal Ascendant, profected house by rising sign, house
  rulers, planets in houses, or angularity.
- If only the year of birth or approximate age is known, do not assign a single
  Lord of the Year. Explain that exact birthday timing is required to determine
  the active annual profection.
- If the house system is unspecified, use the chart's supplied houses without
  treating them as method-neutral. Whole-sign houses are common for traditional
  profections, but the reading should name the method rather than silently
  switching systems.

## Avoiding event certainty

- Frame annual profections as activated topics, annual rulers, symbolic timing,
  and developmental emphasis rather than guaranteed events.
- Do not predict pregnancy, death, illness, accidents, legal outcomes,
  investments, job loss, relationship endings, or other high-stakes outcomes as
  profection-derived certainty.
- Prefer language such as "this year activates," "one likely focus is," "this
  can correspond with," "watch for themes around," and "this is better treated
  as an annual emphasis than a fixed outcome."
- When the activated house or Lord of the Year is under pressure, describe
  practical supports, preparation, pacing, boundaries, and choice points. Avoid
  fear-based language or claims that an age year is inherently good or bad.

## Retrieval guidance

- Always retrieve this annual profection module for
  `reading_type: annual_profection`, then retrieve foundations, the requested
  tradition module, and the natal module.
- Retrieve natal data before annual synthesis: Ascendant, house system, birth
  time confidence, profected house, planets in the profected house, Lord of the
  Year, the Lord's natal house, dignity or condition factors, and aspects to
  the Lord.
- For topic questions, retrieve the relevant natal house and ruler first, then
  compare them with the profected house, Lord of the Year, and transits to the
  Lord.
- For timing questions, retrieve transits to the Lord of the Year, transits
  through the profected house, stations, lunations or eclipses contacting the
  Lord, and any repeated triggers to the same natal factor.
- If exact age, birthday timing, birth time, or house data is missing, state
  the confidence limit in the reading plan and prioritize factors that remain
  stable across the uncertainty.
- When exact modules are missing, fall back to broader planet, house, aspect
  type, tradition, ethics, and synthesis resources rather than inventing
  missing profection rules.

## Source notes

- The profection and time-lord framing paraphrases the Hellenistic period-ruler
  concept preserved in practical form by Vettius Valens (*Anthologies*, ancient
  Greek text public domain; modern translations copyrighted — paraphrased, not
  quoted) and the later profection/direction/return practice recorded by William
  Lilly (*Christian Astrology* Book III, 1659, public domain). Ptolemy treats
  the division of times as an activation method in *Tetrabiblos* IV.10. See
  `references/classical_doctrine_notes.md` (time-lords, profections, directions
  section) for the source pass and provenance tags; no period tables or
  translator examples are reproduced here.
