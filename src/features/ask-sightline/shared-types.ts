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
}>;

export type SharedAskConversation = Readonly<{
  id: string;
  title: string;
  updatedAt: string;
  messages: readonly SharedAskMessage[];
}>;
