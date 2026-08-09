import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AskSightlineWorkspace } from "@/features/ask-sightline/ask-workspace";
import { SharedAskProvider } from "@/features/ask-sightline/shared-ask-provider";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";

describe("Ask Sightline workspace", () => {
  it("presents permission-aware scope and answer guidance", () => {
    const markup = renderToStaticMarkup(
      <WorkspaceProvider
        organizationId="organization-1"
        userId="user-1"
        canUseAi
        projects={[{ id: "project-1", name: "Cedar Grove" }]}
        searchResources={[]}
      >
        <SharedAskProvider storageIdentity="user-1:organization-1">
          <AskSightlineWorkspace />
        </SharedAskProvider>
      </WorkspaceProvider>,
    );

    expect(markup).toContain("Ask Sightline");
    expect(markup).toContain("Current scope");
    expect(markup).toContain("Your organization permissions");
    expect(markup).toContain("How answers work");
    expect(markup).toContain("Verify cited records before acting");
  });
});
