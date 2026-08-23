/**
 * Type declarations for the babel plugins the React Native test shim loads
 * dynamically at runtime (scripts/vitest/react-native-shim.ts). These are
 * transitive dependencies already present in node_modules (pulled in by
 * react-native's own @react-native/babel-preset) but ship without their own
 * TypeScript types; @types packages are deliberately not installed for them.
 */

declare module "@babel/core" {
  const babel: {
    transformSync(
      code: string,
      options: {
        babelrc?: boolean;
        configFile?: boolean;
        compact?: boolean;
        filename?: string;
        plugins?: unknown[];
        sourceMaps?: boolean | "inline";
      }
    ): { code: string | null; map: unknown };
  };
  export default babel;
}

declare module "@babel/plugin-transform-flow-strip-types" {
  const plugin: unknown;
  export default plugin;
}

declare module "@babel/plugin-transform-react-jsx" {
  const plugin: unknown;
  export default plugin;
}

declare module "babel-plugin-syntax-hermes-parser" {
  const plugin: unknown;
  export default plugin;
}

declare module "babel-plugin-transform-flow-enums" {
  const plugin: unknown;
  export default plugin;
}
