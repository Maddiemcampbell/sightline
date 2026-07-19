import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

type PlaceholderPageProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-[var(--content-width)] px-[var(--page-gutter)] py-8 lg:py-10">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mt-8">
        <EmptyState
          title="Ready for the next phase"
          description="This area is intentionally empty while Sightline's product workflows are being defined."
        />
      </div>
    </div>
  );
}
