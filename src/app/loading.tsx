import { LoadingState } from "@/components/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-8 lg:py-10">
      <LoadingState label="Preparing your company overview" rows={8} />
    </div>
  );
}
