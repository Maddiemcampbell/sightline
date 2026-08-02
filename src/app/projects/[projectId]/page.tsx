import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  FileText,
  MapPin,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getProjectDetail } from "@/features/portfolio/data";
import { ProjectDetailAssistant } from "@/features/portfolio/project-detail-assistant";
import { getActivityPage } from "@/features/activity/data";
import { ActivityTimeline } from "@/features/activity/timeline";
import { ProjectAccessRepository } from "@/features/project-access/repository";
import { ProjectPermissions } from "@/features/project-access/project-permissions";
import { WatchlistButton } from "@/features/workspace/watchlist-button";
import {
  canAssignProject,
  canViewProject,
  canViewFinancialExposure,
} from "@/lib/auth/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { getProjectResource } from "@/lib/auth/project-access";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { RiskRow } from "@/lib/supabase/database-row.types";
import { setProjectArchivedAction } from "./actions";
import { canCreateProject } from "@/lib/auth/authorization";

type Props = { params: Promise<{ projectId: string }> };

const fallbackImage = "/images/project-fallback-architecture-v2.png";

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
  const project = detail.project;
  const canManageProjectLifecycle = canCreateProject(context, {
    organization_id: context.organizationId,
  });
  const location = [project.address_line_1, project.city, project.state_code]
    .filter(Boolean)
    .join(", ");
  const elevatedRisks = openRisks.filter((risk) =>
    ["critical", "high"].includes(risk.severity),
  ).length;
  const health =
    elevatedRisks > 0 || project.projected_margin_cents < 0
      ? "At risk"
      : openRisks.length
        ? "Watch"
        : "On track";
  const scheduleProgress = projectProgress(
    project.start_date,
    project.target_completion_date,
    project.status,
  );
  const encodedProjectId = encodeURIComponent(projectId);
  const tabs = [
    ["#overview", "Overview"],
    [`/risks?project=${encodedProjectId}`, `Risks (${openRisks.length})`],
    [`/actions?project=${encodedProjectId}`, "Actions"],
    ["#documents", `Documents (${detail.documents.length})`],
    ["#team", `Team (${projectMembers.length})`],
    [`/activity?project=${encodedProjectId}`, "Activity"],
  ] as const;

  return (
    <div className="mx-auto max-w-[96rem] px-[var(--page-gutter)] py-7 sm:py-9">
      <Link
        href="/projects"
        className="text-muted hover:text-deep-green inline-flex min-h-10 items-center gap-2 text-sm font-semibold"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to projects
      </Link>

      <header className="mt-3 grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-center">
        <div className="bg-background relative h-40 overflow-hidden rounded-xl border lg:h-36">
          <Image
            src={project.image_url ?? fallbackImage}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 240px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-muted text-xs font-semibold">
                {project.project_number}
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                {project.name}
              </h1>
              <p className="text-muted mt-2 flex items-center gap-2 text-sm">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                {location || "Location unavailable"}
              </p>
            </div>
            <WatchlistButton
              item={{
                id: project.id,
                type: "project",
                title: project.name,
                detail: `${project.project_number} · ${location}`,
                href: `/projects/${project.id}`,
              }}
              className="size-10"
            />
            {canManageProjectLifecycle ? (
              <form
                action={setProjectArchivedAction.bind(
                  null,
                  project.id,
                  !project.archived_at,
                )}
              >
                <button className="border-border min-h-10 rounded-md border px-3 text-sm font-semibold">
                  {project.archived_at ? "Restore project" : "Archive project"}
                </button>
              </form>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ProjectPill label={statusLabel(project.status)} tone="status" />
            <ProjectPill
              label={health}
              tone={
                health === "At risk"
                  ? "danger"
                  : health === "Watch"
                    ? "warning"
                    : "positive"
              }
            />
            <span className="text-muted inline-flex items-center gap-1.5 px-1 text-xs">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {dateRange(project.start_date, project.target_completion_date)}
            </span>
          </div>
        </div>
      </header>

      <nav
        aria-label="Project sections"
        className="border-border mt-7 overflow-x-auto border-b"
      >
        <ul className="flex min-w-max gap-7">
          {tabs.map(([href, label], index) => (
            <li key={label}>
              <Link
                href={href}
                aria-current={index === 0 ? "page" : undefined}
                className={`block border-b-2 px-0.5 py-3 text-sm font-semibold ${
                  index === 0
                    ? "border-deep-green text-deep-green"
                    : "text-muted hover:text-ink border-transparent"
                }`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div
        id="overview"
        className="mt-6 grid scroll-mt-8 items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_19rem]"
      >
        <main className="min-w-0 space-y-5">
          <section
            aria-label="Project summary"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            <Summary
              label="Contract value"
              value={
                canSeeFinancials && project.contract_value_cents !== null
                  ? formatMoney(project.contract_value_cents)
                  : canSeeFinancials
                    ? "Not set"
                    : "Restricted"
              }
              detail="Current contract"
              icon={BriefcaseBusiness}
            />
            <Summary
              label="Projected margin"
              value={
                canSeeFinancials
                  ? formatMoney(project.projected_margin_cents)
                  : "Restricted"
              }
              detail={
                canSeeFinancials && project.contract_value_cents
                  ? `${(
                      (project.projected_margin_cents /
                        project.contract_value_cents) *
                      100
                    ).toFixed(1)}% forecast`
                  : "Role-based financial access"
              }
              icon={TrendingUp}
            />
            <Summary
              label="Profit at risk"
              value={
                canSeeFinancials
                  ? formatMoney(detail.profitAtRiskCents)
                  : "Restricted"
              }
              detail={`${elevatedRisks} elevated risk${elevatedRisks === 1 ? "" : "s"}`}
              icon={CircleDollarSign}
              warning={detail.profitAtRiskCents > 0}
            />
            <Summary
              label="Open risks"
              value={String(openRisks.length)}
              detail={`${detail.vendors.length} connected vendor${detail.vendors.length === 1 ? "" : "s"}`}
              icon={ShieldAlert}
              warning={elevatedRisks > 0}
            />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
                    Project health
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Current delivery outlook
                  </h2>
                </div>
                <ProjectPill
                  label={health}
                  tone={
                    health === "At risk"
                      ? "danger"
                      : health === "Watch"
                        ? "warning"
                        : "positive"
                  }
                />
              </div>
              <div className="mt-7">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold">Schedule elapsed</span>
                  <span className="text-muted tabular-nums">
                    {scheduleProgress === null
                      ? "Not available"
                      : `${scheduleProgress}%`}
                  </span>
                </div>
                <progress
                  max={100}
                  value={scheduleProgress ?? 0}
                  aria-label="Elapsed project schedule"
                  className="accent-deep-green mt-3 h-2 w-full"
                >
                  {scheduleProgress ?? 0}%
                </progress>
                <dl className="border-border mt-7 grid grid-cols-2 gap-4 border-t pt-5">
                  <HealthDatum
                    label="Elevated risks"
                    value={String(elevatedRisks)}
                  />
                  <HealthDatum
                    label="Project members"
                    value={String(projectMembers.length)}
                  />
                  <HealthDatum
                    label="Recent documents"
                    value={String(detail.documents.length)}
                  />
                  <HealthDatum
                    label="Connected vendors"
                    value={String(detail.vendors.length)}
                  />
                </dl>
              </div>
            </Card>

            <RiskExposure
              risks={openRisks}
              canSeeFinancials={canSeeFinancials}
            />
          </div>

          <Panel
            title="Active risks"
            eyebrow="Needs attention"
            action={
              <Link
                href={`/risks?project=${encodedProjectId}`}
                className="text-deep-green inline-flex items-center gap-1 text-xs font-semibold"
              >
                View all risks
                <ArrowRight aria-hidden="true" className="size-3" />
              </Link>
            }
          >
            {openRisks.length ? (
              <ul className="divide-border divide-y">
                {openRisks.slice(0, 5).map((risk) => (
                  <li
                    key={risk.id}
                    className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/risks/${risk.id}`}
                        className="hover:text-deep-green font-semibold"
                      >
                        {risk.title}
                      </Link>
                      <p className="text-muted mt-1 line-clamp-1 text-xs">
                        {risk.summary}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <RiskPill severity={risk.severity} />
                      <span className="text-muted text-xs tabular-nums">
                        {canSeeFinancials
                          ? `${formatMoney(risk.potential_exposure_cents)} exposure`
                          : "Exposure restricted"}
                      </span>
                      <span className="text-muted text-xs tabular-nums">
                        {risk.confidence_score}% confidence
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <PositiveEmpty
                title="No active project risks"
                copy="Sightline has no unresolved or undismissed risks for this project."
              />
            )}
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <section id="documents" className="scroll-mt-8">
              <Panel
                title="Recent documents"
                eyebrow="Source material"
                action={
                  <Link
                    href="/documents"
                    className="text-deep-green text-xs font-semibold"
                  >
                    Open library
                  </Link>
                }
              >
                {detail.documents.length ? (
                  <ul className="divide-border divide-y">
                    {detail.documents.slice(0, 5).map((document) => (
                      <li
                        key={document.id}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <Link
                          href={`/documents/${document.id}`}
                          className="hover:text-deep-green flex items-start gap-3"
                        >
                          <span className="bg-soft-green text-deep-green grid size-9 shrink-0 place-items-center rounded-md">
                            <FileText aria-hidden="true" className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold">
                              {document.name}
                            </span>
                            <span className="text-muted mt-1 block text-xs capitalize">
                              {document.document_type.replaceAll("_", " ")} ·{" "}
                              {document.document_date ?? "Date unavailable"}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PositiveEmpty
                    title="No project documents"
                    copy="Upload or associate source material to strengthen this project’s evidence."
                  />
                )}
              </Panel>
            </section>

            <Panel title="Vendors" eyebrow="Delivery partners">
              {detail.vendors.length ? (
                <ul className="space-y-4">
                  {detail.vendors.map((vendor) => (
                    <li key={vendor.id} className="flex items-start gap-3">
                      <span className="bg-soft-green text-deep-green grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold">
                        {vendor.name.charAt(0)}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold">
                          {vendor.name}
                        </span>
                        <span className="text-muted mt-1 block text-xs">
                          {vendor.trade ?? "Trade not set"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <PositiveEmpty
                  title="No connected vendors"
                  copy="Vendor relationships will appear when associated with this project."
                />
              )}
            </Panel>
          </div>

          <Panel
            title="Recent activity"
            eyebrow="Project timeline"
            action={
              <Link
                href={`/activity?project=${encodedProjectId}`}
                className="text-deep-green text-xs font-semibold"
              >
                View all activity
              </Link>
            }
          >
            <ActivityTimeline items={activityPage.items} condensed />
          </Panel>

          <section id="team" className="scroll-mt-8">
            <ProjectPermissions
              projectId={projectId}
              canAssign={canAssignProject(context, resource)}
              members={projectMembers}
              eligibleMembers={eligibleMembers}
              invitations={invitations}
            />
          </section>
        </main>

        <ProjectDetailAssistant projectName={project.name} />
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  detail,
  icon: Icon,
  warning = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Users;
  warning?: boolean;
}) {
  return (
    <Card className="flex min-h-36 flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted text-xs font-semibold">{label}</p>
        <Icon aria-hidden="true" className="text-muted size-4" />
      </div>
      <div>
        <p className="mt-5 text-2xl font-semibold tracking-[-0.035em] tabular-nums">
          {value}
        </p>
        <p className={`mt-1 text-xs ${warning ? "text-danger" : "text-muted"}`}>
          {detail}
        </p>
      </div>
    </Card>
  );
}

function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

function ProjectPill({
  label,
  tone,
}: {
  label: string;
  tone: "status" | "positive" | "warning" | "danger";
}) {
  const tones = {
    status: "bg-soft-blue text-info",
    positive: "bg-soft-green text-deep-green",
    warning: "bg-soft-amber text-warning",
    danger: "bg-soft-red text-danger",
  };
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}
    >
      <span
        aria-hidden="true"
        className="mr-1.5 size-1.5 rounded-full bg-current"
      />
      {label}
    </span>
  );
}

function RiskPill({ severity }: { severity: RiskRow["severity"] }) {
  const tone =
    severity === "critical" || severity === "high"
      ? "bg-soft-red text-danger"
      : severity === "medium"
        ? "bg-soft-amber text-warning"
        : "bg-soft-green text-deep-green";
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}
    >
      <span
        aria-hidden="true"
        className="mr-1.5 size-1.5 rounded-full bg-current"
      />
      {severity}
    </span>
  );
}

function HealthDatum({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function RiskExposure({
  risks,
  canSeeFinancials,
}: {
  risks: readonly RiskRow[];
  canSeeFinancials: boolean;
}) {
  const severities = ["critical", "high", "medium", "low"] as const;
  const totalExposure = risks.reduce(
    (sum, risk) => sum + risk.potential_exposure_cents,
    0,
  );
  return (
    <Card>
      <p className="text-deep-green text-xs font-semibold tracking-[0.08em] uppercase">
        Risk exposure
      </p>
      <div className="mt-1 flex items-end justify-between gap-4">
        <h2 className="text-lg font-semibold">Current risk mix</h2>
        <p className="text-sm font-semibold tabular-nums">
          {canSeeFinancials ? formatMoney(totalExposure) : "Restricted"}
        </p>
      </div>
      {risks.length ? (
        <ul className="mt-6 space-y-4">
          {severities.map((severity) => {
            const matching = risks.filter((risk) => risk.severity === severity);
            const percent = (matching.length / risks.length) * 100;
            return (
              <li key={severity}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold capitalize">{severity}</span>
                  <span className="text-muted tabular-nums">
                    {matching.length} risk{matching.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="bg-border mt-2 h-2 overflow-hidden rounded-full">
                  <span
                    className={`block h-full rounded-full ${
                      severity === "critical" || severity === "high"
                        ? "bg-status-high"
                        : severity === "medium"
                          ? "bg-status-medium"
                          : "bg-status-low"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <PositiveEmpty
          title="No exposure to summarize"
          copy="The project currently has no active risks."
        />
      )}
    </Card>
  );
}

function PositiveEmpty({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="border-border bg-background/60 rounded-lg border border-dashed p-4">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-muted mt-1 text-xs leading-5">{copy}</p>
    </div>
  );
}

function projectProgress(
  startDate: string | null,
  targetDate: string | null,
  status: string,
): number | null {
  if (status === "complete") return 100;
  if (!startDate || !targetDate) return null;
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const target = Date.parse(`${targetDate}T00:00:00Z`);
  const elapsed = Date.now() - start;
  const duration = target - start;
  if (duration <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((elapsed / duration) * 100)));
}

function dateRange(startDate: string | null, targetDate: string | null) {
  if (!startDate && !targetDate) return "Project dates unavailable";
  return `${formatDate(startDate)} – ${formatDate(targetDate)}`;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function statusLabel(status: string) {
  return status === "complete"
    ? "Completed"
    : status
        .replaceAll("_", " ")
        .replace(/^\w/, (letter) => letter.toUpperCase());
}
