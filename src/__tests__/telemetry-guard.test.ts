import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Telemetry & logging guard (D-16 — PRIV-03/PRIV-04, threats T-03-04,
 * T-03-05, T-03-06). Fail-hard source scans in the governance-docs.test.ts
 * archetype: a violation throws inside vitest → non-zero exit → CI fails.
 *
 * - PRIV-03 (no analytics surface exists): no analytics/crash SDK may
 *   appear in the dependency graph (Test 1) or as an import anywhere in
 *   application source (Test 2). Any future Sentry integration (Phase 7+)
 *   must route through the sanctioned logger + redact() in
 *   src/lib/redact.ts — not reintroduce direct SDK surfaces.
 * - PRIV-04 (no stray logging call sites): no `console.<output-method>`
 *   token outside src/lib/redact.ts and the test/setup directories
 *   (Test 3). A legitimate new call site must EXTEND the sanctioned
 *   logger, not bypass it.
 * - T-03-06 (guard-test erosion): there is deliberately NO allowlist
 *   file to append stray call sites to. Weakening this scan instead of
 *   the code is the threat this test exists to surface.
 *
 * Positive control (mutation-verified trip, Phase-1 scanner pattern):
 * verified once during 03-02 execution on 2026-08-27 — temporarily adding
 * a stray `console.log(...)` call to an application source file made this
 * suite exit non-zero; the mutation was then reverted. Recorded in
 * 03-02-SUMMARY.md.
 */

const PACKAGE_JSON = fileURLToPath(new URL("../../package.json", import.meta.url));
const SRC_ROOT = fileURLToPath(new URL("../../src", import.meta.url));

/**
 * Telemetry/analytics/crash package name fragments (substring match on
 * dependency names AND import specifiers). Blocked while no telemetry
 * ships (retention-deletion-policy §4: excluded by default, Sentry only
 * post-beta opt-in).
 */
const TELEMETRY_PACKAGE_SUBSTRINGS = [
  "sentry",
  "posthog",
  "amplitude",
  "segment",
  "firebase",
  "datadog",
  "bugsnag",
  "analytics",
] as const;

/** console output method names — a `console.<name>` token is a logging call site. */
const LOG_OUTPUT_METHODS =
  "log|info|warn|error|debug|trace|dir|dirxml|table|group|groupCollapsed|groupEnd|" +
  "clear|count|countReset|assert|profile|profileEnd|time|timeEnd|timeLog|timeStamp";

const DIRECT_LOG_CALL = new RegExp(`console\\.(${LOG_OUTPUT_METHODS})\\b`);

/** The only sanctioned logging module (D-16) — exempted from the call-site scan. */
const SANCTIONED_LOGGER = "lib/redact.ts";

/** All application .ts/.tsx sources under src/, as src/-relative POSIX paths. */
function applicationSources(): string[] {
  return readdirSync(SRC_ROOT, { recursive: true })
    .map((entry) => entry.toString().split("\\").join("/"))
    .filter((relPath) => /\.(ts|tsx)$/.test(relPath))
    .filter((relPath) => !relPath.startsWith("__tests__/") && !relPath.startsWith("test/"));
}

/** Application sources minus the sanctioned logger (for the call-site scan). */
function sourcesOutsideSanctionedLogger(): string[] {
  return applicationSources().filter((relPath) => relPath !== SANCTIONED_LOGGER);
}

function readSource(relPath: string): string {
  // A missing file throws ENOENT here — the test fails hard, by design.
  return readFileSync(`${SRC_ROOT}/${relPath}`, "utf8");
}

/** Module specifiers referenced by import/require syntax in a source file. */
function importSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s*["']([^"'\n]+)["']/g,
    /\bimport\s*["']([^"'\n]+)["']/g,
    /\bimport\s*\(\s*["']([^"'\n]+)["']/g,
    /\brequire\s*\(\s*["']([^"'\n]+)["']/g,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (match[1]) specifiers.push(match[1]);
    }
  }
  return specifiers;
}

describe("PRIV-03: no analytics/crash SDK in the dependency graph", () => {
  it("package.json dependencies and devDependencies contain no telemetry package", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const offending = Object.keys(allDeps).filter((name) =>
      TELEMETRY_PACKAGE_SUBSTRINGS.some((fragment) => name.includes(fragment))
    );
    expect(
      offending,
      `Telemetry/analytics SDKs are excluded by default (D-16, retention ` +
        `§4). Found in package.json: ${offending.join(", ")}. A Phase 7+ ` +
        `integration must route through src/lib/redact.ts logger + an ` +
        `explicit user opt-in — not ship a direct SDK dependency.`
    ).toEqual([]);
  });
});

describe("PRIV-03: no telemetry-module import in application source", () => {
  it("no src/**/*.{ts,tsx} file (outside tests/setup) imports a telemetry module", () => {
    const violations: string[] = [];
    for (const relPath of applicationSources()) {
      const specifiers = importSpecifiers(readSource(relPath));
      for (const specifier of specifiers) {
        if (TELEMETRY_PACKAGE_SUBSTRINGS.some((fragment) => specifier.includes(fragment))) {
          violations.push(`${relPath} imports "${specifier}"`);
        }
      }
    }
    expect(
      violations,
      `Telemetry imports are forbidden in application source (D-16). ` +
        `Violations: ${violations.join("; ")}`
    ).toEqual([]);
  });
});

describe("PRIV-04: no stray logging call sites outside the sanctioned logger", () => {
  it("no console.<output-method> token outside src/lib/redact.ts and tests/setup", () => {
    const violations: string[] = [];
    for (const relPath of sourcesOutsideSanctionedLogger()) {
      const match = readSource(relPath).match(DIRECT_LOG_CALL);
      if (match) {
        violations.push(`${relPath} contains "${match[0]}"`);
      }
    }
    expect(
      violations,
      `Direct logging calls are only permitted inside src/lib/redact.ts ` +
        `(the sanctioned logger — every call routes through redact(), ` +
        `PRIV-04/T-03-04). Extend the logger instead of adding call ` +
        `sites. Violations: ${violations.join("; ")}`
    ).toEqual([]);
  });
});
