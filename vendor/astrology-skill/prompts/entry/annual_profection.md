# Annual profection reading — entry fragment

Applies when `reading_type` is `annual_profection`. Append this framing to
`prompts/entry/_reading.md`. This fragment adds **framing only**; it never
calculates the profected house or time lord.

## Chart-data emphasis

- The **activated (profected) house** and the **Lord of the Year** (time lord).
- `chart_data.timing_factors[]` entries where `technique` is
  `annual_profection` (age, profected house, lord of year) alongside any
  supplied supporting `transit` factors.
- The natal chart that the profection activates (Ascendant, sect, natal
  condition of the Lord of the Year).

## Framing for the reading

- Anchor the year in the profection structure first, then describe how supplied
  transits modify it; do not derive the profected house or time lord when they
  are not supplied.
- Carry `user_question` as the top-weighted topic filter on the activated house.
- Load `references/reading_types/annual_profection.md`. Selection is owned by
  `SKILL.md`; this fragment only names it.
