import { describe, expect, it } from "vitest";

import {
  toOrganizationSummary,
  toUserSummary,
} from "@/features/platform-admin/customer-directory-repository";
import {
  normalizedHash,
  rankOrganization,
  rankUser,
  searchType,
} from "@/features/platform-admin/customer-directory-service";
import {
  escapeLikePattern,
  globalDirectoryQuerySchema,
  organizationListInputSchema,
  userListInputSchema,
} from "@/features/platform-admin/customer-directory-validation";

describe("platform customer directory validation", () => {
  it("uses bounded pagination and known filters", () => {
    const organizations = organizationListInputSchema.parse({
      page: "-2",
      pageSize: "1000",
      status: "unknown",
    });
    const users = userListInputSchema.parse({
      page: "3",
      pageSize: "50",
      membership: "yes",
    });

    expect(organizations).toMatchObject({
      page: 1,
      pageSize: 25,
      status: "all",
    });
    expect(users).toMatchObject({
      page: 3,
      pageSize: 50,
      membership: "yes",
    });
  });

  it("rejects broad one-character searches and neutralizes filter syntax", () => {
    expect(globalDirectoryQuerySchema.safeParse("a").success).toBe(false);
    expect(globalDirectoryQuerySchema.parse("Acme,(West)")).toBe("Acme West");
    expect(escapeLikePattern("100%_safe")).toBe("100\\%\\_safe");
  });
});

describe("platform customer directory privacy", () => {
  it("maps minimized organization and user rows without sensitive content", () => {
    const organization = toOrganizationSummary({
      id: "10000000-0000-4000-8000-000000000001",
      name: "Acme",
      slug: "acme",
      account_status: "active",
      created_at: "2026-01-01T00:00:00Z",
      timezone: "UTC",
      member_count: 2,
      active_project_count: 1,
      last_activity_at: null,
      storage_bytes: 0,
      failed_job_count: 0,
      failed_delivery_count: 0,
      failed_export_count: 0,
      failed_ai_count: 0,
    });
    const user = toUserSummary({
      id: "20000000-0000-4000-8000-000000000001",
      email: "alex@example.com",
      full_name: "Alex",
      account_status: "active",
      created_at: "2026-01-01T00:00:00Z",
      last_sign_in_at: null,
      email_confirmed_at: "2026-01-01T00:00:00Z",
      auth_provider: "email",
      mfa_enabled: false,
      membership_count: 1,
      last_activity_at: null,
      organization_names: ["Acme"],
    });
    const serialized = JSON.stringify({ organization, user });

    expect(serialized).not.toMatch(
      /password|token|document|prompt|evidence|credential|secret/i,
    );
  });

  it("ranks exact IDs and emails before prefixes and hashes search values", () => {
    const organization = {
      ...baseOrganization,
      id: "10000000-0000-4000-8000-000000000001",
      name: "Acme Construction",
    };
    const user = {
      ...baseUser,
      id: "20000000-0000-4000-8000-000000000001",
      email: "alex@example.com",
      fullName: "Alex Rivera",
    };

    expect(rankOrganization(organization, organization.id)).toBe(0);
    expect(rankOrganization(organization, "Acme")).toBe(2);
    expect(rankUser(user, "alex@example.com")).toBe(1);
    expect(searchType("alex@example.com")).toBe("email");
    expect(normalizedHash("alex@example.com")).not.toContain("alex");
    expect(normalizedHash(" ALEX@example.com ")).toBe(
      normalizedHash("alex@example.com"),
    );
  });
});

const baseOrganization = {
  id: "",
  name: "",
  slug: "",
  status: "active" as const,
  plan: null,
  createdAt: "",
  lastActivityAt: null,
  timezone: "UTC",
  memberCount: 0,
  activeProjectCount: 0,
  storageBytes: 0,
  failedJobCount: 0,
  failedDeliveryCount: 0,
  failedExportCount: 0,
  failedAiCount: 0,
  hasOperationalIssues: false,
};

const baseUser = {
  id: "",
  fullName: "",
  email: null,
  status: "active" as const,
  createdAt: "",
  lastLoginAt: null,
  lastActivityAt: null,
  emailVerified: true,
  authProvider: "email",
  mfaEnabled: false,
  membershipCount: 0,
  organizationNames: [],
};
