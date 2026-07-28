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
  createdAt: string;
};

export default async function PlatformAIUsagePage() {
  await requirePlatformPermission("platform.ai.read", "admin_page", "ai_usage");
  const client = createAdminSupabaseClient();
  const [metrics, analyses, drafts, answers] = await Promise.all([
    new PlatformOperationsService(client).aiSummary(),
    client
      .from("ai_analysis_runs")
      .select(
        "id,organization_id,status,provider,model_name,prompt_version,total_tokens,latency_ms,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("risk_email_drafts")
      .select(
        "id,organization_id,generation_source,provider,model_name,prompt_version,total_tokens,latency_ms,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("risk_conversation_messages")
      .select(
        "id,organization_id,answer_status,provider,model_name,prompt_version,total_tokens,latency_ms,created_at,role",
      )
      .eq("role", "assistant")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const result of [analyses, drafts, answers]) {
    if (result.error) throw new Error(result.error.message);
  }
  const operations: Operation[] = [
    ...(analyses.data ?? []).map((item) => ({
      id: item.id,
      kind: "Risk analysis",
      organizationId: item.organization_id,
      status: item.status,
      provider: item.provider,
      model: item.model_name,
      promptVersion: item.prompt_version,
      tokens: item.total_tokens,
      latencyMs: item.latency_ms,
      createdAt: item.created_at,
    })),
    ...(drafts.data ?? []).map((item) => ({
      id: item.id,
      kind: "Email draft",
      organizationId: item.organization_id,
      status: item.generation_source,
      provider: item.provider,
      model: item.model_name,
      promptVersion: item.prompt_version,
      tokens: item.total_tokens,
      latencyMs: item.latency_ms,
      createdAt: item.created_at,
    })),
    ...(answers.data ?? []).map((item) => ({
      id: item.id,
      kind: "Risk answer",
      organizationId: item.organization_id,
      status: item.answer_status ?? "unavailable",
      provider: item.provider ?? "unknown",
      model: item.model_name ?? "unknown",
      promptVersion: item.prompt_version ?? "unknown",
      tokens: item.total_tokens,
      latencyMs: item.latency_ms,
      createdAt: item.created_at,
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    )
    .slice(0, 50);

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        eyebrow="AI operations"
        title="AI usage"
        description="Model operations, provider-reported token usage, latency, and failures. Prompts, document excerpts, generated bodies, and model reasoning are intentionally excluded."
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
                <th className="p-3">Prompt</th>
                <th className="p-3">Tokens</th>
                <th className="p-3">Latency</th>
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
