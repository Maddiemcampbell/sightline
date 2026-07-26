import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformErrorsPage() {
  await requirePlatformPermission(
    "platform.support.read",
    "admin_page",
    "errors",
  );
  return (
    <AdminPlaceholderView
      title="Errors"
      description="Review redacted production failures and connect them to support investigations."
    />
  );
}
