import { assertOrganizationAccess as assertScopedOrganizationAccess } from "@/lib/auth/authorization";

export function assertOrganizationAccess(
  resource: { organization_id: string } | null,
  organizationId: string,
): asserts resource is { organization_id: string } {
  assertScopedOrganizationAccess(resource, { organizationId });
}
