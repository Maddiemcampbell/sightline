import { LoadingState } from "@/components/loading-state";

export default function BriefLoading() {
  return (
    <div className="mx-auto w-full max-w-[90rem] px-[var(--page-gutter)] py-10">
      <LoadingState label="Preparing your Daily Brief" />
    </div>
  );
}
