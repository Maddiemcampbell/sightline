import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformOperatorsPage() {
  await requirePlatformPermission(
    "platform.admin.manage",
    "admin_page",
    "platform_operators",
  );
  return (
    <AdminPlaceholderView
      title="Platform Operators"
      description="Provision Sightline staff and assign individual capabilities. Customer roles cannot grant access here."
    />
  );
}
