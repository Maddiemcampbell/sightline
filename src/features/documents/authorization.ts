export function assertOrganizationAccess(
  resource: { organization_id: string } | null,
  organizationId: string,
): asserts resource is { organization_id: string } {
  if (!resource || resource.organization_id !== organizationId) {
    throw new Error("Resource not found");
  }
}
