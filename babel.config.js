// Babel configuration — drizzle Expo setup guide Step 7 (wired in 03-09).
//
// `inline-import` transforms the .sql imports that metro.config.js makes
// resolvable into raw default-export string modules — exactly the shape
// drizzle-orm/expo-sqlite/migrator's readMigrationFiles expects
// (migrations.m0000 as raw SQL it splits on the statement-breakpoint
// marker).
//
// `babel-preset-expo` is Expo's own template default (a transitive
// dependency of expo, resolvable from the repo root). Naming it
// explicitly keeps the worklets/reanimated plugin auto-inclusion
// identical to the previous implicit default — do NOT add any
// reanimated/worklets plugin manually; babel-preset-expo handles it.
//
// Guarded by src/__tests__/bundler-config-guard.test.ts: deleting or
// staling this file (or removing the devDependency) fails the mandatory
// CI vitest job.
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: [['inline-import', { extensions: ['.sql'] }]],
};
