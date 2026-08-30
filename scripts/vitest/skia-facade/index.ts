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
 *
 * 04-03 extension: components RECORD their props into a module-level
 * array (`__getRendered` / `__clearRendered`) so tests can assert the
 * deterministic primitives the canvas draws (selection highlights,
 * dashed provisional outlines, per-family chord weights) without any
 * rasterization. Recording is inert for non-asserting graphs. Skia's
 * factory namespace also gains XYWHRect + path arcToOval (annular
 * sector outlines) — consumed by the wheel's selection paths.
 */

import type { FC, ReactNode } from "react";

/**
 * Recorded primitives in render (parent-before-child) order. Entries
 * are { type, props } — props kept as passed (never serialized).
 */
const rendered: Array<{ type: string; props: Record<string, unknown> }> = [];

/** Clear the recorded-primitive log (call between test cases). */
export function __clearRendered(): void {
  rendered.length = 0;
}

/** The primitives rendered since the last clear (render order). */
export function __getRendered(): ReadonlyArray<{ type: string; props: Record<string, unknown> }> {
  return rendered;
}

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
  const component: FC<NoopProps> = (props) => {
    rendered.push({ type: displayName, props: props as Record<string, unknown> });
    return null;
  };
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

export function matchFont(spec: { fontFamily?: string; fontSize?: number }): SkFontFacade {
  return {
    fontFamily: spec.fontFamily ?? "sans-serif",
    fontSize: spec.fontSize ?? 0,
    measureText: () => ({ width: 0, height: 0 }),
    getGlyphWidths: (_text: string) => [],
  };
}

/** Inert rect double — Skia.XYWHRect(...) consumers only feed it back to arcs. */
export interface SkRectFacade {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Chainable inert path builder — Skia.Path.Make() double. */
interface SkPathFacade {
  moveTo: (x: number, y: number) => SkPathFacade;
  lineTo: (x: number, y: number) => SkPathFacade;
  arcToOval: (
    oval: SkRectFacade,
    startAngle: number,
    sweepAngle: number,
    forceMoveTo: boolean
  ) => SkPathFacade;
  cubicTo: () => SkPathFacade;
  close: () => SkPathFacade;
  reset: () => SkPathFacade;
  toSVGString: () => string;
}

function inertPath(): SkPathFacade {
  const path: SkPathFacade = {
    moveTo: () => path,
    lineTo: () => path,
    arcToOval: () => path,
    cubicTo: () => path,
    close: () => path,
    reset: () => path,
    toSVGString: () => "",
  };
  return path;
}

/** Minimal factory namespace (Color / Path.Make / XYWHRect). Extend deliberately. */
export const Skia = {
  Color: (_color: string | number): number => 0,
  Path: {
    Make: (): SkPathFacade => inertPath(),
  },
  XYWHRect: (x: number, y: number, width: number, height: number): SkRectFacade => ({
    x,
    y,
    width,
    height,
  }),
} as const;
