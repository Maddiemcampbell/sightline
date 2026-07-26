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
import { platformCan } from "@/features/platform-admin/capabilities";
import { CustomerDirectoryRepository } from "@/features/platform-admin/customer-directory-repository";
import { ProductionOrganizationService } from "@/features/platform-admin/customer-directory-service";
import { platformServices } from "@/features/platform-admin/services";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PlatformAdminOverviewPage() {
  const operator = await requirePlatformPermission(
    "platform.dashboard.read",
    "admin_dashboard",
    "overview",
  );
  const [health, activity, organizationPage, errors, aiUsage, jobs] =
    await Promise.all([
      platformServices.health.status(),
      platformServices.audit.recent(),
      platformCan(operator, "platform.organizations.read")
        ? new ProductionOrganizationService(
            new CustomerDirectoryRepository(createAdminSupabaseClient()),
          ).list(operator, {
            query: "",
            status: "all",
            members: "all",
            issues: "all",
            recentDays: "all",
            createdDays: "all",
            sort: "activity",
            page: 1,
            pageSize: 10,
          })
        : Promise.resolve(null),
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
        <RecentOrganizationsSection
          items={(organizationPage?.items ?? []).slice(0, 3).map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.memberCount} members · ${item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleDateString() : "activity unavailable"}`,
            status: item.hasOperationalIssues ? "warning" : "healthy",
          }))}
        />
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
