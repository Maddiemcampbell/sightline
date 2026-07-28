import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HelpSupportMenu, helpMenuItems } from "@/components/help-support-menu";
import { HeaderDropdownProvider } from "@/components/header-dropdown-context";

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
  });
});
