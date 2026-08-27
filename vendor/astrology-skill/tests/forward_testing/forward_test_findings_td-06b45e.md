# Forward Test Findings: td-06b45e (four-context blind re-run, enriched corpus)

Date: 2026-06-19

## Scope and method

This pass implements the follow-up deferred by the Phase 8 validation
(`forward_test_findings_td-2a1b24.md`): a re-run of the
`td-e68ad8`-style implementer-agnostic **blind forward test** against the
*post-Phase-7 enriched* corpus, to catch single-walkthrough-blind drift that
the deterministic single-context walkthrough in `td-2a1b24` cannot see.

### Test method (faithful to td-e68ad8)

Six independent, fresh agent contexts were spawned with `pi -p` (print /
non-interactive mode). Each context received **only**:

- a pointer to the skill (auto-discovered from `SKILL.md` in the working
  directory), and
- one raw chart-data prompt (the JSON blocks from
  `structured_reading_prompts.md`), and
- a one-line instruction to follow the skill's workflow and produce a
  reading without clarifying questions.

No evaluation rubric, no expected answers, no `reading_type`/topic hints beyond
what is encoded in the JSON, and no access to prior findings were provided to
any context.

### Blindness controls (sanitized mirror)

To guarantee no expected-answer leakage, the six contexts did **not** run
inside the real repository. A sanitized mirror directory was built containing
**only** `SKILL.md`, `references/`, and `assets/` — explicitly excluding
`tests/`, `AGENTS.md`, `ROADMAP.md`, `quick_validate.py`, and the two prior
findings files. Each context ran with `--no-context-files` (strips
AGENTS.md-equivalent instructions) and `--no-session` (ephemeral, no
persistence). Contexts therefore had no physical path to any expected-answer
artifact.

### Objective capture (unsteered)

Each context ran with `--mode json`, emitting an NDJSON event trace. From each
trace two artifacts were extracted mechanically:

- **Retrieval set:** the de-duplicated set of files each context `read`
  (captured from `tool_execution_start` events) — this is ground-truth
  resource selection, not a self-report that could steer the reading.
- **Reading text:** the concatenation of `text_delta` events — the agent's
  actual delivered reading.

A contamination audit (below) confirms every `read` and every `bash` call
across all six contexts stayed inside the sanitized mirror.

### Prompt-count note

The task referenced "five prompts," but `structured_reading_prompts.md`
currently contains **six** JSON prompts (a `Natal Resources` prompt was added
to the file after `td-2a1b24`). I ran all six — one fresh blind context per
prompt. Running the additional context strengthens coverage rather than
weakening it; the "four-context" name is retained as the inherited method
label.

## Contamination audit (clean)

- Every `read` call across all six contexts resolved to a path under
  `SKILL.md`, `references/`, `assets/`, or `prompts/`. **Zero** reads touched
  the real repo, the test fixtures' prose commentary, or any prior findings
  file.
- All `bash` calls were `ls`/`find`/`cd` explorations **inside** the sanitized
  mirror. No context attempted to escape the working directory.
- The six contexts ran in parallel from a shared mirror cwd. The `transit`
  context listed the shared `runs/` scratch directory (where sibling traces
  were being written) but, per its retrieval log, **read no sibling file**;
  it explicitly noted "`runs/` files are trace logs, not reading outputs" and
  ignored them. No cross-context contamination occurred.
- **Methodology refinement for future blind runs:** run each context from its
  own isolated cwd so sibling scratch files are not even *visible* to a
  listing. Not required for validity here (verified clean), but cleaner.

## Per-prompt results

All six prompts passed on every rubric axis (resource selection, synthesis,
weighting, uncertainty, guardrails). Readings averaged 1,450–2,190 words.
Retrieval sets are closely consistent with the chains `td-2a1b24` predicted
for the enriched corpus, confirming that blind retrieval from the enriched
skill is not drifted relative to the deterministic walkthrough.

### 1. Natal Vocation (blended / practical)

Retrieval: 49 files. Foundations (all three + `aspect_precision` +
`anti_patterns`) → `reading_types/natal` → `traditions/{classical,modern}` →
`traditions/classical/{dignities,sect,bonification_maltreatment}` →
`planets/{mercury,saturn,jupiter,sun,moon,venus,mars}` → exact placements
`planet_in_sign/mercury_gemini` and `planet_in_house/mercury_10th` →
`rulerships/{mercury,saturn,jupiter}` → `planet_condition/{domicile,
angularity, fall, detriment, retrograde}` → aspect pairs
`{mercury_trine_jupiter, mercury_trine_saturn, sun_square_saturn}` →
`synthesis_patterns/{vocation, consulting_advisory_vocation}` → modern
focused `{psychological_framing, archetypal_language}`.

Result: **Passed.** Synthesis correctly stacked the Mercury testimony
(chart ruler + 10th ruler + 10th-house + conjunct MC + domicile) as the single
strongest pattern, then ranked the three user-supplied options as testimony
(teaching/writing and consulting as braided Mercury expressions; operations as
the cadent-6th foundation), with the Sun-Saturn square and Venus-Jupiter
opposition handled as integration tensions. Sect, dignity, and applying/
separating dynamics were weighted per the hierarchy. Strong scope language
(no timing data supplied → no timing claims). No drift.

Minor retrieval note: 49 files is the largest set of the six. All on-target
(no bloat, no contradiction), but a future pass could check whether the
workflow nudges over-loading for high-factor natal charts. Not a defect.

### 2. Transit (blended / beginner-friendly)

Retrieval: 29 files. Foundations → `reading_types/{transit,
transit_examples}` (Saturn-to-Moon trigger match) →
`traditions/{classical,modern}` + `classical/sect` → `planets/{moon,saturn}`
→ `signs/{pisces,virgo}` → `houses/{4,10,8}` → aspect pairs
`{moon_conjunction_saturn, moon_opposition_saturn}` →
`synthesis_patterns/{timing, home}` → `psychological_framing` →
`anti_patterns` → `placements/planet_in_house/saturn_10th`.

Result: **Passed.** The reading treated the Saturn-Moon transit as the
headline, correctly identified the natal Moon-Saturn opposition as a
*reactivated* pattern (Phase 6 enrichment), weighted the slow Saturn transit
above the brief Mars trine, kept the Mars window as an in-season activator
only, and honored the supplied-vs-derived timing boundary (declined to invent
retrograde passes). Sign symbolism for transiting Saturn-in-Pisces was kept
*general* because no dignity was supplied — exactly the Phase 8 guidance.
Guardrails strong (no event prediction, symbolic timing only). No drift.

### 3. Synastry (modern / psychological, creative-collaboration container)

Retrieval: 19 files. Foundations (+ `aspect_precision`) →
`reading_types/{synastry, synastry_examples}` →
`synthesis_patterns/{professional_collaboration, creative_work}` (correctly
fired before any romance-coded pattern) → aspect pairs
`{moon_conjunction_saturn, venus_opposition_mars, mars_conjunction_mercury,
sun_conjunction_moon}` → `psychological_framing`, `archetypal_language` →
`signs/{leo, scorpio, gemini, libra}`.

Result: **Passed, and surfaced a real fixture bug** (see "New findings"
below). The non-romantic container survived the entire retrieval chain; no
5th/7th/8th-house or Venus-Mars contact defaulted to romantic language. The
four inter-chart aspects were weighted by closeness and applying/separating,
translated into collaboration dynamics (accountability, aesthetic charge,
authorship, pace, recognition), and each was paired with a concrete repair
practice. Data limits (no cross-chart overlays, no sect, no dignities) were
named up front.

### 4. Incomplete-Data (blended / practical, no birth time)

Retrieval: 34 files. `birth_time_uncertainty` loaded first (per `SKILL.md`
step 4) → foundations → `reading_types/natal` → `synthesis_patterns/{vocation,
consulting_advisory_vocation, health_routines}` → `planet_condition/{domicile,
retrograde}` → `aspects/{opposition, by_planet_pair/mars_opposition_jupiter}`
→ `mars_virgo` (exact placement) → planet cores, signs, traditions,
`anti_patterns`.

Result: **Passed.** The reading led with an explicit list of *unusable*
evidence (Asc/MC/chart ruler, every house including 10th/2nd/6th, angularity,
sect, angle-based timing) before synthesizing from stable factors (domicile
Jupiter, applying Mars-Jupiter opposition, Mercury-Saturn mutual reception,
doubled Virgo Moon+Mars). The wide Mercury-Saturn contact (9°, no
applying/separating) was correctly demoted to a faint background note.
"Burnout" was framed as a pattern to manage, explicitly not a medical or
mental-health assessment. No drift; the incomplete-birth-time weighting
guidance is honored.

### 5. Annual Profection (blended / practical)

Retrieval: 43 files. `reading_types/{annual_profection, transit}` →
foundations (+ `aspect_precision`, `anti_patterns`) →
`traditions/classical/{dignities, sect, bonification_maltreatment}` →
`planet_condition/{exaltation, domicile, sect}` → planet cores →
`houses/{5,9,2,10,7}` → `signs/{cancer, pisces, scorpio}` →
`rulerships/{jupiter, sun, mars, venus}` → `synthesis_patterns/{resources,
vocation, consulting_advisory_vocation}` → `aspects/{trine, opposition,
square, conjunction, by_planet_pair/venus_opposition_saturn}` →
`psychological_framing`.

Result: **Passed, and surfaced the most material fixture bugs** (see "New
findings"). The reading anchored the year in the supplied 5th-house / Jupiter
Lord-of-the-Year frame, weighted Jupiter's exaltation + 9th-house placement +
dual rulership of 5th and 2nd as the resource link, read the two supplied
transits (Saturn-Venus square, Jupiter return) as in-year windows on the Lord
of the Year, and honored the supplied-vs-derived timing boundary. Night-sect
weighting and out-of-sect Jupiter cautions were applied. No event prediction.

### 6. Natal Resources (blended / practical, no birth time)

Retrieval: 31 files. `birth_time_uncertainty` + `aspect_precision` first →
foundations → `reading_types/natal` → `synthesis_patterns/resources` →
`traditions/classical/{dignities, bonification_maltreatment}` →
`traditions/modern/{psychological_framing, archetypal_language}` →
`planet_condition/{exaltation, fall, retrograde}` →
`aspects/{opposition, square, by_planet_pair/venus_opposition_mars}` → planet
cores → `signs/{cancer, aries, aquarius, taurus, capricorn, leo}` →
`anti_patterns`.

Result: **Passed.** Phase 7's `resources.md` synthesis pattern composed
cleanly with the domicile/exaltation/fall condition modules. The reading
framed the money story as "strong growth, strained structure" (exalted Jupiter
in Cancer hosted by an exalted Moon in Taurus, against Saturn in fall +
retrograde hosting both Sun and Venus), weighted the applying Jupiter-Saturn
square as the central developmental pressure, and kept every claim
sign-based and explicitly provisional pending a timed chart. No drift.

## New findings the single-walkthrough missed

This is the value of the blind multi-context pass over the deterministic
walkthrough: **three of the six test fixtures are internally inconsistent**,
and the blind contexts caught every inconsistency by working the chart
factors directly rather than trusting the supplied labels. The
`td-2a1b24` single-walkthrough used the supplied aspect/profection labels as
given and therefore did not surface them. Verified programmatically:

1. **Synastry `Venus-Mars` "opposition" is geometrically a conjunction.**
   Person A Venus 14.6° Libra vs Person B Mars 15.1° Libra are 0.5° apart in
   the *same* sign → conjunction (0°), not opposition. The synastry context
   flagged this explicitly, loaded `aspect_precision.md`, and interpreted the
   pairing itself (which holds either way) while noting where the
   conjunction-vs-opposition distinction would change the flavor.

2. **Annual Profection `Mars trine Jupiter` is geometrically an opposition.**
   Mars 14.8° Capricorn vs Jupiter 5.9° Cancer are in opposite signs (180°),
   not trine (120°).

3. **Annual Profection `Venus opposition Saturn` is geometrically a square.**
   Venus 3.5° Gemini vs Saturn 11.2° Pisces are in square signs (90°), not
   opposition (180°).

4. **Annual Profection age→house math does not reconcile.** Standard annual
   profection counting maps age 34 to a 10th- or 11th-house year (convention
   dependent), not the 5th; 5th-house years fall near ages 4/16/28/40. The
   annual-profection context flagged the count, noted that the supplied
   5th-house / Jupiter-as-Lord-of-the-Year frame is *otherwise* internally
   self-consistent (5th = Pisces = Jupiter-ruled; Jupiter also rules the 2nd),
   and proceeded on the supplied anchor while holding the count for the user
   to verify. It also declined to lean on the two mislabeled natal aspects
   (#2, #3) and built the reading on internally consistent layers (dignity,
   placement, rulership, sect, transits) instead.

These are **fixture bugs, not corpus bugs.** They confirm the premise of this
follow-up: a single deterministic walkthrough cannot detect the kind of
chart-factor reconciliation a fresh blind context performs, because the
walkthrough's human author tends to consume the supplied labels as ground
truth. The enriched corpus handled every inconsistency gracefully — loading
`aspect_precision.md`, naming the discrepancy, and continuing from
corroborated layers — which is itself positive evidence that the
`aspect_precision` and "interpret only supplied factors" guardrails survive
retrieval end-to-end.

Recommended follow-up TD (not done here; this task is validation-only):
correct the four fixture inconsistencies in `structured_reading_prompts.md`,
or — if they are intentional stress-tests of the precision guardrail — label
them as such in the file's prose so future walkthroughs do not consume them as
ground truth.

## Cross-cutting findings

- **Retrieval fidelity (blind vs walkthrough).** The blind retrieval sets
  match the chains `td-2a1b24` predicted for the enriched corpus very
  closely (same exact modules surfaced: `mercury_gemini`, `mercury_10th`,
  `mars_virgo`, `mars_opposition_jupiter`, the four prioritized synastry
  pairs, `annual_profection` + `transit` for the profection year). No new
  corpus drift was introduced by the Phase 3–7 enrichment: the modules the
  blind agents actually loaded compose without contradiction and produce
  coherent judgments. This closes the "single-walkthrough-blind drift"
  risk the follow-up was filed against.
- **Workflow adherence.** Five of six contexts loaded `anti_patterns.md` for
  the reading self-check; the sixth (synastry) ran the self-check inline.
  Foundations were loaded first in every context. `birth_time_uncertainty`
  was loaded first (not merely included) in both no-birth-time prompts.
  `aspect_precision` fired whenever the data was approximate or inconsistent.
- **Length discipline.** Blind readings landed between ~1,450 and ~2,190
  words — substantive but not monographic. No context produced a disconnected
  cookbook placement-list; all six synthesized.
- **Tone and guardrails.** A targeted scan for fatalistic, fear-based, or
  medicalizing language (`always will`, `inevitably`, `doomed`, `fated`,
  `destined`, `cursed`, `incurable`, `diagnos*`, `mental-health`, event
  certainty, etc.) returned only two hits, both in negated guardrail context
  in the incomplete-data reading ("not a medical or mental-health
  assessment", "not … diagnostic"). No drift. No context told the user to
  make an employment, financial, medical, legal, or relationship decision
  from astrology alone.
- **Compositional fallbacks worked.** Where an exact module does not exist
  (e.g. the Venus-Jupiter opposition in the natal-vocation chart), contexts
  fell back compositionally to `aspects/{opposition}` + the relevant planet
  modules, exactly as the resource-selection contract prescribes. No
  free-association from general model knowledge when a bundled reference
  existed.

## Modules considered for pruning

None. This is a validation-only pass and made no changes to the corpus; the
pruning criterion ("source richness harms composability or retrieval
clarity") was not triggered. The enriched modules aided composability in
every retrieval chain observed.

## Outcome

The enriched corpus passes the four-context-equivalent blind forward test
across all six prompts on all five rubric axes, with no corpus drift
relative to the `td-2a1b24` walkthrough. The blind pass additionally surfaced
four fixture-level data-integrity bugs in `structured_reading_prompts.md`
that the single-walkthrough could not detect, validating the task's premise
that a fresh-context blind re-run catches single-walkthrough-blind drift.
Those fixture bugs are filed as a recommended follow-up TD; no reference
authoring was performed in this pass.

## Artifacts

Raw NDJSON traces, extracted readings (`<slug>.reading.md`), and extracted
retrieval sets (`<slug>.retrieval.txt`) for all six contexts were captured to a
sanitized mirror outside the repository during this session. They are not
checked into the repo because they contain full model outputs and scratch
exploration; consistent with the `td-e68ad8` and `td-2a1b24` passes, the
per-context retrieval sets and verdicts recorded above are the durable record.
The traces can be regenerated on demand by re-running the method in "Blindness
controls" against the sanitized mirror.
