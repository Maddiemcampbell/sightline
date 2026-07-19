import { describe, expect, it, vi } from "vitest";

import {
  isBriefDeliveryDue,
  scheduledDeliveryKey,
} from "@/features/email/delivery-time";
import { emailPreferencesSchema } from "@/features/email/preferences";
import type { EmailMessage } from "@/features/email/provider";
import { renderMorningBriefEmail } from "@/features/email/render-morning-brief";
import { ResendEmailProvider } from "@/features/email/resend-provider";
import type { DailyBriefView } from "@/features/daily-brief/types";

const brief: DailyBriefView = {
  briefId: "brief-1",
  briefDate: "2026-07-18",
  totalProfitAtRiskCents: 300_000,
  activeProjectCount: 1,
  openRiskCount: 3,
  overallRiskLevel: "High",
  risks: [1, 2, 3].map((priority) => ({
    id: `risk-${priority}`,
    priority: priority as 1 | 2 | 3,
    title: priority === 1 ? "Unsafe <script> title" : `Risk ${priority}`,
    severity: "high",
    projectId: "project-1",
    projectName: "BuildCo Project",
    projectSubtitle: "Sacramento, CA",
    exposureCents: priority * 100_000,
    marginImpactCents: priority * 50_000,
    whyItMatters: "This may reduce project profit.",
    evidenceTitle: "Evidence",
    evidenceDetail: "Detail",
    confidenceScore: 90,
    recommendedAction: "Call the responsible project lead.",
    acknowledged: false,
  })),
  projects: [],
  recentResolutions: [],
  sources: [],
};

describe("morning brief rendering", () => {
  it("renders responsive HTML, three secure risk links, and a brief link", () => {
    const email = renderMorningBriefEmail({
      organizationName: "BuildCo Construction",
      recipientName: "Matt Anderson",
      brief,
      appUrl: "https://app.sightline.example",
    });
    expect(email.html).toContain("@media(max-width:600px)");
    expect(
      email.html.match(/https:\/\/app\.sightline\.example\/risks\//g),
    ).toHaveLength(3);
    expect(email.html).toContain("https://app.sightline.example/brief");
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("Unsafe &lt;script&gt; title");
  });

  it("includes the executive content and links in plain text", () => {
    const email = renderMorningBriefEmail({
      organizationName: "BuildCo Construction",
      recipientName: "Matt Anderson",
      brief,
      appUrl: "https://app.sightline.example",
    });
    expect(email.text).toContain("Potential exposure: $1,000");
    expect(email.text).toContain("Why it matters:");
    expect(email.text).toContain("Recommended next action:");
    expect(email.text).toContain("Open the full Daily Brief:");
  });
});

describe("delivery scheduling and preferences", () => {
  it("becomes due at the preferred local time and only on the brief date", () => {
    expect(
      isBriefDeliveryDue({
        now: new Date("2026-07-18T14:00:00Z"),
        timezone: "America/Los_Angeles",
        preferredTime: "07:00",
        briefDate: "2026-07-18",
      }),
    ).toBe(true);
    expect(
      isBriefDeliveryDue({
        now: new Date("2026-07-18T13:59:00Z"),
        timezone: "America/Los_Angeles",
        preferredTime: "07:00",
        briefDate: "2026-07-18",
      }),
    ).toBe(false);
  });

  it("validates time and IANA timezone preferences", () => {
    expect(
      emailPreferencesSchema.safeParse({
        enabled: true,
        preferredTime: "06:30",
        timezone: "America/Denver",
      }).success,
    ).toBe(true);
    expect(
      emailPreferencesSchema.safeParse({
        enabled: true,
        preferredTime: "25:00",
        timezone: "Mars/Olympus",
      }).success,
    ).toBe(false);
  });

  it("uses one stable scheduled key for a user and brief", () => {
    expect(scheduledDeliveryKey("brief-1", "user-1")).toBe(
      scheduledDeliveryKey("brief-1", "user-1"),
    );
    expect(scheduledDeliveryKey("brief-2", "user-1")).not.toBe(
      scheduledDeliveryKey("brief-1", "user-1"),
    );
  });
});

describe("Resend provider", () => {
  it("sends HTML and text with the retry-safe idempotency header", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email-123" }), { status: 200 }),
      );
    const provider = new ResendEmailProvider("re_test", fetcher);
    const message: EmailMessage = {
      from: "Sightline <briefs@example.com>",
      to: "matt@example.com",
      subject: "Daily Brief",
      html: "<p>Brief</p>",
      text: "Brief",
      idempotencyKey: "morning-brief/brief-1/user-1",
    };
    await expect(provider.send(message)).resolves.toEqual({
      providerMessageId: "email-123",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Idempotency-Key": message.idempotencyKey,
        }),
      }),
    );
  });

  it("includes Resend's error message when a send is rejected", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ message: "The example.com domain is not verified." }),
        { status: 403 },
      ),
    );
    const provider = new ResendEmailProvider("re_test", fetcher);

    await expect(
      provider.send({
        from: "Sightline <briefs@example.com>",
        to: "matt@example.com",
        subject: "Daily Brief",
        html: "<p>Brief</p>",
        text: "Brief",
        idempotencyKey: "morning-brief/brief-1/user-1",
      }),
    ).rejects.toThrow(
      "Resend rejected the email: The example.com domain is not verified.",
    );
  });
});
