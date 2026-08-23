import { defineConfig } from "vitest/config";

// Vitest + React Native Testing Library runner configuration.
//
// Notes:
// - RNTL v14 (with its `test-renderer` peer) runs tests in a plain Node
//   environment — Test Renderer renders to pure JS objects, no simulator.
// - Component tests land in plan 01-02; this config currently proves the
//   runner with the zod schema smoke test (Wave 0 of the phase validation
//   contract).
// - RNTL v14 no longer ships a dedicated Vitest guide; environment and
//   include pattern follow Vitest's official configuration docs.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
