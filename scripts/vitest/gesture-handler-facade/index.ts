/**
 * react-native-gesture-handler vitest facade (04-01, Rule 3 deviation,
 * extends the 03-08 device-facade pattern).
 *
 * Why: `_layout.tsx` mounts GestureHandlerRootView (04-01 Task 2,
 * Pitfall 2), so every graph that renders the root layout — the
 * unmocked Phase-2 birth-form RootLayout wiring test — now imports
 * RNGH. The real package entry pulls deep
 * `react-native/Libraries/...` Flow sources that plain-Node workers
 * cannot parse (SyntaxError: Unexpected identifier) plus native turbo
 * modules. Tests that assert gesture behavior mock this module
 * per-file (per-file vi.mocks take precedence over the alias —
 * facade law); this facade exists so unmocked graphs render the app
 * root without device APIs.
 *
 * Surface: exactly what app code imports today —
 * GestureHandlerRootView. Phase-4 gesture tests (04-03+) add
 * GestureDetector/Gesture through per-file vi.mocks or extend this
 * facade deliberately (surface = exactly what consumers import).
 */

import type { FC, ReactNode } from "react";

interface RootViewProps {
  children?: ReactNode;
  [prop: string]: unknown;
}

/** Transparent passthrough — a View wrapper with no native behavior. */
export const GestureHandlerRootView: FC<RootViewProps> = ({ children }) =>
  children ?? null;
GestureHandlerRootView.displayName = "GestureHandlerRootView";
