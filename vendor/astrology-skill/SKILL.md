---
name: astrology-skill
description: Retrieval-first astrological interpretation for chart data, with an optional raw-birth-data calculator path when repo tooling is available. Use when the user provides placements, houses, aspects, dignities, sect, rulerships, transits, synastry factors, profections, solar returns, horary details, electional constraints, raw birth data to preprocess, or a structured astrology reading request.
license: MIT
---

# Astrology Skill

Use this skill to interpret astrological data. The preferred input is
structured chart JSON. When the user supplies raw birth data and the
host has access to this repository's tooling, first run the separate-process
calculator path in `tools/birth_to_chart.py` (see `docs/end_to_end.md`), then
route the emitted chart JSON back into this skill. If that calculator is not
available in the loaded skill bundle or host environment, ask for calculated
chart data or explain how to generate it from the development checkout.

The interpretive workflow itself does not rectify birth times, invent missing
birth data, derive unprovided house systems, or silently fill in chart factors.
It may consume calculator output, but it must not freehand-calculate or assume
missing placements, houses, aspects, dignities, lots, sect, or timing factors.

## Core Rule

Perform a controlled interpretive retrieval pass before writing the reading. Identify the relevant chart factors, load only the matching references, rank the factors, then synthesize. Do not free-associate astrology from general model knowledge when a relevant bundled reference exists.

## Input Contract

Expect any mix of:

- `reading_type`: `natal`, `transit`, `synastry`, `solar_return`, `annual_profection`, `horary`, `electional`, or `mundane`
- `tradition_mode`: `classical`, `modern`, or `blended`
- `tone`: `practical`, `poetic`, `psychological`, `technical`, or `beginner-friendly`
- `chart_data`: ascendant, MC, sect, house system, placements, houses, aspects, dignities, lots, rulerships, timing factors, and source notes
- Raw birth data (date, time, timezone, latitude/longitude, house system, and
  reading type) only when the separate calculator path is available; preprocess
  it before interpretation rather than interpreting from raw birth data.
- `user_question`: the user's explicit focus

If chart data is incomplete, interpret only the factors that are explicitly provided and state which judgments cannot be made from the source data. Do not invent, assume, derive, or "fill in" missing placements, house systems, houses, aspects, dignities, debilities, lots, birth times, sect, rulership conditions, profections, directions, transits, returns, horary significators, electional constraints, or other timing factors.

When a requested reading depends on missing data:

- Ask for the missing chart data if it is essential to the user's question.
- Offer a narrower reading from the available factors when useful.
- Label any partial interpretation as provisional.
- Preserve uncertainty in the final reading with scope language such as "from the supplied placements," "if this aspect is confirmed," or "house-based topics cannot be assessed without houses."

Use `assets/schemas/chart_input_schema.json` as the preferred structured input shape when a user asks how to provide data.

When the host or user asks to **save, archive, export, or deliver** the reading as a report artefact, produce a standardized report per `assets/schemas/report_schema.json` and render it with `references/templates/report_template.md` (see [Report Output](#report-output) below and `docs/report_format.md`). Quick chat answers need no envelope.

Entry commands — one prompt template per `reading_type`, plus a canonical
generic template — live under `prompts/entry/`. They resolve, validate, and
hand a chart to Workflow step 1 without calculating inside the interpretive
workflow. See `docs/entry_commands.md` for the surface and run
`python3 entry_commands.py --list` to enumerate the current functions. For the
wired path from raw birth data through `tools/birth_to_chart.py` to a reading,
see `docs/end_to_end.md`.

## Workflow

1. Parse the supplied chart data and reading request.
2. Identify the reading type, tradition mode, tone, and explicit user focus.
3. Build an internal reading plan using `assets/schemas/reading_plan_schema.json` before drafting the reading. Include the focus, primary factors, resources to load, weighting notes, missing resources, and synthesis warnings.
4. Select the minimum necessary references:
   - Always load `references/foundations/interpretive_principles.md`.
   - Always load `references/foundations/synthesis_rules.md`.
   - Always load `references/foundations/ethics_and_scope.md`.
   - Load `references/foundations/aspect_precision.md` when aspect data is
     approximate, missing orbs, missing applying/separating status, marked
     exact without degrees, or otherwise unclear in precision.
   - Load `references/foundations/birth_time_uncertainty.md` when birth time
     confidence is unknown, approximate, rounded, rectified, low, or otherwise
     unclear, especially for vocation, relationship, home, transit, or house-
     dependent questions.
   - Load `references/reading_types/{reading_type}.md` when it exists.
   - For mundane readings (collective, political, market, weather,
     agricultural, or event focus), keep event-certainty and high-stakes
     claims within the Output Guardrails and the always-loaded ethics and
     scope foundation; `references/reading_types/mundane.md` governs retrieval
     when it exists.
   - For mundane readings, load `references/reading_types/mundane_examples.md`
     when the supplied chart is an Aries ingress (or another cardinal ingress)
     or a Jupiter-Saturn great conjunction.
   - For mundane readings on governance, markets and resources, or conflict and
     foreign relations, load the matching collective synthesis pattern after
     the mundane module: `references/synthesis_patterns/mundane_governance.md`,
     `references/synthesis_patterns/mundane_markets.md`, or
     `references/synthesis_patterns/mundane_conflict.md`.
   - For transit readings, load `references/reading_types/transit_examples.md`
     when the supplied timing factors include Saturn to the Moon, Jupiter to
     the Sun, Mars to the Ascendant, or Pluto to an angle.
   - Load tradition-specific references when the user requests classical, modern, or blended interpretation.
   - For classical or blended interpretation, prefer focused modules such as `references/traditions/classical/dignities.md`, `references/traditions/classical/sect.md`, and `references/traditions/classical/bonification_maltreatment.md` when they match supplied factors; use `references/traditions/classical.md` as the broad fallback.
   - For modern or blended interpretation, prefer focused modules such as `references/traditions/modern/psychological_framing.md`, `references/traditions/modern/outer_planets.md`, and `references/traditions/modern/archetypal_language.md` when they match supplied factors, tone, or the user's question; use `references/traditions/modern.md` as the broad fallback.
   - Load placement, aspect, rulership, condition, or topic references when they exist and match the chart factors.
   - When dignity or debility is explicitly supplied, load the exact `references/placements/planet_condition/{condition}.md` module for domicile, exaltation, detriment, fall, triplicity, term, or face when available; also load `references/traditions/classical/dignities.md` for classical or blended interpretation that needs the broader doctrine.
   - For professional, creative, advisory, client-based, teaching, writing, consulting, or operations questions, load the focused synthesis pattern that matches the user's stated container before falling back to broad relationship or vocation guidance.
5. Rank the chart factors by relevance and weight.
6. Synthesize across factors instead of listing cookbook meanings.
7. Answer in the requested tone while preserving uncertainty and scope limits.
8. Before sending the answer, run the internal reading self-check. For
   validation or revision passes, load `references/foundations/anti_patterns.md`
   and check for common synthesis drift.
9. If the request is for a saved, archived, exported, or delivered report
   artefact, wrap the reading in the standardized report envelope defined by
   `assets/schemas/report_schema.json` (see [Report Output](#report-output)).
   Otherwise, deliver the prose answer directly.

The reading plan is normally internal. Show it only if the user asks for method, traceability, or a reading outline.

## Resource Selection

Prefer exact, composable modules over broad summaries:

- Planet core: `references/planets/{planet}.md`
- Sign emphasis: `references/signs/{sign}.md`
- Planet in sign: `references/placements/planet_in_sign/{planet}_{sign}.md`
- Planet in house: `references/placements/planet_in_house/{planet}_{house}.md`
- Planet as house ruler: `references/rulerships/{planet}.md`
- Planet condition: `references/placements/planet_condition/{condition}.md`
- Aspect type: `references/aspects/{aspect_type}.md`
- Planet pair aspect: `references/aspects/by_planet_pair/{planet1}_{aspect}_{planet2}.md`
- Topic synthesis: `references/synthesis_patterns/{topic}.md`
- Focused tradition topic: `references/traditions/{tradition}/{topic}.md`

When an exact module does not exist, use the closest available broader module and make the limitation explicit in the reading plan.

## Weighting Hierarchy

Give strongest weight to:

1. The user's explicit question.
2. The reading type.
3. Angles, angular planets, and angular rulers.
4. House rulers relevant to the question.
5. Exact aspects and applying/separating dynamics when supplied.
6. Sect, dignity, debility, reception, and condition.
7. Repeated themes across multiple indicators.
8. Outer planets, asteroids, minor points, and speculative factors only when requested or clearly relevant.

Classical astrology describes condition, function, concrete topics, timing, and external circumstances. Modern astrology describes inner experience, developmental themes, archetypal meaning, and psychological integration. In blended mode, let classical condition shape concrete judgment and modern symbolism shape experiential language.

When several user-supplied options are being compared, rank them only from the
chart factors actually provided. Identify the strongest testimony, secondary
support, and practical cautions; avoid presenting the ranking as a directive to
make employment, financial, medical, legal, or relationship decisions from
astrology alone.

For incomplete-data readings, make the data limit part of the weighting rather
than a footnote. State what cannot be judged before leaning on lower-confidence
or non-house factors, then synthesize from the stable supplied factors only.

For transit readings, do not derive missing timing data, station dates,
retrograde passes, or house/angle contacts. You may describe the symbolism of a
supplied transiting planet's sign and aspect, but only use dignity, debility, or
planetary condition when the source explicitly supplies it or the reading
clearly labels it as general sign symbolism rather than calculated condition.

For synastry readings, preserve the relationship context supplied by the user.
Do not default Venus-Mars, Sun-Moon, 5th-house, 7th-house, or 8th-house
contacts to romantic or sexual language when the user frames the relationship
as friendship, family, creative collaboration, professional partnership, or
another non-romantic bond.

For professional or creative collaboration synastry, retrieve
`references/synthesis_patterns/professional_collaboration.md` after the
synastry module. For vocation questions involving consulting, advising,
teaching, writing, client work, operations strategy, or independent practice,
retrieve `references/synthesis_patterns/consulting_advisory_vocation.md`
alongside the broad vocation pattern.

## Output Guardrails

- Separate observation from interpretation.
- Phrase difficult indications as tendencies, pressures, or themes.
- Mention conflicting indicators as tensions to integrate, not contradictions to erase.
- Avoid fatalistic claims or certainty about events.
- Do not diagnose medical or mental health conditions.
- Do not tell users to make medical, legal, financial, or major relationship decisions solely from astrology.
- Avoid fear-based language in horary, electional, transit, or timing work.
- Name uncertainty when chart data is incomplete or source quality is unclear.

## Reading Self-Check

Run this checklist internally before every generated reading. Do not show the
checklist or private reasoning unless the user asks for method or traceability.

- Resource grounding: Did the reading use the minimum relevant bundled
  references, and did it avoid unsupported claims when an exact resource was
  missing?
- Factor weighting: Does the main message follow the user's question, reading
  type, angles/rulers, exact aspects, condition, and repeated testimony rather
  than a striking but secondary symbol?
- Uncertainty: Are missing data, wide or unconfirmed factors, mixed testimony,
  unknown orbs, missing applying/separating status, and confidence limits named
  in proportion to their importance?
- Scope guardrails: Does the reading avoid fatalism, diagnosis, certainty about
  external events, and astrology-only advice for high-stakes choices?
- Synthesis quality: Does the answer combine factors into a coherent judgment
  with qualifications, instead of giving a disconnected placement list?

## Report Output

A **report** is a saved, archived, exported, or delivered reading artefact —
not every chat answer. Produce a report only when the host or user asks to save,
export, archive, or deliver the reading.

The canonical contract is `assets/schemas/report_schema.json`. It wraps the
reading with provenance and attaches the JSON chart artefact(s) it was built
from:

- **Client** (`client.name` or pseudonymous `client.label`).
- **Type of reading** (`reading_type`, required).
- **Date of reading** (`generated_at`, ISO date-time, required).
- **Tradition mode, tone, user question, practitioner** where relevant.
- **Chart artefact(s)** (`chart_artefacts`, required, at least one): the
  `chart_input` the reading interpreted, plus optional `reading_plan`,
  `secondary_chart`, or `timing` artefacts. Embed the JSON inline (`object`) or
  reference a path (`ref`).
- **The reading itself** (`reading.summary` + `reading.body` Markdown, or
  structured `reading.sections`), with `scope_notes` and `uncertainty_notes`.
- **Self-check** materialized only for archival/audit reports; omit it for
  client-facing deliverables.

Render the envelope to Markdown with
`references/templates/report_template.md` when a human-readable artefact is
wanted. `docs/report_format.md` documents the field map, embed-vs-reference
rules, and a minimal example.

Once an envelope exists, gate it deterministically with
`python3 entry_commands.py --report <report-or-path-or-->` — the output-side
twin of `--route`. It validates the envelope against `report_schema.json` and
holds every embedded `chart_input` artefact to the same gate as `--route`, so
a report cannot silently wrap a chart the input gate would reject.

The report composes with the existing input and plan contracts unchanged — a
chart that passes `entry_commands.py --route` embeds verbatim as a
`chart_input` artefact. The report never calculates, rectifies, or derives a
chart factor.
