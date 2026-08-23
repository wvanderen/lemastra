import { describe, expect, it } from "vitest";

import { z } from "zod";

// Wave 0 smoke test — proves the Vitest runner is green and pins the
// zod schema-testing pattern every later plan uses: define a schema,
// parse a valid payload, reject a malformed one.
const schema = z.object({ id: z.string() });

describe("zod schema-test pattern", () => {
  it("parses a valid payload", () => {
    expect(schema.parse({ id: "x" })).toEqual({ id: "x" });
  });

  it("rejects a malformed payload", () => {
    expect(() => schema.parse({ id: 42 })).toThrow();
  });
});
