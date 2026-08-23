import { installReactNativeTestShim } from "../../scripts/vitest/react-native-shim";

// Runs before every test file (vitest setupFiles). react-native ships
// Flow-typed sources that plain Node cannot parse; the shim pre-bundles it
// (flow-stripped) and seeds require.cache so every consumer shares one
// module instance. See scripts/vitest/react-native-shim.ts for details.
//
// NOTE: any module that (transitively) requires react-native — including
// RNTL — must be imported dynamically AFTER the shim install; a static
// import would hoist above it and hit the raw Flow sources. RNTL is
// therefore acquired inside each component test file (beforeAll), NOT here
// — importing it here would create a second module instance and RNTL's
// render/screen state would split across them.
await installReactNativeTestShim();

// React 19: RNTL's `/pure` entry skips the automatic beforeAll/afterAll
// the main entry uses to manage the act environment — with /pure, the
// test author owns this flag. Without it act() queues never flush and
// awaited render/cleanup promises hang forever.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
