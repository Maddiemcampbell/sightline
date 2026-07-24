import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getRiskEvidenceExperience } from "@/features/evidence/data";
import { formatSourceLocation } from "@/features/evidence/evidence-experience";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  assertAuthorized,
  canAccessInternalAdmin,
} from "@/lib/auth/authorization";

export default async function EvidenceDebugPage({
  searchParams,
}: {
  searchParams: Promise<{ riskId?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const context = await requireActorContext();
  assertAuthorized(canAccessInternalAdmin(context));
  const requestedRiskId = (await searchParams).riskId;
  const client = await createServerSupabaseClient();
  const { data: defaultRisk, error } = requestedRiskId
    ? { data: null, error: null }
    : await client
        .from("risks")
        .select("id")
        .eq("organization_id", context.organizationId)
        .order("detected_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  if (error) throw new Error(error.message);
  const riskId = requestedRiskId ?? defaultRisk?.id;
  if (!riskId)
    return <p className="p-8">No risk is available in this organization.</p>;
  const experience = await getRiskEvidenceExperience(riskId);

  return (
    <div className="mx-auto max-w-6xl px-[var(--page-gutter)] py-10">
      <header>
        <p className="text-muted text-xs font-semibold tracking-wide uppercase">
          Internal development tooling
        </p>
        <h1 className="mt-2 text-3xl font-semibold">Evidence debug</h1>
        <p className="text-muted mt-2 text-sm">
          Inspect citation identity, grouping, relevance, and source
          availability. This view intentionally does not expose model
          chain-of-thought.
        </p>
      </header>
      <form className="mt-6 flex gap-3" action="/internal/evidence-debug">
        <label className="flex-1 text-sm font-semibold">
          Risk ID
          <input
            name="riskId"
            defaultValue={riskId}
            className="border-border bg-surface mt-1 min-h-10 w-full rounded-md border px-3 font-normal"
          />
        </label>
        <button className="bg-deep-green mt-6 min-h-10 rounded-md px-4 text-sm font-semibold text-white">
          Inspect
        </button>
      </form>
      <Card className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <caption className="sr-only">
            Evidence records for the selected risk
          </caption>
          <thead className="text-muted border-b text-xs uppercase">
            <tr>
              <th className="py-3 pr-4">Evidence ID</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Support</th>
              <th className="py-3 pr-4">Relevance</th>
              <th className="py-3 pr-4">Location</th>
              <th className="py-3">Document</th>
            </tr>
          </thead>
          <tbody>
            {experience.items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="py-3 pr-4 font-mono text-xs">{item.id}</td>
                <td className="py-3 pr-4">{item.evidenceType}</td>
                <td className="py-3 pr-4">{item.supportType}</td>
                <td className="py-3 pr-4">{item.relevanceScore}%</td>
                <td className="py-3 pr-4">
                  {formatSourceLocation(item) ?? "Missing"}
                </td>
                <td className="py-3">
                  {item.documentId
                    ? item.documentAvailable
                      ? "Available"
                      : "Unavailable"
                    : "Not linked"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
