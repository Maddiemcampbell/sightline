import type { OrganizationCitation } from "@/domain/ai/organization-question";
import type { AdvisorMode } from "@/features/workspace/types";

export type SharedAskMessage = Readonly<{
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: readonly OrganizationCitation[];
  confidence: number | null;
  missingInformation: readonly string[];
  suggestedFollowUps: readonly string[];
  routedAdvisorMode?: Exclude<AdvisorMode, "auto"> | null;
  workflowProposal?: AskWorkflowProposal | null;
}>;

export type AskWorkflowProposal = Readonly<{
  id: string;
  command:
    "/action" | "/meeting" | "/deck" | "/report" | "/email" | "/document";
  status: "suggested" | "ready_for_review" | "approved" | "created" | "failed";
  title: string;
  summary: string;
  effect: string;
  href: string;
  actionLabel: string;
  items: readonly AskWorkflowActionItem[];
}>;

export type AskWorkflowActionItem = Readonly<{
  id: string;
  selected: boolean;
  status: "suggested" | "approved" | "created" | "failed";
  title: string;
  description: string;
  riskId: string;
  riskTitle: string;
  ownerUserId: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  dueDate: string;
  evidenceTitle: string | null;
  evidenceHref: string | null;
  createdActionId: string | null;
  error: string | null;
}>;

export type SharedAskConversation = Readonly<{
  id: string;
  title: string;
  updatedAt: string;
  advisorMode: AdvisorMode;
  selectedProjectId: string;
  messages: readonly SharedAskMessage[];
}>;
