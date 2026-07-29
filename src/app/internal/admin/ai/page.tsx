import {
  AdminPageHeader,
  EmptyTable,
  formatDateTime,
  MetricCards,
  StatusPill,
} from "@/features/platform-admin/data-ui";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import {
  humanize,
  PlatformOperationsService,
} from "@/features/platform-admin/services";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Operation = {
  id: string;
  kind: string;
  organizationId: string;
  status: string;
  provider: string;
  model: string;
  promptVersion: string;
  tokens: number | null;
  latencyMs: number | null;
  retrieval: string;
  evidence: string;
  createdAt: string;
};

export default async function PlatformAIUsagePage() {
  await requirePlatformPermission("platform.ai.read", "admin_page", "ai_usage");
  const client = createAdminSupabaseClient();
  const [metrics, recent] = await Promise.all([
    new PlatformOperationsService(client).aiSummary(),
    client
      .from("ai_observability_events")
      .select(
        "id,organization_id,operation_type,status,provider,model_name,prompt_version,total_tokens,latency_ms,retrieval_candidate_count,retrieval_selected_count,evidence_available_count,evidence_cited_count,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (recent.error) throw new Error(recent.error.message);
  const operations: Operation[] = (recent.data ?? []).map((item) => ({
    id: item.id,
    kind: humanize(item.operation_type),
    organizationId: item.organization_id,
    status: item.status,
    provider: item.provider,
    model: item.model_name,
    promptVersion: item.prompt_version,
    tokens: item.total_tokens,
    latencyMs: item.latency_ms,
    retrieval: ratio(
      item.retrieval_selected_count,
      item.retrieval_candidate_count,
    ),
    evidence: ratio(item.evidence_cited_count, item.evidence_available_count),
    createdAt: item.created_at,
  }));

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        eyebrow="AI operations"
        title="AI usage"
        description="Privacy-safe model operations, usage, retrieval, evidence grounding, errors, and answer feedback. Prompts, document excerpts, generated content, and model reasoning are never recorded here."
      />
      <MetricCards metrics={metrics} />
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">Recent operations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                <th className="p-3">Operation</th>
                <th className="p-3">Status</th>
                <th className="p-3">Model</th>
                <th className="p-3">Prompt version</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Latency</th>
                <th className="p-3">Retrieval</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Recorded</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((operation) => (
                <tr
                  key={`${operation.kind}-${operation.id}`}
                  className="border-b last:border-0"
                >
                  <td className="p-3">
                    <p className="font-semibold">{operation.kind}</p>
                    <p className="mt-1 font-mono text-xs text-slate-500">
                      Org: {operation.organizationId}
                    </p>
                  </td>
                  <td className="p-3">
                    <StatusPill value={operation.status} />
                  </td>
                  <td className="p-3">
                    <p>{operation.model}</p>
                    <p className="text-xs text-slate-500">
                      {operation.provider}
                    </p>
                  </td>
                  <td className="p-3">{humanize(operation.promptVersion)}</td>
                  <td className="p-3">
                    {operation.tokens?.toLocaleString() ?? "Unavailable"}
                  </td>
                  <td className="p-3">
                    {operation.latencyMs === null
                      ? "Unavailable"
                      : `${operation.latencyMs} ms`}
                  </td>
                  <td className="p-3">{operation.retrieval}</td>
                  <td className="p-3">{operation.evidence}</td>
                  <td className="p-3">{formatDateTime(operation.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!operations.length ? (
          <EmptyTable>No AI operations have been recorded.</EmptyTable>
        ) : null}
      </section>
    </div>
  );
}

function ratio(numerator: number | null, denominator: number | null) {
  if (numerator === null || denominator === null) return "Unavailable";
  if (denominator === 0) return "No eligible records";
  return `${numerator}/${denominator} (${((numerator / denominator) * 100).toFixed(0)}%)`;
}
