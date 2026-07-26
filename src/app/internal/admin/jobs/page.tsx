import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformJobsPage() {
  await requirePlatformPermission("platform.jobs.read", "admin_page", "jobs");
  return (
    <AdminPlaceholderView
      title="Jobs"
      description="Monitor scheduled work, retries, duration, and organization-scoped execution failures."
    />
  );
}
