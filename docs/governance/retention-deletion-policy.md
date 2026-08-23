# Retention & Deletion Policy

| Field | Value |
|-------|-------|
| Requirement | GATE-05 (retention/deletion decisions) · PRIV-03/PRIV-04 groundwork |
| Status | Recorded — approval pending (countersigned in plan 01-07) |
| Basis | `docs/governance/data-inventory.md` (provider inventory) · `.planning/phases/01-trust-and-release-boundary/01-RESEARCH.md` |
| Enforced by | Phase 2+ calculation-service implementation and CI tests; provider registry retention strings (plan 01-02) reference the sections below by number |

This policy records **decisions, not aspirations**. Each entry states the rule and where it is
enforced. No server-side system exists yet (Phase 1) — these rules are fixed *before* any
server is built, so every later phase inherits them as build requirements rather than
retrofitting them.

## §1. Calculation + geocoding requests — ephemeral, compute-and-discard

**Rule.** Requests to `lemastra-calculation` and `google-geocoding-timezone` are
**ephemeral and compute-and-discard**: the request payload (birth data, place query,
coordinates, timezone, timestamp) is discarded immediately after the response is returned.
Nothing about an individual request is persisted server-side — no request store, no queue
archive, no analytics capture of payloads.

- **Charts persist device-side only in v1** — the calculated chart is stored on the user's
  device (from Phase 3) and is never written to server-side storage in v1.
- **Enforced at:** the Phase 2 calculation-service implementation (request handling must be
  memory-only across request lifetime) and its test suite; the registry's retention strings for
  these providers reference this section.

## §2. Hosting/infrastructure logs — bounded window, access-restricted, redaction rule

**Rule.** `hosting-platform` server logs are retained for a maximum of **14 days** (the
concrete default; tighter platform minimums win if they are shorter), access-restricted to the
operator, and subject to this **redaction rule**: logged content must exclude birth data,
chart payloads, user questions, and generated prose. Logs may carry request metadata
(timestamps, request ids, status codes, coarse platform strings) only.

- **Enforced at:** Phase 2 deployment configuration (log retention setting, access controls)
  and a payload-redaction check in the calculation service before anything is logged (PRIV-04
  groundwork — the redaction requirement is fixed now so the logging path is born redacted).
- **Store mapping effect:** with §1, this keeps the v1 collection posture near-zero
  off-device (research A6).

## §3. Model-payload traffic (Phase 7) — placeholder tied to re-verification

**Rule (placeholder).** `openai-responses` traffic (bounded chart evidence, user question,
conversation context) is **not authorized to activate** until provider retention controls are
re-verified against current OpenAI documentation. Research A2 records defaults of ≈30-day
application-state retention unless `store:false` / zero-data-retention is set; those specifics
must be re-confirmed at Phase 7 before the provider flips to `active`.

- **Activation precondition:** Phase 7 records the verified retention configuration (including
  the chosen storage setting) in this section and in the provider registry before first
  production traffic.
- **Enforced at:** the Phase 7 managed-connection implementation and its registry update
  (§7); disclosure text must not claim a retention behavior that is not yet verified.

## §4. Telemetry/diagnostics — excluded by default; Sentry only opt-in and scrubbed

**Rule.** Telemetry and diagnostics are **excluded by default** — no crash reporter or
analytics SDK ships active in v1 defaults. `sentry` may be activated only **post-beta, as an
explicit user opt-in**, with `beforeSend` scrubbing configured so that birth data, chart
payloads/prose, user questions, and conversation content are never transmitted (PRIV-03
groundwork).

- **Enforced at:** SDK initialization gated on the opt-in setting; the `beforeSend` scrub
  (allowlist-based: strip everything except coarse crash/performance fields) is a build
  requirement of any activation phase; activation updates this policy and the registry (§7).

## §5. Local data — deletable and exportable by the user, without an account

**Rule (principle fixed now).** Local personal data — charts, conversations, report drafts —
is **deletable and exportable by the user without an account**. The export-all and delete-all
mechanics arrive with Phase 3 (requirements WORK-05/06: export-all, delete-all). Delete-all
must remove every stored personal artifact on the device with no server round-trip (nothing to
request server-side, per §1/§6).

- **Enforced at:** Phase 3 local-storage implementation and tests; this section is the
  principle those mechanics implement.

## §6. Deletion of ephemeral server-side processing — automatic post-response

**Rule.** Server-side processing of calculation/geocoding requests is deleted automatically
when the response is returned; there is **nothing to purge** and no user-initiated deletion
request is needed for it. A user deleting their local data (§5) therefore completes deletion
of everything that exists: no server-side residue of their requests exists to remove.

- **Enforced at:** same enforcement path as §1 (memory-only request lifetime).

## §7. Update rule — policy + registry updated per enabling phase

**Rule.** Every phase that enables a provider flow — **Phase 2** (calculation, geocoding,
hosting), **Phase 7** (model traffic), **Phase 10** (store submission/disclosure publication),
and any later Sentry or Supabase activation — must update **this policy and the provider
registry** (status flip to `active`, verified retention specifics, any new data categories)
as part of that phase's done-criteria. Disclosure drift from shipped behavior is a release
blocker, not a follow-up.

- **Enforced at:** plan 01-06's consistency tests (inventory ids ↔ registry ↔ store
  disclosures) and phase planning conventions (each enabling phase's plan carries the update
  task).

## §8. Approval

| Field | Value |
|-------|-------|
| Approval status | Pending — this policy requires human approval before release (GATE-05) |
| Countersigned | To be recorded in plan 01-07's governance-approval checkpoint |

---

*Companion document: `docs/governance/data-inventory.md` (providers and data categories).
Store-disclosure drafts (plan 01-06) derive their retention answers from the sections above.*
