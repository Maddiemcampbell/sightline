import { describe, expect, it } from "vitest";

import {
  executiveDeckTemplates,
  isExecutiveDeckTemplate,
} from "@/features/reports/executive-deck";

describe("executive deck templates", () => {
  it("offers distinct saved reporting templates", () => {
    expect(executiveDeckTemplates.map((template) => template.name)).toEqual([
      "Weekly executive review",
      "Monthly portfolio review",
      "Project owner meeting",
      "Lender or board update",
      "Risk committee briefing",
    ]);
  });

  it("validates template identifiers before generating a download", () => {
    expect(isExecutiveDeckTemplate("weekly-executive-review")).toBe(true);
    expect(isExecutiveDeckTemplate("unknown-template")).toBe(false);
  });
});
