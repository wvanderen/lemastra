import type { WheelCanvasProps, WheelGraphicsProps } from "./wheel-canvas";

/**
 * D-04 web stub for the interactive wheel canvas (04-07 fix-back).
 *
 * Metro resolves THIS file on Platform.OS === "web" (platform-specific
 * extension), so the native wheel-canvas.tsx — and with it
 * @shopify/react-native-skia and the CanvasKit/WebAssembly web loader
 * — never even enters the web module graph. Expo Router eagerly
 * evaluates every route module on web, so a static import of the real
 * module crashed /chart/result ("Cannot read properties of undefined
 * (reading 'TypefaceFontProvider')") even though web never renders a
 * canvas (D-04: web gets the full evidence experience on
 * /chart/result; /chart/explore shows the capability card).
 *
 * Guarded by src/__tests__/web-skia-isolation.test.ts: this stub must
 * stay skia-free, must not VALUE-import its native sibling (the
 * type-only import below is erased at build), and must re-export the
 * native module's VALUE exports. Never render anything here — a web
 * render of these components would be a D-04 violation.
 */

/** Inert web double — never mounted (D-04: zero canvas on web). */
export function WheelCanvas(_props: WheelCanvasProps): null {
  return null;
}

/** Inert web double — never mounted (D-04: zero canvas on web). */
export function WheelGraphics(_props: WheelGraphicsProps): null {
  return null;
}
