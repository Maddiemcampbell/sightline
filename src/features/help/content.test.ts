import { describe, expect, it } from "vitest";

import { helpPages, isHelpPageSlug } from "./content";

describe("help page content", () => {
  it("provides complete content for every supported help destination", () => {
    expect(Object.keys(helpPages)).toEqual([
      "documentation",
      "shortcuts",
      "releases",
      "forecasting",
      "reports-meetings",
      "follow-ups-alerts",
      "about",
    ]);

    for (const page of Object.values(helpPages)) {
      expect(page.title).not.toHaveLength(0);
      expect(page.introduction.length).toBeGreaterThan(40);
      expect(page.sections.length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(page)).not.toMatch(/coming soon|placeholder/i);
    }
  });

  it("rejects unknown help routes", () => {
    expect(isHelpPageSlug("documentation")).toBe(true);
    expect(isHelpPageSlug("missing")).toBe(false);
  });

  it("documents the Ask Sightline command palette", () => {
    const serialized = JSON.stringify(helpPages.shortcuts);
    expect(serialized).toContain("ask-sightline-commands");
    expect(serialized).toContain("/forecast");
    expect(serialized).toContain("/meeting");
    expect(serialized).toContain("/deck");
  });
});
