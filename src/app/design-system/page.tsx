import { ArrowUpRight, CalendarDays, Plus, RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { MetricCard } from "@/components/metric-card";
import { PageHeader } from "@/components/page-header";
import { RiskBadge, StatusBadge } from "@/components/ui/badge";
import { PrimaryButton, SecondaryButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function SpecimenSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section
      aria-labelledby={`specimen-${title.toLowerCase().replaceAll(" ", "-")}`}
    >
      <div className="mb-4">
        <h2
          id={`specimen-${title.toLowerCase().replaceAll(" ", "-")}`}
          className="text-ink text-lg font-semibold tracking-[-0.02em]"
        >
          {title}
        </h2>
        <p className="text-muted mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-8 lg:py-10">
      <div className="bg-soft-amber text-warning mb-5 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
        Internal development tooling
      </div>
      <PageHeader
        eyebrow="Sightline UI"
        title="Design system"
        description="A working inventory of the foundational components, tokens, and interface states used across Sightline. This route is not intended for customers."
        actions={
          <>
            <SecondaryButton>
              <CalendarDays aria-hidden="true" className="size-4" />
              Secondary
            </SecondaryButton>
            <PrimaryButton>
              <Plus aria-hidden="true" className="size-4" />
              Primary
            </PrimaryButton>
          </>
        }
      />

      <div className="mt-10 space-y-12">
        <SpecimenSection
          title="Color and type"
          description="Core brand colors and the restrained executive typography hierarchy."
        >
          <Card>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Accent", "bg-accent", "#d4e87d"],
                ["Deep green", "bg-deep-green text-white", "#173f32"],
                ["Dark text", "bg-ink text-white", "#13212a"],
                ["Warm background", "bg-background", "#fafaf7"],
              ].map(([label, color, value]) => (
                <div
                  key={label}
                  className="border-border overflow-hidden rounded-md border"
                >
                  <div className={`h-20 ${color}`} />
                  <div className="bg-surface p-3">
                    <p className="text-ink text-sm font-semibold">{label}</p>
                    <p className="text-muted mt-1 text-xs">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-border mt-8 border-t pt-8">
              <p className="text-ink text-4xl font-semibold tracking-[-0.04em]">
                Executive clarity
              </p>
              <p className="text-muted mt-3 max-w-2xl text-base leading-7">
                Sightline uses calm, direct language and comfortable line
                lengths to make financial risk easier to understand.
              </p>
            </div>
          </Card>
        </SpecimenSection>

        <SpecimenSection
          title="Buttons and badges"
          description="Actions and compact signals with clear hierarchy and accessible contrast."
        >
          <Card className="space-y-6">
            <div className="flex flex-wrap gap-3">
              <PrimaryButton>
                <Plus aria-hidden="true" className="size-4" /> Add item
              </PrimaryButton>
              <SecondaryButton>
                <RefreshCw aria-hidden="true" className="size-4" /> Refresh
              </SecondaryButton>
              <PrimaryButton disabled>Disabled action</PrimaryButton>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active">Active</StatusBadge>
              <StatusBadge status="pending">Pending</StatusBadge>
              <StatusBadge status="complete">Complete</StatusBadge>
              <StatusBadge status="neutral">Draft</StatusBadge>
            </div>
            <div className="flex flex-wrap gap-2">
              <RiskBadge level="high">High risk</RiskBadge>
              <RiskBadge level="medium">Medium risk</RiskBadge>
              <RiskBadge level="low">Low risk</RiskBadge>
            </div>
          </Card>
        </SpecimenSection>

        <SpecimenSection
          title="Cards and metrics"
          description="White surfaces use soft borders, restrained radii, and nearly invisible elevation."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Portfolio at risk"
              value="$1.24M"
              detail="Across 6 active projects"
              trend={
                <StatusBadge status="pending">
                  <ArrowUpRight aria-hidden="true" className="mr-1 size-3" />
                  4.2%
                </StatusBadge>
              }
            />
            <MetricCard
              label="Open risk signals"
              value="18"
              detail="5 require executive attention"
              trend={<RiskBadge level="high">5 high</RiskBadge>}
            />
            <MetricCard
              label="Projects reporting"
              value="12 / 14"
              detail="Last refreshed this morning"
              trend={<StatusBadge status="active">On track</StatusBadge>}
            />
          </div>
        </SpecimenSection>

        <SpecimenSection
          title="System states"
          description="Consistent empty, loading, and error treatments for product workflows."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <EmptyState
              title="No documents yet"
              description="Documents added to this project will appear here."
              action={<PrimaryButton>Add document</PrimaryButton>}
            />
            <LoadingState label="Loading project risks" rows={4} />
            <div className="lg:col-span-2">
              <ErrorState
                description="We couldn't refresh this project's latest cost data. Your existing information is still available."
                action={<SecondaryButton>Try again</SecondaryButton>}
              />
            </div>
          </div>
        </SpecimenSection>
      </div>
    </div>
  );
}
