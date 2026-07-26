import { AdminPlaceholderView } from "@/features/platform-admin/placeholder-view";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";

export default async function PlatformAIUsagePage() {
  await requirePlatformPermission("platform.ai.read", "admin_page", "ai_usage");
  return (
    <AdminPlaceholderView
      title="AI Usage"
      description="Track model operations, token consumption, latency, evidence coverage, and failures without exposing customer content."
    />
  );
}
