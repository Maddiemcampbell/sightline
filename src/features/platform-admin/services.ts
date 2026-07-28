import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppDatabase } from "@/lib/supabase/app-database.types";

export type AdminListItem = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  status?: "healthy" | "warning" | "critical" | "info";
}>;

export type PlatformMetric = Readonly<{
  label: string;
  value: string;
  detail: string;
  status: "healthy" | "warning" | "critical" | "info";
}>;

export class PlatformOperationsService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async recentAudit(limit = 5): Promise<readonly AdminListItem[]> {
    const { data, error } = await this.client
      .from("platform_audit_logs")
      .select("id,action,outcome,occurred_at,operator_id")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    const names = await this.operatorNames(
      (data ?? []).map((item) => item.operator_id),
    );
    return (data ?? []).map((item) => ({
      id: item.id,
      title: humanize(item.action),
      subtitle: `${names.get(item.operator_id) ?? "Unknown operator"} · ${relativeTime(item.occurred_at)}`,
      status:
        item.outcome === "failed"
          ? "critical"
          : item.outcome === "denied"
            ? "warning"
            : "info",
    }));
  }

  async jobSummary(): Promise<readonly PlatformMetric[]> {
    const since = oneDayAgo();
    const { data, error } = await this.client
      .from("scheduler_job_executions")
      .select("status,trigger_type")
      .gte("created_at", since);
    if (error) throw new Error(error.message);
    const executions = data ?? [];
    const completed = executions.filter((item) =>
      ["succeeded", "failed", "timed_out", "dead_lettered"].includes(
        item.status,
      ),
    );
    const succeeded = completed.filter(
      (item) => item.status === "succeeded",
    ).length;
    const failures = completed.length - succeeded;
    const retries = executions.filter(
      (item) => item.trigger_type === "retry",
    ).length;
    return [
      metric(
        "Job success rate",
        completed.length
          ? `${((succeeded / completed.length) * 100).toFixed(1)}%`
          : "No runs",
        `${completed.length} completed in the last 24 hours`,
        failures ? "warning" : "healthy",
      ),
      metric(
        "Failures",
        String(failures),
        "Failed, timed out, or dead-lettered",
        failures ? "critical" : "healthy",
      ),
      metric(
        "Retry executions",
        String(retries),
        "Last 24 hours",
        retries ? "warning" : "info",
      ),
    ];
  }

  async aiSummary(): Promise<readonly PlatformMetric[]> {
    const [analyses, drafts, answers] = await Promise.all([
      this.client
        .from("ai_analysis_runs")
        .select("status,total_tokens,latency_ms")
        .gte("created_at", oneDayAgo()),
      this.client
        .from("risk_email_drafts")
        .select("total_tokens,latency_ms")
        .gte("created_at", oneDayAgo()),
      this.client
        .from("risk_conversation_messages")
        .select("total_tokens,latency_ms,role")
        .eq("role", "assistant")
        .gte("created_at", oneDayAgo()),
    ]);
    for (const result of [analyses, drafts, answers]) {
      if (result.error) throw new Error(result.error.message);
    }
    const operations = [
      ...(analyses.data ?? []),
      ...(drafts.data ?? []),
      ...(answers.data ?? []),
    ];
    const tokens = operations.reduce(
      (sum, item) => sum + (item.total_tokens ?? 0),
      0,
    );
    const latencies = operations
      .map((item) => item.latency_ms)
      .filter((value): value is number => value !== null);
    const failures = (analyses.data ?? []).filter(
      (item) => item.status === "failed",
    ).length;
    return [
      metric(
        "AI operations",
        operations.length.toLocaleString(),
        "Analyses, drafts, and answers in the last 24 hours",
        "info",
      ),
      metric(
        "Tokens",
        tokens.toLocaleString(),
        "Provider-reported usage in the last 24 hours",
        "info",
      ),
      metric(
        "Average latency",
        latencies.length
          ? `${Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)} ms`
          : "Unavailable",
        "Across recorded AI operations",
        "info",
      ),
      metric(
        "Failed analyses",
        String(failures),
        "Last 24 hours",
        failures ? "warning" : "healthy",
      ),
    ];
  }

  async healthSummary(): Promise<readonly PlatformMetric[]> {
    const [database, buckets, deliveries, alerts] = await Promise.all([
      this.client
        .from("organizations")
        .select("id", { head: true, count: "exact" }),
      this.client.storage.listBuckets(),
      this.client
        .from("daily_brief_deliveries")
        .select("status")
        .gte("created_at", oneDayAgo()),
      this.client
        .from("job_monitoring_alerts")
        .select("id", { head: true, count: "exact" })
        .eq("status", "open"),
    ]);
    const failedDeliveries = (deliveries.data ?? []).filter(
      (item) => item.status === "failed",
    ).length;
    return [
      metric(
        "Application",
        "Operational",
        `Rendered at ${new Date().toLocaleTimeString()}`,
        "healthy",
      ),
      metric(
        "Database",
        database.error ? "Unavailable" : "Operational",
        database.error ? "Health query failed" : "Service-role query succeeded",
        database.error ? "critical" : "healthy",
      ),
      metric(
        "Storage",
        buckets.error ? "Unavailable" : "Operational",
        buckets.error
          ? "Bucket query failed"
          : `${buckets.data.length} buckets reachable`,
        buckets.error ? "critical" : "healthy",
      ),
      metric(
        "Email delivery",
        failedDeliveries ? "Degraded" : "Operational",
        `${failedDeliveries} failed deliveries in the last 24 hours`,
        failedDeliveries ? "warning" : "healthy",
      ),
      metric(
        "Job monitoring",
        alerts.error
          ? "Unavailable"
          : alerts.count
            ? "Attention needed"
            : "Operational",
        alerts.error
          ? "Alert query failed"
          : `${alerts.count ?? 0} open alerts`,
        alerts.error ? "critical" : alerts.count ? "warning" : "healthy",
      ),
    ];
  }

  async recentErrors(limit = 5): Promise<readonly AdminListItem[]> {
    const { data, error } = await this.client
      .from("application_error_reports")
      .select("id,error_name,error_message,severity,source,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((item) => ({
      id: item.id,
      title: `${item.error_name}: ${item.error_message}`,
      subtitle: `${humanize(item.source)} · ${relativeTime(item.occurred_at)}`,
      status: item.severity === "warning" ? "warning" : "critical",
    }));
  }

  private async operatorNames(ids: readonly string[]) {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return new Map<string, string>();
    const { data, error } = await this.client
      .from("platform_operators")
      .select("id,display_name")
      .in("id", uniqueIds);
    if (error) throw new Error(error.message);
    return new Map(
      (data ?? []).map((operator) => [operator.id, operator.display_name]),
    );
  }
}

function oneDayAgo() {
  return new Date(Date.now() - 86_400_000).toISOString();
}

function metric(
  label: string,
  value: string,
  detail: string,
  status: PlatformMetric["status"],
): PlatformMetric {
  return { label, value, detail, status };
}

export function humanize(value: string) {
  return value
    .replaceAll(".", " ")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function relativeTime(value: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000),
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
