import { describe, expect, it } from "vitest";

import { renderOrganizationInvitation } from "@/features/email/organization-invitation";

describe("organization invitation email", () => {
  it("renders the invited organization, role, and exact single-use link", () => {
    const message = renderOrganizationInvitation({
      organizationName: "BuildCo Construction",
      role: "manager",
      invitationUrl: "https://app.sightline.example/invitations/token",
    });
    expect(message.subject).toContain("BuildCo Construction");
    expect(message.html).toContain("as a Manager");
    expect(message.text).toContain(
      "https://app.sightline.example/invitations/token",
    );
  });

  it("escapes customer-controlled organization names in HTML and headers", () => {
    const message = renderOrganizationInvitation({
      organizationName: 'BuildCo <script>alert("x")</script>\nInjected',
      role: "contributor",
      invitationUrl: "https://app.sightline.example/invitations/token",
    });
    expect(message.html).not.toContain("<script>");
    expect(message.html).toContain("&lt;script&gt;");
    expect(message.subject).not.toContain("\n");
  });
});
