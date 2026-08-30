import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Web Skia-isolation guard (D-04, 04-07 fix-back — on-device report:
 * web /chart/result crashed with "Cannot read properties of undefined
 * (reading 'TypefaceFontProvider')").
 *
 * Root cause: Expo Router eagerly evaluates every route module on web,
 * so a STATIC import of a module that (transitively) imports
 * @shopify/react-native-skia executes the Skia/CanvasKit web loader —
 * even when the component never renders. The fix is Metro's
 * platform-specific resolution: every skia-touching module ships a
 * sibling `.web.tsx`/`.web.ts` stub, so the real module — and
 * CanvasKit — never enters the web module graph at all (stronger than
 * a lazy require: no dead CanvasKit weight in the web bundle).
 *
 * Fail-hard source scans in the telemetry-guard.test.ts archetype: a
 * violation throws inside vitest → non-zero exit → CI fails. There is
 * deliberately NO allowlist file — weakening this scan instead of the
 * code is the threat it exists to surface (T-03-06 archetype; the
 * D-04 law: web renders the evidence experience with ZERO canvas).
 *
 * Guarded invariants:
 * 1. Every application module that imports @shopify/react-native-skia
 *    has a `.web` platform sibling.
 * 2. That sibling never imports @shopify/react-native-skia and never
 *    VALUE-imports its native sibling (type-only `import type` is
 *    erased at build and is allowed).
 * 3. The sibling re-exports every VALUE export of the native module
 *    (stub-rot guard: a new export without a stub copy fails here).
 * 4. Route/screen modules under src/app never import skia directly —
 *    they reach the wheel only through the platform-gated modules.
 */

const SRC_ROOT = fileURLToPath(new URL("../../src", import.meta.url));
const SKIA_SPECIFIER = "@shopify/react-native-skia";

/** All application .ts/.tsx sources under src/, as src/-relative POSIX paths. */
function applicationSources(): string[] {
  return readdirSync(SRC_ROOT, { recursive: true })
    .map((entry) => entry.toString().split("\\").join("/"))
    .filter((relPath) => /\.(ts|tsx)$/.test(relPath))
    .filter((relPath) => !relPath.startsWith("__tests__/") && !relPath.startsWith("test/"));
}

function readSource(relPath: string): string {
  // A missing file throws ENOENT here — the test fails hard, by design.
  return readFileSync(`${SRC_ROOT}/${relPath}`, "utf8");
}

/** Module specifiers referenced by import/require syntax in a source file. */
function importSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /import\s+[^"';]*?from\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
    /export\s+[^"';]*?from\s+["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) specifiers.push(match[1]!);
  }
  return specifiers;
}

/** The `.web` platform sibling path for a module file (ts → .web.ts, tsx → .web.tsx). */
function webSibling(relPath: string): string {
  return relPath.replace(/\.(ts|tsx)$/, ".web.$1");
}

/** Named VALUE exports (`export function X` / `export const X`) in a module. */
function valueExports(content: string): string[] {
  const names: string[] = [];
  for (const match of content.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g)) {
    names.push(match[1]!);
  }
  for (const match of content.matchAll(/export\s+const\s+([A-Za-z0-9_$]+)/g)) {
    names.push(match[1]!);
  }
  return names;
}

/** VALUE-import check: an import of `specifier` that is NOT type-only. */
function valueImports(content: string, specifier: string): boolean {
  const escaped = specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`import\\s+[^"'\\{]*?\\{(?![^}]*\\btype\\b)[^}]*\\}\\s*from\\s*["']${escaped}["']`),
    // `import type ... from` (type-only) must NOT match: the leading
    // clause above requires a non-type named clause; default/namespace
    // imports are value imports.
    new RegExp(`import\\s+[A-Za-z0-9_$]+\\s+from\\s*["']${escaped}["']`),
    new RegExp(`import\\s*\\*\\s*as\\s+[A-Za-z0-9_$]+\\s+from\\s*["']${escaped}["']`),
    new RegExp(`require\\s*\\(\\s*["']${escaped}["']\\s*\\)`),
  ];
  return patterns.some((pattern) => pattern.test(content));
}

describe("web Skia isolation (D-04 — zero canvas on web)", () => {
  it("every module importing @shopify/react-native-skia has a .web platform sibling", () => {
    const sources = applicationSources().filter((relPath) => relPath.startsWith("components/") || relPath.startsWith("app/") || relPath.startsWith("lib/") || relPath.startsWith("hooks/"));
    const skiaModules = sources.filter((relPath) =>
      importSpecifiers(readSource(relPath)).includes(SKIA_SPECIFIER)
    );
    // Sanity: the wheel renderer family is in the guarded set.
    expect(skiaModules).toContain("components/chart/explore/wheel-canvas.tsx");
    expect(skiaModules).toContain("components/chart/explore/mini-wheel-card.tsx");

    for (const relPath of skiaModules) {
      const sibling = webSibling(relPath);
      expect(
        existsSync(`${SRC_ROOT}/${sibling}`),
        `${relPath} imports ${SKIA_SPECIFIER} but has no ${sibling} platform stub — the Skia/CanvasKit web loader executes on Platform.OS === "web" (D-04 violation; 04-07 on-device crash)`
      ).toBe(true);
    }
  });

  it("every .web stub stays skia-free and never value-imports its native sibling", () => {
    const sources = applicationSources();
    const skiaModules = sources.filter((relPath) =>
      importSpecifiers(readSource(relPath)).includes(SKIA_SPECIFIER)
    );
    expect(skiaModules.length).toBeGreaterThan(0);
    for (const relPath of skiaModules) {
      const stub = readSource(webSibling(relPath));
      expect(
        importSpecifiers(stub),
        `${webSibling(relPath)} must not import ${SKIA_SPECIFIER}`
      ).not.toContain(SKIA_SPECIFIER);
      const nativeSpecifier = "./" + relPath.split("/").pop()!.replace(/\.(ts|tsx)$/, "");
      expect(
        valueImports(stub, nativeSpecifier),
        `${webSibling(relPath)} must not VALUE-import ${nativeSpecifier} (type-only import type is fine — it is erased at build)`
      ).toBe(false);
    }
  });

  it("every .web stub re-exports the native module's VALUE exports (stub-rot guard)", () => {
    const sources = applicationSources();
    const skiaModules = sources.filter((relPath) =>
      importSpecifiers(readSource(relPath)).includes(SKIA_SPECIFIER)
    );
    for (const relPath of skiaModules) {
      const nativeExports = valueExports(readSource(relPath));
      const stubContent = readSource(webSibling(relPath));
      for (const name of nativeExports) {
        expect(
          new RegExp(`export\\s+(?:async\\s+)?function\\s+${name}\\b`).test(stubContent) ||
            new RegExp(`export\\s+const\\s+${name}\\b`).test(stubContent),
          `${webSibling(relPath)} does not export ${name} — the web stub has rotted against ${relPath}`
        ).toBe(true);
      }
    }
  });

  it("route/screen modules never import @shopify/react-native-skia directly", () => {
    for (const relPath of applicationSources().filter((relPath) => relPath.startsWith("app/"))) {
      expect(
        importSpecifiers(readSource(relPath)),
        `${relPath} imports ${SKIA_SPECIFIER} directly — screens reach the wheel only through platform-gated modules (D-04)`
      ).not.toContain(SKIA_SPECIFIER);
    }
  });
});
