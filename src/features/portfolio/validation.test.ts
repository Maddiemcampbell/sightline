import { describe, expect, it } from "vitest";

import {
  projectFiltersSchema,
  riskFiltersSchema,
} from "@/features/portfolio/validation";

describe("portfolio filter validation", () => {
  it("uses safe defaults for unsupported project filters", () => {
    expect(
      projectFiltersSchema.parse({ stage: "deleted", sort: "unknown" }),
    ).toEqual({ q: "", stage: "all", sort: "exposure" });
  });

  it("normalizes array search parameters to their first value", () => {
    expect(
      projectFiltersSchema.parse({
        q: ["  concrete  ", "ignored"],
        stage: ["active", "complete"],
        sort: "margin",
      }),
    ).toEqual({ q: "concrete", stage: "active", sort: "margin" });
  });

  it("accepts shareable risk filters", () => {
    expect(
      riskFiltersSchema.parse({
        view: "resolved",
        q: "insurance",
        category: "insurance",
        severity: "high",
        status: "action_needed",
        project: "project-id",
        due: "7_days",
        sort: "confidence",
      }),
    ).toEqual({
      q: "insurance",
      view: "resolved",
      category: "insurance",
      severity: "high",
      status: "action_needed",
      project: "project-id",
      due: "7_days",
      sort: "confidence",
    });
  });
});
