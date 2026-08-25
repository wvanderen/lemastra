# E2E Validation Pass, Evaluation, and Refinement — Plan

**Status:** delivered — Phases A–E landed (see per-phase "Delivered" notes). Deterministic matrix green (8/8); blind forward test clean across 11 prompts / 8-of-8 reading types (`td-846f9a`).
**Scope:** A single coordinated pass that (1) re-runs the full deterministic
end-to-end validation harness, (2) closes two structural-drift gaps the
harnesses do not currently catch, (3) extends blind forward-test coverage to
the half of the reading-type surface that has never been blindly evaluated,
and (4) applies the corpus refinements the evaluation surfaces.

This is a **planning** document. Each phase maps to a tracked `td` issue.
Corpus changes inside Phase D obey the
[research-before-authoring](../AGENTS.md) rule where they touch doctrine.

---

## What "E2E" means for this skill

Three layers, each with its own validation surface:

| Layer | Path | Validated by |
|---|---|---|
| **Calculator path** | raw birth data → `tools/birth_to_chart.py` → chart JSON → `entry_commands.py --route` → route ticket → `SKILL.md` Workflow step 1 | `tests/entry/end_to_end_test.py`, `tools/smoke_test.py` |
| **Structural parity** | schema enum ↔ entry fragments ↔ retrieval modules ↔ `agents/openai.yaml` ↔ `SKILL.md` input contract | `quick_validate.py`, `entry_commands.py --check`, `tests/entry/smoke_test.py` |
| **Interpretive retrieval** | sanitized mirror → fresh blind agent context → reading + retrieval set | `tests/forward_testing/run_blind_forward_test.py` (isolation-by-construction) |

The first two layers are deterministic and fast. The third is the only one
that can catch retrieval drift a single deterministic walkthrough cannot see
(see `forward_test_findings_td-06b45e.md`'s "New findings the
single-walkthrough missed").

---

## Current state (verified green this session)

| Check | Result |
|---|---|
| `python3 quick_validate.py` | PASS — SKILL.md metadata + entry parity |
| `python3 entry_commands.py --check` | PASS — 8 reading types, enum-driven (the B.1 silent gap is now closed: `prompts/entry/mundane.md` exists) |
| `python3 tests/entry/smoke_test.py` | PASS — full entry-surface parity |
| `.venv/bin/python3 tests/entry/end_to_end_test.py` | PASS — calculator-backed stages included (pipe + file modes) |
| `.venv/bin/python3 tools/smoke_test.py` | PASS — 3 fixtures, Asc/MC within ±0.05° |
| Most recent blind pass (`td-846f9a`) | Clean across **11 prompts / 8-of-8 reading types** on all 5 rubric axes (supersedes the 6-prompt `td-06b45e` run; see Phase C) |

So the deterministic path is green. The work below is about **closing
blindness gaps** and **fixing two drift artifacts the harnesses do not
assert against**.

---

## Phase A — Automated E2E + structural validation matrix

**Goal:** one re-runnable command that produces a green/red matrix across
every deterministic surface, plus two drift checks the suite does not yet
cover.

### A.1 Re-run the existing deterministic suite

Capture a single matrix (script or doc section) covering the six checks in
"Current state" above, plus the ROADMAP Phase 5 JSON-schema-parse +
`agents/openai.yaml`-parse block. All must be green before B–D proceed.

### A.2 Two new structural drift checks (currently un-asserted)

These close gaps that Phase 8 (`td-2a1b24`) caught manually and that have no
automated guard:

1. **Gap-matrix ↔ on-disk reality.**
   `references/reference_gap_matrix.md` is a **pre-Phase-5/6/7 snapshot**.
   Verified this session: its summary table still says Signs = `Starter`,
   "No Ptolemaic sign-powers" and Houses = `Moderate`, "No classical house
   doctrine, joys, or derived houses", while the on-disk modules carry
   `## Classical sign-powers` sections (e.g. `references/signs/aries.md`
   has commanding/obeying, masculine/feminine, humor doctrine) and Phase 5
   (`td-722c1d`) and Phase 6 (`td-fb39c1`) enrichment waves have landed. The
   matrix's "First enrichment wave" section lists that work as future TODO.
   The matrix also has **no mundane row at all** (Phase 7 landed mundane).
   → Add a drift check that flags any summary-table row whose claimed
   Depth / Headline-gap contradicts the on-disk module, and any reading
   type present in the schema enum but absent from the matrix.

2. **Source-notes pointer target existence.**
   Phase 8 found and fixed four broken `## Source notes` pointers; the eight
   deferred fixes (3 outer planets + 5 on-demand placement exemplars) have
   since landed (verified). Add a guard so this cannot regress: for every
   `## Source notes` section, confirm any path it names exists under
   `references/`.

Both checks can live as small stdlib scripts under `tests/`
(matching the existing no-dependency test style) or as a section in a dev note.
Decision deferred to Phase A execution; the guard is the deliverable, not its
form.

### A.3 Delivered (`td-3b7112`)

Phase A landed as four stdlib scripts. The single re-runnable matrix is:

```bash
python3 tests/run_validation_matrix.py
```

It runs every deterministic surface and prints one green/red matrix:

- **A.1 (6 checks, all green):** `quick_validate.py`, `entry_commands.py
  --check`, `tests/entry/smoke_test.py`, `.venv/bin/python3
  tests/entry/end_to_end_test.py`, `.venv/bin/python3 tools/smoke_test.py`, and
  the ROADMAP Phase 5 static-asset guard (`schema_and_agents_parse.py`).
  Venv-only checks SKIP cleanly when `.venv` is absent.

- **A.2.1 gap-matrix drift** (`tests/structure/gap_matrix_drift.py`):
  four signal kinds — schema-enum coverage, per-category module-count parity,
  absence-claim contradictions, and depth-floor contradictions. This was the
drift Phase B.2 fixed (mundane absent from the matrix; Reading types 9 vs 11
  and Synthesis patterns 12 vs 15; Signs/Houses/Conditions rows contradicting
  on-disk `## Classical` sections); it is now **GREEN (0 findings)** and
  regression-protects the refreshed matrix.

- **A.2.2 source-notes pointers** (`tests/structure/source_notes_pointers.py`):
  verifies every backtick-quoted `references/...` target named in a
  `## Source notes` section exists. **GREEN** (128 pointers across 96 files;
  no regression from Phase 8).

The matrix exits 0 only when every check is PASS. As of `td-76f5e0`
(Phase B) it is **fully green**; the previously-red `A.2.1` row is now a
regression guard.

---

## Phase B — Structural drift fixes (corpus, low risk)

Concrete fixes Phase A.2 surfaces. Each is small and doctrine-free.

### B.1 Add `prompts/entry/mundane.md` (delivered)

The entry surface listed `mundane` as `[fragment: no]` — the only reading type
without a per-type entry fragment. This was silent in `--check` because
`_collect_parity_issues` only hard-fails on a fragment whose type is
**absent** from the enum, not on an enum value lacking a fragment. So a
mundane chart previously routed only through the canonical template, missing
the per-type framing the other seven types get.

ROADMAP TD P6-E1-TD3 anticipated this ("`mundane` once the mundane epic
lands") — the mundane epic (Phase 7) has landed. `prompts/entry/mundane.md`
now exists, matching the seven existing per-type fragments so enum↔fragment
parity is complete. Framing only; no doctrine. `entry_commands.py --check`
and the entry smoke test stay green.

### B.2 Refresh `references/reference_gap_matrix.md` (delivered)

The summary table and every per-category section were reconciled against the
post-Phase-5/6/7 on-disk modules, and a mundane row was added (reflected in
the Reading-types count going 9 → 11). The reconciliation confirmed the
landed enrichment sections and adjusted Depth / Coverage / Headline-gap /
Priority accordingly: Signs, Houses, Conditions, Planets, and Aspect types
moved from `Starter`/`Moderate` to `Rich`; the P0/P1 priority tiers retired
in favour of `P2 on-demand` / `P3 keep-compact`; the "First enrichment wave"
section became "Enrichment waves (landed)". No new doctrine was authored;
this is a planning-artifact reconciliation. The drift guard
(`tests/structure/gap_matrix_drift.py`) went from 8 findings to 0 and now
regression-protects the matrix.

### B.3 (Conditional) Source-notes regressions

If A.2 check 2 surfaced any broken pointer, fix it. Expected: none —
verified green this session (128 distinct pointers across 96 files), so no
work was needed here. The guard remains in place to catch future drift.

---

## Phase C — Blind forward-test evaluation

Two sub-passes. Both feed Phase D.

### C.1 Re-run the existing 6-prompt blind harness

Re-run `tests/forward_testing/run_blind_forward_test.py` against the current
corpus (post-Phase-B) to confirm `td-06b45e`'s clean verdict still holds.
Capture a new `forward_test_findings_td-<id>.md` following the established
rubric (resource selection, synthesis, weighting, uncertainty, guardrails)
and contamination-audit format.

### C.2 Resolve known fixture bugs + extend reading-type coverage

**Two problems td-06b45e explicitly flagged and deferred:**

1. **Four data-integrity bugs in `structured_reading_prompts.md`** that the
   blind pass caught by working the chart factors directly:
   - Synastry "Venus-Mars opposition" is geometrically a **conjunction**
     (0.5° apart, same sign).
   - Annual Profection "Mars trine Jupiter" is geometrically an **opposition**
     (Capricorn–Cancer, 180°).
   - Annual Profection "Venus opposition Saturn" is geometrically a
     **square** (Gemini–Pisces, 90°).
   - Annual Profection age 34 → 5th house does not reconcile under standard
     counting (5th-house years fall near ages 4/16/28/40).

   **Decision per bug:** *fix* the geometry/age so the fixture is internally
   consistent ground truth, or *label* it as an intentional
   `aspect_precision`-guardrail stress test. Recommended: fix the three
   geometry bugs and the profection age (regenerate via
   `tools/birth_to_chart.py` so the chart is self-consistent), and — if we
   want to keep exercising the precision retrieval path — add **one new,
   explicitly-labeled** precision stress-test fixture rather than leaving the
   existing ones mislabeled.

2. **Reading-type blind coverage is 4 of 8.** Current prompts cover natal
   (×3), transit, synastry, annual_profection. **Zero blind coverage** for
   `solar_return`, `horary`, `electional`, and `mundane`. Mundane is both the
   newest and the most scope-sensitive (event-certainty / fear-based-language
   guardrails); it is the highest-value coverage gap. Add one realistic,
   internally-consistent prompt per missing reading type.

   These need a **research pass** before authoring: each requires a realistic
   chart whose factors are internally consistent (geometry from
   `tools/birth_to_chart.py` or a clearly-labeled external source), and
   mundane especially needs scope-aligned source notes matching
   `references/reading_types/mundane.md`.

### C.3 Delivered (`td-846f9a`)

Phase C landed in one combined run; `tests/forward_testing/forward_test_findings_td-846f9a.md`
is the durable record.

- **C.1** — re-run confirmed `td-06b45e`'s clean verdict still holds: all 11
  prompts pass on every rubric axis. Contamination audit clean by
  construction (0 retrieval / bash leaks across 11 isolated contexts).
- **C.2.1** — the four `td-06b45e` bugs were already corrected by `td-4605f5`
  (commit `3cc171e`; the C task description was stale). A programmatic
  orb re-verification then surfaced **three further** hand-typed orb
  mismatches `td-06b45e` had not caught (Natal Vocation Mercury–Jupiter
  trine / Sun–Saturn square / an irreconcilable Venus–Jupiter "opposition"
  replaced with the geometrically real Mars–Jupiter square; Natal Resources
  Venus–Mars; Incomplete-Data Mercury–Saturn relabeled
  opposition→quincunx). After these surgical fixes a full recompute reports
  **0 aspect mismatches** across all 11 prompts. Because the four mislabels
  are now corrected, one **explicitly labeled** `aspect_precision` stress-test
  fixture was added so the precision retrieval path stays exercised.
- **C.2.2** — four new reading-type prompts (`solar_return`, `horary`,
  `electional`, `mundane`) bring blind coverage from 4/8 to **8/8**. Every
  new chart's geometry originates from `tools/birth_to_chart.py` (then
  rounded, with orbs recomputed from the rounded degrees), preserving the
  no-calculation boundary; the mundane prompt is scope-aligned to
  `references/reading_types/mundane.md`. Research-before-authoring honored:
  dignity/rulership/notes added by hand, geometry from the bundled calculator.

---

## Phase D — Refinement

Apply the corpus changes Phases B and C surface. Likely set (final scope set
by what the evaluation actually finds):

- `prompts/entry/mundane.md` (B.1 — no doctrine).
- `references/reference_gap_matrix.md` refresh (B.2 — planning artifact).
- Fix/label the four forward-test fixtures (C.2.1 — test hygiene).
- Add four new forward-test prompts (C.2.2 — needs research).
- Findings file for the C.1 re-run (C.1).
- Any corpus fixes the C.1 blind pass surfaces.

Each doctrinal change obeys research-before-authoring. Each non-doctrinal
change (fragments, fixtures, the matrix, the findings file) is test-hygiene
or routing.

### D.1 Delivered (`td-afe437`)

Every corpus change Phase D enumerates landed **inside** the B and C tasks
themselves (B.1/B.2 in `td-76f5e0`; C.1/C.2 in `td-846f9a`), so Phase D's
work is consolidation and verification rather than a separate application
pass. Final disposition, verified this session:

- `prompts/entry/mundane.md` (B.1) — present; enum↔fragment parity complete
  (8/8); `entry_commands.py --check` green.
- `references/reference_gap_matrix.md` refresh (B.2) — reconciled to on-disk
  reality; `tests/structure/gap_matrix_drift.py` went 8 findings → 0 (now a
  regression guard).
- Four forward-test fixtures (C.2.1) — corrected (see C.3); programmatic
  recompute reports 0 aspect mismatches across the 11 prompts.
- Four new forward-test prompts + precision stress-test (C.2.2) — present;
  blind coverage 8/8.
- C.1 findings file — `forward_test_findings_td-846f9a.md`.
- **Any corpus fixes the C.1 blind pass surfaces: none.** The findings file
  records "made no doctrinal changes to the corpus" and "No corpus drift
  was introduced"; the pass added fixtures and a findings file only.

Full deterministic matrix re-run this session: **8/8 PASS** (green tree).
No doctrinal corpus change was authored in Phase D, so the
research-before-authoring rule was not triggered here.

---

## Phase E — Closure

- `td review` → `td approve` per the workflow (prefer an independent
  reviewer sub-agent for the doctrinal touches; `--self-review` acceptable
  for the pure test-hygiene pieces).
- Sync `ROADMAP.md` if any new TDs are added (mirrors TD P6-E1-TD6's
  discipline).
- Update `references/resource_index.md` if any module moves implemented ↔
  planned (none expected this pass; the mundane modules are already
  registered).

### E.1 Delivered (`td-afe437`)

- **Review/approve** — recorded under this task per the td workflow.
- **ROADMAP.md** — no sync. Phases A–E of this pass are operational
  execution tracked in `td` + this plan doc, not enumerated in `ROADMAP.md`
  (whose Phase 5 validation TDs are generic acceptance criteria). No new TDs
  were spawned by B or C, so TD P6-E1-TD6-style sync is not triggered. The
  historical "(and `mundane` once the mundane epic lands)" parenthetical in
  the closed design TD P6-E1-TD1 is left intact (accurate-as-history; TD6's
  discipline is to preserve prior content).
- **references/resource_index.md** — no change. The mundane reading-type,
  exemplar, and three synthesis-pattern modules are already registered in
  the implemented list, and every category's "Planned" set is `none`; no
  module moved implemented ↔ planned this pass.

---

## Sequencing and dependencies

```
A (deterministic matrix + 2 new drift checks)
 ├─► B (structural fixes: mundane fragment + gap matrix + any pointer regression)
 │     └─► C.1 (re-run 6-prompt blind, post-B mirror) ──┐
 C.2 (fixture integrity + 4 new reading-type prompts)   │
   │  (independent of B; needs research for new prompts)│
   ▼                                                     ▼
 D (apply B + C findings) ◄─────────────────────────────┘
 └─► E (review, roadmap/index sync, handoff)
```

- **A → B**: B fixes what A finds.
- **B → C.1**: re-run the blind pass against a post-fix mirror.
- **C.2** is independent of B and can proceed in parallel; both feed D.
- **D → E**.

---

## Risk notes

- **Wall-clock.** Blind forward tests spawn fresh agent contexts. Budget for
  sequential runs, or partitioned parallel runs via per-prompt `--runs-dir`
  (the harness's isolation model is unchanged by parallelism).
- **New-prompt authoring is the bulk of the effort**, not running them.
  solar_return / horary / electional / mundane each need a realistic,
  internally-consistent chart. Generate geometry via
  `tools/birth_to_chart.py` wherever possible so the no-calculation boundary
  is preserved and the fixture is self-consistent by construction.
- **No-calculation boundary.** Any new fixture originates from the bundled
  calculator (self-consistent geometry) or a clearly-labeled external
  source. The interpretive skill never imports the calculator.
- **Mundane scope sensitivity.** The mundane prompt is the highest-risk
  evaluation target because its guardrails (no event/market certainty,
  non-fear-based language) are the easiest to drift. Evaluate it with extra
  scrutiny on the guardrails axis.

---

## What this pass deliberately does NOT do

- No new doctrine modules (planet-in-sign, planet-pair, etc.). Coverage gaps
  there are on-demand per the gap matrix's compositional-fallback strategy
  and are out of scope for a validation pass.
- No pruning. Prior passes found nothing to prune; the same criterion
  ("source richness harms composability or retrieval clarity") applies.
- No change to the no-calculation boundary or the AGPL confinement of
  `tools/birth_to_chart.py`.
