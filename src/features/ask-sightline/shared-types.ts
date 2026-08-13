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
    | "/action"
    | "/meeting"
    | "/deck"
    | "/report"
    | "/email"
    | "/document"
    | "/scenario";
  status: "suggested" | "ready_for_review" | "approved" | "created" | "failed";
  title: string;
  summary: string;
  effect: string;
  href: string;
  actionLabel: string;
  items: readonly AskWorkflowActionItem[];
  configuration?: AskWorkflowConfiguration;
  createdHref?: string | null;
}>;

export type AskWorkflowConfiguration =
  | Readonly<{
      kind: "meeting";
      title: string;
      meetingType:
        | "weekly_executive_review"
        | "monthly_portfolio_review"
        | "project_owner_meeting"
        | "lender_board_update"
        | "risk_committee_briefing";
      startsAt: string;
      projectIds: readonly string[];
      agendaPreview: readonly string[];
    }>
  | Readonly<{
      kind: "email";
      riskId: string;
      recipientRole: string;
      tone: "concise" | "collaborative" | "firm" | "formal";
      urgency: "routine" | "soon" | "urgent";
      purpose: "initial_request" | "reminder" | "escalation" | "status_update";
      length: "concise" | "standard" | "detailed";
      subjectPreview: string;
      bodyPreview: string;
    }>
  | Readonly<{
      kind: "deck" | "report";
      template: string;
      projectIds: readonly string[];
      sections: readonly string[];
      readinessWarnings: readonly string[];
    }>
  | Readonly<{
      kind: "document";
      search: string;
    }>
  | Readonly<{
      kind: "scenario";
      name: string;
      projectId: string;
      assumption:
        | "reject_pending_change_orders"
        | "cost_to_complete_increase"
        | "completion_delay";
      costIncreasePercent: number;
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
