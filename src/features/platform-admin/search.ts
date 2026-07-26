import "server-only";

import { platformServices } from "@/features/platform-admin/services";

export async function searchPlatformDirectory(
  query: string,
  scope: { organizations: boolean; users: boolean },
) {
  const [organizations, users] = await Promise.all([
    scope.organizations
      ? platformServices.organizations.search(query)
      : Promise.resolve([]),
    scope.users ? platformServices.users.search(query) : Promise.resolve([]),
  ]);
  return [
    ...organizations.map((result) => ({
      ...result,
      type: "organization" as const,
    })),
    ...users.map((result) => ({ ...result, type: "user" as const })),
  ];
}
