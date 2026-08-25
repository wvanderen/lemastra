# Comparative Benchmark

This directory defines the comparative reading benchmark for
`astrology-skill`. It extends the blind forward-test method in
`tests/forward_testing/` from a single skill-loaded run into a condition matrix
that can compare:

- the same model with the skill loaded versus without the skill;
- multiple models/providers under the same prompt and scoring contract;
- optional ablations that separate skill workflow effects from corpus effects.

Raw model outputs should stay outside the repository by default. Checked-in
files define the benchmark contract: conditions, example config, rubric
structure, and scoring templates.

## Initial Slice

Phase 1 covers the smallest useful benchmark contract:

- `conditions.json` defines the required `skill_current` and `no_skill`
  conditions.
- `config.example.json` shows a smoke matrix shape without selecting real
  providers for the user.
- `rubrics/natal_vocation.json` is the first prompt-specific rubric.
- `score_template.json` shows the manual `scores.json` shape each run cell will
  eventually emit.
- `runs/.gitkeep` preserves the local artifact directory while keeping raw runs
  untracked.

## Conditions

The benchmark starts with two required conditions:

- `skill_current`: load the sanitized skill mirror containing `SKILL.md`,
  `references/`, and `assets/`; use the existing blind forward-test preamble.
- `no_skill`: run from a neutral cwd with no skill files visible; use a neutral
  astrology-reading preamble that does not mention a skill or reference corpus.

Optional ablations can be added later:

- `skill_no_refs`: skill workflow without the reference corpus.
- `refs_only`: reference corpus visible as ordinary files without registering
  the skill.

## Artifact Policy

Benchmark runs should default to a timestamped directory under the system temp,
matching the existing blind forward-test hygiene. A run cell should eventually
look like this:

```text
<runs-dir>/
+-- manifest.json
+-- <model>__<condition>__<prompt>__rep<index>/
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

Do not check raw `reading.md`, `trace.ndjson`, or provider artifacts into the
repo by default. If a future findings file quotes outputs, keep excerpts short
and anonymized where possible.

## Required Metadata

Every run cell should record:

- `benchmark_version`;
- `condition`;
- `prompt_slug`;
- `prompt_title`;
- `provider`;
- `model_requested`;
- `model_resolved`, when available;
- `replicate`;
- `generated_at`;
- `repo_commit`;
- `prompt_set_path`;
- `rubric_path`;
- `runner`;
- `runner_version`;
- `status`;
- `retry_count`;
- `degraded_run`;
- `artifact_paths`.

## Score Axes

Absolute scoring uses seven 0-4 axes. The weighted composite is intentionally
separate from pairwise preference:

| Axis | Weight |
|---|---:|
| `chart_fact_correctness` | 0.20 |
| `resource_workflow_grounding` | 0.15 |
| `factor_weighting` | 0.20 |
| `synthesis_quality` | 0.15 |
| `relevance_usefulness` | 0.10 |
| `uncertainty_calibration` | 0.10 |
| `guardrails` | 0.10 |

Hard-fail flags are recorded separately so a polished answer with one severe
violation remains visible:

- `invented_chart_factor`;
- `ignored_user_constraint`;
- `unsafe_advice`;
- `diagnosis_or_event_certainty`;
- `failed_to_produce_reading`;
- `contaminated_run`;
- `retrieval_outside_allowed_files`;
- `no_skill_saw_skill_files`.

## First Dry-Run Target

The first runner should be able to print, without spawning providers:

```text
2 models x 2 conditions x 1 prompt x 1 replicate
```

Use `natal_vocation` as the first prompt because it has a strong expected
weighting structure: Mercury as chart ruler and 10th ruler in Gemini in the
10th, conjunct the MC, supported by Jupiter and Saturn testimony.

Run the smoke matrix without provider calls:

```bash
python3 tests/benchmark/run_comparative_benchmark.py --dry-run
```

Override the example models without editing `config.example.json`:

```bash
python3 tests/benchmark/run_comparative_benchmark.py --dry-run \
  --model provider-a:model-a \
  --model provider-b:model-b
```

Provider-backed execution uses the same matrix without `--dry-run` and writes
artifacts under a timestamped system-temp directory unless `--runs-dir` is set.

## Relationship To Forward Testing

`tests/forward_testing/` remains the skill-loaded blind regression harness.
This directory is for comparative benchmarking. The two should share concepts
where useful, but the first comparative runner can copy small parsing/extraction
helpers rather than refactor the existing harness prematurely.
