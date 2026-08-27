# Forward Test Findings: td-846f9a (blind re-run, expanded coverage 6→11)

Date: 2026-06-19
Task: `td-846f9a` (Phase C of `docs/e2e_validation_plan.md`)

## Scope and method

This pass executes Phase C in one combined run:

- **C.1** — re-run `run_blind_forward_test.py` against the current (post-Phase-7)
  corpus and confirm `td-06b45e`'s clean verdict still holds across the existing
  6 prompts on all five rubric axes.
- **C.2.1** — resolve the four data-integrity bugs `td-06b45e` flagged, plus
  additional orb inconsistencies a programmatic re-verification surfaced.
- **C.2.2** — extend blind coverage from 4/8 reading types to 8/8 by adding
  `solar_return`, `horary`, `electional`, and `mundane`, plus one explicitly
  labeled `aspect_precision` stress-test fixture.

The blind run covered **11 prompts** (the original 6, three of them
geometry-corrected, plus 5 new), each in its own isolated cwd per the
isolation-by-construction method in `tests/forward_testing/README.md`.

### Test method (unchanged from td-06b45e / td-e68ad8)

Eleven independent, fresh agent contexts were spawned with `pi -p`. Each received
**only**:

- the skill, loaded with `--skill <cwd>` (its own private copy of the sanitized
  mirror), and
- one raw chart-data prompt from `structured_reading_prompts.md`, and
- the one-line instruction in the harness `PREAMBLE`.

No evaluation rubric, no expected answers, no `reading_type`/topic hints beyond
what is encoded in the JSON, and no access to prior findings.

### Blindness controls (sanitized mirror, isolation by construction)

Each context ran from its own private cwd containing **only** `SKILL.md`,
`references/`, and `assets/` — explicitly excluding `tests/`, `AGENTS.md`,
`ROADMAP.md`, `quick_validate.py`, `agents/`, `.git/`, `.todos/`, and every prior
`forward_test_findings_*.md`. Each context ran with `--no-context-files`,
`--no-session`, and `--mode json`. Sibling `<slug>/` directories (holding each
context's own trace and extracted artifacts) sit outside every other context's
cwd, so no `find`/`ls`/`cat` in one context can surface another's scratch files.

### Objective capture (unsteered)

From each trace the harness mechanically derived the **retrieval set**
(de-duplicated `read` paths), the **reading text** (concatenated `text_delta`),
and the **bash audit** (every `bash` command).

## Contamination audit (clean)

- **Retrieval paths:** across all 11 contexts, **0** reads resolved outside
  `SKILL.md`/`references/`/`assets/`. Every path stayed in-mirror.
- **Bash commands:** **0** sibling-slug references and **0** real-repo / home
  references. Every `find`/`ls`/`cd` resolved inside the context's own `cwd/`.
- **Sibling isolation:** vacuously clean by construction — sibling run
  directories are not visible from within any cwd.

Verdict: **clean by construction and by inspection.**

## Fixture-integrity work done before the run (C.2.1)

### The four td-06b45e bugs were already fixed

A programmatic re-verification confirmed commit `3cc171e` (`td-4605f5`, "Fix
fixture geometry") had already corrected all four inconsistencies `td-06b45e`
flagged — the task description was stale:

| Bug (td-06b45e) | td-4605f5 fix | Re-verified |
|---|---|---|
| Synastry "Venus-Mars opposition" is a conjunction (0.5°, same sign) | relabeled `opposition`→`conjunction` | ✓ orb 0.5 |
| Profection "Mars trine Jupiter" is an opposition (Cap–Cancer) | relabeled `trine`→`opposition`, orb 2.0→8.9 separating | ✓ orb 8.9 |
| Profection "Venus opposition Saturn" is a square (Gem–Pisces) | relabeled `opposition`→`square`, orb 2.3→7.7 applying | ✓ orb 7.7 |
| Profection age 34→5th house doesn't reconcile | age 34→28 (genuine 5th-house / Jupiter Lord-of-Year year) | ✓ 28→house 5 |

### Three additional orb inconsistencies td-06b45e did not flag

Recomputing every supplied aspect's orb from the supplied degrees surfaced three
further inconsistencies the blind pass had not caught (the contexts treated them
as sign-level contacts and did not nitpick the orb; the arithmetic was still
wrong). These are the same class of error as the four above — hand-typed orbs
that did not match the degrees — and were fixed surgically this pass:

| Fixture | Aspect | Labeled | Geometric truth | Fix |
|---|---|---|---|---|
| Natal Vocation | Mercury trine Jupiter | orb 1.2 | orb 10.8 (Jupiter Libra 4.9 too far from Mercury's trine point) | Jupiter Libra 4.9→16.9 (trine now orb 1.2, applying) |
| Natal Vocation | Sun square Saturn | orb 0.9 | orb 9.6 (Saturn Aquarius 21.8 too far) | Saturn Aquarius 21.8→13.0 (square now orb 0.8) |
| Natal Vocation | Venus opposition Jupiter | orb 1.4 | **21.4° out of orb** — not a real opposition; irreconcilable with a tight Mercury-Jupiter trine in the same chart | replaced with the geometrically real **Mars square Jupiter** (orb 0.6) |
| Natal Resources | Venus opposition Mars | orb 2.4 | orb 12.4 (Mars Leo 16.6 too far) | Mars Leo 16.6→3.8 (opposition now orb 0.4) |
| Incomplete-Data | Mercury opposition Saturn | orb 9.0 | geometrically a **quincunx** (159°; Capricorn–Gemini are not opposite signs) | relabeled `opposition`→`quincunx`, orb 9.0 now honest |

After these edits, `Natal Vocation`'s Mercury-trine-Saturn orb moved 6.1→2.7
(consistent with the moved Saturn); all other aspects were already correct. A
final programmatic check across all 11 prompts reports **0 aspect mismatches**
(aspect type and orb recomputed from the displayed degrees).

### New explicitly-labeled precision stress-test fixture

Because the four `td-06b45e` mislabels are now corrected, the
`aspect_precision.md` retrieval path is no longer accidentally exercised by the
existing fixtures. Rather than leave mislabeled data in place, this pass adds one
**explicitly labeled** stress test (the "Aspect Precision Stress-Test Prompt"):
a geometrically self-consistent natal chart (ASC Scorpio, day sect) in which two
aspects deliberately carry *partial precision* — one with the orb omitted, one
with applying/separating omitted. The fixture's prose labels it as an intentional
stress test so future walkthroughs do not consume the imprecision as a
data-integrity bug.

### Geometry provenance for the new prompts (C.2.2)

Every new chart's placements, houses, sect, and aspect types/orbs originate from
`tools/birth_to_chart.py` (real Swiss Ephemeris geometry), then were rounded to
one decimal with aspect orbs recomputed from the rounded degrees so the displayed
numbers are exactly self-consistent. Essential-dignity labels, house rulerships,
and interpretive notes were added by hand (doctrine, which the calculator does
not produce). The four new prompts:

- **Solar Return** — a real natal baseline (ASC Virgo, 1990-05-21) and the 2026
  solar return computed at the exact moment the Sun returned to its natal
  position (ASC Gemini, return chart ruler Mercury domicile in the 1st).
- **Horary** — a question-receipt chart (2026-06-15 14:20 CDT, Chicago, ASC
  Libra) carrying the classic **Saturn-in-the-7th radicality caution** and a
  querent/quesited split (Venus vs detrimented Mars).
- **Electional** — two candidate launch charts one week apart (ASC Scorpio early
  1.2° vs ASC Sagittarius 15.5°) with genuinely competing tradeoffs.
- **Mundane** — the **2026 Aries ingress for Washington, DC**, computed at the
  exact equinox moment (Sun 0° Aries); ASC Gemini, chart-ruler Mercury
  retrograde/detriment in the 10th (government), exalted Jupiter in the 2nd
  (treasury), a packed Aries 11th (legislature). Scope-aligned to
  `references/reading_types/mundane.md`.

## Per-prompt results

All **11** prompts passed on every rubric axis (resource selection, synthesis,
weighting, uncertainty, guardrails). Readings averaged **1,541–2,484 words**.
Retrieval counts **25–62 files**.

| # | Prompt | Words | Reads | Verdict |
|---|---|---|---|---|
| 1 | Natal Vocation | 2,263 | 58 | **Pass** |
| 2 | Transit | 1,873 | 25 | **Pass** |
| 3 | Synastry | 2,281 | 34 | **Pass** |
| 4 | Incomplete-Data | 1,824 | 36 | **Pass** |
| 5 | Annual Profection | 1,730 | 36 | **Pass** |
| 6 | Natal Resources | 1,737 | 27 | **Pass** |
| 7 | Solar Return *(new)* | 1,630 | 47 | **Pass** |
| 8 | Horary *(new)* | 1,541 | 40 | **Pass** |
| 9 | Electional *(new)* | 1,845 | 62 | **Pass** |
| 10 | Mundane *(new)* | 2,484 | 46 | **Pass** |
| 11 | Precision Stress-Test *(new)* | 1,937 | 42 | **Pass** |

### Existing 6 (C.1 — clean verdict confirmed)

Retrieval chains match `td-06b45e` closely. None of the six flagged a geometry
mismatch this run — confirming the `td-4605f5` fixes (and this pass's additional
orb corrections) are consumed cleanly as ground truth rather than worked around.
Highlights:

- **Natal Vocation** (58 reads): exact placements `mercury_gemini` +
  `mercury_10th`; the corrected aspect pairs `mercury_trine_jupiter`,
  `mercury_trine_saturn`, `sun_square_saturn`; vocation +
  consulting-advisory-vocation synthesis. Stacked the Mercury testimony (chart
  ruler + 10th ruler + 10th-house + conjunct MC + domicile) as the headline.
- **Transit** (25): `transit` + `transit_examples`; `moon_conjunction_saturn` +
  `moon_opposition_saturn`; treated the Saturn-Moon transit as headline,
  reactivated the natal opposition, weighted slow Saturn above the brief Mars
  trine, honored supplied-vs-derived timing.
- **Synastry** (34): correctly fired `professional_collaboration` +
  `creative_work` before any romance-coded pattern; routed the **corrected**
  `venus_conjunction_mars` (not the old opposition). Non-romantic container
  survived the whole chain.
- **Incomplete-Data** (36): loaded `birth_time_uncertainty` + `aspect_precision`
  first; led with an explicit list of unusable evidence (Asc/MC, all houses,
  sect, angle-based timing) before synthesizing from stable factors.
- **Annual Profection** (age/house corrected): anchored the year in the supplied
  5th-house / Jupiter Lord-of-Year frame with **no** count-mismatch flagging;
  used the corrected Mars-Jupiter opposition and Venus-Saturn square without
  comment. Night-sect weighting and out-of-sect Jupiter cautions applied.
- **Natal Resources** (27): `resources.md` synthesis composed with
  domicile/exaltation/fall conditions; framed the money story as "strong growth,
  strained structure"; used the corrected Venus-Mars opposition (orb 0.4).

### Solar Return *(new)* — Pass

Loaded `reading_types/solar_return.md` first, then the natal baseline factors.
Correctly read the return **in dialogue with the natal chart**: anchored the
year in the return chart ruler Mercury (domicile, angular 1st) against the natal
Mercury-in-Taurus/9th baseline; foregrounded the return Sun-in-1st-ruling-3rd
and Moon-in-3rd-ruling-2nd writing/livelihood thread; weighted exalted Jupiter
in the 2nd (ruling the 10th) as vocational support; demoted the wide Moon-Saturn
trine (6.1°) to background. Named the **late Ascendant (29.8°)** as the
time/location-sensitive part of the return and kept every claim as annual
emphasis, not event prediction.

### Horary *(new)* — Pass

Loaded `reading_types/horary.md`; restated the question; assigned significators
correctly (querent Venus = 1st ruler in 11th; quesited Mars = 7th ruler,
detrimented in 8th; Moon co-ruler, domicile in 10th). Explicitly named the
**Saturn-in-the-7th radicality caution** and treated the judgment as
*provisional*. Identified Venus's sign-reception of Mars, the **absence of an
applying Venus-Mars aspect**, and the Moon's applying square to Saturn. Produced
a measured "yes, *if*" verdict separating "will it come together" (plausible,
goodwill-side strong) from "will it hold" (weaker; partner-side strain). Kept
the reading non-romantic and non-fear-based; demoted wide aspects
(Moon-Saturn 8.9°, Mercury-Jupiter 7.8°) to background.

### Electional *(new)* — Pass

Loaded `reading_types/electional.md`; compared both candidates against the
**same** stated goal (a public, communication-focused launch) with a head-to-head
factor table (chart ruler, Mercury/voice, Sun/10th, Moon/flow, angular benefic,
malefic burden, Ascendant degree). Correctly identified Candidate B's tight
applying **Mercury-sextile-Jupiter (0.3°)** with Jupiter as chart ruler in the
9th/publishing as the cleanest testimony; Candidate A's angular Jupiter-on-MC as
its standout but debilitated chart-ruler Mars + 12th-house Mercury as its
liability. Named A's early Ascendant (1.2°) caution and contrasted the applying
(A) vs separating (B) Mercury-Saturn oppositions. Explicitly declined to time
post-launch momentum (Moon's next aspect/phase not supplied) and promised
nothing about success/growth/income.

### Mundane *(new)* — Pass (highest-risk, highest-scrutiny)

Loaded `reading_types/mundane.md` + `mundane_examples.md` **first**, then the
`mundane_governance` and `mundane_markets` synthesis patterns — exactly the
retrieval chain `mundane.md` prescribes. Correctly named the chart type (Aries
ingress), entity (US / Washington DC), and location; did whole-sign house
arithmetic (noting the MC falls in the 9th whole-sign house and treating the
10th-house *topic* as primary for government). Built a coherent headline —
governance and the legislature are the center of gravity (chart-ruler Mercury
Rx/detriment in the 10th; Mars ruling the 11th placed in the 10th; a packed
Aries 11th stellium) — with exalted Jupiter in the 2nd (treasury) as the
constructive backbone and the applying Sun-Saturn conjunction (Sun exalted,
Saturn in fall) as the central "authority-meets-constraint" tension. **Guardrails
were impeccable**: "symbolic emphasis, not a forecast"; an explicit list of
everything it does not predict (elections, policy, leadership fate, markets,
currency, conflict, disasters); "agency remains with voters, officials,
institutions"; "real-world professional judgment should lead" for material
decisions. No fear-based language; Sun-Saturn framed as "a tension to navigate,
not collapse."

### Aspect Precision Stress-Test *(new)* — Pass (textbook)

Loaded `references/foundations/aspect_precision.md` early (4th read) and built
an **explicit weighting table** that ranks each aspect strictly by the precision
supplied:

| Aspect | Orb | App/Sep | How the reading weighted it |
|---|---|---|---|
| Mars □ Saturn | 3.4° | applying | only fully-specified → strongest usable dynamic; "building pressure" |
| Sun ⚹ Saturn | 5.4° | applying | wide for a sextile → "background qualifier only" |
| Moon □ Venus | 0.2° | **omitted** | tightest orb, but direction unknown → "describe the close tension, do **not** say building/waning" |
| Moon ⚹ Mercury | **omitted** | **omitted** | supplied contact only → "cannot rank tight/wide/exact; lowest weight" |

This is exactly what `aspect_precision.md` prescribes ("interpret only the
precision that was supplied"). The labeled stress-test validates that the
precision guardrail fires end-to-end when precision is partial — closing the
coverage gap left by correcting the four `td-06b45e` mislabels.

## Cross-cutting findings

- **Retrieval fidelity (blind vs prior walkthrough).** The six existing-prompt
  chains match `td-06b45e`'s documented retrieval very closely; the five new
  prompts route correctly to their reading-type modules and (for mundane) to the
  Phase-7 `mundane_governance` / `mundane_markets` synthesis patterns. No corpus
  drift relative to `td-06b45e`.
- **Workflow adherence.** Foundations loaded first in every context.
  `birth_time_uncertainty` loaded first (not merely included) in both
  no-birth-time prompts. `aspect_precision` fired whenever precision was partial
  or approximate (solar return wide trine, horary wide aspects, the stress test).
  `anti_patterns` loaded for the self-check in 11/11.
- **Length discipline.** 1,541–2,484 words — substantive but not monographic;
  every reading synthesized rather than producing a disconnected placement list.
- **Compositional fallback worked.** Where an exact module was missing (e.g.
  `mercury_1st` for the return chart ruler; Jupiter-Mars square pair in natal
  vocation; quincunx as a minor aspect in incomplete-data), contexts fell back
  compositionally to the aspect-type + planet modules exactly as the
  resource-selection contract prescribes. No free-association from general model
  knowledge when a bundled reference existed.
- **Tone and guardrails.** A targeted scan for fatalistic / fear-based /
  medicalizing / event-certain language returned only hits in **negated
  guardrail context** ("not a prediction of what will happen"; "not a medical or
  mental-health assessment"; "not prediction, diagnosis, or direction") plus the
  `mental-health` *referral* in the incomplete-data reading ("well served by a
  qualified health or mental-health professional") and a vocational-symbolism use
  of "diagnosis" (Mars-in-Virgo as analytical/repair/service work, not a medical
  claim). No drift. No context directed the user to make an employment,
  financial, medical, legal, or relationship decision from astrology alone.

## Operational note (transparency)

The first invocation of the `aspect_precision_stress_test` context hit three
`auto_retry_start` events (transient provider errors) and ended in a degraded
state that narrated its retrieval plan without delivering a reading (123 words of
internal narration). The other ten contexts completed cleanly on the first
invocation. The stress-test context was **re-run in isolation** (same mirror,
same prompt, same isolation guarantees) and produced a clean 1,937-word reading
analyzed above. This is a transient-execution artifact, not a corpus or fixture
issue; the re-run is the reading of record.

## Modules considered for pruning

None. This pass added fixtures and a findings file; it made no doctrinal changes
to the corpus. The pruning criterion ("source richness harms composability or
retrieval clarity") was not triggered.

## Outcome

The enriched corpus passes the blind forward test across **all 11 prompts on all
five rubric axes**, confirming `td-06b45e`'s clean verdict still holds (C.1) and
extending blind coverage from 4/8 reading types to **8/8** with the new
solar_return / horary / electional / mundane prompts plus a labeled precision
stress-test (C.2). The pass additionally corrected three orb inconsistencies the
prior blind run did not surface, validating again that a programmatic geometry
re-verification catches arithmetic errors a single walkthrough consumes as ground
truth. No corpus drift was introduced.

## Artifacts

Raw NDJSON traces, extracted readings (`<slug>.reading.md`), retrieval sets
(`<slug>.retrieval.txt`), and bash audits (`<slug>.bash.txt`) for all 11 contexts
were captured to an isolated mirror outside the repository
(`/tmp/astrology_blind_forward/td-846f9a_run/`). They are not checked in (full
model outputs + scratch exploration). Consistent with the `td-e68ad8`,
`td-2a1b24`, and `td-06b45e` passes, the per-context retrieval sets and verdicts
recorded above are the durable record; the run is reproducible via
`./tests/forward_testing/run_blind_forward_test.py`.
