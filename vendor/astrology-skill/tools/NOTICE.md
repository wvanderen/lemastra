# NOTICE — `tools/` birth-data pre-processor

This `tools/` directory is an **opt-in support-script unit** bundled alongside
the astrology skill so agents can resolve `tools/birth_to_chart.py` by relative
path from the installed skill root. Nothing in `SKILL.md` or `references/`
imports, calls, or links to it; agents run it only as a separate process when
raw birth data needs preprocessing. See `docs/birth_to_chart_design.md` §1 for
the no-calculation boundary this preserves.

## Licensing — read before use

`birth_to_chart.py` depends on **pyswisseph**, the Python binding for the
**Swiss Ephemeris**. Swiss Ephemeris and pyswisseph are **dual-licensed**:

1. **GNU AGPL-3.0** (the default, free option), **or**
2. the **Swiss Ephemeris Professional License** from Astrodienst
   (https://www.astro.com/swisseph/) — the paid, commercial option.

Accordingly, **this `tools/` unit is licensed AGPL-3.0** (see `LICENSE`).
Because the script runs as a separate process and the MIT runtime contains no
pyswisseph and no code link to it, AGPL copyleft does **not** propagate into
the interpretive runtime. The AGPL boundary is confined to this directory.

### If you cannot accept AGPL

You **must** purchase the Swiss Ephemeris Professional License from
Astrodienst and use pyswisseph under those terms. This choice is yours to
make and to record; this repo does not grant you that license.

## Third-party attribution

- **Swiss Ephemeris** — © Astrodienst AG, Zurich, Switzerland.
  https://www.astro.com/swisseph/
  Planetary positions are derived from the Swiss Ephemeris / JPL DE431.
  Ephemeris data files (`.se1`), if you choose to download them, are freely
  redistributable from Astrodienst's download area provided this copyright
  notice is preserved.

## No data files are bundled

This repository ships **no** `.se1` ephemeris data files. The script runs out
of the box on the built-in **Moshier** ephemeris (planets ~0.1″, Moon ~3″ —
well inside any realistic natal orb). For higher precision, download the
`.se1` files from Astrodienst once and point the script at them via
`--ephe-path` or the `SWISSEPH_PATH` environment variable. **Never commit
`.se1` files into this repository** (size + attribution handling).
