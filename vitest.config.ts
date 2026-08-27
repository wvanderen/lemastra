import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { lazyFacadeSource } from "./scripts/vitest/react-native-shim";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// react-native alias facade (see scripts/vitest/react-native-shim.ts).
// Written here at CONFIG time — vite transforms test modules in the main
// process before any worker (and thus before the setupFile) runs, so the
// alias target must exist and stay lazy (no raw require at import time).
const nodeRequire = createRequire(path.join(dirname, "vitest.config.ts"));
const facadeDir = path.join(dirname, "node_modules/.cache/lemastra-vitest-rn");
fs.mkdirSync(facadeDir, { recursive: true });
fs.writeFileSync(
  path.join(facadeDir, "rn-require-facade.cjs"),
  lazyFacadeSource(nodeRequire.resolve("react-native")),
  "utf8"
);

// Vitest + React Native Testing Library runner configuration.
//
// Notes:
// - RNTL v14 (with its `test-renderer` peer) runs tests in a plain Node
//   environment — Test Renderer renders to pure JS objects, no simulator.
// - react-native ships Flow-typed sources that plain Node cannot parse;
//   src/test/setup.ts pre-bundles it (flow-stripped) and seeds
//   require.cache before any test module imports run. The alias below
//   routes graph imports through a lazy facade so collection never touches
//   the raw package. See scripts/vitest/react-native-shim.ts.
// - RNTL v14 publishes no Vitest guide; environment/include follow Vitest
//   4 official config docs.
export default defineConfig({
  // Mirrors tsconfig.json "paths": "@/assets/*" → ./assets/* (more specific,
  // listed first) and "@/*" → ./src/*, so component tests import app code
  // with the same alias Metro and tsc resolve.
  resolve: {
    alias: [
      { find: /^@\/assets\/(.*)$/, replacement: path.resolve(dirname, "assets/$1") },
      { find: /^@\/(.*)$/, replacement: path.resolve(dirname, "src/$1") },
      { find: /^react-native$/, replacement: path.join(facadeDir, "rn-require-facade.cjs") },
      // expo-sqlite → node:sqlite-backed test facade (03-01). Unlike the
      // react-native facade this is a committed TypeScript module (no
      // prebundling needed — it only uses node builtins); it implements
      // exactly the drizzle expo-sqlite session call surface. See
      // scripts/vitest/expo-sqlite-facade/README.md.
      { find: /^expo-sqlite$/, replacement: path.join(dirname, "scripts/vitest/expo-sqlite-facade/index.ts") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
