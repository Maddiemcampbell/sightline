import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RichResponse } from "@/features/ask-sightline/rich-response";

describe("Ask Sightline rich responses", () => {
  it("renders a mode-specific evidence summary", () => {
    const markup = renderToStaticMarkup(
      <RichResponse
        message={{
          id: "answer-1",
          role: "assistant",
          content: "The forecast requires attention.",
          confidence: 80,
          routedAdvisorMode: "forecast",
          missingInformation: ["Completion date is missing."],
          suggestedFollowUps: [],
          citations: [
            {
              id: "forecast:portfolio",
              entityType: "forecast",
              title: "Portfolio forecast",
              excerpt: "Current forecast confidence is medium.",
              href: "/forecasts",
            },
          ],
        }}
      />,
    );

    expect(markup).toContain("Forecast outlook");
    expect(markup).toContain("80% confidence");
    expect(markup).toContain("1 evidence gap");
    expect(markup).toContain("Open full workspace");
  });

  it("does not invent a structured summary without a routed mode", () => {
    expect(
      renderToStaticMarkup(
        <RichResponse
          message={{
            id: "answer-2",
            role: "assistant",
            content: "No structured context.",
            confidence: null,
            missingInformation: [],
            suggestedFollowUps: [],
            citations: [],
          }}
        />,
      ),
    ).toBe("");
  });
});
