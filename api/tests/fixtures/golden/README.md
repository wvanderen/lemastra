# GATE-02 Golden Fixture Suite (D-14)

In-repo golden contracts pinning the natal-chart calculation pipeline —
POST `/api/v1/charts/calculate` including its `birth_to_chart.py`
subprocess — against the vendored skill revision
(`vendor/astrology-skill/UPSTREAM.revision`, currently
`660d992a61139ed0286eaf0a38f4e8e0fd4f7822`).

The suite is consumed by `api/tests/test_golden.py`, which discovers every
`cases/*.json` file, drives each `input` through the endpoint via the ASGI
`TestClient`, and asserts the recorded digests. CI runs it on every push
(`api` job in `.github/workflows/ci.yml`).

## Coverage ↔ requirement mapping

| Case file | Category | Pins | Requirement |
|-----------|----------|------|-------------|
| `natal-1990-brooklyn.json` | `natal_normal` | Reference chart (11 placement degrees, angles, 12 cusps, aspect count) | CALC-01 |
| `natal-1992-kentucky.json` | `natal_normal` | Different longitude, shared zone | CALC-01 |
| `natal-southern-hemisphere.json` | `natal_normal` | Southern-hemisphere geometry (Sydney) | CALC-01 |
| `dst-ambiguous-ny-2024.json` | `dst_ambiguous` | First pass **and** `second_pass` digests (fixed-offset D-08 resolution) | BIRTH-03 |
| `dst-nonexistent-ny-2024.json` | `dst_nonexistent` | `shifted` resolution → adjacent valid instant (03:30 EDT) | BIRTH-03 |
| `dst-half-hour-shift.json` | `dst_half_hour` | 30-minute DST shift (Lord Howe, +11:00 → +10:30), both passes | BIRTH-03 |
| `unknown-time-1990-brooklyn.json` | `unknown_time` | Absent-key contract, output-derived `unavailable_factors`, provisional Moon | BIRTH-05 |
| `high-latitude-tromso-whole-sign.json` | `high_latitude` | Whole Sign success at 69.6496°N mid-summer | GATE-02 |
| `high-latitude-tromso-placidus.json` | `high_latitude_failure` | Expected failure: 422 `CALC_UNSUITABLE_HOUSE_SYSTEM` | GATE-02 / CALC-04 |

## Case file shape

```jsonc
{
  "schemaVersion": 1,
  "id": "dst-ambiguous-ny-2024",
  "category": "dst_ambiguous",
  "description": "…why this case exists…",
  "input": { /* the exact POST /api/v1/charts/calculate request body */ },
  "expect": {
    "outcome": "success",           // or "error"
    "digest": {
      "ascendant.absolute_degree": 149.5557,   // rounded to 4 decimals
      "placements.Sun.absolute_degree": 221.2883,
      "house_cusps_count": 12,
      "aspects_count_range": [31, 37],         // inclusive
      "birth_time_confidence": "Timed"
    },
    "second_pass": {                // DST-ambiguous family only
      "time_resolution": { "mode": "second_pass", "offset_seconds": -18000 },
      "digest": { /* same digest vocabulary, second-pass instant */ }
    },
    // unknown-time cases add:
    "absent_keys": ["house_system", "ascendant", "midheaven", "house_cusps", "sect", "lots"],
    "placement_house_keys_absent": true,
    "unavailable_factors": ["ascendant_mc", "houses", "lots", "sect"],
    "provisional_factors": ["moon"],
    // expected-failure cases carry instead:
    "error": { "status": 422, "code": "CALC_UNSUITABLE_HOUSE_SYSTEM", "recoverable": true }
  }
}
```

## Digest design rules

- **Field digests, never whole-document equality.** `chart_data.source_notes`
  embeds version strings (swisseph, tzdata, skill revision, input echo) that
  legitimately change on dependency promotion; comparing whole documents
  would make every promotion silently break. The digest vocabulary is
  limited to stable calculated fields, so a deliberate promotion shows up as
  a reviewable digest diff rather than an opaque failure.
- **Degrees are recorded to 4 decimals** and compared with
  `pytest.approx(abs=1e-4)`.
- **Aspect counts are an inclusive `[min, max]` window** (observed count
  ±3): aspect sets are combinatorially sensitive to orb-table tweaks while
  the absolute-degree digests still pin the underlying positions.
- `source_notes` and `provenance` are never compared (version strings are
  whitelisted out by construction).
- The two research-verified anchors for the NY 2024-11-03 ambiguous hour —
  first-pass ascendant **149.5557°** and second-pass **161.3879°** (a whole
  sign apart: the D-08 picker is not cosmetic) — were asserted during
  generation and are permanently pinned by the committed digests.

## Regeneration protocol (deliberate, reviewed, never in CI)

Values are deterministic under the committed lockfile: the Moshier ephemeris
is built into `pyswisseph==2.10.3.2`, historical zone offsets are pinned by
`tzdata==2026.3`, and the skill tree is pinned by `UPSTREAM.revision`.
Digests therefore regenerate **only** when one of those dependencies is
deliberately promoted (or the endpoint contract changes), as part of the
same reviewed commit — never automatically, and never in CI. A changed
digest without a corresponding promotion commit is a gate failure, not a
maintenance chore (T-02-25).

To regenerate after a deliberate promotion:

```bash
# From the repo root, with the promoted deps synced into api/.venv:
uv run --project api --locked python - <<'EOF'
import json, sys
from pathlib import Path

sys.path.insert(0, "api")
from fastapi.testclient import TestClient
from lemastra_api.main import create_app

# Re-POST each case's input (and its expect.second_pass variant, if any)
# through the endpoint and re-record the digests exactly as documented in
# "Digest design rules" above. Then review the diff field by field —
# every changed value must be attributable to the promotion — and commit
# cases/*.json together with the lockfile / UPSTREAM.revision change.
EOF
```

The regeneration diff is the review artifact: reviewers confirm each
changed degree traces to the promoted dependency, then the golden gate
resumes enforcing the new truth.
