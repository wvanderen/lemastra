import { afterEach } from "vitest";

import { installReactNativeTestShim } from "../../scripts/vitest/react-native-shim";

// Runs before every test file (vitest setupFiles). react-native ships
// Flow-typed sources that plain Node cannot parse; the shim pre-bundles it
// (flow-stripped) and seeds require.cache so every consumer shares one
// module instance. See scripts/vitest/react-native-shim.ts for details.
//
// NOTE: any module that (transitively) requires react-native — including
// RNTL — must be imported dynamically AFTER the shim install; a static
// import would hoist above it and hit the raw Flow sources.
await installReactNativeTestShim();

// RNTL's `/pure` entry (used because Vitest has no jest globals) skips
// automatic cleanup — unmount manually after every test so repeated
// renders don't leak into later text queries.
const { cleanup } = await import("@testing-library/react-native/pure");
afterEach(() => {
  cleanup();
});
