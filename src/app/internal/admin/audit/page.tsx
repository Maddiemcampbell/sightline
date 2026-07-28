import {
  AdminPageHeader,
  EmptyTable,
  formatDateTime,
  Pagination,
  StatusPill,
} from "@/features/platform-admin/data-ui";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { humanize } from "@/features/platform-admin/services";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;
const outcomes = ["success", "denied", "failed"] as const;

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformPermission(
    "platform.audit.read",
    "admin_page",
    "platform_audit",
  );
  const raw = await searchParams;
  const get = (key: string) =>
    typeof raw[key] === "string" ? raw[key] : undefined;
  const page = Math.max(1, Number.parseInt(get("page") ?? "1", 10) || 1);
  const outcome = outcomes.find((value) => value === get("outcome"));
  const action = (get("action") ?? "").trim().slice(0, 160);
  const organizationId = validUuid(get("organizationId"));
  const authUserId = validUuid(get("authUserId"));
  const operatorId = validUuid(get("operatorId"));
  const client = createAdminSupabaseClient();
  let query = client
    .from("platform_audit_logs")
    .select("*", { count: "exact" })
    .order("occurred_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (outcome) query = query.eq("outcome", outcome);
  if (action) query = query.ilike("action", `%${action.replaceAll("%", "")}%`);
  if (organizationId) query = query.eq("organization_id", organizationId);
  if (authUserId) query = query.eq("affected_auth_user_id", authUserId);
  if (operatorId) query = query.eq("operator_id", operatorId);
  const [{ data, error, count }, operators] = await Promise.all([
    query,
    client.from("platform_operators").select("id,display_name"),
  ]);
  if (error) throw new Error(error.message);
  if (operators.error) throw new Error(operators.error.message);
  const names = new Map(
    (operators.data ?? []).map((item) => [item.id, item.display_name]),
  );
  const params = new URLSearchParams();
  if (outcome) params.set("outcome", outcome);
  if (action) params.set("action", action);
  if (organizationId) params.set("organizationId", organizationId);
  if (authUserId) params.set("authUserId", authUserId);
  if (operatorId) params.set("operatorId", operatorId);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        eyebrow="Security"
        title="Platform audit log"
        description="Append-only history of staff access and operational actions. Corrections are recorded as new events; existing records cannot be edited."
      />
      <form
        aria-label="Audit filters"
        className="grid gap-3 rounded-lg border bg-white p-4 sm:grid-cols-5"
      >
        <input
          name="action"
          defaultValue={action}
          placeholder="Search action"
          className="min-h-11 rounded-md border px-3 sm:col-span-2"
        />
        <select
          name="outcome"
          aria-label="Outcome"
          defaultValue={outcome ?? ""}
          className="min-h-11 rounded-md border px-3"
        >
          <option value="">All outcomes</option>
          {outcomes.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          name="organizationId"
          defaultValue={organizationId ?? ""}
          placeholder="Organization ID"
          className="min-h-11 rounded-md border px-3"
        />
        <button className="min-h-11 rounded-md bg-slate-900 px-4 font-semibold text-white">
          Apply filters
        </button>
      </form>
      <div className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[72rem] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-3">Action</th>
                <th className="p-3">Operator</th>
                <th className="p-3">Resource</th>
                <th className="p-3">Outcome</th>
                <th className="p-3">Request ID</th>
                <th className="p-3">Occurred</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((event) => (
                <tr key={event.id} className="border-b align-top last:border-0">
                  <td className="p-3">
                    <p className="font-semibold">{humanize(event.action)}</p>
                    {event.organization_id ? (
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        Org: {event.organization_id}
                      </p>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {names.get(event.operator_id) ?? "Unknown operator"}
                  </td>
                  <td className="p-3">
                    <p>{humanize(event.resource_type)}</p>
                    <p className="mt-1 max-w-xs truncate font-mono text-xs text-slate-500">
                      {event.resource_id ?? "—"}
                    </p>
                  </td>
                  <td className="p-3">
                    <StatusPill value={event.outcome} />
                  </td>
                  <td className="p-3 font-mono text-xs">{event.request_id}</td>
                  <td className="p-3">{formatDateTime(event.occurred_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data?.length ? (
          <EmptyTable>No audit events match these filters.</EmptyTable>
        ) : null}
        <Pagination
          page={Math.min(page, pageCount)}
          pageCount={pageCount}
          path="/internal/admin/audit"
          params={params}
        />
      </div>
    </div>
  );
}

function validUuid(value: string | undefined) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : undefined;
}
