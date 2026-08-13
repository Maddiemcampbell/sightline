import type { AdvisorMode } from "@/features/workspace/types";

export type AskCommand = Readonly<{
  token: string;
  label: string;
  description: string;
  category: "Advisor" | "Workflow";
  advisorMode: AdvisorMode;
  prompt: string;
}>;

export const askCommands: readonly AskCommand[] = [
  {
    token: "/auto",
    label: "Automatic advisor",
    description: "Let Sightline route the question to the best advisor.",
    category: "Advisor",
    advisorMode: "auto",
    prompt: "",
  },
  {
    token: "/project",
    label: "Project advisor",
    description: "Ask about project execution, documentation, and follow-up.",
    category: "Advisor",
    advisorMode: "project",
    prompt: "",
  },
  {
    token: "/risk",
    label: "Risk advisor",
    description: "Investigate severity, evidence, mitigation, and uncertainty.",
    category: "Advisor",
    advisorMode: "risk",
    prompt: "",
  },
  {
    token: "/financial",
    label: "Financial advisor",
    description: "Review authorized cost, exposure, margin, and variance data.",
    category: "Advisor",
    advisorMode: "financial",
    prompt: "",
  },
  {
    token: "/forecast",
    label: "Forecast advisor",
    description: "Explore outlook, cash flow, confidence, and missing inputs.",
    category: "Advisor",
    advisorMode: "forecast",
    prompt: "",
  },
  {
    token: "/executive",
    label: "Executive advisor",
    description: "Prepare concise portfolio and leadership-level answers.",
    category: "Advisor",
    advisorMode: "executive",
    prompt: "",
  },
  {
    token: "/action",
    label: "Create an action",
    description: "Prepare a follow-up action for review before it is created.",
    category: "Workflow",
    advisorMode: "auto",
    prompt: "Create a follow-up action for ",
  },
  {
    token: "/meeting",
    label: "Prepare a meeting",
    description: "Build an agenda from authorized risks and commitments.",
    category: "Workflow",
    advisorMode: "executive",
    prompt: "Prepare a meeting for ",
  },
  {
    token: "/deck",
    label: "Prepare a slide deck",
    description: "Outline an editable executive deck grounded in Sightline.",
    category: "Workflow",
    advisorMode: "executive",
    prompt: "Prepare an executive slide deck for ",
  },
  {
    token: "/report",
    label: "Prepare a report",
    description: "Start a permission-aware report request.",
    category: "Workflow",
    advisorMode: "executive",
    prompt: "Prepare a report about ",
  },
  {
    token: "/email",
    label: "Draft an email",
    description: "Draft correspondence for review without sending it.",
    category: "Workflow",
    advisorMode: "auto",
    prompt: "Draft an email about ",
  },
  {
    token: "/document",
    label: "Find supporting documents",
    description: "Search authorized document and evidence context.",
    category: "Workflow",
    advisorMode: "project",
    prompt: "Find supporting documents related to ",
  },
] as const;

export function matchingAskCommands(value: string): readonly AskCommand[] {
  if (!value.startsWith("/")) return [];
  const query = value.slice(1).trim().toLocaleLowerCase();
  if (value.includes(" ")) return [];
  return askCommands.filter((command) =>
    `${command.token.slice(1)} ${command.label}`
      .toLocaleLowerCase()
      .includes(query),
  );
}

export function resolveAskCommand(value: string): Readonly<{
  question: string;
  advisorMode: AdvisorMode | null;
}> {
  const trimmed = value.trim();
  const [token = "", ...rest] = trimmed.split(/\s+/);
  const command = askCommands.find(
    (item) => item.token === token.toLowerCase(),
  );
  if (!command) return { question: trimmed, advisorMode: null };
  return {
    question: `${command.prompt}${rest.join(" ")}`.trim(),
    advisorMode: command.advisorMode,
  };
}
