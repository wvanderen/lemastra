# Data & Provider Inventory

| Field | Value |
|-------|-------|
| Requirement | GATE-05 (part 1 — inventory basis for disclosures) |
| Status | Recorded — approval pending (countersigned in plan 01-07) |
| Sources | `.planning/phases/01-trust-and-release-boundary/01-RESEARCH.md` (Provider & Data Inventory, fetched 2026-08-22) · `.planning/research/STACK.md` (technology stack) · Apple App Store privacy-details docs · Google Play Data safety docs |
| Registry alignment | Provider identifiers below are the canonical ids consumed by `src/data/provider-registry.json` (plan 01-02). Inventory ids **must equal** registry ids — enforced by the plan 01-06 consistency test. |

This inventory is the single source of truth for every disclosure LemAstra makes: the in-app
privacy screen renders the registry derived from it, the Apple label worksheet and Play Data
safety CSV (plan 01-06) map from it, and the public privacy policy (`privacy-policy.md`) is
written from it. A claim that is not in this inventory must not appear in any disclosure.

## 1. Provider Inventory

One row per provider the v1 stack will use, keyed by registry identifier. Every provider is
**planned** — see §4 Current posture for what that means for the Phase 1 release.

| Identifier | Provider | Data Received | On-device or Off-device | Transmission Trigger | Retention | Purpose | Introduced |
|------------|----------|---------------|-------------------------|----------------------|-----------|---------|------------|
| `lemastra-calculation` | LemAstra Calculation Service (self-hosted FastAPI container, first-party) | Birth date, birth time, selected birthplace (query/label), birthplace coordinates, IANA timezone, birth timestamp | Off-device (when enabled) | User-initiated chart calculation (Phase 2) | **Ephemeral, compute-and-discard** — request payload discarded immediately after the response is returned; charts persist device-side only in v1, never server-side (retention-deletion-policy.md §1) | App functionality | Phase 2 |
| `google-geocoding-timezone` | Google Geocoding API + Time Zone API (called server-side through the calculation service) | Place query text, coordinates, birth timestamp | Off-device (when enabled) | User-initiated birthplace search (Phase 2) | Ephemeral server-proxy handling (§1 of the retention policy); Google request-data terms — caching/attribution constraints — re-verified when Phase 2 wires it (research A4) | App functionality | Phase 2 |
| `hosting-platform` | Container hosting platform (Fly.io, Render, Railway, Cloud Run, or equivalent — first-party infrastructure) | Server request logs incl. request metadata (no payload content, per redaction rule) | Off-device (when enabled) | Every API request the calculation service handles (Phase 2) | Logs bounded to **14 days**, access-restricted, redaction rule excludes birth data, chart payloads, questions, and generated prose from logged content (retention-deletion-policy.md §2, PRIV-04 groundwork) | Infrastructure | Phase 2 |
| `openai-responses` | OpenAI Responses API (managed connection; server-side keys only) | Bounded chart evidence, user question, conversation context | Off-device (when enabled) | User-initiated interpretation / chat message (Phase 7) | **Placeholder** — provider retention controls re-verified before activation: research A2 records defaults ≈30-day application-state retention unless `store:false`/zero-data-retention; re-verify at Phase 7 (retention-deletion-policy.md §3) | App functionality | Phase 7 |
| `supabase` | Supabase (Auth / Postgres / Storage / RLS) | None in v1 — receives nothing while v1 is account-less and local-first; account identifiers and synced artifacts arrive only with v2 account/sync features | Off-device (when enabled, v2) | None in v1 (planned: account sign-in and sync, post-v1) | Not applicable in v1; v2 activation ships with its own retention decisions and updates this inventory + the registry (retention-deletion-policy.md §7) | App functionality (v2 accounts/sync) | v2 (post-v1) |
| `sentry` | Sentry (crash/performance diagnostics, Expo + Python SDKs) | Crash and performance diagnostics — scrubbed via `beforeSend`; never birth data, chart payloads, questions, or generated prose | Off-device (only if activated) | None by default; opt-in crash/diagnostic report if activated post-beta | **Excluded by default** — no telemetry ships while the default posture holds; activation is opt-in, post-beta, scrubbing-gated, and updates this inventory + the registry (retention-deletion-policy.md §4, PRIV-03 groundwork) | Analytics / Diagnostics (optional) | Post-v1-beta (opt-in) |

**Verification notes carried from research (must-close items):**

- **A4 — Google request-data terms** (caching/attribution constraints on Geocoding + Time Zone
  API request data): re-verify against current Google API terms when Phase 2 wires the flow,
  before the provider flips to `active` in the registry.
- **A2 — OpenAI retention specifics** (default ≈30-day application-state retention unless
  `store:false` / zero-data-retention): re-verify against current OpenAI documentation at
  Phase 7, before the provider flips to `active` in the registry.

## 2. Platform Services

Apple- and Google-provided store/platform services (App Store, Google Play, OS-level
crash handling offered by the store, store payments, and similar) are **excluded from
LemAstra's app disclosures**: they are services the store operators provide under their own
privacy regimes, not data flows LemAstra initiates or controls. Apple states this explicitly —
"You are not responsible for disclosing data collected by Apple" — and Google's Data safety
form likewise scopes to the developer's own collection and sharing. These services receive no
LemAstra birth data, chart content, questions, or generated prose through any LemAstra flow.

## 3. Data Categories

Definition list for every category slug used by the provider registry. This one list is shared
by the registry, the store-disclosure drafts (plan 01-06), and the public privacy policy — a
category may not be used in any disclosure unless it is defined here.

| Slug | Plain-language definition |
|------|---------------------------|
| `birth-date` | The date a person was born (year, month, day), as entered for chart calculation. |
| `birth-time` | The time of birth as entered for chart calculation, including its confidence (exact, approximate, or unknown). |
| `birthplace-query` | The birthplace the user selected from search results (its display label), identifying which place was chosen. |
| `birthplace-coordinates` | The latitude/longitude of the selected birthplace, resolved from the selected place. |
| `iana-timezone` | The IANA timezone identifier (e.g. `Europe/Zurich`) historically associated with the birthplace at the birth moment. |
| `place-query-text` | The free-text query a user types while searching for a birthplace. |
| `birth-timestamp` | The birth date + time + timezone resolved to a single UTC instant used for calculation. |
| `request-metadata` | Technical request information (timestamps, request identifiers, IP addresses, user-agent/platform strings) generated by handling a request. |
| `bounded-chart-evidence` | The structured, calculated astrological facts sent for interpretation (placements, aspects, houses, dignities, methodology references) — evidence only, never free-form birth data beyond what calculation requires. |
| `user-question` | The question or focus a user asks about their chart during interpretation. |
| `conversation-context` | The prior turns of an interpretation conversation, kept scoped to the chart being discussed. |

## 4. Current Posture

**Phase 1 truth: no personal data transmits off-device.** In the Phase 1 release, every
provider listed above is **planned, not active** — no calculation, geocoding, model,
account, or diagnostics traffic exists, and no provider receives any data. Saved charts and
conversations do not yet exist in Phase 1. Local-first storage arrives in Phase 3 and **stays
on-device** in v1: charts, conversations, and reports are stored on the user's device only.
Each provider's remote flow is introduced only in the phase named in its "Introduced" column,
and activating any provider requires updating this inventory, the provider registry, and the
retention/deletion policy first (retention-deletion-policy.md §7).

## 5. Approval

| Field | Value |
|-------|-------|
| Approval status | Pending — this inventory requires human approval before release (GATE-05) |
| Countersigned | To be recorded in plan 01-07's governance-approval checkpoint |

---

*Derived from research-verified provider characteristics
(`.planning/phases/01-trust-and-release-boundary/01-RESEARCH.md`, sources fetched 2026-08-22).
Identifier vocabulary is shared with `src/data/provider-registry.json` (plan 01-02); consistency
is enforced by the plan 01-06 test suite.*
