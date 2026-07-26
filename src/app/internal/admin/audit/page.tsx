import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformAuditPage() {
  await requirePlatformPermission(
    "platform.audit.read",
    "admin_page",
    "platform_audit",
  );
  return (
    <AdminPlaceholderView
      title="Platform Audit Log"
      description="Review append-only staff access and operational actions separately from customer organization audit records."
    />
  );
}
