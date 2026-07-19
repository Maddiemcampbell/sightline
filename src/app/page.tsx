import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-8 lg:py-10">
      <PageHeader
        eyebrow="Profit intelligence"
        title="Good morning, Matt."
        description="Sightline is ready to help BuildCo focus on the issues most likely to affect profit this week."
      />
      <div className="mt-8">
        <EmptyState
          title="Your executive workspace is ready"
          description="Dashboard content will be added in the next product phase. For now, explore the application structure through the Daily Brief."
          action={
            <Link
              href="/brief"
              className="bg-deep-green hover:bg-ink focus-visible:outline-accent-strong inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors"
            >
              <Compass aria-hidden="true" className="size-4" />
              Open Daily Brief
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          }
        />
      </div>
    </div>
  );
}
