# Client Secret-Isolation Policy

| Field | Value |
|-------|-------|
| Requirement | GATE-06 (no model, calculation, database, or third-party service secret shipped in the mobile clients) |
| Status | Recorded — approval pending (countersigned in plan 01-07) |
| Basis | `.planning/phases/01-trust-and-release-boundary/01-RESEARCH.md` (Pattern 2, Pitfalls 3–4) · Expo environment-variable documentation |
| Enforced by | gitleaks local scans + CI gate (plan 01-07) using `.gitleaks.toml` / `.gitleaksignore` |

This policy is the classification authority for GATE-06. Every scanner finding gets one of
the three classes below, and only class-2 identifiers may ever be allowlisted — with a
documented rationale. "No secrets in the client" is enforced by scanning, not promised.

## §1. Classification table

| Class | Examples | Client policy |
|-------|----------|---------------|
| **1. Secret** — forbidden in client | OpenAI/model API keys; Supabase `service_role` and secret keys; Google server API keys (Geocoding/Time Zone); database credentials; signing material (JWT secrets, webhook secrets); EAS-embedded build secrets | **Never** in `EXPO_PUBLIC_*`, **never** in the JS bundle, **never** in any `.env` file committed to this repository. Server-side only — backend deployment configuration (Phase 2+) is the sole home for secrets. |
| **2. Publishable identifier** — allowed, documented | Supabase publishable/anon key (authorization enforced by Row Level Security); Sentry DSN; API endpoint URLs | Allowed in the client bundle **but** each concrete value, once actually added, must be fingerprint-allowlisted in `.gitleaksignore` with its class and rationale (see §3), so scanner output stays meaningful. Authorization must be enforced server-side (RLS or equivalent) — publishable ≠ trusted. |
| **3. User secret** — device-only, later phases | BYO endpoint credential (LLM-03, Phase 7: user-supplied LLM provider credential) | Platform secure storage only. Never synced, never logged, never exported, never bundled. Named now so the class exists before the feature does. |

**Why class 1 is absolute:** Expo inlines every `EXPO_PUBLIC_` variable in plain text into
the compiled application — per the official Expo documentation, such variables "are visible
in plain-text in your compiled application" (docs.expo.dev/guides/environment-variables).
Anything placed there (or anywhere else in client source) must be assumed readable by anyone
holding the app bundle.

## §2. Enforcement

The gate is the scan, run identically locally and in CI (plan 01-07 wires these into
GitHub Actions; the same `.gitleaks.toml` governs both):

```bash
gitleaks git . --redact                                  # full git history
gitleaks dir . --redact                                  # working tree
npx expo export --platform web && gitleaks dir dist/ --redact   # shipped bundle (authoritative)
```

- The **bundle scan is the authoritative check**: `EXPO_PUBLIC_` inlining happens at bundle
  time, so source-only scanning cannot prove what ships. Exit code 1 on findings = gate
  failure (GATE-06 enforced).
- `.gitleaks.toml` extends the default gitleaks ruleset with a custom rule
  (`expo-public-secret-name`) flagging secret-suggestive `EXPO_PUBLIC_` names
  (`…KEY|SECRET|TOKEN|PASSWORD`) — such names are forbidden regardless of the value's entropy.
- `.env.example` carries **non-secret values only** (see its header); `.gitignore` blanket-ignores
  `.env*` with a `!.env.example` negation (plan 01-01), so no real env file can enter history.

## §3. Allowlist contract (`.gitleaksignore`)

Every fingerprint entry in `.gitleaksignore` must be preceded by two comment lines:

1. the **class** from §1 (only `publishable-identifier` qualifies — entries claiming any
   other class are invalid and must be rejected in review), and
2. the **rationale**: what the identifier is and why it is safe to ship.

The file starts empty: no publishable identifier is in the client yet (Supabase/Sentry
arrive in later phases). An unannotated ignore is a gate violation, not a style issue —
silent allowlisting destroys the scanner's signal (RESEARCH.md Pitfall 3).

## §4. Review triggers

This policy re-opens for review when: a class-2 identifier is first added to the client;
Phase 7 introduces user-supplied credentials (class 3); or any new third-party service
enters the provider registry (plan 01-02).

---

*Approval: pending — to be countersigned in plan 01-07 (phase close-out approval checkpoint).*
