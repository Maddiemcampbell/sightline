import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformAdminSettingsPage() {
  await requirePlatformPermission(
    "platform.flags.manage",
    "admin_page",
    "platform_settings",
  );
  return (
    <AdminPlaceholderView
      title="Platform Settings"
      description="Foundation for feature flags, operational defaults, release configuration, and guarded platform controls."
    />
  );
}
