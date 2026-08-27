---
phase: 260826-tob-fix-aspect-schema-contract-mismatch-calc
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/api-schemas.test.ts
  - src/lib/api-schemas.ts
autonomous: true
requirements: [CALC-01]

must_haves:
  truths:
    - "A real calculate response — aspects carrying applying-only, separating-only, or neither flag — parses through calculateResponseSchema without error"
    - "A recorded live server response (trimmed, all three aspect shapes) passes the client contract test, so server and client contracts can never silently diverge again"
    - "The schema rejects contract drift: applying/separating values other than literal true, and aspects missing exact, throw"
    - "Full vitest suite and npx tsc --noEmit are green; no file under api/, vendor/, src/app/, or copy decks is touched"
  artifacts:
    - path: "src/lib/api-schemas.ts"
      provides: "aspectSchema mirroring the calculator's applying XOR separating presence-flag contract"
      contains: "applying: z.literal(true).optional()"
    - path: "src/lib/api-schemas.test.ts"
      provides: "real-world aspect fixtures (all three shapes) + recorded-response contract test"
      contains: "recordedCalculateFixture"
  key_links:
    - from: "src/lib/api-schemas.ts (aspectSchema)"
      to: "vendor/astrology-skill/tools/birth_to_chart.py (compute_aspects, L693-704)"
      via: "schema field-for-field mirrors calculator emission: applying emitted only when true, separating only when false, neither when applying is None (stationary); exact always boolean"
      pattern: "z\\.literal\\(true\\)\\.optional\\(\\)"
    - from: "src/lib/api-schemas.test.ts (recorded contract test)"
      to: "src/lib/api-schemas.ts (calculateResponseSchema)"
      via: "calculateResponseSchema.parse(recordedCalculateFixture) — recorded live envelope must pass the client gate"
      pattern: "calculateResponseSchema\\.parse\\(recordedCalculateFixture\\)"
---

<objective>
Fix the aspect schema contract mismatch: the vendored calculator emits `applying: true` XOR `separating: true` as optional presence flags (neither when a body pair has zero relative motion, e.g. angle contacts), but `aspectSchema` declares `separating: z.boolean()` as required and does not know `applying`. Every real calculate response (HTTP 200, server-valid) therefore fails `calculateResponseSchema.parse` inside `postCalculate`, and the resulting ZodError is mis-rendered as the network-error banner "Can't reach the calculation service."

Purpose: Restore CALC-01 — users can calculate a natal chart whose aspects pass the product's fixtures. The server is correct; only the client zod contract is wrong. Aspects are parsed but not rendered in v1 UI, so this is a schema-contract-only fix with no UI changes.

Output: Corrected `aspectSchema` in `src/lib/api-schemas.ts`; real-world aspect fixtures and a recorded-response contract test in `src/lib/api-schemas.test.ts`.
</objective>

<execution_context>
@/Users/eggfam/.config/opencode/gsd-core/workflows/execute-plan.md
@/Users/eggfam/.config/opencode/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md

# The bug (fully root-caused — do not re-research)
- src/lib/api-schemas.ts lines 253-260: `aspectSchema` has `separating: z.boolean()` REQUIRED, no `applying` field. Everything else in the schema is correct.
- vendor/astrology-skill/tools/birth_to_chart.py lines 693-704 (`compute_aspects`): the calculator ALWAYS emits `body_a`, `aspect`, `body_b`, `orb_degrees`, `exact` (boolean); it adds `applying: true` only when applying is True, `separating: true` only when applying is False, and NEITHER key when applying is None (zero relative speed — stationary bodies / Ascendant-Midheaven angle contacts, see `_aspect_relation` lines 648-657).
- Live reproduction: a real 30-aspect chart had 12 applying-only, 17 separating-only, 1 neither (Ascendant square Midheaven), 0 both. All real responses fail the client parse on `aspects[*].separating` invalid_type.
- A recorded full real response lives at /var/folders/7b/nybvblc92tz3l9q2j0jd4wx40000gn/T/opencode/calc-responses/case-placidus-lex.json (Lexington KY, 1990-06-15 14:30, Placidus, 7.4 KB) — the source for the contract-test fixture.
- `aspectSchema` is consumed only by `chartDataSchema.aspects` (api-schemas.ts line 298-301); grep confirms NO other src file references aspects, so the type change (`separating` boolean→`true | undefined`, new optional `applying`) breaks no consumer and needs no UI changes.
- Do NOT touch: api/ (server), vendor/ (skill), UI components, copy decks. The server is correct.

@src/lib/api-schemas.ts
@src/lib/api-schemas.test.ts
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pin the real aspect contract in tests (RED)</name>
  <files>src/lib/api-schemas.test.ts</files>
  <behavior>
    - Test: calculateResponseSchema.parse accepts an aspect carrying only applying: true (no separating key) — currently throws, must pass after fix
    - Test: calculateResponseSchema.parse accepts an aspect carrying only separating: true
    - Test: calculateResponseSchema.parse accepts an aspect carrying NEITHER flag (stationary/angle contact) while exact stays required boolean
    - Test: calculateResponseSchema.parse succeeds on a trimmed RECORDED live calculate envelope (case-placidus-lex) whose 4 aspects cover all three shapes; parsed aspects preserve applying/separating as true-or-absent and exact as boolean on every entry
    - Test: contract-drift mutations throw — an aspect with applying: false (calculator only ever emits literal true), and an aspect with exact removed
  </behavior>
  <action>
All edits in src/lib/api-schemas.test.ts, following the file's existing fixture + mutation-table discipline:

1. Rewrite `calculateTimedFixture.chart_data.aspects` (currently one separating-only aspect at lines 167-176) to three aspects with verbatim real-world shapes from the recorded Lexington chart:
   - applying-only: body_a "Sun", aspect "square", body_b "Moon", orb_degrees 5.3982, applying true, exact false
   - separating-only: body_a "Sun", aspect "trine", body_b "Jupiter", orb_degrees 2.1, separating true, exact false
   - neither: body_a "Ascendant", aspect "square", body_b "Midheaven", orb_degrees 0.7063, exact false — with a brief comment that the calculator omits both flags when relative speed is zero (angles carry speed None).
   Leave `calculateUnknownFixture`'s single separating-only aspect as-is (a valid shape under both old and new schema, keeps the RED diff targeted).

2. Add a new `recordedCalculateFixture` const (plain object, NO `satisfies CalculateResponse` — it is recorded server output the client must accept, not client-authored data). Inline trimmed verbatim values from the recorded response at the temp path above (read it first; if the temp file is gone, the three shapes plus provenance values are in this plan's context and the RCA samples):
   - reading_type: "natal"
   - chart_data: house_system "Placidus", ascendant {sign "Libra", degree 5.5032, absolute_degree 185.5032}, midheaven {sign "Cancer", degree 6.2095, absolute_degree 96.2095}, house_cusps trimmed to the first 2 entries, placements trimmed to Sun/Moon/Mercury verbatim, sect verbatim {status "day", luminary_of_sect "Sun", sect_mate_planets ["Jupiter","Saturn"], notes "Sun altitude 71.6° at birth (above horizon)."}, lots trimmed to the single Lot of Fortune entry verbatim (it carries an extra house: 9 — keep it; lotSchema is loose), source_notes verbatim, birth_time_confidence "Timed"
   - chart_data.aspects: exactly 4 verbatim entries — Sun square Moon {orb 5.3982, applying true, exact false}; Moon sextile Venus {orb 0.1061, applying true, exact false}; Moon trine Jupiter {orb 3.0419, separating true, exact false}; Ascendant square Midheaven {orb 0.7063, exact false}
   - provenance: all 10 keys verbatim (skill_revision 660d9921…, swisseph_version "2.10.03", tzdata_version "2026.3", schema_version, ephemeris_mode "Moshier (built-in)", house_system "Placidus", zodiac_mode "tropical", orb_policy, input_revision, calculator_cmd)
   - unavailable_factors: [] and provisional_factors: [] (both empty in the real timed response)
   Give the fixture a header comment: recorded from the live calculate endpoint (case-placidus-lex, Lexington KY 1990-06-15 14:30, Placidus) so the client zod contract and the server golden tests can never silently diverge again.

3. Extend the `describe("calculateResponseSchema")` block:
   - In the existing "parses a full timed-chart envelope" test, assert the parsed aspects cover all three shapes (one applying true, one separating true, one with both flags absent).
   - New test "parses a recorded real calculate response (client/server contract)": run calculateResponseSchema.parse on recordedCalculateFixture; assert chart_data.aspects has length 4; exactly 2 entries have applying === true, exactly 1 has separating === true, exactly 1 has both applying and separating undefined; every entry has typeof exact === "boolean"; provenance.input_revision is a string.
   - New mutation test "rejects aspect contract drift": deep-copy recordedCalculateFixture, set chart_data.aspects[0].applying = false → expect parse to throw (the calculator only ever emits literal true; any other value means the server contract changed); another deep copy deleting chart_data.aspects[0].exact → expect parse to throw.

4. Run the scoped suite and confirm the RED state: the recorded-response test and the timed-envelope assertions fail on separating invalid_type (expected boolean, received undefined) — this reproduces the production bug at the contract layer. Commit the failing tests: `test(quick): pin calculator aspect contract with recorded-response fixture`
  </action>
  <verify>
    <automated>npx vitest run src/lib/api-schemas.test.ts 2>&1 | grep -E 'recorded|timed-chart|Tests ' ; npx vitest run src/lib/api-schemas.test.ts 2>&1 | grep -c 'expected boolean, received undefined' | grep -v '^0$'</automated>
  </verify>
  <done>Test file contains recordedCalculateFixture with 4 verbatim aspects covering applying-only, separating-only, and neither; timed fixture carries all three shapes; drift mutations (applying false, exact removed) asserted to throw; scoped vitest run fails exactly on the aspect-contract tests (RED reproduction); failing tests committed as test(quick)</done>
</task>

<task type="auto">
  <name>Task 2: Mirror the calculator contract in aspectSchema (GREEN)</name>
  <files>src/lib/api-schemas.ts</files>
  <action>
Single surgical edit to `aspectSchema` (lines 253-260) in src/lib/api-schemas.ts — the rest of the file is untouched:

1. Add a field above separating: `applying` as z.literal(true).optional().describe(...) documenting: presence flag, always true when present — the aspect is applying; mutually exclusive with separating; the calculator (vendor birth_to_chart.py compute_aspects) omits both flags when relative motion is zero (stationary bodies and Asc/MC contacts).

2. Change the existing `separating` field from z.boolean() to z.literal(true).optional().describe(...) documenting: presence flag, always true when present — the aspect is separating; mutually exclusive with applying.

3. Leave `exact` as the required z.boolean() with its current description, and leave body_a/aspect/body_b/orb_degrees untouched.

Do NOT add a superRefine for mutual exclusivity — mirror the calculator emission exactly (it never emits both flags, and literal-true already rejects every other value, which the Task 1 drift mutation pins). Keep the .describe() documentation style consistent with the neighboring fields (house/dignity optionality docs). The loosened required→optional-presence change is the entire fix: after this edit the Task 1 tests must pass without any test change.

Then run the full gate: `npx vitest run` (entire repo suite, not just this file) and `npx tsc --noEmit` (confirms the `satisfies CalculateResponse` fixtures with applying-only aspects typecheck, and that no consumer depended on separating being required). Both must be fully green. Commit: `fix(quick): mirror calculator applying/separating aspect contract in aspectSchema`
  </action>
  <verify>
    <automated>npx vitest run && npx tsc --noEmit</automated>
  </verify>
  <done>aspectSchema declares applying and separating as z.literal(true).optional() presence flags with .describe() docs and keeps exact required boolean; full vitest suite green; tsc --noEmit green; real calculate responses now parse so the misleading network-error banner path for valid responses is gone; fix committed as fix(quick)</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| server JSON → client zod parse | Calculated-chart responses from the API cross into client trust via calculateResponseSchema (parse-then-trust in src/lib/api.ts) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | Tampering | aspectSchema / calculateResponseSchema | mitigate | Keep literal-true presence flags (rejects applying/separating values other than true — drift surfaces as a typed parse failure, never silent acceptance); exact stays required; schema stays the single client gate (no raw JSON reaches UI) |
| T-quick-02 | Denial of Service | postCalculate parse path | accept | No new parsing surface; the fix only relaxes two flags to optional-presence — malformed payloads still throw ZodError before any consumer runs |
| T-quick-03 | Information Disclosure | error banner mapping (confirm screen) | accept | Out of scope for this fix: the ZodError→network-copy mislabeling is cosmetic (no data leaked) and disappears for valid responses once parsing succeeds; no api/, UI, or copy-deck files may be touched |
</threat_model>

<verification>
1. `npx vitest run` — full suite green, including the new recorded-response contract test and aspect-shape assertions.
2. `npx tsc --noEmit` — green; proves the type relaxation breaks no consumer (nothing in src reads aspects beyond the schema itself).
3. Grep gates: `grep -c 'z.literal(true).optional()' src/lib/api-schemas.ts` returns 2; `grep -c 'recordedCalculateFixture' src/lib/api-schemas.test.ts` returns ≥ 2 (declaration + parse call).
4. Scope check: `git diff --name-only` across both commits contains exactly src/lib/api-schemas.ts and src/lib/api-schemas.test.ts — no api/, vendor/, src/app/, or copy-deck changes.
</verification>

<success_criteria>
- Every real calculate response (applying-only, separating-only, and stationary aspect shapes) parses through calculateResponseSchema — the class of "network error" banners for HTTP-200 calculations is eliminated at the contract layer.
- Client and server contracts are pinned together by a recorded-live-response test; future calculator emission drift fails the client suite loudly instead of silently breaking the app.
- Full test suite and typecheck green; change confined to the two client schema files; conventional commits (test(quick)/fix(quick)).
</success_criteria>

<output>
Create `.planning/quick/260826-tob-fix-aspect-schema-contract-mismatch-calc/260826-tob-SUMMARY.md` when done
</output>
