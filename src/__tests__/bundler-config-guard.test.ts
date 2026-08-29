import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

/**
 * Bundler-config guard (03-09, threat T-03-GC-01). Fail-hard source
 * scans in the telemetry-guard.test.ts archetype: a violation throws
 * inside vitest → non-zero exit → the mandatory CI vitest job fails.
 *
 * WHY this guard exists: plan 03-01 wired drizzle but skipped Steps 6–7
 * of drizzle's official Expo setup guide (metro.config.js `sql`
 * sourceExt + babel.config.js inline-import for .sql). Every pre-UAT
 * gate masked the omission — vitest served the migrations as virtual
 * modules (vitest.config.ts plugins), tsc was satisfied by the
 * companion drizzle/migrations.d.ts, and the CI bundle-scan job
 * (expo export) never ran because the phase branches were unpushed.
 * The gap surfaced only as the UAT Test 1 boot crash on ALL platforms:
 * Metro "Unable to resolve module ./0000_nebulous_meggan.sql from
 * drizzle/migrations.js". Full diagnosis:
 * .planning/debug/app-boot-crash-drizzle-migration.md.
 *
 * A silent removal (or staling) of any of the three artifacts asserted
 * below reintroduces that all-platform boot crash — this suite must
 * fail first, in CI. There is deliberately NO allowlist file: weakening
 * the scan instead of the config is the anti-pattern this guard exists
 * to surface (same guard-erosion stance as telemetry-guard.test.ts).
 *
 * Positive control (mutation-verified trip, telemetry-guard precedent):
 * verified once during 03-09 execution on 2026-08-29 — temporarily
 * renaming metro.config.js (→ metro.config.js.bak) made this suite exit
 * non-zero; the file was restored and the suite went green again.
 * Recorded in 03-09-SUMMARY.md.
 */

const METRO_CONFIG = fileURLToPath(new URL("../../metro.config.js", import.meta.url));
const BABEL_CONFIG = fileURLToPath(new URL("../../babel.config.js", import.meta.url));
const PACKAGE_JSON = fileURLToPath(new URL("../../package.json", import.meta.url));

describe("bundler guard: metro.config.js registers sql for drizzle migrations", () => {
  it("metro.config.js exists at the repo root", () => {
    // Deleting the config reintroduces the boot crash — fail here first.
    expect(existsSync(METRO_CONFIG), "metro.config.js is missing (03-09 bundler wiring removed)").toBe(true);
  });

  it("extends Expo's default config via getDefaultConfig (expo/metro-config)", () => {
    // A config that REPLACES the Expo default instead of extending it
    // (missing getDefaultConfig / expo/metro-config require) is stale
    // wiring and must fail.
    const source = readFileSync(METRO_CONFIG, "utf8");
    expect(
      /expo\/metro-config/.test(source) && /getDefaultConfig/.test(source),
      "metro.config.js must require getDefaultConfig from expo/metro-config and extend its result"
    ).toBe(true);
  });

  it("registers sql on resolver.sourceExts (drizzle Expo guide Step 6)", () => {
    const source = readFileSync(METRO_CONFIG, "utf8");
    expect(
      /sourceExts[^\n]*["']sql["']/.test(source),
      "metro.config.js must append 'sql' to config.resolver.sourceExts — without it Metro cannot " +
        "resolve the .sql imports in drizzle/migrations.js on ANY platform"
    ).toBe(true);
  });

  it("semantically loads with sql present in resolver.sourceExts", () => {
    const require = createRequire(import.meta.url);
    const config = require(METRO_CONFIG) as { resolver: { sourceExts: readonly string[] } };
    expect(
      config.resolver.sourceExts.includes("sql"),
      "metro.config.js loads but resolver.sourceExts lacks 'sql' — the wiring is broken, not just misformatted"
    ).toBe(true);
  });
});

describe("bundler guard: babel.config.js inlines .sql imports as strings", () => {
  it("babel.config.js exists at the repo root", () => {
    expect(existsSync(BABEL_CONFIG), "babel.config.js is missing (03-09 bundler wiring removed)").toBe(true);
  });

  it("uses the babel-preset-expo preset (Expo template default)", () => {
    const source = readFileSync(BABEL_CONFIG, "utf8");
    expect(
      source.includes("babel-preset-expo"),
      "babel.config.js must keep babel-preset-expo — it is Expo's template default and owns " +
        "worklets/reanimated plugin auto-inclusion (never add those manually)"
    ).toBe(true);
  });

  it("configures inline-import for the .sql extension (drizzle Expo guide Step 7)", () => {
    const source = readFileSync(BABEL_CONFIG, "utf8");
    expect(
      /["']inline-import["']/.test(source) && /extensions\s*:\s*\[\s*["']\.sql["']\s*\]/.test(source),
      "babel.config.js must configure the inline-import plugin with extensions: ['.sql'] — the shape " +
        "drizzle-orm/expo-sqlite/migrator's readMigrationFiles consumes"
    ).toBe(true);
  });

  it("semantically loads with the preset and the .sql inline-import plugin", () => {
    const require = createRequire(import.meta.url);
    const config = require(BABEL_CONFIG) as {
      presets: unknown[];
      plugins: unknown[];
    };
    expect(config.presets.includes("babel-preset-expo")).toBe(true);
    expect(
      JSON.stringify(config.plugins).includes("inline-import") && JSON.stringify(config.plugins).includes(".sql"),
      "babel.config.js loads but the plugins array no longer carries inline-import for .sql"
    ).toBe(true);
  });
});

describe("bundler guard: babel-plugin-inline-import stays a devDependency", () => {
  it("devDependencies includes babel-plugin-inline-import (not dependencies)", () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(
      pkg.devDependencies && Object.prototype.hasOwnProperty.call(pkg.devDependencies, "babel-plugin-inline-import"),
      "babel-plugin-inline-import must stay in devDependencies — removing it (03-01's skip) " +
        "reintroduces the all-platform boot crash this guard exists for"
    ).toBe(true);
    expect(
      pkg.dependencies ? Object.prototype.hasOwnProperty.call(pkg.dependencies, "babel-plugin-inline-import") : false,
      "babel-plugin-inline-import is build-time only — a move to dependencies ships it in the app " +
        "dependency graph and must fail"
    ).toBe(false);
  });
});
