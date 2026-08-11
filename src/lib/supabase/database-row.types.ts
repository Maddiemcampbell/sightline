import type { Database, Json } from "@/lib/supabase/database.types";

export type { Json };
type Tables = Database["public"]["Tables"];
export type AiAnalysisRunRow = Tables["ai_analysis_runs"]["Row"];
export type AiRiskSuggestionRow = Tables["ai_risk_suggestions"]["Row"];
export type BriefItemRow = Tables["brief_items"]["Row"];
export type DailyBriefRow = Tables["daily_briefs"]["Row"];
export type DocumentRow = Tables["documents"]["Row"];
export type ExceptionAlertRow = Tables["exception_alerts"]["Row"];
export type ExceptionAlertRuleRow = Tables["exception_alert_rules"]["Row"];
export type DocumentActivityRow = Tables["document_activities"]["Row"];
export type IntegrationSourceRow = Tables["integration_sources"]["Row"];
export type OrganizationRow = Tables["organizations"]["Row"];
export type ProjectRow = Tables["projects"]["Row"];
export type ProjectFinancialRow = Tables["project_financials"]["Row"];
export type FinancialChangeOrderRow = Tables["financial_change_orders"]["Row"];
export type FinancialCashEventRow = Tables["financial_cash_events"]["Row"];
export type PortfolioFinancialSnapshotRow =
  Tables["portfolio_financial_snapshots"]["Row"];
export type RecommendedActionRow = Tables["recommended_actions"]["Row"];
export type MeetingRow = Tables["meetings"]["Row"];
export type MeetingDecisionRow = Tables["meeting_decisions"]["Row"];
export type MeetingFollowUpRow = Tables["meeting_follow_ups"]["Row"];
export type RiskActivityRow = Tables["risk_activities"]["Row"];
export type RiskEvidenceRow = Tables["risk_evidence"]["Row"];
export type RiskEmailDraftRow = Tables["risk_email_drafts"]["Row"];
export type CommitmentFollowUpRow = Tables["commitment_follow_ups"]["Row"];
export type RiskConversationRow = Tables["risk_conversations"]["Row"];
export type RiskConversationMessageRow =
  Tables["risk_conversation_messages"]["Row"];
export type RiskRow = Tables["risks"]["Row"];
export type RiskResolutionRow = Tables["risk_resolutions"]["Row"];
export type UserRow = Tables["users"]["Row"];
export type VendorRow = Tables["vendors"]["Row"];
