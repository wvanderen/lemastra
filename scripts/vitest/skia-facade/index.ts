/**
 * @shopify/react-native-skia vitest facade (04-01, extends the 03-08
 * expo-device-facade pattern).
 *
 * Why: the real package entry pulls the CanvasKit/WebAssembly runtime
 * (plus native glue) into the vitest graph, which plain-Node workers
 * cannot execute (T-04-02 — no test graph may load CanvasKit). The
 * wheel's geometry is pure by law (src/lib/chart-wheel), so only Skia
 * *component* tests ever resolve this specifier; those tests mock this
 * module per-file (per-file vi.mocks take precedence over the alias —
 * facade law) and assert through props, never through rasterization.
 *
 * Surface: exactly what Phase-4 components import — Canvas, Group,
 * Circle, Line, Path, Text, matchFont, Skia, DashPathEffect. Defaults
 * are benign: components render nothing, factories return inert values.
 * When a Phase-4 component imports a new export, extend this facade
 * deliberately (surface = exactly what consumers import).
 */

import type { FC, ReactNode } from "react";

/**
 * Function components written without JSX so this stays a `.ts` module
 * under strict tsc. Props are deliberately loose: the REAL package's
 * types govern app code (the alias only applies inside the vitest
 * graph); the facade only needs to render nothing without crashing.
 */
interface NoopProps {
  children?: ReactNode;
  [prop: string]: unknown;
}

function noopComponent(displayName: string): FC<NoopProps> {
  const component: FC<NoopProps> = () => null;
  component.displayName = displayName;
  return component;
}

export const Canvas = noopComponent("Canvas");
export const Group = noopComponent("Group");
export const Circle = noopComponent("Circle");
export const Line = noopComponent("Line");
export const Path = noopComponent("Path");
export const Text = noopComponent("Text");
export const DashPathEffect = noopComponent("DashPathEffect");

/** Benign font double — zeros until a test explicitly mocks measureText. */
export interface SkFontFacade {
  fontFamily: string;
  fontSize: number;
  measureText: (text: string) => { width: number; height: number };
  getGlyphWidths: (text: string) => number[];
}

export function matchFont(_spec: unknown): SkFontFacade {
  return {
    fontFamily: "sans-serif",
    fontSize: 0,
    measureText: () => ({ width: 0, height: 0 }),
    getGlyphWidths: (_text: string) => [],
  };
}

/** Chainable inert path builder — Skia.Path.Make() double. */
interface SkPathFacade {
  moveTo: () => SkPathFacade;
  lineTo: () => SkPathFacade;
  cubicTo: () => SkPathFacade;
  close: () => SkPathFacade;
  reset: () => SkPathFacade;
  toSVGString: () => string;
}

function inertPath(): SkPathFacade {
  const path: SkPathFacade = {
    moveTo: () => path,
    lineTo: () => path,
    cubicTo: () => path,
    close: () => path,
    reset: () => path,
    toSVGString: () => "",
  };
  return path;
}

/** Minimal factory namespace (Color / Path.Make). Extend deliberately. */
export const Skia = {
  Color: (_color: string | number): number => 0,
  Path: {
    Make: (): SkPathFacade => inertPath(),
  },
} as const;
