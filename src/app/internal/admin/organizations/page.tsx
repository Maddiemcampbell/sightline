import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformOrganizationsPage() {
  await requirePlatformPermission(
    "platform.organizations.read",
    "admin_page",
    "organizations",
  );
  return (
    <AdminPlaceholderView
      title="Organizations"
      description="Search and inspect customer organizations without granting platform operators customer membership."
    />
  );
}
