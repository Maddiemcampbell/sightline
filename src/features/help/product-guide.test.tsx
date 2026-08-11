import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductGuide } from "@/features/help/product-guide";

describe("Sightline product guide", () => {
  it("connects core workflows to their workspace destinations", () => {
    const markup = renderToStaticMarkup(<ProductGuide />);

    expect(markup).toContain("Get productive with Sightline");
    expect(markup).toContain("A practical daily workflow");
    expect(markup).toContain("Navigate the workspace");
    expect(markup).toContain("Home is your portfolio overview");
    expect(markup).toContain("Use Sightline beyond the daily risk review");
    expect(markup).toContain("Forecast with confidence");
    expect(markup).toContain("Prepare executive reviews");
    expect(markup).toContain("Close the commitment loop");
    expect(markup).toContain("Before acting on an answer");
    expect(markup).toContain("Access follows organizational responsibility");
    expect(markup).toContain('href="/brief"');
    expect(markup).toContain('href="/ask"');
    expect(markup).toContain('href="/help/forecasting"');
    expect(markup).toContain('href="/help/reports-meetings"');
    expect(markup).toContain('href="/help/follow-ups-alerts"');
    expect(markup).toContain('href="/organization?section=team"');
  });
});
