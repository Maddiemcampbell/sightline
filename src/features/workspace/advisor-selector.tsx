"use client";

import { Sparkles } from "lucide-react";

import type { AdvisorMode } from "@/features/workspace/types";
import { useDashboardState } from "@/features/workspace/workspace-provider";

const labels: Record<AdvisorMode, string> = {
  project: "Project Advisor",
  executive: "Executive Advisor",
  risk: "Risk Advisor",
  financial: "Financial Advisor",
};

export function AdvisorSelector() {
  const { advisorMode, setAdvisorMode, stateReady } = useDashboardState();
  return (
    <label className="border-accent-strong bg-accent/25 flex min-h-10 items-center gap-2 rounded-md border px-3">
      <Sparkles className="text-deep-green size-4" aria-hidden="true" />
      <span className="sr-only">Advisor mode</span>
      <select
        value={advisorMode}
        disabled={!stateReady}
        onChange={(event) => setAdvisorMode(event.target.value as AdvisorMode)}
        className="min-w-36 bg-transparent text-xs font-semibold outline-none"
      >
        {Object.entries(labels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const advisorModeLabels = labels;
