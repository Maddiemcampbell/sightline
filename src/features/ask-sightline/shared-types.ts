import type { OrganizationCitation } from "@/domain/ai/organization-question";

export type SharedAskMessage = Readonly<{
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: readonly OrganizationCitation[];
  confidence: number | null;
  missingInformation: readonly string[];
  suggestedFollowUps: readonly string[];
}>;

export type SharedAskConversation = Readonly<{
  id: string;
  title: string;
  updatedAt: string;
  messages: readonly SharedAskMessage[];
}>;
