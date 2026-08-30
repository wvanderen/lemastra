/**
 * react-native-worklets vitest facade (04-03 Task 3, Rule 3 deviation,
 * extends the 04-01 facade law).
 *
 * Why: the wheel canvas imports `runOnJS` to hop from its Tap worklet
 * back to JS-side hit-testing, and importing the canvas (via the D-03
 * mini-wheel card on /chart/result and /chart/saved) drags the real
 * react-native-worklets entry into plain-Node vitest graphs — where its
 * ESM directory imports and native runtime cannot load (same class as
 * the 04-01 RNGH facade).
 *
 * Surface: exactly what app code imports today — `runOnJS` (the wheel
 * canvas) and `scheduleOnRN` (animated-icon.tsx, for any future graph
 * that renders it unmocked). `runOnJS` here returns an IMMEDIATE
 * caller: the "worklet" side collapses onto JS, which is exactly what
 * component tests need (tap handlers invoke the real hit-testing path
 * synchronously). Tests that assert threading behavior mock this
 * module per-file (precedence law). Extend deliberately.
 */

/** Immediate call — no UI thread exists under the facade. */
export function runOnJS<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  return (...args: TArgs) => fn(...args);
}

/** Synchronous dispatch — collapses onto the JS thread. */
export function scheduleOnRN<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ...args: TArgs
): void {
  fn(...args);
}
