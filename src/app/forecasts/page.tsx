import type { Metadata } from "next";

import { ForecastWorkspace } from "@/features/forecasting/forecast-workspace";
import { getForecastingView } from "@/features/forecasting/data";

export const metadata: Metadata = { title: "Forecasting" };
export const dynamic = "force-dynamic";

export default async function ForecastingPage() {
  const view = await getForecastingView();
  return <ForecastWorkspace view={view} />;
}
