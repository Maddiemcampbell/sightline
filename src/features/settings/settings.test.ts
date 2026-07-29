import { describe, expect, it } from "vitest";
import {
  notificationSettingsSchema,
  organizationSettingsSchema,
  passwordUpdateSchema,
  projectDefaultsSchema,
} from "@/features/settings/validation";

describe("organization administration settings", () => {
  it("validates organization branding and operational defaults", () => {
    expect(
      organizationSettingsSchema.parse({
        name: "Sightline Builders",
        logoUrl: "https://example.com/logo.png",
        brandColor: "#164E3B",
        timezone: "America/Los_Angeles",
        defaultCurrency: "USD",
        industry: "Commercial construction",
        companySize: "51-200",
      }),
    ).toMatchObject({ defaultCurrency: "USD", companySize: "51-200" });
    expect(
      organizationSettingsSchema.safeParse({
        name: "X",
        logoUrl: "javascript:alert(1)",
        brandColor: "green",
        timezone: "Mars/Olympus",
        defaultCurrency: "$",
        industry: "",
        companySize: "",
      }).success,
    ).toBe(false);
  });

  it("validates personal notification and project defaults", () => {
    expect(
      notificationSettingsSchema.parse({
        digestFrequency: "weekly",
        assignmentNotifications: true,
        mentionNotifications: true,
        weeklySummary: false,
      }).digestFrequency,
    ).toBe("weekly");
    expect(
      projectDefaultsSchema.safeParse({
        visibility: "public",
        role: "owner",
        documentPermissions: "anyone",
      }).success,
    ).toBe(false);
  });

  it("requires matching strong-enough passwords", () => {
    expect(
      passwordUpdateSchema.safeParse({
        password: "a-secure-password",
        confirmPassword: "a-secure-password",
      }).success,
    ).toBe(true);
    expect(
      passwordUpdateSchema.safeParse({
        password: "short",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
  });
});
