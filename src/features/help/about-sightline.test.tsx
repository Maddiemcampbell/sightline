import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AboutSightline } from "@/features/help/about-sightline";

describe("About Sightline", () => {
  it("explains the product workflow, trust model, and next steps", () => {
    const markup = renderToStaticMarkup(<AboutSightline />);

    expect(markup).toContain("See risk sooner. Protect project profit.");
    expect(markup).toContain("One line of sight from signal to response");
    expect(markup).toContain("AI should make the evidence clearer");
    expect(markup).toContain("Permission-aware");
    expect(markup).toContain('href="/brief"');
    expect(markup).toContain('href="/ask"');
    expect(markup).toContain('href="/settings/privacy"');
  });
});
