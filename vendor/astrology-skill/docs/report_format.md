# Report Format: Standardized Reading Reports

**Task:** `td-7d265d`
**Scope:** The standardized output structure for a reading report — what fields
it carries, when to produce it, and how it relates to the chart input and the
internal reading plan.

This document defines the contract. The canonical machine-readable contract is
[`assets/schemas/report_schema.json`](../assets/schemas/report_schema.json); the
human-readable rendering template is
[`references/templates/report_template.md`](../references/templates/report_template.md).

---

## What a report is (and is not)

| | |
|---|---|
| **Is a report** | A saved, archived, exported, or delivered reading artefact that bundles provenance + the reading + the chart it was built from. |
| **Is not a report** | A quick chat answer. For interactive answers, the prose governed by `SKILL.md` is enough; no envelope is required. |

The boundary matters: not every reading should become a heavy report. Produce a
report when the host or user asks to **save**, **archive**, **export**, **send**,
or **deliver** the reading, or when a downstream consumer needs structured data.

When a report is produced, the **JSON envelope is the canonical form**. The
Markdown rendering is one projection of it. Produce the form the caller asked
for; when unspecified, prefer JSON (it round-trips losslessly into Markdown).

---

## The standard fields

| Field | Required | Meaning |
|---|---|---|
| `schema_version` | yes | Report schema version. Currently `1.0`. |
| `report_id` | yes | Stable id (slug / ULID / UUID). Unique within the producing host. |
| `generated_at` | yes | **Date of reading.** ISO-8601 datetime, timezone-aware. |
| `timezone` | no | IANA label for presenting `generated_at` to a human. |
| `client` | no | The person the reading is for. `name` (real), `label` (pseudonymous, e.g. `Subject A`), `birth_date` (context only), `notes`. Prefer `label` for privacy unless a real name is explicitly intended. |
| `reading_type` | yes | `natal`, `transit`, `synastry`, `solar_return`, `annual_profection`, `horary`, `electional`, or `mundane`. Mirrors `chart_input_schema.json`. |
| `tradition_mode` | no | `classical`, `modern`, `blended`. |
| `tone` | no | `practical`, `poetic`, `psychological`, `technical`, `beginner-friendly`. |
| `user_question` | no | The querent's explicit focus, verbatim where possible. |
| `practitioner` | no | The reader or producing agent (`name`, `role`, `notes`). For archival provenance. |
| `chart_artefacts` | yes, ≥1 | The JSON chart artefact(s). See below. |
| `reading` | yes | The synthesized reading. `title`, `summary`, `sections[]` or `body`, `scope_notes[]`, `uncertainty_notes[]`. |
| `self_check` | no | The reading self-check, materialized. Omit for client deliverables; include for archival/audit. |
| `references_used` | no | Bundled reference files actually loaded (repo-relative paths). |
| `disclaimer` | no | Scope-of-practice line. Defaults to the standard ethics-and-scope line. |
| `language` | no | BCP-47 tag the reading was written in. |

`additionalProperties: true` at every level, so hosts may attach their own
fields (case IDs, billing codes, locale preferences) without breaking the
contract.

---

## Chart artefacts

`chart_artefacts` is the part that makes a report self-contained: the reading
and the data it was built from travel together.

```json
"chart_artefacts": [
  {
    "role": "chart_input",
    "schema_ref": "assets/schemas/chart_input_schema.json",
    "source": "tools/birth_to_chart.py",
    "object": { "reading_type": "natal", "chart_data": { "…": "…" } }
  },
  {
    "role": "reading_plan",
    "schema_ref": "assets/schemas/reading_plan_schema.json",
    "source": "<inline>",
    "object": { "focus": "…", "primary_factors": ["…"], "…" : "…" }
  }
]
```

- **`role`** — how the artefact relates to the reading:
  - `chart_input` — the authoritative source chart. **At least one expected on
    every reading report.**
  - `reading_plan` — the internal plan from `SKILL.md` Workflow step 3.
  - `secondary_chart` — a companion chart (synastry partner, solar return,
    returnee).
  - `timing` — a transit, profection, or progression table.
  - `other` — anything else (a horary/Q&A table, an electional candidate set).
- **`source`** — where it came from: a file path, `<inline>`, or a provenance
  line (`tools/birth_to_chart.py`, `external program`).
- **`object`** vs **`ref`** — embed the JSON inline, or reference a path/URI.
  At least one of the two must be present per artefact.
- **`schema_ref`** — informational pointer to the schema the object conforms to.
  It is **not** a JSON `$ref`: validating the embedded object against that schema
  is the producer's job. (We avoid cross-file `$ref` so the report schema
  validates anywhere with a plain `Draft202012Validator`, matching the skill's
  dependency-light philosophy.)

### Embed vs reference

- **Embed** (`object`) when the report must be self-contained — archival,
  export, email, anything that may outlive the source files.
- **Reference** (`ref`) when files are stable and co-located, or the artefact is
  large and already persisted (e.g. `chart.json` on disk).

A single report may mix the two (embed the chart_input, reference a large
secondary_chart).

---

## The reading body

`reading` carries the synthesized output in one of two shapes (or both):

- **`body`** (string) — free-form Markdown. The default rendering target and
  what `SKILL.md` step 7 produces.
- **`sections`** (array of `{ heading, body, weight? }`) — for hosts that render
  into fixed sections.

At least one of `body` or `sections` must be present.

`summary` is a short overview written *after* the body — two to four sentences
stating the main synthesis. It is not the reading itself.

`scope_notes` and `uncertainty_notes` carry the same caveats the prose carries.
The Output Guardrails and the reading self-check still apply; the report does
not soften them.

---

## The self-check

`SKILL.md` runs the reading self-check internally before every reading. In a
report, that check can be **materialized** for traceability:

```json
"self_check": {
  "resource_grounding": { "status": "pass", "notes": "…" },
  "factor_weighting":   { "status": "pass" },
  "uncertainty":        { "status": "warn", "notes": "birth time Timed, not Rectified" },
  "scope_guardrails":   { "status": "pass" },
  "synthesis_quality":  { "status": "pass" }
}
```

- **Omit `self_check`** for client-facing deliverables (it is an internal
  artifact).
- **Include it** for archival, audit, peer-review, or when the user asks for
  method or traceability.

---

## Relationship to existing contracts

```
 chart_input_schema.json   ──►  chart_artefacts[role=chart_input].object
 reading_plan_schema.json  ──►  chart_artefacts[role=reading_plan].object
                               report_schema.json  (this standard)
                                     │
                                     ▼
                          JSON envelope  ──►  Markdown rendering
                                            (report_template.md)
```

The report standard **wraps** the existing input and plan contracts; it does not
change them. A chart that passes `entry_commands.py --route` can be embedded
verbatim as a `chart_input` artefact.

### Enum parity

`report_schema.json` inlines the `reading_type`, `tradition_mode`, and `tone`
enums **by value** (not cross-file `$ref`), so the schema validates anywhere
without a resolver. Drift is caught structurally: `python3 quick_validate.py`
asserts the report schema enums match `chart_input_schema.json`, the same way
`entry_commands.py --check` asserts enum/fragment/module parity.

---

## Producing a report

The producer is `SKILL.md`'s synthesis step — there is no separate calculator.
At the end of the workflow:

1. Run the normal Workflow steps 1–8 (parse, plan, retrieve, rank, synthesize,
   self-check).
2. Collect provenance: client name/label, `generated_at` (now), the chart object
   that was routed in, the reading plan, and the list of references actually
   loaded.
3. Build the envelope per `report_schema.json`. Embed or reference the chart
   artefact(s). Materialize the self-check only for archival/audit reports.
4. Emit JSON, or render Markdown via `report_template.md`, per the caller's
   request.
5. Gate the finished envelope with `python3 entry_commands.py --report
   <report-or-path-or-->` before delivery or archival. It validates the
   envelope against `report_schema.json` and re-runs the chart-input gate on
   every embedded `chart_input` artefact, so the report and the chart it wraps
   are both confirmed well-formed. The gate performs no calculation.

The report never computes, rectifies, or derives a chart factor — the same
no-calculation boundary that governs stages 2–3 of the end-to-end path
([`docs/end_to_end.md`](end_to_end.md)).

---

## Minimal example

```json
{
  "schema_version": "1.0",
  "report_id": "natal-subject-a-20260620",
  "generated_at": "2026-06-20T14:30:00-04:00",
  "timezone": "America/New_York",
  "client": { "label": "Subject A" },
  "reading_type": "natal",
  "tradition_mode": "blended",
  "tone": "practical",
  "user_question": "What is the vocation pattern?",
  "chart_artefacts": [
    {
      "role": "chart_input",
      "schema_ref": "assets/schemas/chart_input_schema.json",
      "source": "chart.json",
      "ref": "chart.json"
    }
  ],
  "reading": {
    "title": "Natal Reading — Subject A",
    "summary": "A night-chart with a Cancer rising Mars …",
    "body": "## Chart shape\n\n…\n\n## Vocation\n\n…",
    "scope_notes": ["Vocation read from the 10th/2nd/6th and their rulers."],
    "uncertainty_notes": ["Birth time is Timed, not Rectified; angle-sensitive timing is provisional."]
  },
  "references_used": [
    "references/foundations/interpretive_principles.md",
    "references/foundations/synthesis_rules.md",
    "references/reading_types/natal.md"
  ]
}
```

---

## Acceptance-criteria mapping

| Criterion (`td-7d265d`) | Where |
|---|---|
| Standardized report structure exists | `assets/schemas/report_schema.json` (this doc). |
| Includes client name | `client.name` / `client.label`. |
| Includes type of reading | `reading_type` (required). |
| Includes date of reading | `generated_at` (required, date-time). |
| Includes JSON chart artefacts | `chart_artefacts` (required, ≥1, embed or ref). |
| Standard composes with existing contracts | "Relationship to existing contracts" above; chart/plan schemas unchanged. |
| Drift between report enums and input enums is caught | `quick_validate.py` parity check. |
