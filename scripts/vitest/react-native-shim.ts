import fsSync from "node:fs";
import { createRequire, Module } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin as RolldownPlugin } from "rolldown";

/**
 * React Native test shim for Vitest (plain-Node environment).
 *
 * Problem: react-native ships Flow-typed sources (`import typeof ...`,
 * `} as T` casts) that Metro strips at bundle time but plain Node cannot
 * parse. Jest handles this via the RN babel preset; under Vitest every
 * native `require("react-native")` (RNTL's, test files', externals') hits
 * the raw sources and dies with `SyntaxError: Unexpected token 'typeof'`.
 *
 * Fix (zero new dependencies — everything used is already in the tree):
 * 1. Pre-bundle react-native with rolldown (vite 8's bundler, a direct
 *    dependency here), stripping Flow via the same Hermes-parser +
 *    flow-strip babel plugins that @react-native/babel-preset uses, with
 *    Metro-style platform file resolution (`.ios.js` → `.native.js` →
 *    `.js`, ios platform like the RN jest preset).
 * 2. Seed Node's `require.cache` for react-native's resolved id with the
 *    pre-bundled exports, BEFORE any test imports run (setupFiles). Both
 *    the Vitest module graph and native CJS requires then share one
 *    module instance — identity matters: RNTL must see the same `Text`
 *    components the screens under test render.
 *
 * The bundle is cached on disk keyed by the react-native version plus the
 * shim implementation version.
 */

const SHIM_VERSION = "1";
const RN_PLATFORM = "ios"; // matches the react-native jest preset default

const nodeRequire = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cacheDir = path.join(projectRoot, "node_modules/.cache/lemastra-vitest-rn");

export async function installReactNativeTestShim(): Promise<void> {
  const rnPackageId = nodeRequire.resolve("react-native/package.json");
  const rnRoot = path.dirname(rnPackageId);
  const rnVersion: string = JSON.parse(fsSync.readFileSync(rnPackageId, "utf8")).version;
  const bundlePath = path.join(cacheDir, `react-native-${rnVersion}-shim${SHIM_VERSION}.cjs`);

  const rnId = nodeRequire.resolve("react-native");
  if (nodeRequire.cache[rnId]) {
    // Already loaded (e.g. a second setup pass in the same worker).
    return;
  }

  if (!fsSync.existsSync(bundlePath)) {
    fsSync.mkdirSync(cacheDir, { recursive: true });
    await buildRnBundle(path.join(rnRoot, "index.js"), rnRoot, bundlePath);
  }

  const mod = new Module(rnId, null);
  mod.filename = rnId;
  mod.exports = nodeRequire(bundlePath);
  mod.loaded = true;
  nodeRequire.cache[rnId] = mod;
}

/** rolldown bundle: RN sources flow-stripped, everything else external. */
async function buildRnBundle(entry: string, rnRoot: string, outfile: string): Promise<void> {
  // Imported lazily so vitest.config (which never calls this) stays cheap.
  const { rolldown } = await import("rolldown");
  const babel = (await import("@babel/core")).default;
  const flowStripTypes = (await import("@babel/plugin-transform-flow-strip-types")).default;
  const flowEnums = (await import("babel-plugin-transform-flow-enums")).default;
  const reactJsx = (await import("@babel/plugin-transform-react-jsx")).default;
  const hermesParser = (await import("babel-plugin-syntax-hermes-parser")).default;

  const RN_SCOPE_RE = /[\\/]node_modules[\\/](@react-native[\\/]|react-native[\\/])/;

  const rnPlugin: RolldownPlugin = {
    name: "lemastra-rn-flow-strip",
    resolveId(specifier, importer) {
      if (!importer) return null; // entry, handled by rolldown input
      if (specifier.startsWith(".") || path.isAbsolute(specifier)) {
        const resolved = resolveMetroStyle(specifier, path.dirname(importer));
        if (resolved) return { id: resolved };
        return null;
      }
      // react-native self-references resolve inside the package
      if (specifier === "react-native" || specifier.startsWith("react-native/")) {
        const rel =
          specifier === "react-native" ? "index.js" : specifier.slice("react-native/".length);
        const resolved = resolveMetroStyle(rel, rnRoot);
        if (resolved) return { id: resolved };
      }
      // @react-native/* satellite packages also ship Flow sources → bundle
      if (specifier.startsWith("@react-native/")) {
        try {
          const resolved = nodeRequire.resolve(specifier, {
            paths: [path.dirname(importer)],
          });
          if (RN_SCOPE_RE.test(resolved)) return { id: resolved };
        } catch {
          // fall through to default resolution
        }
      }
      return null; // bare deps → external via the `external` option
    },
    load(id) {
      if (ASSET_RE.test(id)) {
        return "export default 0;"; // asset requires become inert in tests
      }
      return null;
    },
    transform(code, id) {
      if (!RN_SCOPE_RE.test(id) || !id.endsWith(".js")) {
        return null;
      }
      const result = babel.transformSync(code, {
        babelrc: false,
        configFile: false,
        compact: false,
        filename: id,
        // Same parse/strip stack as @react-native/babel-preset: Hermes
        // parser (Flow superset incl. unparenthesized `as` casts).
        // flow-enums runs BEFORE flow-strip-types: enums are runtime
        // constructs the enums plugin lowers to a const (flow-strip alone
        // would delete the declaration and leave dangling references).
        // JSX lowering last.
        plugins: [
          [hermesParser, { parseLangTypes: "flow" }],
          flowEnums,
          flowStripTypes,
          reactJsx,
        ],
        sourceMaps: true,
      });
      return { code: result.code ?? code, map: result.map ?? undefined };
    },
  };

  const bundle = await rolldown({
    input: entry,
    plugins: [rnPlugin],
    treeshake: false,
    external(id) {
      if (id.startsWith(".") || path.isAbsolute(id)) return false;
      if (id === "react-native" || id.startsWith("react-native/")) return false;
      if (id.startsWith("@react-native/")) return false; // Flow sources → bundled
      return true; // every other package loads natively at test time
    },
  });
  try {
    await bundle.write({
      file: outfile,
      format: "cjs",
      sourcemap: "inline",
      banner: "var __DEV__ = true;", // jest-equivalent default for tests
    });
  } finally {
    await bundle.close();
  }
}

const ASSET_RE = /\.(png|jpe?g|gif|webp|ttf|otf|svg|mp3|mp4|wav|cairo)$/;

/**
 * Metro-style resolution inside react-native: for extension-less
 * specifiers try `.<platform>.js` → `.native.js` → `.js` (then `.json`,
 * then directory index variants). Explicit extensions resolve as-is.
 */
function resolveMetroStyle(specifier: string, fromDir: string): string | null {
  const base = path.resolve(fromDir, specifier);
  const ext = path.extname(base);
  const hasKnownExt = [".js", ".cjs", ".mjs", ".json"].includes(ext);

  const candidates: string[] = [];
  if (hasKnownExt) {
    candidates.push(base);
  } else {
    const platforms = [RN_PLATFORM, "native", ""];
    for (const platform of platforms) {
      const suffix = platform ? `.${platform}` : "";
      candidates.push(`${base}${suffix}.js`, `${base}${suffix}.json`);
    }
    for (const platform of platforms) {
      const suffix = platform ? `.${platform}` : "";
      candidates.push(path.join(base, `index${suffix}.js`), path.join(base, `index${suffix}.json`));
    }
  }

  for (const candidate of candidates) {
    if (isFile(candidate)) return candidate;
  }
  return null;
}

function isFile(p: string): boolean {
  try {
    return fsSync.statSync(p).isFile();
  } catch {
    return false;
  }
}
