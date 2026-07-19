import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ActivityTimeline } from "@/features/activity/timeline";
import { getActivityPage } from "@/features/activity/data";

type Props = { searchParams: Promise<{ cursor?: string; riskId?: string }> };
export default async function ActivityPage({ searchParams }: Props) {
  const { cursor, riskId } = await searchParams;
  const page = await getActivityPage({
    ...(cursor ? { cursor } : {}),
    ...(riskId ? { riskId } : {}),
    limit: 25,
  });
  return (
    <main className="mx-auto max-w-5xl px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          Organization history
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Activity
        </h1>
        <p className="text-muted mt-2">
          Human decisions, automated detections, and AI analysis across BuildCo
          risks.
        </p>
      </header>
      <Card className="mt-6">
        <ActivityTimeline items={page.items} />
        {page.nextCursor && (
          <Link
            href={`/activity?${riskId ? `riskId=${encodeURIComponent(riskId)}&` : ""}cursor=${encodeURIComponent(page.nextCursor)}`}
            className="border-border text-deep-green mt-6 inline-flex min-h-10 items-center rounded-md border px-4 text-sm font-semibold"
          >
            Load older activity
          </Link>
        )}
      </Card>
    </main>
  );
}
