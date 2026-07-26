import type { AdvisorMode } from "@/features/workspace/types";

const advisorPrompts: Record<AdvisorMode, readonly string[]> = {
  project: [
    "Which projects currently deserve attention?",
    "Which projects generate the most overdue actions?",
    "Where are documentation gaps occurring?",
  ],
  executive: [
    "What deserves my attention today?",
    "Prepare for tomorrow's leadership meeting.",
    "Summarize what changed this week.",
  ],
  risk: [
    "Which risks have the largest supported exposure?",
    "Which vendors appear across multiple risks?",
    "What actions should I prioritize?",
  ],
  financial: [
    "Which supported risks have the largest financial exposure?",
    "Where do repeated issues suggest cost-saving opportunities?",
    "Which financial questions cannot current data answer?",
  ],
};

export function getSuggestedOrganizationPrompts({
  advisorMode,
  pathname,
  selectedProjectName,
  hasPortfolioObservations,
  hasRecentActivity = false,
}: {
  advisorMode: AdvisorMode;
  pathname: string;
  selectedProjectName: string | null;
  hasPortfolioObservations: boolean;
  hasRecentActivity?: boolean;
}): readonly string[] {
  const contextual: string[] = [];
  if (selectedProjectName) {
    contextual.push(`Summarize ${selectedProjectName}.`);
    contextual.push(`Explain why ${selectedProjectName} needs attention.`);
  } else if (pathname.startsWith("/actions")) {
    contextual.push("What actions should I prioritize?");
  } else if (pathname.startsWith("/projects")) {
    contextual.push("Which projects are becoming risky?");
  } else if (pathname.startsWith("/risks")) {
    contextual.push("Find similar historical risks.");
  } else if (pathname === "/" && hasPortfolioObservations) {
    contextual.push("Explain the highest-impact portfolio observation.");
  }
  if (hasRecentActivity) contextual.push("What changed this week?");
  return [...new Set([...contextual, ...advisorPrompts[advisorMode]])].slice(
    0,
    4,
  );
}

export function getSuggestedRiskPrompts(
  advisorMode: AdvisorMode,
): readonly string[] {
  const contextual: Record<AdvisorMode, readonly string[]> = {
    project: [
      "How could this risk affect its project?",
      "What project action should happen next?",
    ],
    executive: [
      "Why does this risk deserve leadership attention?",
      "Summarize this risk for leadership.",
    ],
    risk: [
      "Why is this high risk?",
      "What evidence supports this?",
      "What should we do next?",
      "What information is missing?",
    ],
    financial: [
      "What supported financial impact does this risk have?",
      "Which financial information is missing?",
    ],
  };
  return contextual[advisorMode];
}
