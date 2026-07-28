import { describe, expect, it } from "vitest";

import {
  customerBugReportSchema,
  detectImageType,
  sanitizeFilename,
} from "./validation";

const valid = {
  title: "Project form freezes",
  description: "The form stopped responding after I selected a vendor.",
  diagnosticConsent: false,
  idempotencyKey: "10000000-0000-4000-8000-000000000001",
  correlationId: "20000000-0000-4000-8000-000000000001",
};

describe("customer bug report validation", () => {
  it("requires only title and description among customer-entered fields", () => {
    expect(customerBugReportSchema.safeParse(valid).success).toBe(true);
  });

  it("returns field-specific errors while accepting optional values", () => {
    const result = customerBugReportSchema.safeParse({
      ...valid,
      title: "x",
      stepsToReproduce: "Open the project",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined();
      expect(result.error.flatten().fieldErrors.stepsToReproduce).toBeUndefined();
    }
  });

  it("detects image content from magic bytes", () => {
    expect(
      detectImageType(
        Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
      ),
    ).toBe("image/png");
    expect(
      detectImageType(Uint8Array.from([60, 115, 99, 114, 105, 112, 116])),
    ).toBeNull();
  });

  it("sanitizes attachment filenames", () => {
    expect(sanitizeFilename("../../screen shot<script>.png")).not.toContain(
      "<",
    );
  });
});
