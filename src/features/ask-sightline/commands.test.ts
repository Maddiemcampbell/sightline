import { describe, expect, it } from "vitest";

import {
  askCommands,
  buildWorkflowProposal,
  matchingAskCommands,
  resolveAskCommand,
} from "@/features/ask-sightline/commands";

describe("Ask Sightline commands", () => {
  it("exposes unique documented commands", () => {
    expect(new Set(askCommands.map((command) => command.token)).size).toBe(
      askCommands.length,
    );
    expect(askCommands.map((command) => command.token)).toEqual(
      expect.arrayContaining([
        "/auto",
        "/forecast",
        "/scenario",
        "/meeting",
        "/deck",
      ]),
    );
  });

  it("filters commands while the slash token is being typed", () => {
    expect(
      matchingAskCommands("/fore").map((command) => command.token),
    ).toEqual(["/forecast", "/scenario"]);
    expect(matchingAskCommands("regular question")).toEqual([]);
  });

  it("routes advisor commands and expands workflow commands", () => {
    expect(resolveAskCommand("/forecast next 90 days")).toEqual({
      question: "next 90 days",
      advisorMode: "forecast",
      workflowCommand: null,
    });
    expect(resolveAskCommand("/meeting Cedar Grove")).toEqual({
      question: "Prepare a meeting for Cedar Grove",
      advisorMode: "executive",
      workflowCommand: "/meeting",
    });
    expect(resolveAskCommand("What changed?")).toEqual({
      question: "What changed?",
      advisorMode: null,
      workflowCommand: null,
    });
  });

  it("builds an explicit non-mutating workflow preview", () => {
    expect(
      buildWorkflowProposal("/meeting", "Prepare a meeting for Cedar Grove"),
    ).toMatchObject({
      command: "/meeting",
      summary: "Cedar Grove",
      href: "/meetings",
      actionLabel: "Review meeting setup",
    });
    expect(
      buildWorkflowProposal("/meeting", "Prepare a meeting for Cedar Grove")
        .effect,
    ).toMatch(/No meeting has been created/);
  });

  it("builds an editable action proposal from cited risks", () => {
    const riskId = crypto.randomUUID();
    const proposal = buildWorkflowProposal(
      "/action",
      "Create a follow-up action for obtain the renewed certificate",
      [
        {
          id: riskId,
          entityType: "risk",
          title: "Insurance certificate expires soon",
          excerpt: "The current certificate expires this week.",
          href: `/risks/${riskId}`,
        },
      ],
    );

    expect(proposal.status).toBe("ready_for_review");
    expect(proposal.items).toEqual([
      expect.objectContaining({
        selected: true,
        title: "obtain the renewed certificate",
        riskId,
        evidenceTitle: "Insurance certificate expires soon",
      }),
    ]);
  });
});
