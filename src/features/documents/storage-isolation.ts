export function organizationStoragePath(
  organizationId: string,
  documentId: string,
  filename: string,
): string {
  return `${organizationId}/${documentId}/${filename}`;
}

export function isOrganizationStoragePath(
  organizationId: string,
  storagePath: string,
): boolean {
  return storagePath.startsWith(`${organizationId}/`);
}

export function assertOrganizationStoragePath(
  organizationId: string,
  storagePath: string,
): void {
  if (!isOrganizationStoragePath(organizationId, storagePath)) {
    throw new Error("File not found.");
  }
}
