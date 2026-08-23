# Swiss Ephemeris Licensing & Distribution Posture

| Field | Value |
|-------|-------|
| Requirement | GATE-01 |
| Status | Product-approved 2026-08-23 — qualified review scheduled before public/commercial beta |
| Decision | **Professional License (option-a)** — selected by the LemAstra project owner, 2026-08-23 |
| Sources | astro.com/swisseph/swephinfo_e.htm · secont_e.pdf (June 2026 edition) · pypi.org/pypi/pyswisseph · /Users/eggfam/dev/astrology-skill (repo inspection) — all verified 2026-08-22 (01-RESEARCH.md) |

This document records **LemAstra's own licensing position** for Swiss Ephemeris and pyswisseph. Its
structure follows the explicit licensing-notes pattern of `astrology-skill`
(`docs/birth_to_chart_design.md` §3 — dual-license statement, chosen path, obligations, documented
alternative) as a structural analog only. LemAstra does **not** adopt that repository's
"AGPL confined to `tools/` by process isolation" interpretation: it serves astrology-skill's
distribution model, and the Professional License contract's own text puts LemAstra's
client-calls-server topology in scope regardless (§2).

## 1. Decision & Rationale

**Chosen path: Swiss Ephemeris Professional License (option-a).**

- **What was chosen:** Astrodienst's Professional License, unlimited tier — **CHF 700 one-time fee,
  99-year validity, unlimited projects** — executed as a signed contract countersigned by Astrodienst.
- **Why:** LemAstra intends closed-source distribution of the mobile clients and the calculation
  service. The Professional License permits distribution of Swiss Ephemeris in compiled form without
  source-disclosure obligations, is explicitly designed for the server-calling-app topology LemAstra
  uses (§2), and removes the AGPL whole-project and §13 network-source duties from the distribution
  path. The one-time cost is cheap now and expensive to relicense after distribution begins.
- **Alternative considered (option-b, not taken):** GNU AGPL-3.0 at no fee. Astrodienst's terms
  require placing "the whole software project under AGPL or a compatible license," and
  network-service usage triggers AGPL §13 source-offer duties to users. That forecloses closed-source
  commercial distribution, so this path was rejected.
- **Timing requirement honored:** the choice was made before any SE-containing software is
  distributed and before any public service is activated — "The choice must be made before the
  software developer distributes software containing parts of Swiss Ephemeris to others, and before
  any public service using the developed software is activated." (astro.com/swisseph/swephinfo_e.htm)
- **Binding effect:** this decision binds the distribution terms of the Phase 2+ FastAPI calculation
  container. Phase 2 must not ship or activate a public SE-containing service until obligation O1
  (executed contract record) is satisfied.

## 2. Distribution Model

- **Mobile clients never embed Swiss Ephemeris or pyswisseph.** All astronomical calculation happens
  server-side; the clients contain no calculation code.
- **The FastAPI calculation container (Phase 2+) is the SE-containing artifact.** pyswisseph lives
  exclusively in the calculation service/process and never enters any app bundle.
- **LemAstra's topology is in contract scope.** The mobile app requests calculation from a server
  providing Swiss Ephemeris, which the Professional License contract explicitly defines as an
  SE-containing app:

  > "Even when the distributed app contains no calculation code itself but requests calculation from a
  > server providing it, this is considered an app containing Swiss Ephemeris."
  > — Swiss Ephemeris Professional License contract, June 2026 edition (`secont_e.pdf`)

  LemAstra therefore treats the app + server system as "an app containing Swiss Ephemeris" and
  licenses accordingly, on the contract's own definition — not on any process-isolation or
  containment rationale.
- **The library is AGPL regardless of ephemeris data mode.** pyswisseph 2.10.3.2 carries the PyPI
  classifier `License :: OSI Approved :: GNU Affero General Public License v3` (AGPL-3.0). Using the
  built-in Moshier mode avoids handling `.se1` data files but does not change the library's license.
  If `.se1` files are used later, they are freely redistributable with Astrodienst's copyright
  notice preserved (astrology-skill `tools/NOTICE.md`).
- **Coverage boundary to confirm at review.** The Astrodienst contract covers Swiss Ephemeris.
  Whether it extends to pyswisseph (a third-party Python binding of SE) must be confirmed during
  qualified review (§5) — see obligation O5.

## 3. Obligations Inventory

| # | Obligation (Professional License path) | Status / Trigger |
|---|----------------------------------------|------------------|
| O1 | **Executed contract record**: parties (LemAstra operator ↔ Astrodienst AG), execution date, tier (CHF 700 one-time, 99-year, unlimited projects), countersigned by Astrodienst | **Pending purchase** — must exist and be filed with this posture before first SE distribution or public-service activation (Phase 2 gate) |
| O2 | **Compiled-form distribution rights**: SE may be distributed in compiled/binary form; source distribution is permitted but not required | Satisfied on contract execution; container images ship compiled SE only |
| O3 | **SE source modifications remain AGPL-conditioned** | LemAstra does not modify SE source; if ever done, the modifications are AGPL-3.0 and must be published |
| O4 | **No promotional use of author names**; "SWISS EPHEMERIS Inside" label granted for compliant distribution | Attribution limited to §4's notice pattern and the granted label |
| O5 | **pyswisseph coverage**: pyswisseph 2.10.3.2 is AGPL-3.0 (PyPI classifier) independent of ephemeris data mode; container distribution of pyswisseph must be covered by the Astrodienst contract or separately comply with AGPL | **Qualified-review item** — resolve before the Phase 2 container is distributed or a public service is activated |
| O6 | **astrology-skill vendoring (Phase 2+)**: the skill's MIT license at repo root plus its AGPL-3.0 `tools/` LICENSE/NOTICE/README files must survive backend packaging verbatim, and the vendored skill's commit hash must be recorded per calculated chart | Applies when the skill is vendored into the backend (Phase 2+); per-chart skill-hash provenance is a Phase 2 calculation-service requirement |

## 4. Attribution & Notices

- The backend **NOTICE file** (created with the Phase 2 calculation service) carries:
  - **Swiss Ephemeris** — © Astrodienst AG, Zurich, Switzerland. https://www.astro.com/swisseph/
  - Derived-positions attribution: "Planetary positions are derived from the Swiss Ephemeris / JPL
    DE431."
- **Calculation provenance strings** include the calculator identity and version on every chart,
  following the pattern `computed by pyswisseph/Swiss Ephemeris <version>` (the skill's
  `source_notes` pattern), so each chart records its calculation basis as auditable provenance.
- **No promotional use of author names**: the individual Swiss Ephemeris authors' names are never
  used in marketing or product copy; the granted "SWISS EPHEMERIS Inside" label is the only mark used.

## 5. Approval Record

| Field | Value |
|-------|-------|
| Decision | Swiss Ephemeris **Professional License (option-a)** — CHF 700 one-time, 99-year, unlimited-projects tier |
| Decision maker | LemAstra project owner (human) |
| Decision date | 2026-08-23 |
| Decision vehicle | Plan 01-03 Task 1 `checkpoint:decision` (phase 01-trust-and-release-boundary) |
| Alternative considered | AGPL-3.0 whole-project path (option-b) — rejected: forecloses closed-source distribution (§1) |
| Qualified review status | **Scheduled before public/commercial beta** (GATE-01 approval trigger point) — licensing conclusions remain subject to qualified review; product approval does not constitute or replace qualified review |
| Product approval | **Approved** — human/product-owner approval (LemAstra project owner; no named individual supplied), 2026-08-23 |
| Product approval scope | Chosen path (Professional License, option-a, §1) and distribution model (§2: closed-source mobile clients; Swiss Ephemeris confined to the server-side FastAPI calculation container) |
| Product approval vehicle | Plan 01-07 Task 2 `checkpoint:human-verify` governance-approval checkpoint (phase 01-trust-and-release-boundary) |
| Purchase status | Contract not yet executed — O1 (CHF 700 license purchase + countersigned contract record) must complete before first SE distribution or public-service activation |

---

*Recorded from research-verified facts (`.planning/phases/01-trust-and-release-boundary/01-RESEARCH.md`,
sources fetched 2026-08-22). This posture is a compliance record, not legal advice (research
assumption A7).*
