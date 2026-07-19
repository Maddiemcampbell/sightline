import type { Database, Json } from "@/lib/supabase/database.types";

export type { Json };
type Tables = Database["public"]["Tables"];
export type BriefItemRow = Tables["brief_items"]["Row"];
export type DailyBriefRow = Tables["daily_briefs"]["Row"];
export type DocumentRow = Tables["documents"]["Row"];
export type IntegrationSourceRow = Tables["integration_sources"]["Row"];
export type OrganizationRow = Tables["organizations"]["Row"];
export type ProjectRow = Tables["projects"]["Row"];
export type RecommendedActionRow = Tables["recommended_actions"]["Row"];
export type RiskActivityRow = Tables["risk_activities"]["Row"];
export type RiskEvidenceRow = Tables["risk_evidence"]["Row"];
export type RiskRow = Tables["risks"]["Row"];
export type UserRow = Tables["users"]["Row"];
export type VendorRow = Tables["vendors"]["Row"];
