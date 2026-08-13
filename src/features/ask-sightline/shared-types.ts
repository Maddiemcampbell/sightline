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
  command:
    "/action" | "/meeting" | "/deck" | "/report" | "/email" | "/document";
  title: string;
  summary: string;
  effect: string;
  href: string;
  actionLabel: string;
}>;

export type SharedAskConversation = Readonly<{
  id: string;
  title: string;
  updatedAt: string;
  messages: readonly SharedAskMessage[];
}>;
