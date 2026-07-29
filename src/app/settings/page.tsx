import Link from "next/link";
import { Card } from "@/components/ui/card";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsOverview() {
  const membership = await requireCurrentMembership();
  const client = createAdminSupabaseClient();
  const [organization, members, projects, risks, documents] = await Promise.all(
    [
      client
        .from("organizations")
        .select("*")
        .eq("id", membership.organizationId)
        .single(),
      client
        .from("organization_memberships")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId),
      client
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId),
      client
        .from("risks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organizationId),
      client
        .from("documents")
        .select("size_bytes")
        .eq("organization_id", membership.organizationId),
    ],
  );
  if (organization.error) throw new Error(organization.error.message);
  const storage =
    documents.data?.reduce((sum, item) => sum + (item.size_bytes ?? 0), 0) ?? 0;
  const ownerResult = await client
    .from("organization_memberships")
    .select("application_user_id")
    .eq("organization_id", membership.organizationId)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  const owner = ownerResult.data
    ? await client
        .from("users")
        .select("full_name")
        .eq("id", ownerResult.data.application_user_id)
        .maybeSingle()
    : null;
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="grid size-14 place-items-center rounded-lg text-xl font-bold text-white"
            style={{ backgroundColor: organization.data.brand_color }}
          >
            {organization.data.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{organization.data.name}</h2>
            <p className="text-muted text-sm">
              {organization.data.industry ?? "Industry not set"} ·{" "}
              {organization.data.timezone}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Current owner"
            value={owner?.data?.full_name ?? "Not available"}
          />
          <Metric
            label="Created"
            value={new Date(organization.data.created_at).toLocaleDateString()}
          />
          <Metric label="Subscription" value="Sightline V3 · Preview" />
          <Metric
            label="Storage usage"
            value={`${(storage / 1_048_576).toFixed(1)} MB`}
          />
          <Metric label="Members" value={String(members.count ?? 0)} />
          <Metric label="Projects" value={String(projects.count ?? 0)} />
          <Metric label="Risks" value={String(risks.count ?? 0)} />
          <Metric label="Currency" value={organization.data.default_currency} />
        </dl>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <QuickLink
          href="/settings/organization"
          title="Organization profile"
          copy="Branding, company details, timezone, and currency."
        />
        <QuickLink
          href="/settings/team"
          title="Team and access"
          copy="Members, invitations, roles, and project assignment."
        />
        <QuickLink
          href="/settings/security"
          title="Security"
          copy="Password, active session, MFA, and API-key readiness."
        />
        <QuickLink
          href="/settings/audit-log"
          title="Audit log"
          copy="Review internal security and administration events."
        />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs font-semibold uppercase">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
function QuickLink({
  href,
  title,
  copy,
}: {
  href: string;
  title: string;
  copy: string;
}) {
  return (
    <Link
      href={href}
      className="border-border bg-surface hover:border-deep-green rounded-lg border p-5"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted mt-1 text-sm">{copy}</p>
    </Link>
  );
}
