import { describe, expect, it } from "vitest";

import {
  commentInputSchema,
  extractMentionUsernames,
  usernameFor,
} from "@/features/collaboration/validation";
import { notificationInputSchema } from "@/features/notifications/validation";

const id = "60000000-0000-4000-8000-000000000001";

describe("collaboration validation", () => {
  it("creates stable usernames and extracts unique inline mentions", () => {
    expect(usernameFor("Maddie O'Connor", "maddie@example.com")).toBe(
      "maddie.o.connor",
    );
    expect(
      extractMentionUsernames(
        "Please ask @maddie.o.connor. Copy @sam and @maddie.o.connor.",
      ),
    ).toEqual(["maddie.o.connor", "sam"]);
  });

  it("accepts Markdown comments and rejects empty or oversized content", () => {
    expect(
      commentInputSchema.parse({
        riskId: id,
        bodyMarkdown: "**Owner:** @maddie",
      }).bodyMarkdown,
    ).toContain("**Owner:**");
    expect(
      commentInputSchema.safeParse({ riskId: id, bodyMarkdown: " " }).success,
    ).toBe(false);
    expect(
      commentInputSchema.safeParse({
        riskId: id,
        bodyMarkdown: "x".repeat(10_001),
      }).success,
    ).toBe(false);
  });

  it("only permits local notification destinations", () => {
    expect(
      notificationInputSchema.safeParse({
        organizationId: id,
        recipientMembershipId: id,
        type: "mention",
        title: "Mentioned",
        href: "/risks/123?tab=activity",
      }).success,
    ).toBe(true);
    expect(
      notificationInputSchema.safeParse({
        organizationId: id,
        recipientMembershipId: id,
        type: "mention",
        title: "Mentioned",
        href: "https://attacker.example",
      }).success,
    ).toBe(false);
  });
});
