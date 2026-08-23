# App Store Connect Privacy-Label Worksheet

| Field | Value |
|-------|-------|
| Requirement | GATE-05 (part 2 — Apple privacy-label disclosure draft) |
| Status | Draft — transcribed into App Store Connect at Phase 10 store submission |
| Sources | `src/data/provider-registry.json` (plan 01-02) · `docs/governance/data-inventory.md` (plan 01-04) · Apple App Store privacy-details documentation (01-RESEARCH.md) |
| Consistency | Enforced by `src/__tests__/disclosures-consistency.test.ts` — every registry provider id must appear in this worksheet |

This worksheet transcribes the answers LemAstra enters in App Store Connect's App Privacy
section ("privacy nutrition labels"). Apple has no import format, so this structured worksheet
is the reviewable in-repo equivalent. Every answer uses **Apple's fixed data-type and purpose
taxonomy only** — see §4.

## 1. Current release answer

**Data Not Collected.**

For the Phase 1 release, the answer to whether this app collects data is **no** — no data
types are collected, linked to identity, or used for tracking:

- Every provider in the registry is **planned, not active** (`data-inventory.md` §4): no
  calculation, geocoding, model, account, or diagnostics flow exists, so nothing transmits
  off-device at all.
- Saved charts do not exist yet in Phase 1; when local saving arrives (Phase 3) it stays
  on-device, and Apple exempts **on-device-only processing** from disclosure — data accessed
  and processed only on the user's device is never "collected".
- Apple's definition of collection also excludes **service-and-discard transmission** (data
  transmitted off-device solely to service the request in real time and not retained). Phase
  2's calculation/geocoding traffic is designed to qualify
  (`retention-deletion-policy.md` §1) — but the current release needs neither exemption: no
  remote feature exists.

## 2. Prepared answers per provider

The answers to enter **when each provider activates**. Later phases update this worksheet and
the console answers as part of their done-criteria (`retention-deletion-policy.md` §7) —
they never re-derive answers from scratch.

| Provider id | Apple data type(s) | Purpose | Linked to identity | Tracking | Notes (activation) |
|-------------|--------------------|---------|--------------------|----------|--------------------|
| `lemastra-calculation` | User Content → Other User Content | App Functionality | No — account-less v1 | No | Phase 2. Ephemeral compute-and-discard request (policy §1); the chart persists device-side only. Registry mapping: `Other User Content`. |
| `google-geocoding-timezone` | Location → Precise Location; User Content → Other User Content | App Functionality | No — account-less v1 | No | Phase 2. Server-proxied ephemeral handling (policy §1); Google request-data terms re-verified when wired (research A4). |
| `hosting-platform` | Other Data Types | App Functionality | No — account-less v1 | No | Phase 2. Request metadata only, in access-restricted logs ≤ 14 days under the redaction rule (policy §2). Registry draft said `Other Data`; this worksheet uses Apple's official type `Other Data Types`. |
| `openai-responses` | User Content → Other User Content | App Functionality | No — account-less v1 | No | Phase 7. Not authorized to activate until provider retention controls are re-verified (policy §3, research A2). |
| `supabase` | Identifiers → User ID; User Content → Other User Content | App Functionality | No in v1 — Yes once v2 accounts activate (the account identifier is the identity) | No | v2 (post-v1). Activation ships with its own retention decisions and updates this worksheet (policy §7); publishable key only in the client, never a service-role key. |
| `sentry` | Diagnostics → Crash Data; Diagnostics → Performance Data | Analytics | No | No | Post-beta, opt-in only; `beforeSend` scrubbing means birth data, chart payloads, questions, and prose are never transmitted (policy §4). |

## 3. Privacy policy URL

**Placeholder — set at publication (Phase 10):** the public URL hosting
`docs/governance/privacy-policy.md` via GitHub Pages, published before store submission.
App Store Connect requires a privacy-policy URL for every app.

> `[set in Phase 10] https://<github-pages-host>/lemastra/privacy` ← source:
> `docs/governance/privacy-policy.md`

## 4. Taxonomy rules

- Answers use **Apple's fixed data-type/purpose taxonomy only**. Categories: Contact Info,
  Location, Sensitive Info, Contacts, User Content, Browsing History, Search History,
  Identifiers, Purchases, Usage Data, Diagnostics, Surroundings, Other Data Types. Purposes:
  App Functionality, Analytics, Product Personalization, Third-Party Advertising, Developer's
  Advertising/Marketing. No other values may appear in console answers.
- Google Play Data-safety terms must **never** appear in Apple answers (and vice versa) —
  Google states the two frameworks "may differ materially" (research Pitfall 5). The Play
  counterpart artifact is `play-data-safety.csv` (§5).
- No invented categories: a data type may only be declared if it maps to a registry
  provider's `appleLabelMapping` and the data inventory.
- **Apple label answers can be updated in App Store Connect without an app release** — an
  activation phase updates the console as soon as its flow ships.

## 5. Companion Play artifact

`docs/governance/disclosures/play-data-safety.csv` is the Google Play counterpart, in
Google's own CSV template format. It **always mirrors the shipping release** (currently the
zero-collection truth). Prepared activation answers for Play live in the registry's
`playDataTypes` field per provider — the same single source this worksheet derives from —
not in the CSV.
