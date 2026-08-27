import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit codegen config (03-01) — `npm run db:generate` emits the
 * app-importable migration modules + journal under drizzle/ (committed
 * artifacts; A5: the generated index must be importable by the
 * imperative migrator inside getWorkspaceDb()).
 */
export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./src/lib/workspace/schema.ts",
  out: "./drizzle",
});
