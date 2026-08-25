# Trigger Evaluation Suite

This suite checks whether the `SKILL.md` frontmatter description routes the
astrology skill to the right requests:

- **Should trigger:** interpretation of already-calculated astrology factors,
  including casual phrasing, structured chart data, explicit techniques, and
  indirect reading requests.
- **Should not trigger:** adjacent work such as calculating charts from birth
  data, generic spiritual advice, educational astrology definitions, content
  writing, software/schema tasks, and non-astrological chart requests.

The cases live in `trigger_queries.json` with a balanced train/validation
split:

- Train: 12 cases, 6 should-trigger and 6 should-not-trigger.
- Validation: 8 cases, 4 should-trigger and 4 should-not-trigger.

## Pass Criteria

Train is allowed one miss while tuning the description:

- accuracy >= 91%
- false positives <= 1
- false negatives <= 1

Validation is the holdout set and must be clean before changing the
description:

- accuracy = 100%
- false positives = 0
- false negatives = 0

Only revise the `SKILL.md` description when the train split shows a consistent
failure pattern. After any revision, rerun both splits and keep the description
at or below the Codex 1024-character limit enforced by `quick_validate.py`.

## Recording Outcomes

There is no deterministic local API for Codex skill-trigger selection in this
repository, so outcomes are recorded manually from the available host.

1. Print prompts for a split:

   ```bash
   python3 tests/trigger/run_trigger_eval.py --split train --print-prompts
   python3 tests/trigger/run_trigger_eval.py --split validation --print-prompts
   ```

2. Create a results template:

   ```bash
   python3 tests/trigger/run_trigger_eval.py \
     --init-results /tmp/astrology-trigger-results.json
   ```

3. For each case, ask the host whether the astrology skill would trigger on the
   query. Fill `actual_trigger` with `true` or `false` and add optional notes.

4. Score the recorded outcomes:

   ```bash
   python3 tests/trigger/run_trigger_eval.py \
     --results /tmp/astrology-trigger-results.json
   ```

The script exits non-zero when fixture structure is invalid or when scored
results miss the pass criteria.
