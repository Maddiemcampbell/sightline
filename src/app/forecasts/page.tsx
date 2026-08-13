import type { Metadata } from "next";

import {
  ForecastWorkspace,
  type InitialForecastScenario,
} from "@/features/forecasting/forecast-workspace";
import type { ScenarioKind } from "@/features/forecasting/scenario";
import { getForecastingView } from "@/features/forecasting/data";

export const metadata: Metadata = { title: "Forecasting" };
export const dynamic = "force-dynamic";

export default async function ForecastingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const view = await getForecastingView();
  const params = await searchParams;
  const kind = stringParam(params.scenarioKind);
  const allowedKinds: readonly ScenarioKind[] = [
    "reject_pending_change_orders",
    "cost_to_complete_increase",
    "completion_delay",
  ];
  const initialScenario: InitialForecastScenario | null =
    kind && allowedKinds.includes(kind as ScenarioKind)
      ? {
          name: stringParam(params.scenarioName) || "Chat forecast scenario",
          projectId: stringParam(params.scenarioProject),
          kind: kind as ScenarioKind,
          costIncreasePercent: Math.min(
            20,
            Math.max(5, Number(stringParam(params.scenarioCost)) || 10),
          ),
        }
      : null;
  return <ForecastWorkspace view={view} initialScenario={initialScenario} />;
}

function stringParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}
