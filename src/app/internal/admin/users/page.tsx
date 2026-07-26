import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformUsersPage() {
  await requirePlatformPermission("platform.users.read", "admin_page", "users");
  return (
    <AdminPlaceholderView
      title="Users"
      description="Investigate account and onboarding health through carefully scoped staff support workflows."
    />
  );
}
