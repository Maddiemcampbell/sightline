import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpSupportMenu, helpMenuItems } from "@/components/help-support-menu";
import { HeaderDropdownProvider } from "@/components/header-dropdown-context";
import { helpPages } from "@/features/help/content";

describe("help and support menu", () => {
  it("provides the shared help destinations", () => {
    const markup = renderToStaticMarkup(
      <HeaderDropdownProvider>
        <HelpSupportMenu />
      </HeaderDropdownProvider>,
    );

    expect(markup).toContain("Help and support");
    expect(helpMenuItems.map(({ label }) => label)).toEqual([
      "Documentation",
      "Keyboard Shortcuts",
      "Contact Support",
      "Release Notes",
      "About Sightline",
    ]);
    expect(helpMenuItems[2]?.href).toContain("mailto:support@sightline.app");
    expect(markup).not.toContain("Coming soon");
  });

  it("maps every internal destination to a supported help page", () => {
    const internalSlugs = helpMenuItems
      .map(({ href }) => href)
      .filter((href) => href.startsWith("/help/"))
      .map((href) => href.replace("/help/", ""));

    expect(internalSlugs).toEqual(Object.keys(helpPages));
  });
});
