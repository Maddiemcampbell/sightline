import type { AdvisorMode } from "@/features/workspace/types";
import type { AskWorkflowProposal } from "@/features/ask-sightline/shared-types";

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
  workflowCommand: AskWorkflowProposal["command"] | null;
}> {
  const trimmed = value.trim();
  const [token = "", ...rest] = trimmed.split(/\s+/);
  const command = askCommands.find(
    (item) => item.token === token.toLowerCase(),
  );
  if (!command)
    return { question: trimmed, advisorMode: null, workflowCommand: null };
  return {
    question: `${command.prompt}${rest.join(" ")}`.trim(),
    advisorMode: command.advisorMode,
    workflowCommand:
      command.category === "Workflow"
        ? (command.token as AskWorkflowProposal["command"])
        : null,
  };
}

export function buildWorkflowProposal(
  command: AskWorkflowProposal["command"],
  question: string,
): AskWorkflowProposal {
  const subject = question
    .replace(
      /^(Create a follow-up action for|Prepare a meeting for|Prepare an executive slide deck for|Prepare a report about|Draft an email about|Find supporting documents related to)\s*/i,
      "",
    )
    .trim();
  const encoded = encodeURIComponent(subject);
  const proposals: Record<
    AskWorkflowProposal["command"],
    Omit<AskWorkflowProposal, "command">
  > = {
    "/action": {
      title: "Proposed follow-up action workflow",
      summary: subject || "Review the requested follow-up and its evidence.",
      effect:
        "No action has been created. Confirm the related risk, owner, priority, due date, and definition of done in the action workflow.",
      href: `/actions${subject ? `?search=${encoded}` : ""}`,
      actionLabel: "Review action workflow",
    },
    "/meeting": {
      title: "Proposed meeting preparation",
      summary: subject || "Prepare an evidence-grounded meeting agenda.",
      effect:
        "No meeting has been created. Confirm the meeting type, projects, date, and generated agenda before saving it.",
      href: "/meetings",
      actionLabel: "Review meeting setup",
    },
    "/deck": {
      title: "Proposed executive deck",
      summary: subject || "Prepare an editable executive presentation.",
      effect:
        "No deck has been generated. Confirm the template, included sections, financial visibility, and data-readiness warnings first.",
      href: "/reports?template=weekly-executive-review#executive-decks",
      actionLabel: "Review deck setup",
    },
    "/report": {
      title: "Proposed report",
      summary: subject || "Prepare a permission-aware report.",
      effect:
        "No report has been downloaded. Select the report type and review its scope and data limitations first.",
      href: "/reports",
      actionLabel: "Review report options",
    },
    "/email": {
      title: "Proposed email draft",
      summary: subject || "Draft evidence-grounded correspondence.",
      effect:
        "No email has been drafted or sent. Select the related risk and review the recipient, tone, claims, and cited evidence first.",
      href: "/risks",
      actionLabel: "Choose related risk",
    },
    "/document": {
      title: "Proposed document review",
      summary: subject || "Find supporting documents and evidence.",
      effect:
        "No records have changed. Review only documents available within the current organization and project scope.",
      href: `/documents${subject ? `?search=${encoded}` : ""}`,
      actionLabel: "Review documents",
    },
  };
  return { command, ...proposals[command] };
}
