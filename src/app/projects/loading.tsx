import { LoadingState } from "@/components/loading-state";

export default function ProjectsLoading() {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-10">
      <LoadingState label="Loading projects" rows={5} />
    </div>
  );
}
