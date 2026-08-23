import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Vitest + React Native Testing Library runner configuration.
//
// Notes:
// - RNTL v14 (with its `test-renderer` peer) runs tests in a plain Node
//   environment — Test Renderer renders to pure JS objects, no simulator.
// - react-native ships Flow-typed sources that plain Node cannot parse;
//   src/test/setup.ts pre-bundles it (flow-stripped) and seeds
//   require.cache before any test imports run. See
//   scripts/vitest/react-native-shim.ts.
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
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
  },
});
