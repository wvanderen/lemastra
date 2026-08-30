import type { MiniWheelCardProps } from "./mini-wheel-card";

/**
 * D-04 web stub for the D-03 mini-wheel entry card (04-07 fix-back).
 *
 * Metro resolves THIS file on Platform.OS === "web" (platform-specific
 * extension), so the native mini-wheel-card.tsx — and with it
 * WheelGraphics → @shopify/react-native-skia → the CanvasKit web
 * loader — never enters the web module graph. The native card is a
 * native-only surface by design (04-03): /chart/result's web branch
 * renders the full evidence experience instead (ModeToggle +
 * FactPanel + EvidenceLists — the user's D-04 decision), so nothing
 * legitimate ever renders this stub.
 *
 * Guarded by src/__tests__/web-skia-isolation.test.ts: skia-free, no
 * VALUE-import of the native sibling (the type-only import below is
 * erased at build), VALUE exports mirrored. Never render anything
 * here — a web render of the card would be a D-04 violation.
 */

/** Inert web double — never mounted (D-04: zero canvas on web). */
export function MiniWheelCard(_props: MiniWheelCardProps): null {
  return null;
}
