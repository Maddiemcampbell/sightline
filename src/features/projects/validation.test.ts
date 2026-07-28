import { describe, expect, it } from "vitest";

import { firstProjectSchema } from "@/features/projects/validation";

describe("firstProjectSchema", () => {
  it("accepts a project with every optional field left blank", () => {
    const result = firstProjectSchema.safeParse({
      name: "Medical Office Renovation",
      projectNumber: "24-107",
      addressLine1: "",
      city: "",
      stateCode: "",
      postalCode: "",
      startDate: "",
      targetCompletionDate: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        addressLine1: null,
        city: null,
        stateCode: null,
        postalCode: null,
        startDate: null,
        targetCompletionDate: null,
      });
    }
  });

  it("reports only invalid fields while retaining valid submitted values", () => {
    const result = firstProjectSchema.safeParse({
      name: "M",
      projectNumber: "24-108",
      addressLine1: "100 Main Street",
      city: "Oakland",
      stateCode: "California",
      postalCode: "94607",
      startDate: "2026-08-10",
      targetCompletionDate: "2026-08-01",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.name?.[0]).toContain("at least 2 characters");
      expect(errors.stateCode?.[0]).toContain("two-letter state code");
      expect(errors.targetCompletionDate?.[0]).toContain(
        "on or after the start date",
      );
      expect(errors.projectNumber).toBeUndefined();
      expect(errors.addressLine1).toBeUndefined();
      expect(errors.city).toBeUndefined();
      expect(errors.postalCode).toBeUndefined();
    }
  });
});
