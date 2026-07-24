import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpSupportMenu } from "@/components/help-support-menu";

describe("help and support menu", () => {
  it("provides actionable and privacy-safe support destinations", () => {
    const markup = renderToStaticMarkup(<HelpSupportMenu />);

    expect(markup).toContain("Help and support");
    expect(markup).toContain("Report a problem");
    expect(markup).toContain("mailto:support@sightline.app");
    expect(markup).toContain("/settings/privacy");
    expect(markup).toContain("Never include passwords");
  });
});
