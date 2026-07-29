import { describe, expect, it } from "vitest";

import { postgresTimestampSchema } from "@/features/portfolio/database-validation";

describe("portfolio database validation", () => {
  it("accepts PostgreSQL timestamptz offsets", () => {
    expect(postgresTimestampSchema.parse("2026-07-28T20:15:30.123+00:00")).toBe(
      "2026-07-28T20:15:30.123+00:00",
    );
  });

  it("rejects non-ISO timestamps", () => {
    expect(postgresTimestampSchema.safeParse("July 28, 2026").success).toBe(
      false,
    );
  });
});
