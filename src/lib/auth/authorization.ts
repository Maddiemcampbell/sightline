export type ActorContext = Readonly<{
  organizationId: string;
  userId: string;
  role: "executive" | "operations" | "project_manager" | "admin";
}>;

export class AuthorizationError extends Error {
  readonly code = "NOT_FOUND";

  constructor(message = "Resource not found") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function assertOrganizationAccess<T extends { organization_id: string }>(
  resource: T | null,
  context: Pick<ActorContext, "organizationId">,
): asserts resource is T {
  if (!resource || resource.organization_id !== context.organizationId) {
    throw new AuthorizationError();
  }
}

export function assertSameOrganization(
  context: Pick<ActorContext, "organizationId">,
  organizationId: string,
): void {
  if (context.organizationId !== organizationId) {
    throw new AuthorizationError();
  }
}
