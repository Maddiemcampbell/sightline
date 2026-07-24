import { describe, expect, it } from "vitest";
import {
  organizationDeletionSchema,
  privacySettingsSchema,
  userDeletionSchema,
} from "@/features/privacy/validation";
import { hashIdentifier } from "@/features/privacy/core";

describe("privacy lifecycle validation", () => {
  it("accepts bounded retention periods", () => {
    expect(privacySettingsSchema.parse({
      softDeleteGraceDays: 30,
      documentRetentionDays: 2555,
      activityRetentionDays: 1095,
      aiRetentionDays: 365,
      auditRetentionDays: 2555,
      deletedRecordRetentionDays: 30,
    })).toMatchObject({ softDeleteGraceDays: 30, aiRetentionDays: 365 });
    expect(privacySettingsSchema.safeParse({
      softDeleteGraceDays: 0,
      documentRetentionDays: 1,
      activityRetentionDays: 1,
      aiRetentionDays: 1,
      auditRetentionDays: 1,
      deletedRecordRetentionDays: 1,
    }).success).toBe(false);
  });

  it("requires explicit supported deletion scopes and account confirmation", () => {
    expect(organizationDeletionSchema.parse({
      scope: "organization_all_data",
      confirmation: "BuildCo Construction",
    }).scope).toBe("organization_all_data");
    expect(organizationDeletionSchema.safeParse({
      scope: "everything",
      confirmation: "yes",
    }).success).toBe(false);
    expect(userDeletionSchema.safeParse({
      confirmation: "delete my account",
    }).success).toBe(false);
    expect(userDeletionSchema.safeParse({
      confirmation: "DELETE MY ACCOUNT",
    }).success).toBe(true);
  });

  it("uses stable irreversible identifiers for retained audit evidence", () => {
    expect(hashIdentifier("organization-a")).toHaveLength(64);
    expect(hashIdentifier("organization-a")).toBe(
      hashIdentifier("organization-a"),
    );
    expect(hashIdentifier("organization-a")).not.toBe(
      hashIdentifier("organization-b"),
    );
  });
});
