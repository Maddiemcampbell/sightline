import { LoadingState } from "@/components/loading-state";

export default function DocumentsLoading() {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <LoadingState label="Loading documents" rows={6} />
    </div>
  );
}
