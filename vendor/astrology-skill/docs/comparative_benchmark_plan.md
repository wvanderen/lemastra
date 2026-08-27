# Comparative reading benchmark plan

**Task:** `td-6b6980`  
**Status:** plan  
**Scope:** Compare AI-generated astrology readings across two dimensions:

- **Skill lift:** the same model reading the same prompt with this skill loaded
  versus without the skill.
- **Model performance:** multiple models/providers under the same benchmark
  conditions.

This plan extends the existing blind forward-test method in
`tests/forward_testing/README.md`. It keeps that method's isolation controls,
but adds explicit experimental conditions, scored rubric artifacts, pairwise
judging, and cross-model reporting.

## Benchmark question

The benchmark should answer:

1. Does loading `astrology-skill` improve reading quality versus general model
   astrology knowledge?
2. Which models use the skill most faithfully?
3. Which models produce the strongest readings when no skill is available?
4. Where does the skill help most: factual discipline, factor weighting,
   uncertainty, guardrails, synthesis, or user usefulness?
5. Does the skill reduce generic/Barnum prose and chart-fact invention?

The benchmark is not trying to prove astrology itself. It measures whether a
reading is **chart-sensitive, technically grounded, useful, calibrated, and
safe** under the skill's own interpretive contract.

## Conditions

Run every prompt under a balanced matrix:

| Condition | Skill loaded? | Corpus visible? | Prompt style | Purpose |
|---|---:|---:|---|---|
| `skill_current` | yes | `SKILL.md`, `references/`, `assets/` | current blind preamble | Main skill condition. |
| `no_skill` | no | none | neutral reading preamble | General model baseline. |
| `skill_no_refs` | yes | `SKILL.md` + `assets/`, no `references/` | current blind preamble | Optional ablation: workflow without corpus. |
| `refs_only` | no skill registration | `references/` visible as ordinary files | neutral retrieval instruction | Optional ablation: corpus without skill routing. |

The first two conditions are required. The ablations are useful if we want to
separate "the skill workflow helps" from "the reference corpus helps."

For `no_skill`, the prompt must not mention that a skill exists or imply that a
reference corpus should be loaded. It should ask for a complete reading from the
supplied chart data, with the same no-clarifying-questions constraint and the
same safety expectations. That avoids giving the baseline a hidden copy of the
skill instructions.

## Model matrix

Start with a small, repeatable model set before broadening:

| Tier | Model cells | Replicates |
|---|---:|---:|
| Smoke | 2 models x 2 conditions x 3 prompts | 1 |
| Main pass | 4-6 models x 2 conditions x 11 prompts | 2 |
| Full pass | 6+ models x 2-4 conditions x 11+ prompts | 3 |

Each model cell should record:

- provider and model id as requested;
- provider-reported resolved model/version when available;
- date/time;
- runner version;
- prompt-set commit SHA;
- skill/corpus commit SHA;
- condition;
- retry count and degraded-run status.

If the runner cannot pin seeds, use repeated runs to estimate variance. Treat a
single run as directional only.

## Prompt set

Use `tests/forward_testing/structured_reading_prompts.md` as the initial prompt
set because it already covers all supported reading types:

- natal;
- transit;
- synastry;
- incomplete-data natal;
- annual profection;
- natal resources;
- solar return;
- horary;
- electional;
- mundane;
- aspect precision stress test.

Add a second benchmark-only prompt layer later:

- **chart-swap pairs:** same user question, different chart;
- **decoy-factor prompts:** include tempting but secondary symbols to test
  weighting;
- **missing-data traps:** omit houses, orbs, applying/separating status, or
  birth time;
- **guardrail traps:** money, health, relationship, electional, mundane, and
  event-certainty requests;
- **near-duplicate prompts:** same chart, lightly paraphrased question, to test
  stability.

Benchmark prompts should remain raw chart-data fixtures, not expected-answer
essays. Expectations belong in separate rubric files.

## Artifacts

Create a future `tests/benchmark/` tree:

```text
tests/benchmark/
+-- README.md
+-- config.example.json
+-- conditions.json
+-- rubrics/
|   +-- natal_vocation.json
|   +-- transit.json
|   +-- ...
+-- runs/
|   +-- .gitkeep
+-- run_comparative_benchmark.py
+-- score_run.py
+-- summarize_results.py
```

Raw model outputs should stay outside the repo by default, like the current
blind forward-test artifacts. Durable checked-in records should be summaries,
rubric definitions, and anonymized aggregate results.

Suggested run artifact layout:

```text
<runs-dir>/
+-- manifest.json
+-- prompt_set/
+-- model_provider_model_condition_prompt_rep/
|   +-- cwd/
|   +-- prompt.txt
|   +-- trace.ndjson
|   +-- reading.md
|   +-- retrieval.txt
|   +-- bash.txt
|   +-- metadata.json
|   +-- scores.json
+-- summary.json
```

## Scoring

Score absolute quality and pairwise preference separately.

### Absolute rubric

Use 0-4 points per axis:

| Axis | Weight | What it measures |
|---|---:|---|
| Chart-fact correctness | 20% | No invented placements, houses, aspects, dignities, timing, or certainty. |
| Resource/workflow grounding | 15% | In skill conditions, loads and uses the expected references without sprawl. In no-skill conditions, avoids unsupported pseudo-citations. |
| Factor weighting | 20% | Leads with the strongest testimony for the question and reading type. |
| Synthesis quality | 15% | Produces an integrated judgment rather than a placement list. |
| Relevance/usefulness | 10% | Answers the user's actual question in practical language. |
| Uncertainty calibration | 10% | Names missing data, mixed testimony, wide or unknown precision, and limits. |
| Guardrails | 10% | Avoids fatalism, diagnosis, event certainty, fear language, and astrology-only advice for high-stakes choices. |

Also track hard-fail flags:

- invented chart factor;
- ignored explicit user constraint;
- unsafe advice;
- diagnosis or event certainty;
- failed to produce a reading;
- contaminated run;
- retrieval outside allowed files;
- no-skill condition accidentally saw skill files.

### Prompt-specific expectations

Each prompt should get a rubric JSON with:

- `must_mention`: high-value factors expected in a good reading;
- `must_not_claim`: unsupported or unsafe claims;
- `weighting_targets`: factors that should be primary, secondary, or background;
- `expected_retrieval`: condition-specific reference files for skill runs;
- `known_traps`: fixture details that often lure models into mistakes;
- `guardrail_checks`: prompt-specific safety risks.

This creates a stable evaluator target without leaking expected answers into
the generation prompt.

### Pairwise judging

For each prompt, compare anonymized readings:

- `skill_current` vs `no_skill` for the same model;
- model A vs model B under `skill_current`;
- model A vs model B under `no_skill`;
- optional ablations against `skill_current`.

Judges answer:

- Which reading is more technically grounded?
- Which reading better weights the chart?
- Which reading is more useful to the user?
- Which reading is safer and better calibrated?
- Overall, which would you prefer to receive?

Use blind labels and randomize order. Aggregate with win rate and, once enough
comparisons exist, a Bradley-Terry or Elo-style ranking.

## Chart-sensitivity tests

Add chart-swap tests once the main bench works.

Method:

1. Generate reading A from chart A and reading B from chart B under the same
   user question.
2. Ask a blind judge which reading better fits chart A.
3. Repeat with chart B.

If judges cannot distinguish the correct chart at above-chance rates, the model
may be producing fluent but weakly chart-sensitive prose. This is especially
important for the no-skill baseline.

## Automation design

The current `run_blind_forward_test.py` should not be replaced immediately. Add
a separate comparative runner first, then share helpers later if duplication
becomes annoying.

Required runner features:

- condition-aware mirror builder;
- model/provider matrix input;
- per-cell isolated cwd;
- neutral versus skill-specific preamble selection;
- trace extraction compatible with current `pi --mode json` artifacts;
- metadata capture;
- retry/degraded-run tracking;
- contamination checks per condition;
- output normalization for scoring.

Scoring can start semi-manual:

1. runner creates artifacts;
2. evaluator fills `scores.json` from rubric;
3. summarizer produces aggregate tables.

Then automate incrementally:

- deterministic checks first: invented chart factors, missing major factors,
  retrieval drift, guardrail phrase scans, length/cost/latency;
- judge-model rubric scoring second;
- human expert review for calibration samples and disputed cases.

## Reporting

Produce these summary tables:

- skill lift by model;
- model ranking under `skill_current`;
- model ranking under `no_skill`;
- per-reading-type scores;
- hard-fail rates;
- invented-factor rates;
- guardrail violation rates;
- retrieval and length drift;
- pairwise win rates;
- variance across replicates;
- cost and latency.

Example headline metrics:

```text
Skill lift = mean(skill_current composite - no_skill composite)
Skill win rate = pairwise wins(skill_current over no_skill) / comparisons
Hallucination reduction = no_skill invented-factor rate - skill_current rate
Guardrail lift = no_skill violation rate - skill_current violation rate
Chart sensitivity = correct chart-swap identification rate
```

## Acceptance criteria

The benchmark is ready for a first real pass when:

- at least 3 prompts run across 2 models and 2 conditions;
- all artifacts land outside the repo by default;
- every run records model, condition, prompt, commit, and timestamp metadata;
- contamination checks distinguish skill and no-skill conditions;
- at least one prompt has a complete rubric JSON;
- `score_run.py` can produce composite scores from `scores.json`;
- `summarize_results.py` reports skill lift and pairwise win-rate placeholders;
- the method is documented enough that a fresh session can reproduce it.

The benchmark is ready for decision-making when:

- all 11 current prompts run across the main model set;
- at least 2 replicates per model/condition exist;
- each prompt has a prompt-specific rubric;
- at least one blind pairwise judging pass is complete;
- hard-fail flags are reviewed manually;
- aggregate findings include confidence/variance notes.

## Build phases

### Phase 1: Design the bench contract

- Add `tests/benchmark/README.md`.
- Add `conditions.json`.
- Add `config.example.json`.
- Add one rubric JSON for `natal_vocation`.
- Define metadata and scores schemas informally in the README.

### Phase 2: Comparative runner MVP

- Implement `run_comparative_benchmark.py`.
- Support `skill_current` and `no_skill`.
- Support one or more `--model` values.
- Reuse prompt parsing from `run_blind_forward_test.py`.
- Emit artifacts outside the repo by default.
- Add dry-run and extract-only modes.

### Phase 3: Scoring MVP

- Implement `score_run.py` for manual `scores.json` validation and composite
  calculation.
- Implement deterministic checks for invented chart factors and guardrail
  phrase scans.
- Implement `summarize_results.py` for skill lift tables.

### Phase 4: Full prompt coverage

- Add rubric JSON for all 11 current prompts.
- Run 2 models x 2 conditions x 11 prompts as a benchmark rehearsal.
- Record a findings file with limitations and next fixes.

### Phase 5: Cross-model pass

- Run the main model set with at least 2 replicates.
- Add blind pairwise judging artifacts.
- Publish aggregate findings, not raw generated readings, unless explicitly
  needed for audit.

### Phase 6: Chart-sensitivity extension

- Add chart-swap and decoy-factor prompt pairs.
- Add chart-swap judging.
- Report chart-sensitivity separately from prose quality.

## Risks and controls

| Risk | Control |
|---|---|
| No-skill baseline accidentally sees skill files | Empty or neutral cwd; contamination audit asserts no `SKILL.md`, `references/`, or `assets/` reads. |
| Skill condition gets hidden expected answers | Sanitized mirror excludes tests, findings, roadmap, rubrics, and benchmark summaries. |
| Judge bias toward longer or more polished prose | Normalize display, blind labels, track length, and ask technical questions separately from usefulness. |
| Model variance overwhelms results | Use replicates and report variance before making model decisions. |
| Rubrics overfit to one tradition | Keep prompt-specific expectations tied to supplied chart factors and the skill's declared tradition mode. |
| Automated judge repeats model bias | Use deterministic checks plus human calibration samples; keep pairwise outputs anonymized. |
| Cost grows quickly | Start with smoke/main/full tiers and cache extracted artifacts. |

## First recommended slice

Build the smallest useful slice:

1. `tests/benchmark/README.md`.
2. `conditions.json` with `skill_current` and `no_skill`.
3. One rubric: `natal_vocation.json`.
4. Dry-run-only comparative runner that prints the 2 x 2 x 1 matrix.
5. Manual scoring template.

That slice proves the experiment shape before spending model budget.
