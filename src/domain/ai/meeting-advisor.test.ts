import { describe, expect, it } from "vitest";

import {
  meetingAdvisorContextSchema,
  meetingAdvisorOutputSchema,
  validateMeetingAdvisorGrounding,
} from "@/domain/ai/meeting-advisor";

const context = meetingAdvisorContextSchema.parse({
  organizationId: "10000000-0000-4000-8000-000000000001",
  userId: "11000000-0000-4000-8000-000000000001",
  meetingId: "12000000-0000-4000-8000-000000000001",
  mode: "briefing",
  meeting: {
    title: "Weekly review",
    type: "weekly_executive_review",
    status: "scheduled",
    startsAt: "2026-08-14T17:00:00.000Z",
    projectCount: 2,
  },
  citations: [
    {
      id: "agenda:risk-1",
      title: "Insurance renewal",
      excerpt: "Certificate renewal remains open.",
      href: "/risks/60000000-0000-4000-8000-000000000001",
    },
  ],
  decisionCount: 0,
  actionCount: 0,
  notes: "",
});

const output = meetingAdvisorOutputSchema.parse({
  headline: "One item needs review",
  overview: "Review the open renewal with leadership.",
  items: [
    {
      label: "Decision needed",
      detail: "Confirm the response to the open renewal.",
      citationIds: ["agenda:risk-1"],
    },
  ],
  decisionDraft: null,
  followUpDraft: null,
  recapSubject: null,
  recapDraft: null,
  confidence: 90,
  missingInformation: [],
});

describe("meeting advisor grounding", () => {
  it("accepts output cited to the bounded meeting context", () => {
    expect(validateMeetingAdvisorGrounding(output, context)).toEqual(output);
  });

  it("rejects unavailable or absent citations", () => {
    expect(() =>
      validateMeetingAdvisorGrounding(
        {
          ...output,
          items: [{ ...output.items[0]!, citationIds: ["agenda:unknown"] }],
        },
        context,
      ),
    ).toThrow(/unavailable sources/);
    expect(() =>
      validateMeetingAdvisorGrounding(
        { ...output, items: [{ ...output.items[0]!, citationIds: [] }] },
        context,
      ),
    ).toThrow(/requires at least one citation/);
  });
});
