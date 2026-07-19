import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { ManualDetectionButton } from "@/features/detection/manual-run-button";

export default function InternalDetectionPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="mx-auto max-w-3xl px-[var(--page-gutter)] py-10">
      <span className="bg-soft-amber text-warning rounded-full px-3 py-1 text-xs font-semibold">
        Internal development tooling
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
        Deterministic risk detection
      </h1>
      <p className="text-muted mt-3 leading-7">
        Run the V1 insurance, weather-delay, and repeated-issue rules against
        seeded extracted fields. No model or external API is called.
      </p>
      <Card className="mt-7">
        <h2 className="text-lg font-semibold">Manual run</h2>
        <p className="text-muted mt-2 mb-5 text-sm">
          The run updates matching risks, upserts evidence and actions, records
          rule results, and regenerates today’s Daily Brief.
        </p>
        <ManualDetectionButton />
      </Card>
    </div>
  );
}
