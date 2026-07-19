import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BriefSummary } from "@/features/daily-brief/brief-summary";

describe("BriefSummary", () => {
  it("renders all four executive metrics accessibly", () => {
    const markup = renderToStaticMarkup(
      <BriefSummary
        totalProfitAtRiskCents={28100000}
        activeProjectCount={4}
        openRiskCount={7}
        overallRiskLevel="Critical"
      />,
    );
    expect(markup).toContain('aria-label="Brief summary"');
    expect(markup).toContain("$281,000");
    expect(markup).toContain("Active projects");
    expect(markup).toContain("Critical");
  });
});
