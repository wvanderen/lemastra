# Synastry reading — entry fragment

Applies when `reading_type` is `synastry`. Append this framing to
`prompts/entry/_reading.md`. This fragment adds **framing only**; it never
calculates inter-chart aspects.

## Chart-data emphasis

- **Two charts**: `chart_data.person_a` and `chart_data.person_b` (or whatever
  two subject containers the source supplies), each with its own placements,
  houses, and birth-time confidence.
- **Inter-chart aspects** in `chart_data.aspects` (bodies prefixed by person,
  e.g. `Person A Moon`).
- **Relationship context** carried in `user_question` — romantic, platonic,
  familial, creative, or professional.

## Framing for the reading

- Preserve the relationship framing from `user_question`; do not default
  Venus–Mars / Sun–Moon / 5th–7th–8th contacts to romantic or sexual language
  when the bond is named otherwise.
- State birth-time confidence per chart before leaning on house-level contacts.
- Load `references/reading_types/synastry.md`; load
  `references/synthesis_patterns/professional_collaboration.md` after it when
  the bond is a professional or creative collaboration. Selection is owned by
  `SKILL.md`; this fragment only names it.
