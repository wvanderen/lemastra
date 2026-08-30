/**
 * Type declaration for drizzle-kit's generated drizzle/migrations.js
 * (A5 shape — source-verified against the emitted index and
 * drizzle-orm's readMigrationFiles consumer). The .js file itself is
 * outside tsconfig's include patterns, so without this companion the
 * relative import in src/lib/workspace/db.ts fails to resolve.
 * Regenerating migrations does not touch this file; the shape is the
 * stable migrator contract.
 */
declare const migrations: {
  journal: {
    version: string;
    dialect: string;
    entries: {
      idx: number;
      version: string;
      when: number;
      tag: string;
      breakpoints: boolean;
    }[];
  };
  migrations: Record<string, string>;
};

export default migrations;
