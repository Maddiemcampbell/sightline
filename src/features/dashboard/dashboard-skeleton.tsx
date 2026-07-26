import { LoadingState } from "@/components/loading-state";

export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[96rem] px-[var(--page-gutter)] py-6 lg:py-8"
      role="status"
      aria-label="Preparing your executive dashboard"
    >
      <span className="sr-only">Preparing your executive dashboard</span>
      <div className="bg-border h-64 rounded-2xl motion-safe:animate-pulse" aria-hidden="true" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-4 sm:grid-cols-2">
          <LoadingState label="Loading portfolio overview" rows={4} className="sm:col-span-2 min-h-52" />
          <LoadingState label="Loading portfolio risk heatmap" rows={6} className="min-h-72" />
          <LoadingState label="Loading recent intelligence" rows={5} className="min-h-72" />
        </div>
        <LoadingState label="Loading AI assistant" rows={8} className="min-h-[30rem]" />
      </div>
    </div>
  );
}
