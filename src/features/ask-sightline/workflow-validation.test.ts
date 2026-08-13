import { describe, expect, it } from "vitest";

import { applyAskActionProposalSchema } from "@/features/ask-sightline/workflow-validation";

describe("Ask Sightline workflow proposals", () => {
  it("accepts a bounded reviewed action payload", () => {
    expect(
      applyAskActionProposalSchema.parse({
        proposalId: crypto.randomUUID(),
        items: [
          {
            id: crypto.randomUUID(),
            title: "Confirm recovery plan",
            description: "A dated plan is attached to the risk.",
            riskId: crypto.randomUUID(),
            ownerUserId: null,
            priority: "high",
            dueDate: "2026-08-18",
          },
        ],
      }).items,
    ).toHaveLength(1);
  });

  it("rejects missing risk context and oversized batches", () => {
    const item = {
      id: crypto.randomUUID(),
      title: "Confirm recovery plan",
      description: "Attach the approved plan.",
      riskId: "",
      ownerUserId: null,
      priority: "normal",
      dueDate: "",
    };
    expect(
      applyAskActionProposalSchema.safeParse({
        proposalId: crypto.randomUUID(),
        items: [item],
      }).success,
    ).toBe(false);
    expect(
      applyAskActionProposalSchema.safeParse({
        proposalId: crypto.randomUUID(),
        items: Array.from({ length: 11 }, () => ({
          ...item,
          id: crypto.randomUUID(),
          riskId: crypto.randomUUID(),
        })),
      }).success,
    ).toBe(false);
  });
});
