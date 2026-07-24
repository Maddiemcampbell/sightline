import { notFound } from "next/navigation";

import {
  analyzeFixtureAction,
  approveSuggestionAction,
  rejectSuggestionAction,
} from "@/app/internal/ai-review/actions";
import { Card } from "@/components/ui/card";
import { riskAnalysisOutputSchema } from "@/domain/ai/risk-analysis";
import { riskAnalysisFixtures } from "@/features/ai/evaluation-fixtures";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { requireActorContext } from "@/lib/auth/request-context";
import { assertInternalAdmin } from "@/lib/auth/internal-admin";

export default async function AiReviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const context = await requireActorContext();
  assertInternalAdmin(context);
  const client = await createServerSupabaseClient();
  const { data, error } = await client
    .from("ai_risk_suggestions")
    .select(
      "*,ai_analysis_runs(model_name,prompt_version,status,latency_ms,input_tokens,output_tokens,total_tokens)",
    )
    .eq("organization_id", context.organizationId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-10">
      <span className="bg-soft-amber text-warning rounded-full px-3 py-1 text-xs font-semibold">
        Internal development tooling
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
        AI risk review
      </h1>
      <p className="text-muted mt-3 max-w-2xl leading-7">
        Model output remains a pending suggestion until Matt explicitly approves
        it. Rejection never changes the risk register. If the provider is
        unavailable, these fixtures use the deterministic V1 fallback.
      </p>
      <Card className="mt-7">
        <h2 className="text-lg font-semibold">Evaluation fixtures</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {riskAnalysisFixtures.map((fixture) => (
            <form key={fixture.id} action={analyzeFixtureAction}>
              <input type="hidden" name="fixtureId" value={fixture.id} />
              <button className="border-border focus-visible:outline-accent-strong rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-2">
                Analyze {fixture.name}
              </button>
            </form>
          ))}
        </div>
      </Card>
      <section aria-labelledby="review-heading" className="mt-8 space-y-4">
        <h2 id="review-heading" className="text-xl font-semibold">
          Review queue
        </h2>
        {(data ?? []).length === 0 ? (
          <Card>
            <p className="text-muted">No AI suggestions have been created.</p>
          </Card>
        ) : (
          (data ?? []).map((row) => {
            const suggestion = riskAnalysisOutputSchema.parse(
              row.suggested_risk,
            );
            const run = Array.isArray(row.ai_analysis_runs)
              ? row.ai_analysis_runs[0]
              : row.ai_analysis_runs;
            return (
              <article key={row.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-muted text-xs font-semibold tracking-wide uppercase">
                        {suggestion.category} · {suggestion.severity}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold">
                        {suggestion.suggestedRiskTitle}
                      </h3>
                    </div>
                    <span className="bg-surface-muted rounded-full px-3 py-1 text-xs font-semibold">
                      {row.review_status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6">
                    {suggestion.whyItMatters}
                  </p>
                  <p className="text-muted mt-3 text-sm leading-6">
                    Next: {suggestion.recommendedNextAction}
                  </p>
                  <p className="text-muted mt-4 text-xs">
                    {run?.model_name ?? "Unknown model"} ·{" "}
                    {run?.prompt_version ?? "Unknown prompt"} ·{" "}
                    {run?.latency_ms ?? 0}ms · {run?.total_tokens ?? 0} tokens
                  </p>
                  {row.review_status === "pending" ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <form
                        action={approveSuggestionAction}
                        className="space-y-3"
                      >
                        <input
                          type="hidden"
                          name="suggestionId"
                          value={row.id}
                        />
                        <label className="block text-sm font-semibold">
                          Review note (optional)
                          <input
                            name="reviewNote"
                            className="border-border mt-2 h-10 w-full rounded-md border px-3 font-normal"
                          />
                        </label>
                        <button className="bg-deep-green focus-visible:outline-accent-strong rounded-md px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2">
                          Approve and activate risk
                        </button>
                      </form>
                      <form
                        action={rejectSuggestionAction}
                        className="space-y-3"
                      >
                        <input
                          type="hidden"
                          name="suggestionId"
                          value={row.id}
                        />
                        <label className="block text-sm font-semibold">
                          Rejection reason
                          <input
                            required
                            minLength={3}
                            name="reviewNote"
                            className="border-border mt-2 h-10 w-full rounded-md border px-3 font-normal"
                          />
                        </label>
                        <button className="border-border focus-visible:outline-accent-strong rounded-md border px-4 py-2 text-sm font-semibold focus-visible:outline-2">
                          Reject suggestion
                        </button>
                      </form>
                    </div>
                  ) : null}
                </Card>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
