import { PlaceholderPage } from "@/components/placeholder-page";

type RiskPageProps = Readonly<{
  params: Promise<{ riskId: string }>;
}>;

export default async function RiskPage({ params }: RiskPageProps) {
  const { riskId } = await params;

  return (
    <PlaceholderPage
      eyebrow="Risk detail"
      title={`Risk ${riskId}`}
      description="Evidence, financial exposure, and ownership for this risk will appear here."
    />
  );
}
