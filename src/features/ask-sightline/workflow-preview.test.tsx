import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SharedAskProvider } from "@/features/ask-sightline/shared-ask-provider";
import { WorkflowPreview } from "@/features/ask-sightline/workflow-preview";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";

describe("Ask Sightline workflow preview", () => {
  it("renders an explicit editable approval boundary", () => {
    const riskId = crypto.randomUUID();
    const markup = renderToStaticMarkup(
      <WorkspaceProvider
        organizationId={crypto.randomUUID()}
        userId={crypto.randomUUID()}
        canUseAi
        projects={[]}
        searchResources={[
          {
            id: riskId,
            type: "risk",
            title: "Insurance certificate expires soon",
            detail: "Cedar Grove · critical severity",
            href: `/risks/${riskId}`,
          },
        ]}
      >
        <SharedAskProvider storageIdentity="workflow-preview-test">
          <WorkflowPreview
            message={{
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Review the proposed follow-up.",
              citations: [],
              confidence: 90,
              missingInformation: [],
              suggestedFollowUps: [],
              workflowProposal: {
                id: crypto.randomUUID(),
                command: "/action",
                status: "ready_for_review",
                title: "Proposed actions",
                summary: "Renew the certificate",
                effect: "No action has been created.",
                href: "/actions",
                actionLabel: "Review actions",
                items: [
                  {
                    id: crypto.randomUUID(),
                    selected: true,
                    status: "suggested",
                    title: "Obtain renewed certificate",
                    description: "Attach the renewed certificate.",
                    riskId,
                    riskTitle: "Insurance certificate expires soon",
                    ownerUserId: null,
                    priority: "high",
                    dueDate: "2026-08-18",
                    evidenceTitle: "Insurance certificate expires soon",
                    evidenceHref: `/risks/${riskId}`,
                    createdActionId: null,
                    error: null,
                  },
                ],
              },
            }}
          />
        </SharedAskProvider>
      </WorkspaceProvider>,
    );

    expect(markup).toContain("Nothing changes without approval");
    expect(markup).toContain("Definition of done");
    expect(markup).toContain("Approve &amp; create selected");
    expect(markup).toContain("Permission and project access are checked again");
  });
});
