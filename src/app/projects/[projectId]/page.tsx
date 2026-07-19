import { notFound } from "next/navigation";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/daily-brief/formatters";
import { getProjectDetail } from "@/features/portfolio/data";

type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  const detail = await getProjectDetail(projectId);
  if (!detail) notFound();
  const openRisks = detail.risks.filter(
    (risk) => !["resolved", "dismissed"].includes(risk.status),
  );
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
              Project profit at risk
            </p>
            <p className="mt-1 text-3xl font-semibold">
              {formatMoney(profitAtRisk)}
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
            detail.project.contract_value_cents
              ? formatMoney(detail.project.contract_value_cents)
              : "Not set"
          }
        />
        <Summary
          label="Projected margin"
          value={formatMoney(detail.project.projected_margin_cents)}
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
                        {formatMoney(risk.potential_exposure_cents)} exposure
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
            <ol className="space-y-4">
              {detail.activities.map((activity) => (
                <li key={activity.id} className="border-border border-l-2 pl-3">
                  <p className="text-sm font-semibold capitalize">
                    {activity.activity_type.replace("_", " ")}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {activity.note ?? "Risk record updated"}
                  </p>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
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
