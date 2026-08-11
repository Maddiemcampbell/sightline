import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductGuide } from "@/features/help/product-guide";

describe("Sightline product guide", () => {
  it("connects core workflows to their workspace destinations", () => {
    const markup = renderToStaticMarkup(<ProductGuide />);

    expect(markup).toContain("Get productive with Sightline");
    expect(markup).toContain("A practical daily workflow");
    expect(markup).toContain("Navigate the workspace");
    expect(markup).toContain("Before acting on an answer");
    expect(markup).toContain("Access follows organizational responsibility");
    expect(markup).toContain('href="/brief"');
    expect(markup).toContain('href="/ask"');
    expect(markup).toContain('href="/organization?section=team"');
  });
});
