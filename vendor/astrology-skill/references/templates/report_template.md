# Reading Report Template

Use this structure when producing a **saved, archived, or delivered** reading
report. It is the human-readable rendering of an object that conforms to
[`assets/schemas/report_schema.json`](../../assets/schemas/report_schema.json).

Not every chat answer is a report. A report is produced when the host or user
asks to save, archive, export, or deliver the reading. For quick chat answers,
plain prose governed by `SKILL.md` is enough.

The JSON envelope is the canonical contract; this Markdown is one rendering of
it. Both are acceptable outputs — pick the one the caller asked for. When in
doubt, produce the JSON envelope (it round-trips losslessly into this Markdown
via `references/templates/report_template.md`).

## Field map (envelope → Markdown)

| Report field | Markdown location |
|---|---|
| `report_id`, `schema_version` | footer |
| `generated_at`, `timezone` | header ("Date of reading") |
| `client.name` / `client.label` | header ("Client") |
| `reading_type`, `tradition_mode`, `tone` | header |
| `practitioner` | header (optional) |
| `user_question` | blockquote under the header |
| `reading.summary` | "Summary" section |
| `reading.sections` or `reading.body` | body sections |
| `reading.scope_notes`, `reading.uncertainty_notes` | "Scope & uncertainty" |
| `self_check`, `references_used` | "Method & traceability" (optional) |
| `chart_artefacts` | "Appendix: chart artefact(s)" |
| `disclaimer` | footer |

## Template

```markdown
# {reading.title | "{reading_type, title-cased} Reading — {client.label or client.name or 'Anonymous'}"}

| | |
|---|---|
| **Client** | {client.name or client.label or "Anonymous"} |
| **Reading type** | {reading_type} |
| **Date of reading** | {generated_at rendered in timezone, date + time} |
| **Tradition** | {tradition_mode or "blended"} · **Tone** | {tone or "practical"} |
| **Practitioner** | {practitioner.name and practitioner.role, or omit the row} |

> **Question:** {user_question, or "Open natal synthesis." if absent}

## Summary
{reading.summary}

## {section.heading}              ← render reading.sections[] in order if present
{section.body}

(If reading.sections is absent, render reading.body here as-is.)

## Scope & uncertainty

**In scope**
- {reading.scope_notes[] …; if empty, write one line summarizing the scope}

**Uncertainty & limits**
- {reading.uncertainty_notes[] …; if empty and birth_time_confidence is Timed,
  write "Chart factors are within stated data limits; no material uncertainty
  flagged."}

## Method & traceability            ← optional; include for archival/audit reports
- **Resources loaded:** {references_used[] joined, or "(minimal set)"}
- **Self-check:** resource_grounding {…}, factor_weighting {…}, uncertainty {…},
  scope_guardrails {…}, synthesis_quality {…} (pass/warn/fail per item)

## Appendix: chart artefact(s)

Each artefact is embedded inline in a fenced block or referenced by path. Label
the role of each.

### Artefact 1 — {chart_artefacts[0].role} ({chart_artefacts[0].source})
{If chart_artefacts[0].object is present:}
```json
{…chart_artefacts[0].object pretty-printed…}
```
{Else if chart_artefacts[0].ref is present:}
Referenced: `{chart_artefacts[0].ref}`

{Repeat per artefact. The role `chart_input` artefact is the authoritative
source chart; `reading_plan` is the internal plan; `secondary_chart` is a
synastry/return companion; `timing` is a transit/profection table.}

---
*Report ID: {report_id} · Report schema v{schema_version} ·
Generated {generated_at} ({timezone or "UTC"}).*
*{disclaimer, or the standard ethics-and-scope line: "This reading is
interpretive and educational. It is not medical, legal, financial, or
psychological advice, and should not be the sole basis for a major decision."}*
```

## Rendering rules

- **One chart_input artefact minimum.** Every reading report attaches the chart
  it interpreted. If the original was an inline object in chat, embed it; if it
  was a file, embed it or reference the path.
- **Do not redact into inaccuracy.** You may pseudonymize a client name into a
  label, but never alter placements, aspects, houses, sect, or timing values
  from the source artefact.
- **Preserve uncertainty in proportion.** The Markdown "Scope & uncertainty"
  section must carry the same caveats the prose carries — do not soften them in
  the report rendering.
- **Self-check is private by default.** Include "Method & traceability" only for
  archival, audit, or when the user asks for method/traceability. For a client
  deliverable, omit it (it is an internal artifact of the workflow).
- **No new chart factors.** The Markdown rendering never computes, rectifies, or
  derives anything the artefacts do not already contain — the same
  no-calculation boundary that governs the rest of the skill.
