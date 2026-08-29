// Metro bundler configuration — drizzle Expo setup guide Step 6 (wired in 03-09).
//
// Metro is the bundler for BOTH web and native (dev server, export, and
// the CI bundle-scan). drizzle-kit's generated drizzle/migrations.js
// imports migration .sql files as string modules (line 4: `import m0000
// from './0000_nebulous_meggan.sql'`), and Metro's default resolver has
// no `sql` extension — without this registration every bundle dies with
// "Unable to resolve module ./0000_nebulous_meggan.sql" (the UAT Test 1
// boot crash on all platforms; root cause + evidence in
// .planning/debug/app-boot-crash-drizzle-migration.md).
//
// The includes-guard keeps re-requiring this config idempotent — the
// `sql` entry is never duplicated.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.sourceExts.includes('sql')) {
  config.resolver.sourceExts.push('sql');
}

module.exports = config;
