import type { Metadata } from "next";

import { ForecastReadinessView } from "@/features/forecast-readiness/readiness-view";
import { getForecastReadinessCenter } from "@/features/forecast-readiness/data";

export const metadata: Metadata = { title: "Forecast data readiness" };
export const dynamic = "force-dynamic";

export default async function ForecastReadinessPage() {
  const center = await getForecastReadinessCenter();
  return <ForecastReadinessView center={center} />;
}
