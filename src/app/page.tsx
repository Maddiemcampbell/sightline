import { Dashboard } from "@/features/dashboard/dashboard";
import { getDashboardView } from "@/features/dashboard/data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const view = await getDashboardView();
  return <Dashboard view={view} />;
}
