# Phase 1: Trust and Release Boundary - Pattern Map

**Mapped:** 2026-08-22
**Files analyzed:** 18 (new/modified)
**Analogs found:** 0 in-repo (greenfield) / 4 external authoritative analogs + 3 RESEARCH.md-documented reference patterns

> **Greenfield status (verified this session):** `git ls-files` shows the repo contains ONLY `AGENTS.md` and `.planning/*` — no application code, no configs, no CI, no tests. **Every file in this phase is a first instance that sets the pattern.** Where useful, analogs are drawn from the authoritative external dependency `/Users/eggfam/dev/astrology-skill` (per AGENTS.md "Domain dependency" constraint) and from reference patterns already documented with sources in `01-RESEARCH.md`. No in-repo code excerpts exist to copy; none are invented below.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `docs/governance/swiss-ephemeris-posture.md` | doc (governance/decision record) | file-I/O (read by structural test) | EXT: `astrology-skill/docs/birth_to_chart_design.md` §3 (lines 58-76) + EXT: `astrology-skill/tools/NOTICE.md` | structure-match (external) |
| `docs/governance/data-inventory.md` | doc (governance) | file-I/O | EXT: `astrology-skill/docs/birth_to_chart_design.md` §4 field-table style | structure-match (external) |
| `docs/governance/retention-deletion-policy.md` | doc (governance) | file-I/O | none — first instance | none (greenfield) |
| `docs/governance/disclosures/apple-labels.md` | doc (worksheet) | transform (inventory → store taxonomy) | none — must follow Apple's fixed taxonomy (RESEARCH.md) | none (greenfield) |
| `docs/governance/disclosures/play-data-safety.csv` | config (data) | transform (inventory → Play CSV) | none — Google's sample CSV template (RESEARCH.md) | none (greenfield) |
| `src/data/provider-registry.json` | model (versioned data source) | file-I/O (bundled, read by UI + tests) | EXT: `astrology-skill/assets/schemas/chart_input_schema.json` (data-contract style) + RESEARCH.md Pattern 1 shape | structure-match (external) |
| `src/schemas/` (zod registry schema) | utility (validation) | transform (parse/validate) | EXT: `astrology-skill/quick_validate.py` (validation-gate semantics) | structure-match (external) |
| Expo app skeleton (`app/` via `create-expo-app`, SDK 57) | scaffold | request-response (future) | none — official `expo-template-default` 57.0.17 (RESEARCH.md Package Audit) | none (greenfield) |
| `app/privacy/` disclosure screen | component | transform (registry JSON → rendered UI) | none — first RN component in repo | none (greenfield) |
| Expo app config (`app.json` incl. `expo.ios.privacyManifests`) | config | n/a (build config) | RESEARCH.md Code Example (official Expo docs pattern) | reference (documented) |
| `.gitleaks.toml` | config (scanner rules) | batch (scan) | gitleaks default-rule extension (RESEARCH.md; official TOML config) | reference (documented) |
| `.gitleaksignore` | config (fingerprinted allowlist) | batch (scan) | none — first instance; MUST carry rationale comments (RESEARCH.md anti-pattern) | none (greenfield) |
| `.github/workflows/` (secrets + test CI) | config (CI) | batch | RESEARCH.md Code Example lines 279-303 (gitleaks official README pattern) | reference (documented) |
| `.gitignore` (modify: add `.env*`) | config | n/a | none — file doesn't exist yet (created by scaffold) | none (greenfield) |
| `.env.example` (non-secrets only) | config | n/a | none — first instance | none (greenfield) |
| `src/schemas/registry.test.ts` | test | file-I/O (assert) | EXT: `astrology-skill/quick_validate.py` | structure-match (external) |
| `src/__tests__/privacy-screen.test.tsx` | test (component) | file-I/O (render+assert) | none — first test in repo (Vitest + RNTL, Wave 0) | none (greenfield) |
| `src/__tests__/governance-docs.test.ts` + `src/__tests__/disclosures-consistency.test.ts` | test (structural) | file-I/O (read docs, assert) | EXT: `astrology-skill/quick_validate.py` (fail-on-hard-parity pattern) | structure-match (external) |

## Pattern Assignments

### `docs/governance/swiss-ephemeris-posture.md` (doc, decision record)

**Analog (external):** `/Users/eggfam/dev/astrology-skill/docs/birth_to_chart_design.md` §3 "Licensing (explicit notes)" (lines 58-76)

⚠️ **CRITICAL CAVEAT (RESEARCH.md Anti-Patterns + Pitfall 1):** copy the *document structure* — explicit dual-license statement, obligations, chosen path, documented alternative — NOT the legal reasoning. astrology-skill's "AGPL confined to `tools/`" containment position serves *its* distribution model; RESEARCH.md verified (secont_e.pdf, June 2026 edition) that LemAstra's client-calls-server topology falls under the Professional License's server-calling-app clause. The posture doc must record LemAstra's own decision.

**Structure pattern** (external analog, lines 58-76):
```markdown
## 3. Licensing (explicit notes)

- **Swiss Ephemeris** (the C library) and **`pyswisseph`** are dual-licensed:
  **AGPL-3.0** *or* the paid **Swiss Ephemeris Professional License** from
  Astrodienst (source: `astro.com/swisseph/swephinfo_e.htm`).
- AGPL conditions: anyone who *distributes* the software, or *offers it as a
  network service*, must place **the whole project** under AGPL or a compatible
  license, and must offer source to network users.
- **Containment strategy (default).** [...] invoked as a separate process. [...]
- **Closed/commercial path (documented alternative).** [...] this is recorded in
  `tools/NOTICE.md` so the choice is explicit, not silent.
```

**Attribution/notice pattern** (external analog: `/Users/eggfam/dev/astrology-skill/tools/NOTICE.md` lines 30-37):
```markdown
## Third-party attribution

- **Swiss Ephemeris** — © Astrodienst AG, Zurich, Switzerland.
  https://www.astro.com/swisseph/
  Planetary positions are derived from the Swiss Ephemeris / JPL DE431.
```

**Required content (RESEARCH.md lines 356-361 — the posture doc's checklist):** (1) chosen path + rationale; (2) distribution-model statement (clients never embed SE; FastAPI container is the SE-containing artifact; app is "an app containing Swiss Ephemeris" under the contract definition); (3) obligations inventory per path; (4) Astrodienst attribution + no promotional use of author names; (5) approval record (decision maker, date, qualified-review status). RESEARCH.md recommendation: Professional License (CHF 700 one-time), presented as `checkpoint:human-verify`.

---

### `src/data/provider-registry.json` + `src/schemas/` zod schema (model + validation utility)

**Analog (external, data-contract style):** `/Users/eggfam/dev/astrology-skill/assets/schemas/chart_input_schema.json` lines 1-45 — versioned schema with `$schema` declaration, per-field `description`, closed `enum`s for status-like fields:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "Astrology Skill Chart Input",
  "description": "Preferred input contract for astrology reading requests...",
  "type": "object",
  "required": ["reading_type", "chart_data"],
  "properties": {
    "reading_type": {
      "description": "The primary kind of reading requested.",
      "type": "string",
      "enum": ["natal", "transit", ...]
    },
    "tradition_mode": {
      "type": "string",
      "enum": ["classical", "modern", "blended"],
      "default": "blended"
    }
  }
}
```

**Concrete starting shape (RESEARCH.md Pattern 1, lines 180-199 — planner finalizes):**
```json
{
  "schemaVersion": 1,
  "providers": [
    {
      "id": "lemastra-calculation",
      "status": "planned",
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

Key properties to preserve from the analog: closed enums (`"planned" | "active"`), explicit `description` per field (this doc IS the disclosure source of truth), `schemaVersion` for evolution. Zod schema mirrors these as literals (v3/v4 line per RESEARCH.md Supporting stack).

---

### `src/schemas/registry.test.ts`, `src/__tests__/governance-docs.test.ts`, `src/__tests__/disclosures-consistency.test.ts` (structural tests)

**Analog (external, validation-gate semantics):** `/Users/eggfam/dev/astrology-skill/quick_validate.py` — the pattern to port to Vitest:

- `fail(message)` → `SystemExit(1)` (lines 22-24): hard failures abort with exit 1 → CI gate fails.
- Warnings print but don't fail (lines 132-135): only hard parity failures gate.
- **Cross-artifact parity check** (lines 138-168): `validate_report_schema_parity()` asserts one artifact's enums match another's, delegating to a single source of truth — direct analog for `disclosures-consistency.test.ts` asserting every active registry provider appears in the Play CSV.
- Required/optional field set checking (lines 84-92): analog for the posture-doc structural test (all five required sections present).

```python
# quick_validate.py lines 22-24 — exit-code gate semantics to port:
def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)
```

Vitest equivalent behavior: `assert`/`expect` failures inside `vitest run` → non-zero exit → CI job fails (same gate semantics; no custom runner needed).

---

### `.github/workflows/` CI + `.gitleaks.toml` (config, batch scan)

**No in-repo analog.** Reference pattern documented with source in RESEARCH.md lines 279-303 (source: github.com/gitleaks/gitleaks official README — adapt):

```yaml
- uses: gitleaks/gitleaks-action@v2          # scans git history + working tree
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
# ...separate job:
- run: npx expo export --platform web        # produces the plain-text JS bundle
- run: |
    gitleaks dir dist/ --report-path gitleaks-bundle.json --report-format json --redact
    # exit code 1 on findings → job fails → GATE-06 enforced
```

Local per-task equivalents (RESEARCH.md lines 307-311): `gitleaks git . --redact`, `gitleaks dir . --redact`, `npx expo export --platform web && gitleaks dir dist/ --redact`.

`.gitleaks.toml`: extend gitleaks default rules (TOML); add a custom rule per RESEARCH.md Pitfall 4 forbidding secret-suggestive names in `EXPO_PUBLIC_*`. `.gitleaksignore`: fingerprint-based, **every entry requires a documented class + rationale comment** (RESEARCH.md anti-pattern: unannotated ignores destroy the gate's signal).

---

### Expo app config — privacy manifests (config)

**No in-repo analog.** Reference pattern documented in RESEARCH.md lines 315-331 (source: docs.expo.dev/guides/apple-privacy — use `expo.ios.privacyManifests` in app config, never hand-edit native project under CNG):

```json
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

### `app/privacy/` disclosure screen (component, transform)

**No analog — first React Native component in the repo.** Scaffold comes from `create-expo-app@latest` (SDK 57 / `expo-template-default` 57.0.17, RESEARCH.md Package Legitimacy Audit — include the flagged `checkpoint:human-verify` before install). Component contract (RESEARCH.md test map, line 419): renders **every** registry provider with data categories, retention, transmission trigger — read from bundled `provider-registry.json`, never hardcoded strings (anti-pattern: hardcoded disclosure strings in components).

## Shared Patterns

### Pattern A: Single-source-of-truth data consumed by multiple projections
**Source:** RESEARCH.md Pattern 1 (lines 175-201) + external analog `astrology-skill` schema/parity architecture
**Apply to:** provider-registry.json, privacy screen, both store-disclosure drafts, privacy-policy content, and all four structural tests. One registry → UI text + Apple worksheet + Play CSV + policy. Every later phase adding a data flow (2, 7, 10) updates registry + disclosures as done-criteria.

### Pattern B: Exit-code gates (fail hard, warn soft)
**Source:** EXT `/Users/eggfam/dev/astrology-skill/quick_validate.py` (semantics above)
**Apply to:** all Vitest structural tests and both gitleaks CI jobs. Gate = non-zero exit on findings; anything advisory prints WARN without failing.

### Pattern C: Explicit, recorded license/attribution posture
**Source:** EXT `astrology-skill/tools/NOTICE.md` + `docs/birth_to_chart_design.md` §3
**Apply to:** `swiss-ephemeris-posture.md` only — with the caveat that LemAstra records its OWN path (server-calling-app clause applies; containment rationale must NOT be copied).

### Pattern D: Secret classification policy (secret / publishable identifier / user secret)
**Source:** RESEARCH.md Pattern 2 table (lines 203-212)
**Apply to:** `.gitleaksignore`, `.env.example`, CI bundle scan, and all future `EXPO_PUBLIC_*` usage. Publishable identifiers (Supabase anon key, Sentry DSN) allowed but fingerprint-allowlisted with rationale; secrets never in client.

## No Analog Found

All in-repo matches are "none" — the repo is greenfield (verified: only `AGENTS.md` + `.planning/`). Files below additionally lack even an external structural analog; the planner should follow RESEARCH.md patterns directly:

| File | Role | Data Flow | Reason / First-instance guidance |
|------|------|-----------|----------------------------------|
| Expo app skeleton | scaffold | request-response (future) | Generated by official `create-expo-app` — first instance sets repo conventions (Expo Router structure, `npx expo install` versioning) |
| `app/privacy/` screen | component | transform | First RN component; sets testing/render conventions for all later screens |
| `.gitleaksignore` | config | batch | First instance; every fingerprint entry must carry class + rationale comment |
| `.env.example`, `.gitignore` mods | config | n/a | First instance; non-secrets only, `.env*` ignored |
| `retention-deletion-policy.md` | doc | file-I/O | First instance; content driven by RESEARCH.md provider-inventory retention decisions (ephemeral compute-and-discard recommended) |
| `apple-labels.md` / `play-data-safety.csv` | doc/data | transform | Must answer within Apple/Google fixed taxonomies only (RESEARCH.md anti-pattern: never invent categories); Play CSV follows Google's sample template |
| `privacy-screen.test.tsx` | test | file-I/O | First test; Wave 0 installs Vitest + @testing-library/react-native and config |

## Metadata

**Analog search scope:** `/Users/eggfam/dev/lemastra` (full — 25 tracked files, all planning docs); external: `/Users/eggfam/dev/astrology-skill` (authoritative domain dependency per AGENTS.md)
**Files scanned:** 25 in-repo (no code); 4 external analogs read in full/targeted (NOTICE.md, quick_validate.py, chart_input_schema.json, birth_to_chart_design.md §3)
**Early stop:** 4 external analogs + 3 RESEARCH.md-documented reference patterns sufficient — all remaining files are first-instance greenfield
**Pattern extraction date:** 2026-08-22
