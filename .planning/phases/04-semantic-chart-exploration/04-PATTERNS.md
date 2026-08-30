# Phase 4: Semantic Chart Exploration - Pattern Map

**Mapped:** 2026-08-30
**Files analyzed:** 22 (17 new, 5 modified)
**Analogs found:** 20 / 22 (2 have no in-repo analog — the first Skia canvas and its gesture/zoom code; vendor math + RESEARCH excerpts cover them)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/app/chart/explore.tsx` (new) | route | request-response (query by id) | `src/app/chart/saved.tsx` | exact |
| `src/lib/chart-wheel/geometry.ts` (new) | utility (pure) | transform | `vendor/astrology-skill/tools/chart_diagram.py` (port source) + `src/lib/workspace/revision-diff.ts` (module convention) | exact (port) |
| `src/lib/chart-wheel/collision.ts` (new) | utility (pure) | transform | `vendor/astrology-skill/tools/chart_diagram.py` lines 464-483 | exact (port) |
| `src/lib/chart-wheel/glyphs.ts` (new) | config/data | transform | `vendor/astrology-skill/tools/chart_diagram.py` lines 43-104 | exact (port) |
| `src/lib/chart-wheel/geometry.test.ts` (new) | test | transform | `src/__tests__/placement-list.test.tsx` + `src/test/fixtures/frozen-natal-envelope.json` | exact |
| `src/components/chart/explore/wheel-canvas.tsx` (new) | component | event-driven (gesture → transform) | **none in repo** (first Skia) — closest partial: `src/components/animated-icon.tsx` (Reanimated import posture); math from 04-RESEARCH Pattern 4 | no-analog |
| `src/components/chart/explore/wheel-a11y-overlay.tsx` (new) | component | event-driven (selection) | `src/components/ui/option-card.tsx` (Pressable a11y semantics) + `placement-list.tsx` a11y labels | role-match |
| `src/components/chart/explore/fact-panel.tsx` (new) | component | request-response (selection → facts) | `src/components/chart/assumptions-line.tsx` (card + a11y label) | exact |
| `src/components/chart/explore/evidence-lists.tsx` (new) | component | CRUD (render envelope rows) | `src/components/chart/placement-list.tsx` | exact |
| `src/components/chart/explore/mode-toggle.tsx` (new) | component | event-driven (mode flip) | `src/components/birth/confidence-control.tsx` + `src/components/ui/option-card.tsx` | exact |
| `src/components/chart/explore/glossary.tsx` (new) | component | event-driven (expand/collapse) | `src/components/chart/provenance-details.tsx` (expandable disclosure) | exact |
| `src/components/chart/explore/mini-wheel-card.tsx` (new) | component | request-response (push route) | `src/components/workspace/web-unsupported.tsx` (card) + `saved.tsx` lines 190-196 (router.push by id) | role-match |
| `src/components/chart/explore/copy.ts` (new) | config (copy deck) | transform | `src/components/chart/copy.ts` | exact |
| `src/components/chart/evidence-vocabulary/kinds.ts` (new) | config (typed union) | transform | `src/lib/api-schemas.ts` (typed enum/idiom) | role-match |
| `src/components/chart/evidence-vocabulary/tokens.ts` (new) | config (theme tokens) | transform | `src/constants/theme.ts` | exact |
| `src/components/chart/evidence-vocabulary/phrases.ts` (new) | config (copy + a11y phrasing) | transform | `src/components/chart/copy.ts` (`placementA11yLabel`) | exact |
| `src/hooks/use-explore-mode.ts` (new) | hook | CRUD (persist preference) | `src/hooks/use-disclosure.ts` | exact |
| `scripts/vitest/skia-facade/index.ts` (new) | test facade | transform | `scripts/vitest/expo-device-facades/sharing.ts` | exact |
| `src/__tests__/{wheel-selection,explore-surface,wheel-a11y-parity,evidence-vocabulary,explore-mode,explore-web,mini-wheel-card}.test.tsx` (new) | test | varies | `src/__tests__/placement-list.test.tsx` | exact |
| `src/app/chart/result.tsx` (modify) | route | — | itself; insert `MiniWheelCard` above `PlacementList` (line 207) | — |
| `src/app/chart/saved.tsx` (modify) | route | — | itself; insert `MiniWheelCard` above `PlacementList` (line 151) | — |
| `src/app/_layout.tsx` (modify) | config (app root) | — | itself; add `GestureHandlerRootView` + `chart/explore` Stack.Screen | — |
| `vitest.config.ts` (modify) | config (test) | — | itself; add skia alias beside lines 123-125 | — |

(Exact names of explore components are discretion per CONTEXT; the seams — route / pure geometry / canvas / overlay / lists / vocabulary / mode hook / facade — are the load-bearing structure. `package.json` changes only via `npx expo install @shopify/react-native-skia` → 2.6.2, never npm-latest.)

## Pattern Assignments

### `src/app/chart/explore.tsx` (route, request-response)

**Analog:** `src/app/chart/saved.tsx` — the exact id-param + parse-then-trust + state-screen pattern the explore route repeats.

**Route param + data access pattern** (saved.tsx lines 65-78):
```typescript
const params = useLocalSearchParams<{ id?: string }>();
const chartId = typeof params.id === "string" ? params.id : "";
const detailQuery = useWorkspaceChart(chartId);
// ...
// Unknown chart (repository null) or missing id → home, never /birth.
useEffect(() => {
  if (chartId.length === 0 || detailQuery.data === null) router.replace("/");
}, [chartId, detailQuery.data]);
```

**State screens — content only after parse, typed error, never partial** (saved.tsx lines 94-115):
```typescript
if (detailQuery.isError) {
  return (
    <View style={styles.stateScreen}>
      <ErrorCard heading={OPEN_FAILED_ERROR_COPY.heading} body={OPEN_FAILED_ERROR_COPY.body}
        testID="saved-chart-error" />
    </View>
  );
}
if (detailQuery.isPending) {
  return (
    <View style={styles.stateScreen} testID="saved-chart-loading">
      <ThemedText type="small" themeColor="textSecondary">{LOADING_CHART}</ThemedText>
    </View>
  );
}
```

**Query hooks to reuse verbatim** (`src/hooks/use-workspace.ts`): `useWorkspaceChart(chartId)` (lines 82-89) for latest revision; `useRevisionContent(revisionId)` (lines 100-107) when the optional `?revision=` param is present. Both already enforce `retry: false`, repository-edge zod re-parse, and the `['charts']` key tree. **Do not add a new query/fetch path.**

**Import conventions** (saved.tsx lines 1-27): `@/` path alias throughout; grouped imports (expo-router → react → react-native → `@/components` → `@/constants` → `@/hooks` → `@/lib`); header doc-comment block stating the route contract and decision IDs.

**Explore-specific additions over the analog:** optional `revision` param (read-only semantics per Phase-3 D-07 — `src/app/chart/revision.tsx` is the read-only-view reference); web renders evidence-only via `Platform.OS === "web"` branch rendering the capability card (D-04), mirroring how `saved.tsx` line 207 conditionally renders `<WebUnsupported />`.

---

### `src/lib/chart-wheel/geometry.ts` + `collision.ts` + `glyphs.ts` (utility, pure transform)

**Analog:** `vendor/astrology-skill/tools/chart_diagram.py` — the authoritative geometry to PORT (not reinvent). Module convention analog: `src/lib/workspace/revision-diff.ts` — pure functions, zero React/RN/storage imports, header doc-comment, template-over-facts only, "trivially unit-testable" (revision-diff.ts lines 20-24).

**Polar mapping** (chart_diagram.py lines 284-285, 356-357):
```python
def _polar(cx, cy, angle, radius):
    return (cx + radius * math.cos(angle), cy - radius * math.sin(angle))  # Y flipped
def lon_to_angle(lon):
    return math.radians((lon - anchor_lon) % 360) + math.pi  # anchor at 9 o'clock, CCW
```

**Anchor + ring radii** (chart_diagram.py lines 337-354):
```python
cx = cy = size / 2
scale = size / 720
outer_r = 330 * scale; sign_outer_r = 302 * scale; sign_inner_r = 252 * scale
planet_r = 210 * scale; aspect_r = 130 * scale
anchor_lon = first_house["longitude"] if first_house is not None else asc_lon if asc_lon is not None else 0.0
```

**Collision/declutter algorithm** (chart_diagram.py lines 464-486) — port parameterized by zoom (min_angular_distance shrinks as scale grows; D-11 declutter tiers):
```python
positioned = []
by_longitude = sorted(placements, key=lambda p: p["longitude"])
min_angular_distance = math.radians(12)   # → parameter
radius_step = 24 * scale; max_radius_level = 4
for placement in by_longitude:
    angle = lon_to_angle(placement["longitude"])
    radius_level = 0; index = 0
    while index < len(positioned):
        other = positioned[index]
        diff = abs(angle - other["angle"])
        if diff > math.pi: diff = 2 * math.pi - diff
        if diff < min_angular_distance and radius_level == other["radius_level"]:
            radius_level = min(radius_level + 1, max_radius_level); index = 0; continue
        index += 1
    positioned.append({"angle": angle, "radius_level": radius_level})
    final_radius = planet_r - radius_level * radius_step
```

**Glyph vocabularies** (chart_diagram.py lines 43-104): `SIGN_GLYPHS` (♈-♓, keys must match envelope `sign` strings verbatim), `PLANET_GLYPHS` (☉☽☿♀♂♃♄♅♆♇☊☋⚷⚸, including "True Node"/"North Node"/"South Node"/"Chiron"/"Lilith"), `ASPECT_COLORS` keyed by lowercase aspect names ("conjunction", "trine", …). Port to `glyphs.ts` as `Record<string, string>` with fallback-to-raw-name (vendor: `PLANET_GLYPHS.get(name, name[:1])`). **Aspect stroke styling must NOT port color-only — A11Y-02 requires stroke pattern/weight per family + text redundancy (D-16, Pitfall 7).**

**Aspect chord anchors** (chart_diagram.py lines 455-457): chords join the two bodies' positions projected onto `aspect_r` via `lon_to_angle` + `_polar`.

**Input types:** consume `CalculateResponse`/`ChartData` from `src/lib/api-schemas.ts` (lines 293-310: `ascendant`/`midheaven`/`house_cusps` optional per unknown-time; `aspects` with applying/separating flags; `provisional_factors`/`unavailable_factors` at lines 356-364 drive D-16). Absent envelope keys ⇒ absent geometry — never a houses ring without birth time.

**Laws:** no Skia/RN imports inside this module (must run in plain Node vitest); radians emitted everywhere (Pitfall 1); the mini-wheel (D-03) and a11y overlay (D-12) consume the SAME primitives.

---

### `src/components/chart/explore/wheel-canvas.tsx` (component, event-driven — NO IN-REPO ANALOG)

First Skia code in the repo. There is no canvas/gesture component to copy. Two partial anchors:

1. **Reanimated import posture** — `src/components/animated-icon.tsx` lines 5-6 show the repo's working Reanimated-4 import style under Expo 57 (`import Animated, { Easing, Keyframe } from 'react-native-reanimated'` + `scheduleOnRN` from `react-native-worklets`; `'worklet'` directive inside callbacks, line 41). The zoom shell uses `useSharedValue` instead of Keyframes.

2. **Gesture + zoom shape** — copy from 04-RESEARCH Pattern 4 (verified against official Skia/RNGH docs this session):
```typescript
const scale = useSharedValue(1); const savedScale = useSharedValue(1);
const offset = useSharedValue({ x: 0, y: 0 }); const savedOffset = useSharedValue({ x: 0, y: 0 });
const pan = Gesture.Pan().onUpdate((e) => {
  offset.value = { x: savedOffset.value.x + e.translationX, y: savedOffset.value.y + e.translationY };
}).onEnd(() => { savedOffset.value = offset.value; });
const pinch = Gesture.Pinch().onUpdate((e) => {
  scale.value = clamp(savedScale.value * e.scale, MIN_ZOOM, MAX_ZOOM);
}).onEnd(() => { savedScale.value = scale.value; });

<GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
  <Canvas style={...}>
    <Group transform={[{ translateX: offsetX }, { translateY: offsetY }, { scale }]}
           origin={{ x: cx, y: cy }}>   {/* wheel center — Skia origin defaults top-left, radians (Pitfall 1) */}
      {/* geometry primitives from the pure module */}
    </Group>
  </Canvas>
</GestureDetector>
```

**Non-negotiables from research:** inverse-transform hit-testing as a pure function in the geometry module (Pitfall 5); `GestureHandlerRootView` must be added to `_layout.tsx` first or everything silently no-ops (Pitfall 2); RNGH activation thresholds so the parent ScrollView doesn't steal wheel pan (Pitfall 6); selection reads as an ordinary React prop (only gesture frames stay off the render path); provisional factors get dashed outline treatment, never hue-only (D-16).

---

### `src/components/chart/explore/wheel-a11y-overlay.tsx` (component, event-driven)

**Analog:** `src/components/ui/option-card.tsx` — Pressable with full a11y state semantics; plus `placement-list.tsx` for label sourcing.

**Selection semantics pattern** (option-card.tsx lines 35-47):
```typescript
<Pressable
  accessibilityRole="radio"          // overlay uses "button" + selected state per D-12
  accessibilityState={{ checked: selected }}
  onPress={onPress}
  style={[styles.card, {
    backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? theme.accent : HAIRLINE_BORDER_COLOR,
  }]}
>
```

**Overlay shape** (04-RESEARCH Pattern 6, verified against RN 0.86 docs): one invisible `Pressable` per geometry hit region with `accessibilityRole="button"`, `accessibilityState={{ selected }}`, `accessibilityLabel` from the SAME vocabulary/degree-split as the fact panel (A-UI-4), absolutely positioned `{left, top, width, height}` from base-coordinate hit regions; the Canvas wrapper gets `importantForAccessibility="no-hide-descendants"` (Android) + `accessibilityElementsHidden` (iOS). Overlay stays at base (unzoomed) geometry — A3; the lists are the canonical non-visual path.

**Label sourcing law:** labels derive from `placementA11yLabel`-style copy-deck sentences (chart/copy.ts lines 61-72) + `splitDegreeMinutes` — never a second formatter. List-parity tests assert overlay ↔ list ↔ panel agreement.

---

### `src/components/chart/explore/fact-panel.tsx` (component, request-response)

**Analog:** `src/components/chart/assumptions-line.tsx` — the inline card with a single composed a11y sentence.

**Card + a11y pattern** (assumptions-line.tsx lines 67-88):
```typescript
<View style={[styles.card, { backgroundColor: theme.backgroundElement }]}
  accessible
  accessibilityLabel={`${ASSUMPTIONS_LABEL}: ${assumptionsValue(...)}`}>
  <ThemedText type="small" style={styles.label}>{ASSUMPTIONS_LABEL}</ThemedText>
  <ThemedText type="small" themeColor="textSecondary">{assumptionsValue(...)}</ThemedText>
</View>
```
Card style block (lines 114-121): `borderRadius: 8, borderWidth: 1, borderColor: HAIRLINE_BORDER_COLOR, padding: Spacing.three, gap: Spacing.two`.

**Explore additions over the analog:** `accessibilityLiveRegion="polite"` / `aria-live="polite"` so selection updates announce (A11Y-01); fields render only when the envelope carries them (D-10 display rule, placement-list.tsx lines 86-93); Simple mode hides deep-technical fields from the SAME envelope (D-06); degree facts via `splitDegreeMinutes`/`formatDegreeMinutes`/`spokenDegrees` imported from `@/components/chart/placement-list` / `./copy` — one split feeds visual + spoken (A-UI-4).

---

### `src/components/chart/explore/evidence-lists.tsx` (component, render envelope rows)

**Analog:** `src/components/chart/placement-list.tsx` — extend, don't fork.

**List + row + heading pattern** (placement-list.tsx lines 56-99):
```typescript
<View style={styles.section}>
  <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
    {PLACEMENTS_HEADING}
  </ThemedText>
  <View role="list" accessible style={styles.list}>
    {placements.map((placement) => {
      const { degrees, minutes } = splitDegreeMinutes(placement.degree);
      return (
        <View key={`${placement.body}-${placement.absolute_degree}`}
          style={[styles.row, { backgroundColor: theme.backgroundElement }]}
          role="listitem" accessible
          accessibilityLabel={placementA11yLabel({ body, sign, degrees, minutes, house, motion, dignities })}>
          {/* present-only slots; dignity renders ONLY where present — never a dash */}
```

**Explore additions:** rows become pressable (selection, D-10) with `accessibilityState={{ selected }}`; new houses + aspects tables repeat the same heading/list/listitem/card structure; auto-scroll to the selected row with the loop-guard contract (selection only on explicit user intent — Pitfall 9); Simple mode hides lots/sect/orb/applying columns (D-06) from the same data.

---

### `src/components/chart/explore/mode-toggle.tsx` (component, event-driven)

**Analog:** `src/components/birth/confidence-control.tsx` — the exact inline segmented-control pattern D-05 mirrors.

**Radiogroup + options-from-copy-deck pattern** (confidence-control.tsx lines 30-48):
```typescript
<View accessibilityRole="radiogroup" style={styles.group} testID={testID}>
  <ThemedText type="default" accessibilityRole="header" style={styles.heading}>
    {CONFIDENCE_HEADING}
  </ThemedText>
  {CONFIDENCE_OPTIONS.map((option) => (
    <OptionCard key={option.value} label={option.value} helper={option.helper}
      selected={value === option.value}
      onPress={() => onChange(option.value)}
      testID={`confidence-${option.value.toLowerCase()}`} />
  ))}
</View>
```

Selected state via `OptionCard`'s three channels — fill + 2px accent border + 600 weight, never color alone (option-card.tsx lines 11-14). For a compact horizontal Simple↔Technical segmented control, keep the radiogroup semantics + `accessibilityState={{ checked/selected }}`; copy from `explore/copy.ts`.

---

### `src/components/chart/explore/glossary.tsx` (component, event-driven)

**Analog:** `src/components/chart/provenance-details.tsx` — the expandable disclosure with structural expanded state.

**Expand/collapse pattern** (provenance-details.tsx lines 50-51, 69-84):
```typescript
const [expanded, setExpanded] = useState(false);
// ...
<Pressable accessibilityRole="button"
  accessibilityState={{ expanded }}
  onPress={() => setExpanded((current) => !current)}
  style={styles.header} testID="provenance-details-toggle">
  <ThemedText type="default" style={styles.headerLabel}>{CALCULATION_DETAILS_HEADER}</ThemedText>
  {/* Status-marker glyph only — state conveyed structurally, never by the glyph alone */}
  <ThemedText type="default" themeColor="textSecondary">{expanded ? "▴" : "▾"}</ThemedText>
</Pressable>
```
Glossary = same per-term toggle; definitions come from `explore/copy.ts` (deck content, never interpretation — D-08/T-02-34).

---

### `src/components/chart/explore/mini-wheel-card.tsx` (component, push route)

**Analogs:** card chrome from `src/components/workspace/web-unsupported.tsx`; navigation from `saved.tsx` lines 190-196.

**Static card** (web-unsupported.tsx lines 27-39): heading + body on `backgroundElement`, `borderRadius: 8`, hairline border, `padding: Spacing.three` — plus `testID` prop convention.

**Push by id — never an envelope through params** (saved.tsx lines 190-196):
```typescript
onOpenRevision={(revisionId) =>
  router.push({ pathname: "/chart/revision", params: { id: revisionId } })
}
```
The card renders the same geometry as a static (non-interactive) preview (D-03) and pushes `/chart/explore?id={chartId}`. On `/chart/result` the chart may not be saved yet — the result flow passes its freshly calculated chart into the explore route per the planner's param design (id-style only; result already threads `chartId` for the revise flow, result.tsx lines 87-88).

---

### `src/components/chart/explore/copy.ts` + `evidence-vocabulary/phrases.ts` (copy decks)

**Analog:** `src/components/chart/copy.ts` — the copy-deck idiom every new string joins.

**Deck conventions** (chart/copy.ts lines 1-18, 61-72): header doc-comment declaring "Components never paraphrase these; tests assert them exactly"; `{…}` server values render verbatim, never reworded; interpretation prose FORBIDDEN by construction (T-02-34). Formatter style — pure functions composing sentence segments with `.filter((s): s is string => s !== undefined)`:
```typescript
export function placementA11yLabel(input: PlacementA11yInput): string {
  const segments = [
    `${input.body} in ${input.sign}`,
    spokenDegrees(input.degrees, input.minutes),
    input.house !== undefined ? housePhrase(input.house) : undefined,
    `${motionLabel(input.motion)} motion`,
  ].filter((segment): segment is string => segment !== undefined);
  if (input.dignities && input.dignities.length > 0) segments.push(input.dignities.join(", "));
  return segments.join(", ");
}
```
`phrases.ts` (four evidence kinds incl. the interpretation kind's copy defined-but-unrendered, D-15) follows this template-over-facts idiom; glossary definitions and mode labels land in `explore/copy.ts` (Pitfall 11: zero literals inside components).

---

### `src/components/chart/evidence-vocabulary/kinds.ts` + `tokens.ts` (typed config)

**Analogs:** typed vocabulary from `src/lib/api-schemas.ts` (z.infer'd const types, lines 92-96); tokens from `src/constants/theme.ts`.

**Token pattern** (theme.ts lines 10-37): `as const` light/dark objects with documented semantic roles and WCAG contrast rationale in comments; `ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark` (line 39). `tokens.ts` defines per-evidence-kind tokens the same way (stroke pattern + weight per aspect family — not hue — plus provisional dashed-outline token, D-16/A11Y-02) and `kinds.ts` a discriminated union: `calculated | judgment | interpretation | uncertainty`.

---

### `src/hooks/use-explore-mode.ts` (hook, persist preference)

**Analog:** `src/hooks/use-disclosure.ts` — the versioned-key AsyncStorage pattern D-07 reuses verbatim.

**Safe-persist pattern** (use-disclosure.ts lines 17-47):
```typescript
export const CALCULATION_DISCLOSURE_KEY = "@lemastra:disclosure.calculation.v1";
// read: best-effort, mounted-guarded, catch → undefined (a read failure never blocks UI)
AsyncStorage.getItem(KEY).then((value) => { if (mounted) setAcknowledged(value === "true"); })
  .catch(() => undefined);
// write: optimistic setState; safe-persist catch — storage failure degrades, never blocks
try { await AsyncStorage.setItem(KEY, "true"); } catch { /* safe-persist */ }
```
Explore-mode differences: key `@lemastra:explore.mode.v1` (versioned, bump on content change), value `"simple" | "technical"`, first-run default `"simple"` (D-07). Mode is ONE React state passed as a prop — not context, not two trees (D-06).

---

### `scripts/vitest/skia-facade/index.ts` (test facade)

**Analog:** `scripts/vitest/expo-device-facades/sharing.ts` — the committed-TS-facade pattern (03-08, extending 03-01).

**Facade conventions** (sharing.ts lines 1-26): header doc-comment stating WHY (real entry pulls native/CanvasKit and crashes under plain Node) and the precedence law ("per-file vi.mocks take precedence over the alias"); surface = exactly what consumers import, nothing more; defaults are benign (capability available, no-op). Skia facade exports a no-op `Canvas, Group, Circle, Line, Path, Text, matchFont, Skia` surface (04-RESEARCH Wave 0).

**Wiring** (vitest.config.ts lines 123-125 — add the skia alias beside these):
```typescript
{ find: /^expo-sharing$/, replacement: path.join(dirname, "scripts/vitest/expo-device-facades/sharing.ts") },
// → add: { find: /^@shopify\/react-native-skia$/, replacement: path.join(dirname, "scripts/vitest/skia-facade/index.ts") },
```

---

### Test files in `src/__tests__/` (test)

**Analog:** `src/__tests__/placement-list.test.tsx` — the RNTL `/pure` mechanics every new component test joins.

**Test mechanics law** (placement-list.test.tsx lines 36-58): RNTL and components are acquired in `beforeAll` dynamic imports (NOT static) because the RN shim seeds `require.cache` only after the setupFile runs; `afterEach → cleanup()`; fixtures are server-envelope shapes; assertions derive fixture → rendered rows plus exact-string pins on copy templates; a11y labels asserted via `row.props.accessibilityLabel`.
```typescript
let render: typeof rtlRender;
let PlacementList: typeof import("@/components/chart/placement-list").PlacementList;
beforeAll(async () => {
  ({ render, within, userEvent, cleanup } = await import("@testing-library/react-native/pure"));
  ({ PlacementList, formatDegreeMinutes } = await import("@/components/chart/placement-list"));
});
```

**Fixture source:** `src/test/fixtures/frozen-natal-envelope.json` (Timed chart with `house_cusps`/`ascendant`/`midheaven`/`aspects`/`sect`/`lots`) — geometry golden fixtures assert numeric primitives from it; an Unknown-time envelope shape gets added per the same frozen-fixture discipline. Screenshots never the sole assertion. Hook test analog: `src/__tests__/use-disclosure.test.tsx`; repository-mocking seam: mock `@/lib/workspace/repository` (use-workspace.ts lines 20-22). Web degradation test mocks `Platform.OS` (explore-web).

---

### Modified files

**`src/app/chart/result.tsx`:** insert `<MiniWheelCard … />` directly above `<PlacementList placements={envelope.chart_data.placements} />` (line 207) — the first screen after calculating shows a wheel (D-03). Route already parses the envelope via `calculateResponseSchema.parse` in a `useMemo` (lines 90-100) — the card consumes that parsed envelope for static geometry.

**`src/app/chart/saved.tsx`:** insert `<MiniWheelCard … />` above `<PlacementList … />` (line 151), pushing `/chart/explore?id={detail.chart.chartId}`.

**`src/app/_layout.tsx`:** two additions —
1. `<GestureHandlerRootView style={{ flex: 1 }}>` wrapping `QueryProvider`'s content (inside `ThemeProvider`), or wrapping `QueryProvider` (04-RESEARCH Pitfall 2: without it all gestures silently no-op);
2. `<Stack.Screen name="chart/explore" />` beside lines 31-33.
After the route exists: run the dev server to regenerate typed routes BEFORE `tsc --noEmit` (Pitfall 10).

**`vitest.config.ts`:** one alias (see skia-facade section above).

## Shared Patterns

### Card treatment
**Source:** every Phase 1-3 card (`assumptions-line.tsx` lines 114-121, `unavailable-factors.tsx` lines 107-113, `web-unsupported.tsx` lines 42-49, `option-card.tsx` lines 61-69)
**Apply to:** fact-panel, evidence-lists rows, mini-wheel-card, glossary definitions, mode-toggle
```typescript
/** Hairline carried forward from the Phase-1 card treatment. */
const HAIRLINE_BORDER_COLOR = "rgba(128, 128, 128, 0.4)";
// card: borderRadius: 8, borderWidth: 1, borderColor: HAIRLINE_BORDER_COLOR,
//       padding: Spacing.three, gap: Spacing.two, backgroundColor: theme.backgroundElement
```

### Themed primitives
**Source:** `src/components/themed-text.tsx` / `themed-view.tsx` + `useTheme()` + `Spacing`/`MaxContentWidth` from `src/constants/theme.ts`
**Apply to:** all new components — `ThemedText` with `type`/`themeColor` props (never raw `Text`), `useTheme()` for fills (e.g. `theme.accent` for selection highlight), `Spacing.*` tokens for all insets, `maxWidth: MaxContentWidth, width: "100%", alignSelf: "center"` on screen content (saved.tsx lines 248-255).

### Accessibility contract
**Source:** `option-card.tsx` lines 11-14 (three selection channels, never color alone), `provenance-details.tsx` lines 69-84 (`accessibilityState={{ expanded }}` structural state), `placement-list.tsx` lines 61-78 (list/listitem + copy-deck a11y sentences), `chart/copy.ts` `spokenDegrees` (visual/spoken agree, A-UI-4)
**Apply to:** every explore surface; plus `accessibilityLiveRegion="polite"` on the fact panel; canvas a11y-hidden behind the overlay (D-12); aspect style = stroke pattern + weight, provisional = dashed + text (D-16/A11Y-02).

### Copy-deck law (T-02-34)
**Source:** `src/components/chart/copy.ts` lines 1-18
**Apply to:** every new string — `explore/copy.ts` (mode labels, glossary definitions, zoom hints, headings) and `evidence-vocabulary/phrases.ts` (four kinds). Zero string literals inside components; tests pin exact strings.

### Route contract (id-param law + parse-then-trust + state screens)
**Source:** `src/app/chart/saved.tsx` lines 29-115
**Apply to:** `src/app/chart/explore.tsx` — id-style params only; repository is the only data source; loading/`ErrorCard`/redirect-home states; content renders only after the repository-edge re-parse.

### Versioned-key AsyncStorage hook
**Source:** `src/hooks/use-disclosure.ts`
**Apply to:** `src/hooks/use-explore-mode.ts` (see assignment above).

### Test facade alias
**Source:** `vitest.config.ts` lines 110-125 + `scripts/vitest/expo-device-facades/sharing.ts`
**Apply to:** `@shopify/react-native-skia` → `scripts/vitest/skia-facade/index.ts`; per-file `vi.mock` takes precedence over the alias.

### Dependency installation
**Source:** house convention (Phases 1-3): `npx expo install <pkg>` selects the Expo-pinned version; tilde pins authoritative; legitimacy `checkpoint:human-verify` before install (03-09 precedent)
**Apply to:** the phase's single new package: `npx expo install @shopify/react-native-skia` → must land at **2.6.2** in package.json (Expo SDK 57 pin from `bundledNativeModules.json`; npm-latest is 2.11.1 and would break Expo Go — Pitfall 3). RNGH ~2.32.0 / Reanimated 4.5.1 / worklets 0.10.1 are already installed.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/chart/explore/wheel-canvas.tsx` (Skia Canvas + GestureDetector shell) | component | event-driven (gesture → UI-thread transform) | First Skia/canvas/gesture code in the repo. Planner uses 04-RESEARCH Pattern 4 excerpt (doc-verified) + `animated-icon.tsx` for the Reanimated-4 import/worklet posture; Wave-0 spike validates on-device. |
| Zoom/gesture shared-value composition (inside wheel-canvas) | hook/util | event-driven | No `useSharedValue`/RNGH `Gesture.*` usage exists yet (`rg` confirms zero gesture-handler imports in src). RESEARCH Pattern 4 + RNGH 2.x builder API are the source; `GestureHandlerRootView` wiring in `_layout.tsx` is a prerequisite task. |

Everything else extends proven in-repo patterns: the pure geometry module ports the project's own vendored renderer math, and all evidence/UI surfaces extend Phase 2-3 components.

## Metadata

**Analog search scope:** `src/app/**`, `src/components/**`, `src/hooks/**`, `src/lib/**`, `scripts/vitest/**`, `src/__tests__/**`, `src/test/fixtures`, `vendor/astrology-skill/tools/chart_diagram.py`
**Files scanned:** ~45 (24 source files read; grep-verified RNGH/Reanimated usage; fixture keys inspected)
**Pattern extraction date:** 2026-08-30
