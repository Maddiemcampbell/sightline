import {
  AIUsageSection,
  PlatformStatusSection,
  QuickActionsSection,
  RecentActivitySection,
  RecentErrorsSection,
  RecentOrganizationsSection,
  SystemHealthSection,
} from "@/features/platform-admin/overview-sections";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { platformServices } from "@/features/platform-admin/services";

export const dynamic = "force-dynamic";

export default async function PlatformAdminOverviewPage() {
  const operator = await requirePlatformPermission(
    "platform.dashboard.read",
    "admin_dashboard",
    "overview",
  );
  const [health, activity, organizations, errors, aiUsage, jobs] =
    await Promise.all([
      platformServices.health.status(),
      platformServices.audit.recent(),
      platformServices.organizations.recent(),
      platformServices.support.recent(),
      platformServices.aiUsage.summary(),
      platformServices.jobs.summary(),
    ]);
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Platform Operations
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        Overview
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        A staff-only operational workspace. Metrics shown in this foundation
        milestone are placeholders.
      </p>
      <div className="mt-7 grid gap-5 xl:grid-cols-2">
        <PlatformStatusSection
          metrics={[...health.slice(0, 2), ...jobs.slice(0, 1)]}
        />
        <RecentActivitySection items={activity} />
        <RecentOrganizationsSection items={organizations} />
        <RecentErrorsSection items={errors} />
        <SystemHealthSection metrics={health} />
        <AIUsageSection metrics={aiUsage} />
        <div className="xl:col-span-2">
          <QuickActionsSection permissions={operator.permissions} />
        </div>
      </div>
    </div>
  );
}
