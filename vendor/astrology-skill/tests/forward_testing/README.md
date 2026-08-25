# Blind Forward Testing — Method

This directory holds the prompts and findings for **blind forward testing** of
the astrology skill, plus a harness that runs each prompt in a fresh, **isolated**
agent context. The method exists to catch drift the skill author cannot see from
their own deterministic walkthrough: a fresh context has no memory of the
intended retrieval chain and must reconstruct it from `SKILL.md`'s workflow
alone.

| File | Role |
|------|------|
| `structured_reading_prompts.md` | The prompt set — raw chart-data JSON, no expected answers. |
| `run_blind_forward_test.py` | Harness. Builds a sanitized mirror, runs each prompt in its own isolated cwd, extracts readings + retrieval sets. |
| `benchmark_summary.py` | Provider-free benchmark summary. Uses the current clean findings table by default, or a future `--runs-dir` artifact set when supplied. |
| `forward_test_findings_td-*.md` | Per-run findings (historical records; one per pass). |

## Why isolation by construction

Earlier blind runs (see `forward_test_findings_td-06b45e.md`, section
"Contamination audit") spawned several `pi -p` contexts in parallel from a
**single shared** sanitized-mirror cwd. A post-hoc audit confirmed no sibling
trace was *read*, but sibling scratch files (NDJSON traces, extracted readings)
were *visible* to `find`/`ls` explorations by other contexts. That forces the
audit to **prove a negative** (no context catted a sibling file) rather than
rely on isolation. It is a needless validity risk: a future context could `cat`
a sibling trace and silently contaminate itself.

The resolution adopted here is **isolation by construction**: each context gets
its own private copy of the sanitized mirror as its working directory, and each
context's scratch artifacts (trace, reading, retrieval set) live **outside**
every other context's cwd. A stray `find`/`ls`/`cat` in one context can never
surface another context's artifacts, because there is no path from one cwd to a
sibling's scratch files.

## How a blind run is structured

For each prompt in the prompt set, the harness produces an isolated layout:

```
<runs-dir>/                         # outside the repository (default: system temp)
├── mirror/                         # the sanitized mirror, built once
│   ├── SKILL.md
│   ├── references/
│   └── assets/
├── <slug>/                         # one per prompt
│   ├── cwd/                        # THIS CONTEXT'S PRIVATE working directory
│   │   ├── SKILL.md                #   = a fresh copy of the mirror
│   │   ├── references/
│   │   └── assets/
│   ├── prompt.txt                  # exact prompt fed to pi (for audit)
│   ├── trace.ndjson                # pi --mode json event stream
│   ├── <slug>.reading.md           # extracted reading (concatenated text_delta)
│   ├── <slug>.retrieval.txt        # extracted retrieval set (de-duplicated reads)
│   └── <slug>.bash.txt             # extracted bash commands (audit aid)
└── <other-slug>/…
```

Every `cwd/` contains **only** the mirror. Sibling `<slug>/` directories sit one
level up, **outside** every other `cwd/`, so they are invisible to `find`/`ls`
run from within any context. That is the isolation guarantee.

## Blindness controls

These controls are enforced by the harness and must be preserved by anyone
running a blind pass by hand.

1. **Sanitized mirror.** Each cwd is copied from a mirror containing **only**
   `SKILL.md`, `references/`, and `assets/`. Explicitly excluded: `tests/`,
   `AGENTS.md`, `ROADMAP.md`, `quick_validate.py`, `agents/`, `.git/`,
   `.todos/`, and all prior `forward_test_findings_*.md`. The harness asserts
   the mirror contains nothing else and fails fast if it does.
2. **No context files.** Each context runs with `--no-context-files` (`-nc`) so
   no `AGENTS.md`/`CLAUDE.md`-equivalent instructions leak into the prompt.
3. **No session persistence.** Each context runs with `--no-session` (ephemeral;
   nothing is saved or resumable).
4. **Explicit skill load.** The skill is loaded with `--skill <cwd>` so it is
   available deterministically regardless of project-trust state (pi's
   project-scoped skill discovery under `.agents/skills/`/`.pi/skills/` is
   trust-gated; `--skill` is trust-independent and additive). The cwd is also
   set to the isolated mirror so `SKILL.md`'s relative reference paths resolve
   correctly.
5. **Runs outside the repo.** The default `<runs-dir>` is a fresh timestamped
   directory under the system temp, so scratch artifacts never land inside the
   repository (matching the founding hygiene).
6. **No expected answers in the prompt.** Each prompt is the raw chart-data JSON
   plus a one-line instruction to follow the skill's workflow and produce a
   reading without clarifying questions. No rubric, no `reading_type`/topic hints
   beyond what is encoded in the JSON, no evaluation targets.

## Objective capture (unsteered)

Each context runs with `--mode json`, emitting an NDJSON event trace. The
harness derives two artifacts mechanically from each trace — these are
ground-truth, not self-report:

- **Retrieval set** (`<slug>.retrieval.txt`): the de-duplicated set of files the
  context `read`, captured from `tool_execution_start` events
  (`toolName == "read"`, `args.path`), in first-seen order.
- **Reading text** (`<slug>.reading.md`): the concatenation of `text_delta`
  events (under `message_update` → `assistantMessageEvent`).
- **Bash audit** (`<slug>.bash.txt`): every `bash` command the context ran
  (`tool_execution_start`, `toolName == "bash"`, `args.command`), to support the
  contamination audit.

## Contamination audit (run after every blind pass)

For each context, confirm the reading is uncontaminated by construction *and* by
inspection:

1. **By construction (the new guarantee):** each `cwd/` contains only
   `SKILL.md`/`references/`/`assets/`, and sibling run directories are outside
   every cwd. Verify with `find <slug>/cwd -type f` — it must list only mirror
   files.
2. **Reads stayed in-mirror:** every path in `<slug>.retrieval.txt` resolves
   under `SKILL.md`, `references/`, or `assets/`. No path should touch the real
   repo, the prompt-set prose commentary, or any prior findings file.
3. **Bash stayed in-mirror:** every command in `<slug>.bash.txt` is an
   `ls`/`find`/`cd`/`cat`-style exploration that resolves inside the cwd. No
   command should escape the working directory or reference a sibling run.
4. **No sibling reads:** with per-context isolation this is now vacuously true
   (siblings are not visible), but it remains worth confirming no `read`/`bash`
   path names another `<slug>/` directory.

Record the audit verdict in the run's findings file, as the prior passes did.

## Running the harness

```bash
# From the repo root. Full run: build mirror, run pi per prompt, extract.
./tests/forward_testing/run_blind_forward_test.py

# Preview the plan (slugs, cwds, pi commands) without spawning pi:
./tests/forward_testing/run_blind_forward_test.py --dry-run

# Re-extract readings/retrieval sets from existing traces (no pi):
./tests/forward_testing/run_blind_forward_test.py --extract-only \
    --runs-dir /path/to/previous/runs

# Pin a model / provider / output location:
./tests/forward_testing/run_blind_forward_test.py --model sonnet:high \
    --runs-dir /tmp/my-run
```

Useful flags: `--repo`, `--prompts`, `--mirror` (reuse a pre-built mirror),
`--pi`/`$PI_BIN`, `--provider`, `--extra-arg` (repeatable; pass-through to pi),
`--dry-run`, `--extract-only`. The script probes `pi --version` before copying
and fails fast if pi is not callable.

Per-context contexts run **sequentially** by default. To run them in parallel,
launch the harness once per prompt into separate `--runs-dir`s (the isolation
model is unchanged — each context still gets its own cwd). Parallelism is a
future convenience and does not affect validity.

## Evaluation rubric

Evaluate each extracted reading on the five axes used by the prior passes (see
`forward_test_findings_td-e68ad8.md`): **resource selection**, **synthesis**,
**weighting**, **uncertainty**, and **guardrails** (no fatalism, diagnosis,
event certainty, or astrology-only advice for high-stakes decisions). Cross-check
each blind retrieval set against the deterministic walkthrough's predicted chain
(`forward_test_findings_td-2a1b24.md`) to detect single-walkthrough-blind drift.

## Retrieval/output benchmark

The clean `td-846f9a` pass is now the lightweight benchmark for future
enrichment. It records, per prompt, approximate output words, de-duplicated read
counts, and pass/fail rubric verdicts. The benchmark is intentionally an amber
warning system, not a hard stop: useful readings may grow when a new reference
category is added, but unexpected retrieval or length jumps should be visible.

```bash
# Provider-free baseline check used by the deterministic validation matrix.
python3 tests/forward_testing/benchmark_summary.py --check

# Human-readable current baseline summary.
python3 tests/forward_testing/benchmark_summary.py

# Compare a fresh blind-run artifact directory without re-running providers.
python3 tests/forward_testing/benchmark_summary.py \
    --runs-dir /tmp/astrology_blind_forward/td-846f9a_run
```

Warning thresholds are established from the current clean run: reads warn above
`max(baseline + 8, baseline * 1.25)`, and output length warns above
`max(baseline + 350 words, baseline * 1.30)`. Artifact mode also reports
retrieval totals by reference category (`reading_types`, `foundations`,
`synthesis_patterns`, etc.) and identifies the highest-read/highest-word prompt
within each reading type.

For a planned next-generation benchmark that compares **with-skill vs
without-skill** readings and ranks multiple models/providers, see
`docs/comparative_benchmark_plan.md`.

## Scope

This method and harness make **no changes to the skill corpus**. They are
test-hygiene tooling. Findings from a run may, separately, motivate corpus TDs —
but those are authored in their own tasks, not here.
