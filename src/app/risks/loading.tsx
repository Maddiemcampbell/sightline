import { LoadingState } from "@/components/loading-state";

export default function RisksLoading() {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <LoadingState label="Loading risks" rows={5} />
    </div>
  );
}
