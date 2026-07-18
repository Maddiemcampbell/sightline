import { PlaceholderPage } from "@/components/placeholder-page";

type ProjectPageProps = Readonly<{
  params: Promise<{ projectId: string }>;
}>;

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  return (
    <PlaceholderPage
      eyebrow="Project detail"
      title={`Project ${projectId}`}
      description="Project-specific financial context and risk signals will appear here."
    />
  );
}
