import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformSystemHealthPage() {
  await requirePlatformPermission(
    "platform.health.read",
    "admin_page",
    "system_health",
  );
  return (
    <AdminPlaceholderView
      title="System Health"
      description="Provide an operational view of application, database, storage, email, and dependency health."
    />
  );
}
