# LemAstra Privacy Policy

> **Hosting (editorial note — not part of the published policy):** This file is the source
> content for LemAstra's public privacy-policy page. It will be hosted via **GitHub Pages**
> from this repository's content and published at a public URL **before store submission
> (Phase 10)** — both Apple's App Store and Google Play require a public privacy-policy URL.
> Derived from `docs/governance/data-inventory.md` and
> `docs/governance/retention-deletion-policy.md`; any change to those documents must be
> reflected here before it ships.

**Effective date:** _[placeholder — set at publication, Phase 10]_

## What LemAstra is

LemAstra is a personal astrology workspace. You enter birth details, calculate an accurate
natal chart, explore the chart and its astrological evidence, compare transits for a moment
you choose, discuss the evidence with an AI interpreter, and export a report. This policy
explains, in plain language, what data is involved and what leaves your device.

## What stays on your device

LemAstra is built **local-first**:

- **Two remote features are live in the current release, both user-initiated and ephemeral**:
  chart calculation (LemAstra's own calculation service) and birthplace search (Google
  geocoding and timezone services, called by our server). The app shows you exactly what is
  sent — and asks once before your first calculation — and every such request is
  **discarded immediately after your chart is returned**. Nothing from these requests is
  retained server-side.
- **Your charts, conversations, and reports are stored on your device** (once saving exists),
  and you never need an account to use LemAstra.
- Every other remote feature described below (AI interpretation, diagnostics, accounts and
  sync) is **planned**. Each one is turned on only in a future release, and this policy is
  updated before that happens.

## What each service receives when a remote feature is enabled

These descriptions cover the planned remote features, written so you know what will happen
**before** you use any of them.

### Chart calculation (LemAstra's own calculation service)

When you ask LemAstra to calculate a chart, the birth details needed for it (date, time,
selected birthplace, timezone) are sent to LemAstra's own calculation service. The request is
**discarded immediately after your chart is returned** — we do not keep it on our servers.
Your finished chart is saved **on your device only**; we never store your charts server-side.

### Birthplace search (Google geocoding and timezone services)

When you search for a birthplace, the text you type and the selected place's details are
processed through Google's Geocoding and Time Zone APIs, called by our server so that no
Google credentials ever live in the app. Handling is ephemeral — used to resolve your place
and discarded; we do not build a history of your searches.

### AI interpretation (OpenAI)

When you ask for an interpretation or chat about a chart (a future release), the request
sends the **structured astrological evidence** for your chart, your question, and the current
conversation context — not your raw birth record beyond what the evidence contains. We will
state the exact retention arrangement here, verified against OpenAI's current terms, **before
this feature is turned on**; we will not enable it with an unverified retention claim.

### Diagnostics (Sentry)

Crash and performance reporting is **off by default**. If we ever enable it, it will be
**opt-in**, and reports are scrubbed before sending so they never contain birth data, chart
content, your questions, or conversation text — only technical crash information.

### Accounts and sync (Supabase)

LemAstra works without an account. If account-based sync is added in a future release, this
policy will be updated first to describe exactly what is stored and how you can delete it.

### Service logs (our hosting platform)

Our servers keep short-lived technical logs (up to **14 days**) needed to operate the service
— things like timestamps and request identifiers. Logs never contain your birth data, chart
contents, questions, or generated text.

## What we do not do

- We do **not sell** your personal data.
- We do **not** include advertising or cross-app tracking SDKs.
- We do **not** collect analytics or diagnostics by default.
- We do **not** log or retain birth data, chart contents, questions, or interpretations on
  our servers (requests are handled and discarded, per above).

## Your control over your data

Because your data lives on your device, you control it directly:

- **Export everything.** You can export all of your saved data from the app.
- **Delete everything.** You can delete all of your saved data from the app at any time —
  no account, no request to us, nothing left to remove on our side.

## Changes to this policy

We will update this policy before any change to how data is handled ships in the app, and the
effective date above will change with it. The always-current version is published at the
public URL provided with the app.

## Contact

Questions about this policy or your data: _[contact placeholder — set at publication]_

---

*Source content maintained in the LemAstra repository at `docs/governance/privacy-policy.md`,
derived from the approved data inventory and retention/deletion policy. Publication target:
GitHub Pages, before store submission.*
