import { notFound } from "next/navigation";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getProjectDetail } from "@/features/portfolio/data";
import { getActivityPage } from "@/features/activity/data";
import { ActivityTimeline } from "@/features/activity/timeline";
import { ProjectAccessRepository } from "@/features/project-access/repository";
import { ProjectPermissions } from "@/features/project-access/project-permissions";
import {
  canAssignProject,
  canViewProject,
  canViewFinancialExposure,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { getProjectResource } from "@/lib/auth/project-access";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const context = await requireActorContext();
  const resource = await getProjectResource(context, projectId);
  if (!resource || !canViewProject(context, resource)) notFound();
  const detail = await getProjectDetail(projectId);
  if (!detail) notFound();
  const repository = new ProjectAccessRepository(createAdminSupabaseClient());
  const [activityPage, projectMembers, eligibleMembers, invitations] =
    await Promise.all([
      getActivityPage({ projectId, limit: 8 }),
      repository.listProjectMembers(context.organizationId, projectId),
      repository.listEligibleMembers(context.organizationId),
      repository.listInvitations(context.organizationId, projectId),
    ]);
  const openRisks = detail.risks.filter(
    (risk) => !["resolved", "dismissed"].includes(risk.status),
  );
  const canSeeFinancials = canViewFinancialExposure(context);
  const profitAtRisk = openRisks.reduce(
    (sum, risk) => sum + risk.estimated_margin_impact_cents,
    0,
  );
  const location = [
    detail.project.address_line_1,
    detail.project.city,
    detail.project.state_code,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <Link href="/projects" className="text-muted text-sm font-semibold">
        ← Projects
      </Link>
      <header className="mt-5">
        <p className="text-muted text-sm font-semibold">
          {detail.project.project_number} · {location}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">
              {detail.project.name}
            </h1>
            <p className="text-muted mt-2 capitalize">
              {detail.project.status.replace("_", " ")} project
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted text-xs font-semibold uppercase">
              Estimated project profit at risk
            </p>
            <p className="mt-1 text-3xl font-semibold">
              {canSeeFinancials ? formatMoney(profitAtRisk) : "Restricted"}
            </p>
          </div>
        </div>
      </header>
      <section
        aria-label="Project summary"
        className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Summary
          label="Contract value"
          value={
            canSeeFinancials && detail.project.contract_value_cents
              ? formatMoney(detail.project.contract_value_cents)
              : "Not set"
          }
        />
        <Summary
          label="Projected margin"
          value={
            canSeeFinancials
              ? formatMoney(detail.project.projected_margin_cents)
              : "Restricted"
          }
        />
        <Summary label="Open risks" value={String(openRisks.length)} />
        <Summary label="Vendors" value={String(detail.vendors.length)} />
      </section>
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Panel title="Open risks">
            {openRisks.length ? (
              <ul className="divide-y">
                {openRisks.map((risk) => (
                  <li key={risk.id} className="py-4 first:pt-0 last:pb-0">
                    <Link
                      href={`/risks/${risk.id}`}
                      className="hover:text-deep-green font-semibold"
                    >
                      {risk.title}
                    </Link>
                    <div className="text-muted mt-2 flex flex-wrap gap-4 text-sm">
                      <span className="capitalize">{risk.severity}</span>
                      <span>
                        {canSeeFinancials
                          ? `${formatMoney(risk.potential_exposure_cents)} exposure`
                          : "Exposure restricted"}
                      </span>
                      <span>{risk.confidence_score}% confidence</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-sm">No open risks.</p>
            )}
          </Panel>
          <Panel title="Recent documents">
            {detail.documents.length ? (
              <ul className="divide-y">
                {detail.documents.slice(0, 6).map((document) => (
                  <li key={document.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="font-semibold">{document.name}</p>
                    <p className="text-muted mt-1 text-xs capitalize">
                      {document.document_type.replace("_", " ")} ·{" "}
                      {document.document_date ?? "No date"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted text-sm">No documents.</p>
            )}
          </Panel>
        </div>
        <aside className="space-y-6">
          <Panel title="Vendors">
            <ul className="space-y-4">
              {detail.vendors.map((vendor) => (
                <li key={vendor.id}>
                  <p className="font-semibold">{vendor.name}</p>
                  <p className="text-muted mt-1 text-sm">
                    {vendor.trade ?? "Trade not set"}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Risk activity">
            <ActivityTimeline items={activityPage.items} condensed />
            <Link
              href={`/activity`}
              className="text-deep-green mt-5 inline-block text-sm font-semibold"
            >
              View all activity
            </Link>
          </Panel>
        </aside>
      </div>
      <div className="mt-6">
        <ProjectPermissions
          projectId={projectId}
          canAssign={canAssignProject(context, resource)}
          members={projectMembers}
          eligibleMembers={eligibleMembers}
          invitations={invitations}
        />
      </div>
    </div>
  );
}
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-muted text-xs font-semibold uppercase">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </Card>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h2 className="mb-5 text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}
