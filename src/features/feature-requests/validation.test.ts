import { describe, expect, it } from "vitest";

import { customerFeatureRequestSchema } from "./validation";

describe("feature request validation", () => {
  it("accepts a complete request", () => {
    expect(
      customerFeatureRequestSchema.safeParse({
        title: "Add portfolio export scheduling",
        description:
          "Let executives schedule recurring portfolio exports for their teams.",
        priority: "high",
        diagnosticConsent: false,
        idempotencyKey: "00000000-0000-4000-8000-000000000001",
        correlationId: "00000000-0000-4000-8000-000000000002",
      }).success,
    ).toBe(true);
  });

  it("requires a useful description", () => {
    const result = customerFeatureRequestSchema.safeParse({
      title: "Export",
      description: "short",
      diagnosticConsent: false,
      idempotencyKey: "00000000-0000-4000-8000-000000000001",
      correlationId: "00000000-0000-4000-8000-000000000002",
    });
    expect(result.success).toBe(false);
  });
});
