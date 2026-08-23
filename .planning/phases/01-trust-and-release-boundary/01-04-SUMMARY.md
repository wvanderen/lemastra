---
phase: 01-trust-and-release-boundary
plan: 04
subsystem: infra
tags: [privacy, governance, data-inventory, retention-policy, privacy-policy, gate-05, store-disclosure]

# Dependency graph
requires:
  - phase: 01-trust-and-release-boundary (plan 01-03)
    provides: Governance-doc pattern (field-table header, sections, approval record) established by swiss-ephemeris-posture.md
provides:
  - GATE-05 data + provider inventory (docs/governance/data-inventory.md) with the six canonical registry provider ids
  - Concrete retention/deletion decisions (ephemeral compute-and-discard, 14-day redacted logs, telemetry exclusion, local export/delete principle, per-phase update rule)
  - Public privacy-policy source content with hosting decision (GitHub Pages, published before Phase 10 submission)
affects: [01-02 provider registry, 01-06 disclosure drafts + consistency tests, 01-07 governance approval, Phase 2 calculation service, Phase 3 local storage, Phase 7 model traffic, Phase 10 store submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Registry-aligned inventory: provider identifiers are the canonical vocabulary shared with src/data/provider-registry.json (plan 01-02) and enforced by plan 01-06 consistency tests"
    - "Shared data-categories definition list: one set of 11 slugs used by registry, store disclosures, and privacy policy"
    - "Decisions-not-aspirations policy: every retention rule states the rule AND where it is enforced (§ references carried by registry retention strings)"

key-files:
  created:
    - docs/governance/data-inventory.md
    - docs/governance/retention-deletion-policy.md
    - docs/governance/privacy-policy.md
  modified: []

key-decisions:
  - "Retention default fixed before any server exists: calculation/geocoding requests are ephemeral compute-and-discard; charts persist device-side only in v1, never server-side"
  - "Hosting logs: 14-day bounded retention window, access-restricted, redaction rule excluding birth data/chart payloads/questions/prose (PRIV-04 groundwork)"
  - "OpenAI retention is a Phase 7 activation precondition: re-verify provider retention controls (research A2, ~30-day defaults) before the provider flips active"
  - "Telemetry excluded by default; Sentry only post-beta opt-in with beforeSend scrubbing (PRIV-03 groundwork)"
  - "Privacy-policy hosting: GitHub Pages from repo content, published before Phase 10 store submission (resolves research Open Question 4 per plan)"
  - "Per-phase update rule: phases 2/7/10 must update policy + registry as done-criteria; disclosure drift is a release blocker"

patterns-established:
  - "Inventory ids = registry ids: governance docs and src/data/provider-registry.json share one provider vocabulary, test-enforced in plan 01-06"
  - "Data-categories single definition list: no disclosure may use a category undefined in the inventory"
  - "Public policy derived from approved docs: privacy-policy.md explicitly derives from inventory + retention policy and must be updated before any handling change ships"

requirements-completed: [GATE-05]

# Metrics
duration: 2min
completed: 2026-08-23
status: complete
---

# Phase 1 Plan 4: Data Inventory, Retention Policy & Privacy Policy Summary

**GATE-05 governance basis: six-provider data inventory with registry-aligned ids, concrete ephemeral/14-day-redacted retention decisions, and GitHub-Pages-ready public privacy-policy content — all encoding the Phase 1 truth that nothing transmits off-device yet.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-08-23T15:15:46Z
- **Completed:** 2026-08-23T15:18:19Z
- **Tasks:** 3
- **Files modified:** 3 (all created)

## Accomplishments
- Data + provider inventory covering all six registry provider ids (lemastra-calculation, google-geocoding-timezone, hosting-platform, openai-responses, supabase, sentry) with data received, on/off-device, trigger, retention, purpose, and introduced phase — plus research A2/A4 re-verification notes carried as must-close items
- Retention & deletion policy fixing concrete decisions: ephemeral compute-and-discard, 14-day access-restricted redacted logs, Phase 7 OpenAI re-verification gate, telemetry-default-exclusion, Phase 3 export/delete principle, per-phase (2/7/10) policy+registry update rule
- Public privacy-policy source content with GitHub Pages hosting decision, plain-language per-provider text phrased for planned flows only, and contact/effective-date placeholders

## Task Commits

Each task was committed atomically:

1. **Task 1: Write the data + provider inventory** - `d8b742a` (docs)
2. **Task 2: Write the retention & deletion policy** - `57d6c7f` (docs)
3. **Task 3: Write public privacy-policy content** - `8d4b968` (docs)

**Plan metadata:** (see final docs commit below)

## Files Created/Modified
- `docs/governance/data-inventory.md` - Provider inventory (6 registry ids), platform-services exemption, 11 data-category definitions, Current posture statement, approval placeholder
- `docs/governance/retention-deletion-policy.md` - Eight concrete retention/deletion decisions (§1–§8), each stating rule + enforcement point
- `docs/governance/privacy-policy.md` - Public policy source content + GitHub Pages hosting note, derived from the two approved-basis documents

## Decisions Made
- Ephemeral compute-and-discard fixed as the default for calculation/geocoding requests before any server exists (T-01-08 mitigation)
- Concrete 14-day log retention window with an explicit redaction rule (no birth data, chart payloads, questions, or prose in logs)
- OpenAI (Phase 7) and Google terms (Phase 2) retention re-verification encoded as activation preconditions, keeping disclosure text honest until verified (T-01-07 mitigation)
- Privacy-policy hosting via GitHub Pages from repo content, published before Phase 10 store submission (planner discretion per research Open Question 4, as instructed by the plan)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Inventory, retention policy, and privacy policy are ready as inputs for wave 2: plan 01-02's provider registry must use exactly these six provider ids and reference retention sections by number; plan 01-06's drafts and consistency tests derive from these documents
- Approval placeholders remain open by design — countersigned in plan 01-07's governance-approval checkpoint
- Research A2 (OpenAI) and A4 (Google) re-verification items are recorded in the inventory and must close before their providers flip to active (Phase 7 / Phase 2)

## Self-Check: PASSED

- All three artifacts exist on disk (verified with `test -f`)
- All six provider ids present in data-inventory.md (verified with grep loop)
- Task grep gates: Task 1 PASS, Task 2 PASS (ephemeral, compute-and-discard, beforeSend, redaction), Task 3 PASS (GitHub Pages, on-device, effective date)
- must_haves artifact patterns verified (lemastra-calculation / ephemeral / effective)
- Commits d8b742a, 57d6c7f, 8d4b968 present on gsd/phase-01-trust-and-release-boundary

---
*Phase: 01-trust-and-release-boundary*
*Completed: 2026-08-23*
