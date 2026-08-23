# Phase 1: Trust and Release Boundary - Research

**Researched:** 2026-08-22
**Domain:** Licensing compliance (Swiss Ephemeris/AGPL), app-store privacy disclosures, provider/data governance, client secret-isolation
**Confidence:** HIGH (licensing facts cross-verified against official contract text) / MEDIUM (store taxonomies from official docs; provider details partially carried from prior-session research)

## Summary

Phase 1 is a governance-plus-walking-skeleton phase in a brand-new repository (verified: no application code exists — only `AGENTS.md` and `.planning/`). The four requirements (GATE-01, GATE-05, GATE-06, PRIV-07) are all release-boundary gates, but success criteria 1 ("User can review … before enabling any remote feature") and 4 ("no … secret is present in either mobile client") require a real Expo client to exist. The phase therefore has three intertwined deliverable classes: (a) **approved governance documents** — Swiss Ephemeris licensing/distribution posture, data inventory, retention/deletion policy, provider inventory; (b) **a minimal Expo (SDK 57) app skeleton** hosting a disclosure surface driven by a versioned, schema-validated provider registry; and (c) **enforced secret-isolation tooling** — gitleaks-based scanning wired into CI covering both the repo and the exported client bundle.

The Swiss Ephemeris licensing question is now precisely answerable. Astrodienst's official pages and the Professional License contract (June 2026 edition, text extracted from `secont_e.pdf`) confirm dual licensing (AGPL-3.0 or Professional License), that the choice must be made *before distributing software containing SE or activating any public service*, and — critically — the contract's verbatim clause: *"Even when the distributed app contains no calculation code itself but requests calculation from a server providing it, this is considered an app containing Swiss Ephemeris."* LemAstra's planned architecture (mobile client → FastAPI server running pyswisseph) falls exactly under this clause. The Professional License is a one-time CHF 700, 99-year, unlimited-project-tier contract; the AGPL path requires placing "the whole software project under AGPL or a compatible license" and offering source to network users. The astrology-skill repo's "separate process confines AGPL to `tools/`" interpretation is that repo's own legal position for its distribution model and must not be adopted as LemAstra's without qualified review.

Store privacy disclosures map mechanically from the data inventory once it exists: Apple's "nutrition labels" (App Store Connect) and Google's Data Safety form (Play Console) use different taxonomies that do not transfer between stores (Google says so explicitly). Both exempt on-device-only processing; both treat service-and-discard transmission as non-collection (Apple) or declarable-ephemeral (Play); both require a public privacy-policy URL; Google supports full offline CSV import/export of the Data Safety form, which makes an in-repo, reviewable disclosure artifact practical. Play requires the form even for zero-collection apps.

**Primary recommendation:** Build the phase as: (1) a `docs/governance/` set — `swiss-ephemeris-posture.md`, `data-inventory.md`, `provider-registry` (structured data consumed by both the app UI and the store-disclosure drafts), `retention-deletion-policy.md`, plus Apple-label and Play-CSV disclosure drafts derived from it; (2) an Expo SDK 57 skeleton with a Privacy/Disclosure screen rendering the provider registry; (3) gitleaks config + CI gate (repo history, working tree, and exported JS bundle) with an explicit allowlist classifying publishable identifiers (Supabase publishable key, Sentry DSN) as non-secrets; (4) `checkpoint:human-verify` tasks for the licensing-path decision and qualified review of the posture and disclosure set.

<user_constraints>

## User Constraints (from PROJECT.md / AGENTS.md — no CONTEXT.md; yolo mode)

### Locked Decisions (project-level, binding on this phase)

- **Tech stack**: React Native via Expo (SDK 57 stable line / RN 0.86); New Architecture only; Expo Router for navigation; let `npx expo install` select native package versions.
- **Domain dependency**: `dev/astrology-skill` is the authoritative starting point for interpretive datasets and methodologies; bring it in as a versioned dependency; never ask the LLM to calculate placements.
- **Trust**: Calculated facts and structured astrological evidence must stay distinguishable from generated interpretation.
- **Initial scope**: v1 = natal charts + transits; accounts/sync, web parity, raw provider keys, temporal/social features are v2+ (out of scope).
- **Privacy readiness**: No architecture assuming birth data, personal events, or conversations are public; privacy-first, local-by-default.
- **Backend direction**: FastAPI + Python 3.12 container; pyswisseph ≥2.10.3.2 locked, confined to the calculation service; Swiss Ephemeris licensing is an explicit critical gate (STACK.md "Licensing gate (critical)").
- **Data platform direction**: Supabase Postgres/Auth/RLS; publishable keys may be in the app; service-role and OpenAI keys may not (STACK.md).

### the agent's Discretion (research-recommended, planner decides)

- Exact licensing path recommended for approval: Professional License (CHF 700) for closed-source distribution, or AGPL if the project open-sources the calculation service — presented as a decision with a human checkpoint (see Open Questions).
- Whether to scaffold the Expo app in this phase (research: yes — success criteria 1 and 4 need a client; keep it minimal walking skeleton).
- Disclosure surface implementation: versioned provider-registry data file + schema validation + settings/first-run screen rendering it.
- gitleaks configuration specifics, CI wiring, and the publishable-identifier allowlist policy.

### Deferred Ideas (OUT OF SCOPE)

- Accounts/sync, web parity, raw API keys in-app (v2: SYNC-*, WEB-01, KEY-01).
- Animated calendar, event journaling, publishing/social features, aggregate research.
- Server-side PDF rendering pipeline (justified only when cross-platform parity becomes a requirement).
- PostHog/analytics: "Do not block v1 on analytics" — if ever added, coarse events only.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description (REQUIREMENTS.md) | Research Support |
|----|-------------------------------|------------------|
| GATE-01 | The project records an approved Swiss Ephemeris licensing and distribution posture before public or commercial beta. | Verified dual-license facts + the server-calling-app contract clause define exactly what the posture document must decide (license path, distribution model, notices, review record). See Swiss Ephemeris Licensing section. |
| GATE-05 | The release has an approved data inventory, retention/deletion policy, provider inventory, and accurate Apple and Google privacy disclosures. | Store taxonomies captured from official Apple/Google docs with collection/sharing definitions, exemptions, and Play's CSV format; provider inventory derived from STACK.md stack. See Provider & Data Inventory and Store Disclosure Mapping sections. |
| GATE-06 | No model, calculation, database, or third-party service secret is shipped in the mobile clients. | Expo `EXPO_PUBLIC_` inlining behavior documented; gitleaks capabilities (dir/git/bundle scan, config, CI exit codes) documented; secret vs. publishable-identifier classification defined. See Client Secret Isolation section. |
| PRIV-07 | User can review current provider, retention, and data-transmission disclosures before enabling remote calculation or model features. | Disclosure-surface pattern: schema-validated provider registry rendered by an Expo screen; registry carries per-provider data categories, transmission triggers, retention, and activation status so later phases extend rather than rewrite it. See Architecture Patterns. |

</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| In-app disclosure surface (PRIV-07) | Client (Expo app screen) | Repo governance (registry source data) | The review happens on-device before feature enable; content must come from versioned data so it cannot drift from governance docs |
| Licensing posture record (GATE-01) | Repo governance docs | Backend deployment (calculation service) | The decision binds the Phase 2 container's distribution terms; clients never embed SE |
| Data/provider inventory + retention policy (GATE-05) | Repo governance docs | — | Single source of truth from which store disclosures, in-app text, and later privacy features derive |
| Apple/Google privacy disclosures (GATE-05) | Store consoles (App Store Connect / Play Console) | Repo draft artifacts (Play CSV import; Apple label worksheet) | Publication happens in consoles; Play's CSV import makes the draft reviewable in-repo; Apple's answers are console-entered and updatable without app updates |
| Public privacy-policy URL (required by both stores) | CDN / Static hosting | Repo (source content) | Required before store submission; content derived from the data inventory |
| Secret-free client enforcement (GATE-06) | CI (gitleaks on repo + exported bundle) | Client conventions (no secrets in `EXPO_PUBLIC_`) | Enforcement must be automated at commit/build time, not review-time |

## Standard Stack

### Core

| Library / Tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `create-expo-app` | 4.0.0 (npm, verified) | Scaffold the Expo walking skeleton | Official Expo scaffolder; `npx create-expo-app@latest` with the SDK 57 default template (`expo-template-default` 57.0.17) [VERIFIED: npm registry] |
| Expo SDK | 57.0.15 (npm, verified) | Client runtime for the disclosure surface | Project-locked choice; SDK 57 = RN 0.86 / React 19.2.3 per STACK.md (official Expo docs) [VERIFIED: npm registry + CITED: docs.expo.dev] |
| gitleaks | latest release (brew/GitHub release; MIT) | Secret detection for GATE-06 | De-facto standard: 28.9k stars, `git`/`dir`/`stdin` modes, TOML config with default-rule extension, SARIF/JSON reports, exit-code CI gate, official GitHub Action + pre-commit hook [CITED: github.com/gitleaks/gitleaks] |
| Play Data safety CSV | Google's sample template | In-repo reviewable disclosure artifact for Play Console | Play Console supports full offline CSV completion and import; the sample format is documented in the official help article [CITED: support.google.com/googleplay/android-developer/answer/10787469] |
| Expo privacy manifests | via `expo.ios.privacyManifests` in app config | iOS `PrivacyInfo.xcprivacy` (required-reason APIs, collected data types) | Official Expo mechanism; avoids hand-editing native project under CNG [CITED: docs.expo.dev/guides/apple-privacy + developer.apple.com/documentation/bundleresources/privacy_manifest_files] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest (+ React Native Testing Library) | latest stable | Test the disclosure screen renders registry content; schema validation tests | Phase's automated checks for PRIV-07; STACK.md testing stack — Wave 0 install (repo has no test framework yet) |
| `zod` | latest stable v3/v4 line | Schema-validate the provider registry consumed by app + disclosure tooling | Keeps disclosure data and code honest at both boundaries (STACK.md: RHF+Zod for forms; reuse for registry) |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gitleaks | trufflehog / GitHub Secret Protection / hand-rolled grep script | gitleaks is simplest to run locally (brew) + CI with custom rules and ignore fingerprints; GitHub Secret Protection complements but doesn't scan built bundles; hand-rolled regex misses entropy/encoding tricks |
| Play CSV draft in repo | Console-only entry | CSV gives reviewable, diffable, phase-updated artifacts — matches GATE-05's "approved" framing |
| In-repo Apple label worksheet | Spreadsheet outside repo | Same single-source-of-truth argument; Apple has no import format, so a structured markdown/JSON worksheet is the reviewable equivalent |

**Installation:**
```bash
brew install gitleaks                       # secret scanning (also available: GitHub Action, Docker, pre-built binaries)
npx create-expo-app@latest lemastra         # Expo SDK 57 walking skeleton (exact target dir is a planner decision)
```

**Version verification (this session):** `expo@57.0.15`, `create-expo-app@4.0.0`, `expo-template-default@57.0.17` via npm registry; `pyswisseph 2.10.3.2` on PyPI with classifier `License :: OSI Approved :: GNU Affero General Public License v3` (confirms AGPL-3.0; backend use begins Phase 2). gitleaks is versioned by release tag, not a package manager.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `create-expo-app` | npm | mature | 79k/wk | github.com/expo/expo | OK | Approved |
| `expo` | npm | patch published 2026-08-20 | 8.4M/wk | github.com/expo/expo | SUS ("too-new") | Approved with context — false positive: the signal reflects the latest patch publish date of the official Expo SDK (8.4M weekly downloads, official repo, documented in Expo docs). `checkpoint:human-verify` before install per protocol; expect trivial confirmation |
| `expo-template-default` | npm | patch published 2026-08-20 | 54k/wk | none in manifest (official Expo template) | SUS ("too-new", "no-repository") | Approved with context — same false-positive pattern; template is published by the Expo team alongside the SDK. Include in the same checkpoint |
| gitleaks | brew/GitHub releases (Go binary) | ~7 yrs | 28.9k stars | github.com/gitleaks/gitleaks | OK (manual review) | Approved — MIT, maintainer states feature-complete/security-patches-only (noted; no replacement warranted now) |
| `pyswisseph` | PyPI | mature | — | astrorigin.com/pyswisseph | OK (manual review) | Not installed this phase; AGPL-3.0 classifier verified for GATE-01 record |

**Packages removed due to SLOP verdict:** none
**Packages flagged as suspicious [SUS]:** `expo`, `expo-template-default` — flagged only by the recency heuristic; planner adds one `checkpoint:human-verify` covering the Expo scaffold install.

*All packages above were confirmed against the official Expo/Astrodienst documentation paths, not just registry existence.*

## Architecture Patterns

### System Architecture Diagram

```
                      GOVERNANCE (repo, human-approved)
  ┌──────────────────────────────────────────────────────────────────┐
  │ docs/governance/                                                  │
  │  swiss-ephemeris-posture.md   data-inventory.md                   │
  │  retention-deletion-policy.md provider-registry.{json|yaml} ──┐   │
  │  disclosures/apple-labels.md  disclosures/play-data-safety.csv │   │
  └───────────────────────────────────────────────────────────────┼───┘
                                                    derive & review │
                                  ┌─────────────────────────────────┘
                                  ▼
   USER DEVICE                     CI / VALIDATION
  ┌────────────────────┐          ┌──────────────────────────────────┐
  │ Expo client (SDK57)│          │ gitleaks git .   (repo history)  │
  │  Privacy screen ───┼──renders─┼  gitleaks dir .  (working tree)  │
  │  (registry-driven, │  from    │  gitleaks dir <exported bundle>  │
  │   pre-feature)     │  bundled │  vitest: registry schema + UI    │
  │  NO secrets in     │  copy    │  exit 1 on findings = gate fail  │
  │  EXPO_PUBLIC_*     │          └──────────────────────────────────┘
  └─────────┬──────────┘                        │
            │ (nothing transmits in Phase 1 —   ▼
            │  remote features arrive Phase 2+) STORE CONSOLES (manual, Phase 10)
            │                          App Store Connect labels ← apple-labels.md
            ▼                          Play Console Data safety  ← play CSV import
   [Phase 2+: calculation, geocoding,
    model traffic — each new flow must
    update the registry BEFORE enable]
```

### Recommended Project Structure

```
lemastra/
├── app/ or src/                # Expo Router app (skeleton + privacy screen)
│   └── privacy/                # disclosure screen rendering the registry
├── src/data/provider-registry.json   # versioned disclosure source (schema-validated)
├── src/schemas/                # zod schema for the registry
├── docs/governance/            # GATE-01/05 approved documents (human-reviewed)
│   ├── swiss-ephemeris-posture.md
│   ├── data-inventory.md
│   ├── retention-deletion-policy.md
│   └── disclosures/
│       ├── apple-labels.md     # App Store Connect worksheet
│       └── play-data-safety.csv # Play Console import CSV
├── .gitleaks.toml              # extend default rules + LemAstra specifics
├── .gitleaksignore             # fingerprinted allowlist (publishable ids)
├── .github/workflows/          # CI: gitleaks (repo + bundle), vitest
└── PRIVACY-POLICY source       # content destined for the public URL both stores require
```

### Pattern 1: Disclosure content as versioned, schema-validated data (PRIV-07)

**What:** All user-facing and store-facing disclosure text derives from one structured registry file, not from hardcoded UI strings or separate documents.
**When to use:** Always in this codebase — this is the mechanism that keeps GATE-05 artifacts and PRIV-07 UI synchronized as later phases add real data flows.

```json
// src/data/provider-registry.json — illustrative shape (planner finalizes schema)
{
  "schemaVersion": 1,
  "providers": [
    {
      "id": "lemastra-calculation",
      "name": "LemAstra Calculation Service",
      "status": "planned",           // "planned" | "active" — flips when Phase 2 enables it
      "introducedInPhase": 2,
      "dataCategories": ["birth-date", "birth-time", "birthplace-coordinates", "iana-timezone"],
      "transmissionTrigger": "user-initiated chart calculation",
      "retention": "ephemeral — request discarded after response (per retention-deletion-policy.md)",
      "appleLabelMapping": "Other Data Types / Other User Content",
      "playDataTypes": ["Personal info → Other info", "Location → Precise location"],
      "purpose": "App functionality"
    }
  ]
}
```

**Why:** Apple's "Collect" definition turns on retention beyond real-time servicing, and Play's on off-device transmission with an ephemeral exemption — the same facts drive both labels, the in-app text, and the privacy policy. One source, three projections. Schema validation (zod) in CI catches drift between phases.

### Pattern 2: Secret classification policy (GATE-06)

**What:** A written, enforced classification of what may legitimately appear in a mobile client vs. what must never be embedded.

| Class | Examples | Client policy |
|-------|----------|---------------|
| **Secret** (forbidden in client) | OpenAI/model API keys, Supabase `service_role`/secret keys, Google server API keys, DB credentials, signing material, EAS-embedded build secrets | Never in `EXPO_PUBLIC_*`, never in JS bundle; server-side only [CITED: docs.expo.dev/guides/environment-variables — "visible in plain-text in your compiled application"] |
| **Publishable identifier** (allowed, documented) | Supabase publishable/anon key (authorization enforced by RLS), Sentry DSN, API endpoint URLs | Allowed in bundle; MUST be fingerprint-allowlisted in `.gitleaksignore` with a documented rationale so scanner output stays meaningful [CITED: STACK.md — "Publishable keys may be in the app; service-role and OpenAI keys may not"] |
| **User secret** (device-only, later phases) | BYO endpoint credential (LLM-03) | Platform secure storage, never synced/logged — Phase 7 concern, but the policy should name it now |

### Pattern 3: Scan the shipped artifact, not just the source (GATE-06)

**What:** `EXPO_PUBLIC_` inlining happens at bundle time, so the authoritative check is on the exported bundle: run `npx expo export` (or scan the EAS build artifact) then `gitleaks dir <output>` in CI. Source scanning (`gitleaks git .`) catches committed secrets including history.

### Anti-Patterns to Avoid

- **Hardcoded disclosure strings in components:** guarantees drift from the inventory; render from the registry.
- **Adopting astrology-skill's AGPL-containment rationale as LemAstra's legal position:** that interpretation serves *its* distribution model; Astrodienst's own pages state the whole-project obligation and the professional contract explicitly covers server-calling apps.
- **Inventing store-disclosure categories:** both stores define fixed taxonomies with different semantics (e.g., Apple's "optional disclosure" criteria vs. Play's "ephemeral processing"); answer within their taxonomies only.
- **`.gitleaksignore` without rationale comments:** silently allowlisted identifiers destroy the gate's signal; every ignore needs a documented class + reason.
- **One-time disclosure thinking:** every later phase that adds a data flow (2: calculation/geocoding, 7: model traffic, 10: store submission) must update registry + disclosures as part of that phase's done-criteria — encode this expectation now.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secret detection | Custom regex/grep scripts | gitleaks (default rules + custom TOML rules + entropy + base64/hex decoding) | Entropy scoring, encoded-secret decoding, fingerprint baselines, report formats, and CI integration are solved problems; hand-rolled scanners miss obfuscated leaks |
| Store disclosure categories | Free-form privacy descriptions | Official Apple/Play taxonomies + Play CSV template | The stores review against their own fixed data-type/purpose lists; free-form text doesn't map and both warn that you alone are responsible for accuracy |
| iOS privacy manifest | Hand-written Xcode plist under CNG | `expo.ios.privacyManifests` in app config | Expo owns native project generation; also documents the static-CocoaPods parsing caveat and per-package PrivacyInfo files |
| Disclosure content management | Per-screen prose | Versioned registry + zod schema | Single source of truth consumed by UI, store worksheets, and privacy policy |

**Key insight:** This phase's product *is* correctness of claims about data and licensing. Every hand-rolled approximation of an official taxonomy or scanner is a liability that surfaces at app review, at audit, or at distribution time.

## Common Pitfalls

### Pitfall 1: Treating Swiss Ephemeris licensing as an implementation detail
**What goes wrong:** Shipping a hosted/commercial beta without a recorded license path; or assuming the client contains no SE code so no obligation exists.
**Why it happens:** The calculator lives server-side and the astrology-skill repo documents a plausible-sounding containment story.
**How to avoid:** The Professional License contract *explicitly* defines an app requesting calculation from a server as an app containing Swiss Ephemeris [VERIFIED: secont_e.pdf, June 2026 edition]. Record the posture (path, payer, notices, review status) before any public/commercial activation; obtain qualified review (GATE-01's "approved").
**Warning signs:** Posture doc citing only astrology-skill's NOTICE.md; no human-approval record; beta plans without a chosen license path.

### Pitfall 2: Disclosures that drift from reality
**What goes wrong:** Store labels or in-app text describing practices that no longer match shipped behavior after later phases add flows.
**Why it happens:** Disclosures written as one-time prose at launch.
**How to avoid:** Registry-driven disclosures (Pattern 1) + per-phase update expectation; Apple answers can be updated anytime without an app update, Play's form likewise [CITED: Apple/Play docs].
**Warning signs:** UI strings containing provider names; disclosure edits required in components rather than data files.

### Pitfall 3: "No secrets" interpreted as "no identifiers"
**What goes wrong:** Either (a) Supabase publishable keys/Sentry DSNs treated as violations and awkwardly proxied, or (b) real secrets excused because "the scanner always flags something."
**Why it happens:** Publishable keys are JWT-shaped and trip generic entropy rules; without a classification policy every finding looks the same.
**How to avoid:** Written classification (Pattern 2) + fingerprinted, commented `.gitleaksignore`; bundle scan as the authoritative gate.
**Warning signs:** Unannotated ignores; scanner disabled "because of false positives."

### Pitfall 4: `EXPO_PUBLIC_` used for anything sensitive
**What goes wrong:** A key inlined in plain text into the shipped JS bundle.
**Why it happens:** It's the path of least resistance for config in Expo.
**How to avoid:** Official docs state these vars are plain-text visible in the compiled app; add a custom gitleaks rule or lint forbidding secret-suggestive names in `EXPO_PUBLIC_*`; `.env.example` contains only non-secrets; `.gitignore` covers `.env*` [CITED: docs.expo.dev/guides/environment-variables].

### Pitfall 5: Reusing iOS disclosures for Google Play
**What goes wrong:** Materially wrong Play declarations.
**Why it happens:** Taxonomies look similar; Google explicitly says the frameworks "may differ materially."
**How to avoid:** Maintain both artifacts from the shared inventory (Play CSV + Apple worksheet); e.g., Play treats date-of-birth under "Personal info → Other info" and requires declaring even pseudonymous data; Apple has distinct linked/tracking columns [CITED: both official docs].

### Pitfall 6: No public privacy-policy URL when stores require it
**What goes wrong:** Disclosure work blocked at submission time.
**Why it happens:** Both stores require a public URL; it's infrastructure nobody scheduled.
**How to avoid:** The phase produces policy content derived from the inventory and picks hosting (e.g., static site/GitHub Pages); publishing can precede app submission [CITED: Apple "Privacy Policy (Required)"; Play "privacy policy is required"].

### Pitfall 7: Publishing store answers without the underlying inventory being approved
**What goes wrong:** Accurate-looking labels with no auditable basis — GATE-05 asks for the inventory AND matching disclosures.
**How to avoid:** Sequence: inventory → policy → registry → derived store artifacts → human approval checkpoint → (later, Phase 10) console publication.

## Code Examples

### gitleaks CI gate with bundle scan (GitHub Actions)

```yaml
# Source pattern: github.com/gitleaks/gitleaks (official README) — adapt for the repo's CI
name: secrets
on: [push, pull_request]
jobs:
  gitleaks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2          # scans git history + working tree
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  bundle-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx expo export --platform web        # produces the plain-text JS bundle
      - run: |
          gitleaks dir dist/ --report-path gitleaks-bundle.json --report-format json --redact
          # exit code 1 on findings → job fails → GATE-06 enforced
```

### Local equivalents (per-task quick checks)

```bash
gitleaks git . --redact            # full history scan (also available as pre-commit hook)
gitleaks dir . --redact            # working tree
npx expo export --platform web && gitleaks dir dist/ --redact
```

### Expo privacy manifest via app config

```json
// Source: docs.expo.dev/guides/apple-privacy
{
  "expo": {
    "ios": {
      "privacyManifests": {
        "NSPrivacyAccessedAPITypes": [
          {
            "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
            "NSPrivacyAccessedAPITypeReasons": ["CA92.1"]
          }
        ]
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Privacy policy text only | Apple privacy labels + Play Data safety + iOS privacy manifests | Labels 2020; manifests required since May 2024 | Structured, per-type declarations are mandatory submission inputs, not marketing copy |
| Secrets scanned manually | gitleaks/trufflehog in CI + GitHub Secret Protection | standard practice | Automated gates expected; bundle-level scanning now practical |
| Swiss Ephemeris GPL-2 era terms | AGPL-3.0 or Professional License; DE441 base since May 2026 | SE 2.00 (2014) → current contract June 2026 edition | Server-calling apps explicitly in scope of the professional license; CHF 700 one-time unlimited tier current |

**Deprecated/outdated:**
- The OpenAI help-center retention article ID moved during this session; retention specifics (default ~30-day retention, `store: false`) carry from prior-session official-docs research and must be re-verified when Phase 7 builds the connection.
- Supabase docs URL for key management moved (404 this session); publishable/service-role distinction carries from prior officially-cited research and STACK.md.

## Swiss Ephemeris Licensing (GATE-01 decision space)

**Verified facts** (cross-checked: astro.com/swisseph/swephinfo_e.htm + secont_e.pdf contract text + pyswisseph PyPI classifier + astrology-skill repo inspection):

- Dual license: **(a) GNU AGPL-3.0** or **(b) Swiss Ephemeris Professional License**. "The choice must be made before the software developer distributes software containing parts of Swiss Ephemeris to others, and before any public service using the developed software is activated." [VERIFIED: astro.com]
- AGPL path: obligation to "place his or her whole software project under the AGPL or a compatible license"; network-service usage triggers AGPL §13 source-offer duties. [VERIFIED: astro.com]
- Professional License (June 2026 edition): unlimited tier **CHF 700 one-time**, **99-year** validity, signed contract countersigned by Astrodienst; licensee may distribute SE in compiled form; **source distribution permitted but not required**; modifications to SE source stay AGPL-conditioned; "SWISS EPHEMERIS Inside" label granted; author names must not be used promotionally. [VERIFIED: secont_e.pdf]
- **The app-calls-server clause (verbatim):** "Even when the distributed app contains no calculation code itself but requests calculation from a server providing it, this is considered an app containing Swiss Ephemeris." [VERIFIED: secont_e.pdf]
- pyswisseph 2.10.3.2 is AGPL-3.0 (PyPI classifier) — the *library* is AGPL regardless of ephemeris data mode; the built-in Moshier mode avoids `.se1` data-file handling but not the library license. `.se1` files, if later used, are freely redistributable with Astrodienst's copyright notice preserved (astrology-skill `tools/NOTICE.md`).
- astrology-skill's own licensing structure: MIT runtime at root; **AGPL-3.0 confined to `tools/`** (birth_to_chart.py + smoke tests) with LICENSE/NOTICE/README per-file. When LemAstra vendors the skill (Phase 2+), those files and notices come along and must survive packaging — record skill commit hash per chart. [VERIFIED: repo inspection of /Users/eggfam/dev/astrology-skill]

**What the posture document must decide (its required content):**
1. Chosen path (AGPL-compatible open-sourcing of the calculation service vs. Professional License purchase) + rationale.
2. Distribution model statement: mobile clients never embed SE/pyswisseph (STACK.md architecture); the FastAPI container is the SE-containing artifact; the app is "an app containing Swiss Ephemeris" under the professional-license definition because it requests server calculation.
3. Obligations inventory: for AGPL — whole-project licensing, source offer to network users, license texts; for Professional — executed contract record (date, parties, tier), compiled-form distribution rights, notice preservation.
4. Attribution/notices: Astrodienst copyright + SE-derived-positions attribution in backend NOTICE and provenance strings (existing `source_notes` pattern: "Computed by pyswisseph/Swiss Ephemeris 2.10.03…"); no promotional use of author names.
5. Approval record: decision maker, date, qualified-review status (pending/approved — GATE-01 requires approval *before* public/commercial beta, so Phase 1 can land the posture with review explicitly scheduled).

**Research recommendation (planner shapes into tasks; human decides):** Professional License (CHF 700 one-time) is the low-friction path for a closed-source commercial release and is explicitly designed for the server-calling-app topology; AGPL is coherent if the project intends to open-source the calculation service. Either way the decision is cheap now and expensive after distribution begins.

## Provider & Data Inventory (GATE-05 starter)

Providers implied by the v1 stack (STACK.md), with the disclosure-relevant characteristics the inventory must record. Status reflects Phase 1 reality: **no remote feature is enabled yet** — the registry marks each provider planned/active so disclosures stay accurate per release.

| Provider | Data Received | Transmission & Retention Characteristics | Purpose | Introduced |
|----------|--------------|------------------------------------------|---------|-----------|
| LemAstra calculation service (self-hosted container) | Birth date/time, birthplace query/coords, IANA tz | First-party; retention policy must fix: ephemeral compute-and-discard vs. persisted provenance (recommended: ephemeral request, persisted chart stays device-side in v1) | App functionality | Phase 2 |
| Google Geocoding + Time Zone APIs (server-side keys) | Place text query; coordinates + timestamp | Third-party; keys server-side; request-data retention per Google API terms — caching/attribution constraints documented in prior research; verify current terms when Phase 2 wires it [ASSUMED: specifics not re-verified this session] | App functionality | Phase 2 |
| OpenAI Responses API (managed connection) | Bounded chart evidence + question + conversation context | Third-party; prior-session official-docs research: default application-state retention ≥30 days unless `store:false`/ZDR — re-verify at Phase 7 [ASSUMED for current values] | App functionality | Phase 7 |
| Supabase (Auth/Postgres/Storage/RLS) | Account + synced artifacts (when enabled) | v1 is account-less local-first; Supabase is backend infrastructure for managed services; publishable key only in client, RLS enforced [CITED: prior research + STACK.md] | App functionality | v2 (not in v1 flows) |
| Sentry (optional) | Crash/performance diagnostics | PRIV-03/04: scrub via `beforeSend`; birth data/chart prose/questions excluded; Sentry's mobile privacy FAQ maps directly to store label answers [CITED: docs.sentry.io] | Analytics/Diagnostics (optional) | Post-v1-beta, opt-in posture |
| Apple/Google platform services | Store-provided | Apple: "You are not responsible for disclosing data collected by Apple" | — | Phase 10 |
| Hosting platform (Fly/Render/Railway/GCP) | Server logs incl. request metadata | First-party infra; log-retention + redaction rules belong in the retention policy (PRIV-04) | Infrastructure | Phase 2 |

**Mapping notes for the disclosure drafts (starter, from official taxonomies):**
- On-device-only chart storage/saving/reopening (Phases 2–3) is **not collection** on either store → supports an eventual near-"no data collected" posture for the local-first core.
- Calculation traffic that is serviced and discarded: Apple — not "collected" (no disclosure); Play — declare as collected + ephemeral (hidden from users) or not collected if never stored; the inventory's retention decisions decide which.
- Birthplace geocoding when enabled: Precise Location + query text off-device → disclosed as collected (App functionality) unless the server-proxy design keeps it ephemeral-and-declared on Play.
- Model-payload traffic when enabled: Other User Content (Apple) / Other user-generated content (Play), App functionality; Play additionally gets Personal info → Other info for birth date.
- Both stores require the **privacy policy URL**; Play requires the form even for zero-collection apps.

## Runtime State Inventory

> Greenfield phase — no application runtime exists yet. Recorded to satisfy the checklist explicitly.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — no app, no database, no services (verified: repo contains only AGENTS.md and .planning/) | None |
| Live service config | None — no deployed services, no store console entries, no provider accounts verified in-repo | Apple Developer / Play Console account existence unconfirmed — flag for user (see Open Questions) |
| OS-registered state | None — no scheduled tasks, daemons, or global installs created by this repo | None |
| Secrets/env vars | None — no .env files, no SOPS, no CI secrets defined yet (repo scan: only AGENTS.md, .planning/) | Phase 1 creates the *policy* and scanner config that govern all future ones |
| Build artifacts | None — no node_modules, no dist, no .venv in this repo | None — verified by directory listing |

## Common Questions the Planner Will Face

1. **Does Phase 1 scaffold the app?** Research: yes — minimal Expo skeleton; PRIV-07 needs a renderable surface and GATE-06 needs a scanneable artifact. Keep it skeletal (one privacy screen + registry); wheel/storage/backend all come later.
2. **What is "approved"?** GATE-01/05 use "approved" — Phase 1 should produce the artifacts plus a recorded approval workflow (human checkpoint), with qualified/legal review explicitly schedulable before any public/commercial beta (the gates' trigger point). The phase can complete with review status honestly recorded as pending-approval if the approver is the user.
3. **Store publication timing:** Console entry happens at Phase 10 submission; Phase 1 delivers reviewed drafts (Play CSV is importable; Apple worksheet transcribes into App Store Connect). Nothing here blocks on console access.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + React Native Testing Library (STACK.md testing stack) — Wave 0 install (none exists; repo is greenfield) |
| Config file | none — see Wave 0 |
| Quick run command | `npx vitest run` (scoped: `npx vitest run src/schemas`) |
| Full suite command | `npx vitest run && gitleaks git . --redact && gitleaks dir . --redact` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PRIV-07 | Disclosure screen renders every registry provider with data categories, retention, transmission trigger | unit/component | `npx vitest run src/__tests__/privacy-screen.test.tsx -t "renders provider"` | ❌ Wave 0 |
| PRIV-07 | provider-registry.json validates against zod schema (status enum, required fields, apple/play mappings present) | unit | `npx vitest run src/schemas/registry.test.ts` | ❌ Wave 0 |
| GATE-06 | Repo history + working tree contain no secrets (allowlisted publishables excepted) | CI gate | `gitleaks git . --redact && gitleaks dir . --redact` | ❌ Wave 0 |
| GATE-06 | Exported client bundle contains no secrets | CI gate | `npx expo export --platform web && gitleaks dir dist/ --redact` | ❌ Wave 0 |
| GATE-01 | Posture document exists with all five required sections and a decision/approval record | structural check (script or test reading docs/governance) | `npx vitest run src/__tests__/governance-docs.test.ts` | ❌ Wave 0 |
| GATE-05 | Play CSV present and internally consistent with registry (every active provider row represented) | structural check | `npx vitest run src/__tests__/disclosures-consistency.test.ts` | ❌ Wave 0 |
| GATE-05 | Human approval of inventory/policy/disclosures | manual | — (checkpoint:human-verify at end of phase) | n/a |
| GATE-01 | Qualified licensing review | manual | — (checkpoint:human-verify; may be recorded as scheduled-before-beta) | n/a |

### Sampling Rate
- **Per task commit:** quick command above (vitest scoped + `gitleaks dir .`)
- **Per wave merge:** full suite incl. `gitleaks git .` history scan
- **Phase gate:** full suite green before `/gsd-verify-work`; human checkpoints closed

### Wave 0 Gaps
- [ ] `vitest` + `@testing-library/react-native` install & config — framework
- [ ] `src/schemas/registry.test.ts` — PRIV-07 schema enforcement
- [ ] `src/__tests__/privacy-screen.test.tsx` — PRIV-07 rendering
- [ ] `src/__tests__/governance-docs.test.ts` — GATE-01 structure check
- [ ] `src/__tests__/disclosures-consistency.test.ts` — GATE-05 registry↔CSV consistency
- [ ] `.gitleaks.toml` + CI workflow — GATE-06 automation

## Security Domain

`security_enforcement: true`, ASVS L1, block-on high.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (v1 account-less; Phase 7+ revisits) | — |
| V3 Session Management | no (this phase) | — |
| V4 Access Control | yes (client-side) | No privileged credentials in client; server-authoritative design documented in posture/inventory |
| V5 Input Validation | yes | zod schema for provider registry before consumption by UI/tests |
| V6 Cryptography | no (this phase; secure storage arrives Phase 7) | — |
| V8 Data Protection | yes | Secret classification policy; retention/deletion policy doc; telemetry-scrubbing posture (PRIV-03/04 groundwork) |
| V14 Config | yes | `.gitleaks.toml`, `.gitignore` (.env*), CI gate config; no secrets in repo or `EXPO_PUBLIC_*` |

### Known Threat Patterns for Expo/RN + governance phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage via bundled env/config | Information Disclosure | gitleaks source+bundle CI gate; classification policy; plain-text inlining documented |
| Slopsquatting/supply-chain injection | Tampering | Package Legitimacy Gate (this audit); `npx expo install --fix` for SDK-aligned versions |
| Inaccurate privacy disclosures | Repudiation (legal) | Registry-driven single source; human approval checkpoints; store-taxonomy-faithful drafts |
| License non-compliance (AGPL/SE) | Repudiation (legal) | Recorded posture with decision + qualified review before distribution |
| Committed `.env` / history secrets | Information Disclosure | gitignored `.env*`, history scanning, pre-commit hook option |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node + npm | Expo scaffold, vitest, bundle export | ✓ | 22.22.3 / 10.9.8 | — |
| git | history scanning, phase workflow | ✓ | 2.50.1 | — |
| gitleaks | GATE-06 scanning | ✗ | — | `brew install gitleaks` (brew present); or official GitHub Action / Docker image in CI — no blocker |
| Homebrew | gitleaks install path | ✓ | 6.0.18 | — |
| Docker | backend work (Phase 2+) | ✓ | 29.5.3 | not needed this phase |
| Go | alternate gitleaks build | ✓ | 1.26.5 | unnecessary if brew/action used |
| uv | Python backend deps (Phase 2+) | ✗ | — | install when Phase 2 begins — not a Phase 1 blocker |
| watchman | Metro perf (optional) | ✗ | — | none needed |
| Apple Developer / Play Console accounts | store disclosure *publication* | ? unconfirmed | — | Phase 1 ships reviewable drafts; confirm accounts before Phase 10 |

**Missing dependencies with no fallback:** none blocking Phase 1.
**Missing dependencies with fallback:** gitleaks (brew/action/docker); uv (Phase 2 concern).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | gitleaks default rule set covers OpenAI/Google/generic API keys (exact rule IDs not enumerated this session) | Client Secret Isolation | Custom rules needed sooner; minor — TOML extension is trivial |
| A2 | OpenAI retention specifics (≥30-day default, `store:false` control) carried from prior-session official-docs research | Provider Inventory | Disclosure text imprecise; re-verify before Phase 7 registry activation |
| A3 | Supabase publishable vs service-role key model carried from prior research (docs URL moved; 404 this session) | Secret Classification | Misclassification of client key; verify against current Supabase docs when key handling is implemented |
| A4 | Google API request-data retention characteristics not re-verified this session | Provider Inventory | Same as A2 — verify when Phase 2 wires geocoding |
| A5 | Store-disclosure *publication* happens at Phase 10; Phase 1 delivers approved drafts | Multiple | If earlier publication is expected, console access becomes a phase dependency |
| A6 | v1 launch collection posture predicted near-zero off-device (local-first core + ephemeral calculation) | Store Disclosure Mapping | Label answers change if later phases persist server-side; registry design absorbs this by tracking status per provider |
| A7 | Swiss Ephemeris "whole software project" AGPL scope reading and the sufficiency of either license path require qualified review — research provides facts, not legal advice | SE Licensing | The core reason GATE-01 exists; mitigated by the human-verify checkpoint |

## Open Questions (RESOLVED)

1. **Which Swiss Ephemeris license path?**
   - What we know: both paths' terms, costs, and the server-calling-app clause (verified).
   - What's unclear: whether the project intends closed-source distribution (→ Professional License, CHF 700) or will open-source the calculation service (→ AGPL).
   - Recommendation: planner encodes a `checkpoint:human-verify` decision task presenting both; default recommendation = Professional License.
   - **(RESOLVED)** Plan 01-03 Task 1 — `checkpoint:decision` presenting both paths to the user (default recommendation: Professional License).
2. **Who approves GATE-01/05 artifacts, and is qualified legal review available?**
   - What we know: gates require "approved" status before public/commercial beta.
   - What's unclear: approver identity and whether counsel review happens in-phase or is scheduled.
   - Recommendation: user is the approver-of-record this phase; legal review task recorded as scheduled-before-beta.
   - **(RESOLVED)** Plan 01-07 Task 2 — user is approver-of-record via the blocking governance-approval checkpoint; 01-07 Task 3 records qualified review as scheduled-before-beta.
3. **Do Apple Developer Program and Google Play Console accounts exist?**
   - What we know: drafts don't need them; publication (Phase 10) does.
   - Recommendation: confirm during this phase's human checkpoint; not blocking.
   - **(RESOLVED)** Plan 01-07 Task 2 step 5 — informational (non-blocking) account-existence check recorded during the approval checkpoint.
4. **Privacy-policy hosting target?**
   - What we know: a public URL is mandatory for both stores.
   - Recommendation: static hosting (e.g., GitHub Pages) from repo content; decide in plan.
   - **(RESOLVED)** Plan 01-04 Task 3 — explicit decision: GitHub Pages, published at Phase 10 store submission.
5. **Sentry in v1 default posture?**
   - What we know: STACK.md makes it optional; disclosure answers differ if enabled.
   - Recommendation: registry marks Sentry "optional/planned" with scrubbing preconditions; activation decision deferred to a later phase with its own disclosure update.
   - **(RESOLVED)** Plan 01-02 Task 1 — provider 6 (Sentry) entered as opt-in/post-beta in the provider registry; activation deferred with its own disclosure update.

## Sources

### Primary (HIGH confidence)
- astro.com/swisseph/swephinfo_e.htm — dual-license terms, choice timing, whole-project AGPL obligation, attribution rules (fetched verbatim this session)
- astro.com/swisseph/secont_e.pdf (June 2026 edition) — Professional License contract text incl. the server-calling-app clause, CHF 700/99-year terms, source-distribution option (downloaded + text-extracted this session)
- /Users/eggfam/dev/astrology-skill — MIT root LICENSE, tools/ AGPL-3.0 LICENSE + NOTICE.md + README.md, docs/birth_to_chart_design.md §3 licensing analysis, requirements.txt (direct repo inspection)
- pypi.org/pypi/pyswisseph — version 2.10.3.2, AGPL-3.0 classifier (registry query this session)
- npm registry — expo@57.0.15, create-expo-app@4.0.0, expo-template-default@57.0.17 (registry query this session)

### Secondary (MEDIUM confidence)
- developer.apple.com/app-store/app-privacy-details/ — label mechanics, Collect definition, purposes, optional-disclosure criteria, on-device exemption, privacy-policy requirement (fetched verbatim)
- support.google.com/googleplay/android-developer/answer/10787469 — Data safety form scope, collect/share definitions, ephemeral processing, pseudonymous data, CSV format, zero-collection-app requirement (fetched verbatim)
- developer.apple.com/documentation/bundleresources/privacy_manifest_files + docs.expo.dev/guides/apple-privacy — PrivacyInfo.xcprivacy keys and Expo app-config configuration incl. CocoaPods parsing caveat (fetched verbatim)
- docs.expo.dev/guides/environment-variables — EXPO_PUBLIC_ plain-text inlining warning, .env handling (fetched verbatim)
- github.com/gitleaks/gitleaks — capabilities, config format, CI/pre-commit integration, maintenance status (fetched verbatim)
- docs.sentry.io (React Native sensitive-data) — beforeSend scrubbing, sendDefaultPii, mobile-privacy/store-disclosure FAQ pointer (fetched verbatim)
- Prior-session officially-cited research (.planning/research/STACK.md, PITFALLS.md, ARCHITECTURE.md) — OpenAI retention, Supabase key model, Google API policies, Expo SDK 57 mapping

### Tertiary (LOW confidence)
- Seam `classify-confidence --provider webfetch` returns LOW as a provider-tier default; official-doc fetches are content-verbatim, so claims above are tagged CITED/VERIFIED per provenance convention rather than by provider tier. Noted for transparency.

## Metadata

**Confidence breakdown:**
- Licensing facts (GATE-01): HIGH — official page + contract PDF + package classifier + repo inspection, cross-consistent
- Store disclosure mechanics (GATE-05): HIGH on mechanics (verbatim official docs), MEDIUM on LemAstra-specific answers (dependent on unmade retention decisions)
- Secret-isolation approach (GATE-06): HIGH on Expo inlining behavior and gitleaks capabilities; MEDIUM on default rule coverage (A1)
- Architecture (registry-driven disclosures): MEDIUM — sound pattern, schema details unsettled (planner's discretion)

**Research date:** 2026-08-22
**Valid until:** 2026-09-21 (stable domain; re-verify OpenAI/Supabase specifics at their introduction phases per A2/A3)
