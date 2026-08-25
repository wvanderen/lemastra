# Transit Readings

Transit readings compare current or future sky movement with the natal chart to
identify timing windows, pressure points, developmental themes, and symbolic
triggers. They do not replace natal interpretation: the natal chart describes
the underlying promise, capacity, and topic structure; transits describe when
those themes may be activated, intensified, revised, or brought into conscious
focus.

## Data source

Transiting positions and transit→natal contacts are **computed by the bundled
tool**, not derived by the skill:

    python3 tools/birth_to_chart.py --reading-type transit \
        --date <birth> --time <birth> --lat/--lon/--tz <birth> \
        --target-date <date> [--target-time HH:MM --target-tz <zone>]

They arrive in `chart_data.transit_chart` as transiting `placements` (each
placed in its **natal** house) and `natal_contacts` (transit → natal planets
and angles, with `orb_degrees`, `applying`/`separating`, `exact`); one
`chart_data.timing_factors` entry is emitted per contact. The natal chart is
still the base. On an untimed chart, planet-to-planet contacts remain but
angular/house contacts are omitted (not invented). If transit data arrives
from an external tool instead, consume the same shape per `docs/end_to_end.md`.

## Baseline factors

- Natal promise for the topic: house, ruler, planet condition, aspects, sect,
  dignity, and repeated natal testimony relevant to the user's question.
- Transiting outer planets to natal planets, angles, chart ruler, luminaries,
  and topic rulers.
- Lunations, eclipses, and syzygies contacting natal planets, angles, or topic
  houses when supplied.
- Station points and retrograde/direct passages, especially when they occur
  near natal planets, angles, or sensitive degrees.
- Angular contacts: transits to the Ascendant, Descendant, MC, IC, angular
  rulers, or planets moving through angular houses when birth time is reliable.
- Exact aspects and tight applying/separating contacts when orb data is
  supplied.
- Repeated triggers to the same natal planet, house, axis, or ruler across
  multiple timing factors.

## Natal promise before timing

- First establish what the natal chart can reasonably support. A transit can
  awaken, stress, clarify, delay, accelerate, or externalize a natal theme, but
  it should not be read as creating a life topic from nothing.
- Keep the natal configuration and the active transit in separate steps before
  synthesizing them. Describe the natal factor as the enduring pattern,
  capacity, vulnerability, or topic structure; describe the transit as the
  temporary pressure, opportunity, emphasis, or timing trigger moving across
  that natal material.
- Treat the natal house and ruler as the topic container, then read the transit
  as the timing trigger. For example, a transit to the 10th ruler is more about
  career, visibility, authority, or direction when the natal chart already
  links that ruler to those topics.
- Do not let the transiting planet overwrite the natal planet. A Saturn transit
  to the natal Moon, for example, should first read the natal Moon's sign,
  house, condition, aspects, sect relevance, and topics; Saturn then times a
  period of boundary, maturation, responsibility, cooling, delay, or structural
  pressure around those Moon themes.
- Weigh the natal condition of the contacted planet. Transits to well-supported
  natal factors may describe opportunity, integration, or increased capacity;
  transits to stressed or conflicted factors may describe pressure, repair,
  choice points, or the need for support.
- If the active transit contacts a natal configuration involving several
  planets, rulers, houses, or angles, identify which natal factor is being
  contacted directly and which factors are being activated by association.
  Avoid treating every planet in a natal pattern as equally activated unless
  the transit contacts each one or repeated testimony supports the link.
- If the natal data is incomplete, state which timing claims are limited. Do
  not make firm house, angle, or angularity claims when the birth time is
  missing, approximate, rounded, or uncertain.
- When the source supplies a transiting planet's sign but not dignity,
  condition, station history, retrograde passes, or full timing sequence, keep
  those distinctions separate. Use sign symbolism if relevant, but do not imply
  a calculated dignity or multi-pass storyline unless the source provides it.

## Timing priorities

- Start with the user's question and the natal topic, then rank the active
  transit testimony. A transit that exactly contacts the relevant house ruler,
  angle, luminary, chart ruler, or time lord usually outranks a vivid but
  unrelated contact.
- Prioritize transiting Saturn, Uranus, Neptune, and Pluto for longer arcs,
  structural change, maturation, disruption, dissolution, renewal, and
  sustained developmental pressure.
- Use Jupiter and Saturn for medium-term opportunities, limits, commitments,
  consequences, growth cycles, and practical timing when they contact natal
  planets, angles, or topic rulers.
- Use Mars, Venus, Mercury, the Sun, and the Moon as short-term activators,
  especially when they perfect a larger outer-planet configuration, cross an
  angle, trigger an eclipse degree, or make an exact aspect to a natal factor.
- Treat lunations and eclipses as emphasis points or symbolic peaks, not as
  automatic events. They matter most when they closely contact natal planets,
  angles, the chart ruler, luminaries, or the ruler of the question's house.
- Treat station points as high-emphasis degrees. A station near a natal planet,
  angle, chart ruler, luminary, or topic ruler can extend the timing window and
  intensify the symbolism.
- Exact aspects outrank loose contacts. When orb data is supplied, name whether
  a transit is applying, exact, separating, repeated by retrograde motion, or
  part of a longer sequence. Exactness increases timing confidence, but it does
  not guarantee a concrete event.
- Stations can outweigh ordinary exact contacts when the station degree closely
  touches a natal planet, angle, chart ruler, luminary, or topic ruler, because
  the transiting planet lingers and repeats its symbolism. Treat the station as
  an intensifier and time-window extender, not as proof that one specific event
  must occur.
- Angularity raises visibility and concreteness when birth time is reliable.
  Transits to the Ascendant, Descendant, MC, IC, planets in angular houses, or
  angular rulers are more likely to be noticeable in circumstances, body,
  relationships, home, vocation, or public/private life than the same transit
  occurring only by sign or to an unanchored point.
- Repetition increases relevance: the same natal factor activated by an outer
  planet, lunation, station, angular transit, and exact aspect is more important
  than an isolated minor contact.
- Repeated timing testimony can come from multiple hits by retrograde motion,
  an outer-planet transit echoed by Mars or a lunation, a station on the same
  degree, a transit to the ruler of the activated house, or a separate timing
  technique pointing to the same natal topic. When these repeat, state that the
  period is more emphasized; do not state that the outcome is certain.

## Transit window language

- Use windows rather than promises. Name the broad active period, the likely
  peak near exactness or station, and the integration period after separation
  only when the source supplies enough dates, orbs, and motion data.
- If a transit makes multiple passes, treat the first pass as an introduction
  or opening contact, the retrograde pass as review, complication, return, or
  deepening, and the final direct pass as resolution, implementation, or clearer
  expression only when those passes are supplied. Do not invent pass dates.
- For slow planets, the window may include months around exactness, especially
  when the planet stations near the natal degree. For fast planets, the window
  is shorter and works best as an activator of a larger pattern.
- When the user supplies only a date range without exact degrees, describe
  general emphasis during that range and identify what additional data would be
  needed to locate the peak.
- When the user asks whether something will happen, translate the transit into
  conditions, themes, decisions, pressures, openings, and likely periods of
  attention. Avoid converting the timing window into a guarantee.

## Data quality limits

- If no transit date or date range is supplied, avoid timing claims and describe
  the kind of information needed to assess a transit window.
- If birth time is uncertain, avoid confident statements about transits to
  angles, angular houses, house cusps, or Moon degree when the Moon's exact
  position may shift materially.
- If house system is unspecified, use the supplied chart houses but do not
  treat house placement as method-neutral. Prefer planet-to-planet contacts and
  repeated natal testimony when house placement is unstable.
- If exact degrees, orbs, and aspect phases are not supplied, use broad transit
  themes only and avoid ranking loose contacts as if they were exact.

## Avoiding event certainty

- Frame transits as timing windows, symbolic weather, activation patterns, and
  areas of attention rather than guaranteed external events.
- Do not predict pregnancy, death, illness, accidents, legal outcomes,
  investments, job loss, relationship endings, or other high-stakes outcomes as
  transit-derived certainty.
- Prefer language such as "this may coincide with," "this can correlate with,"
  "one possible expression is," "watch for themes around," and "this is better
  treated as a reflective timing window than a fixed outcome."
- When a transit appears intense, describe constructive responses, practical
  preparation, support-seeking, and choice points. Avoid fear-based language,
  fatalism, and claims that a transit is inherently bad, dangerous, cursed, or
  unavoidable.
- If the user asks whether a specific event will happen, answer with conditional
  symbolic framing and practical uncertainty. Name the relevant transit factors,
  then separate what the astrology can suggest from what it cannot know.

## Retrieval guidance

- Always retrieve this transit module for `reading_type: transit`, then retrieve
  foundations, the requested tradition module, the natal module, and natal
  resources for the contacted planets, houses, rulers, and aspects.
- Retrieve `references/reading_types/transit_examples.md` when the supplied
  timing factors include Saturn to the Moon, Jupiter to the Sun, Mars to the
  Ascendant, or Pluto to an angle.
- Retrieve natal topic factors before transit factors: the relevant house,
  house ruler, planets in the house, chart ruler, luminaries, angular planets,
  and exact natal aspects tied to the user's question.
- For transit synthesis, prioritize exact outer-planet contacts, lunations or
  eclipses on natal factors, station points, angular contacts, and repeated
  triggers to the same natal planet, house, axis, or ruler.
- When exact transit modules are missing, fall back to the broader transiting
  planet, natal planet, aspect type, house, tradition, and synthesis resources.
- For a transit to a natal planet that already has a natal aspect with the
  same planet, retrieve both the transit example or aspect resources and the
  natal aspect resources. Weight the direct current transit first, then the
  natal aspect as the pattern being reactivated.
- For short-term date questions, retrieve the larger active transit pattern
  first, then use inner-planet or lunar contacts as activators only when they
  connect to that larger pattern or the user's stated topic.
- For birth-time-sensitive transit questions, first check whether Ascendant, MC,
  house cusps, Moon degree, and angularity are reliable. If not, retrieve
  non-house-dependent contacts first and state the confidence limit in the
  reading plan.
