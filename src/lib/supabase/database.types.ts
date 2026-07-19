export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export type DatabaseEnums = {
  action_status: "open" | "in_progress" | "complete" | "dismissed";
  activity_type:
    | "created"
    | "status_changed"
    | "assigned"
    | "commented"
    | "evidence_added"
    | "action_updated"
    | "resolved"
    | "dismissed";
  brief_status: "draft" | "published";
  document_type:
    | "contract"
    | "insurance"
    | "daily_log"
    | "schedule"
    | "change_order"
    | "safety"
    | "financial"
    | "other";
  integration_provider:
    "manual" | "procore" | "autodesk" | "email" | "sharepoint" | "other";
  project_status: "planning" | "active" | "on_hold" | "complete" | "cancelled";
  risk_category:
    | "insurance"
    | "schedule"
    | "documentation"
    | "contract"
    | "safety"
    | "financial"
    | "vendor"
    | "weather"
    | "other";
  risk_severity: "low" | "medium" | "high" | "critical";
  risk_status:
    "monitoring" | "action_needed" | "in_progress" | "resolved" | "dismissed";
  user_role: "executive" | "operations" | "project_manager" | "admin";
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

type OrganizationRow = Timestamped & {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

type UserRow = Timestamped & {
  auth_user_id: string | null;
  email: string;
  full_name: string;
  id: string;
  organization_id: string;
  role: DatabaseEnums["user_role"];
  title: string | null;
};

type ProjectRow = Timestamped & {
  address_line_1: string | null;
  city: string | null;
  contract_value_cents: number | null;
  projected_margin_cents: number;
  id: string;
  name: string;
  organization_id: string;
  postal_code: string | null;
  project_number: string;
  start_date: string | null;
  state_code: string | null;
  status: DatabaseEnums["project_status"];
  target_completion_date: string | null;
};

type VendorRow = Timestamped & {
  contact_email: string | null;
  contact_name: string | null;
  id: string;
  name: string;
  organization_id: string;
  trade: string | null;
};

type RiskRow = Timestamped & {
  assigned_user_id: string | null;
  category: DatabaseEnums["risk_category"];
  confidence_score: number;
  detected_at: string;
  due_at: string | null;
  estimated_margin_impact_cents: number;
  id: string;
  organization_id: string;
  potential_exposure_cents: number;
  project_id: string | null;
  resolved_at: string | null;
  severity: DatabaseEnums["risk_severity"];
  status: DatabaseEnums["risk_status"];
  summary: string;
  title: string;
  vendor_id: string | null;
  why_it_matters: string;
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<OrganizationRow>;
      users: Table<UserRow>;
      projects: Table<ProjectRow>;
      vendors: Table<VendorRow>;
      project_vendors: Table<{
        created_at: string;
        organization_id: string;
        project_id: string;
        scope_of_work: string | null;
        vendor_id: string;
      }>;
      integration_sources: Table<
        Timestamped & {
          external_account_id: string | null;
          id: string;
          is_active: boolean;
          last_synced_at: string | null;
          name: string;
          organization_id: string;
          provider: DatabaseEnums["integration_provider"];
        }
      >;
      documents: Table<
        Timestamped & {
          document_date: string | null;
          document_type: DatabaseEnums["document_type"];
          external_id: string | null;
          id: string;
          integration_source_id: string | null;
          name: string;
          organization_id: string;
          project_id: string | null;
          storage_path: string | null;
          vendor_id: string | null;
        }
      >;
      risks: Table<RiskRow>;
      risk_evidence: Table<{
        created_at: string;
        description: string;
        document_id: string | null;
        id: string;
        integration_source_id: string | null;
        observed_at: string;
        organization_id: string;
        risk_id: string;
        source_excerpt: string | null;
        title: string;
      }>;
      recommended_actions: Table<
        Timestamped & {
          assigned_user_id: string | null;
          completed_at: string | null;
          description: string;
          due_at: string | null;
          id: string;
          organization_id: string;
          risk_id: string;
          status: DatabaseEnums["action_status"];
          title: string;
        }
      >;
      daily_briefs: Table<
        Timestamped & {
          brief_date: string;
          headline: string;
          id: string;
          introduction: string;
          organization_id: string;
          published_at: string | null;
          status: DatabaseEnums["brief_status"];
        }
      >;
      brief_items: Table<{
        created_at: string;
        daily_brief_id: string;
        headline: string;
        id: string;
        organization_id: string;
        priority: number;
        recommended_next_step: string;
        risk_id: string;
        summary: string;
      }>;
      risk_activities: Table<{
        activity_type: DatabaseEnums["activity_type"];
        actor_user_id: string | null;
        created_at: string;
        from_status: DatabaseEnums["risk_status"] | null;
        id: string;
        metadata: Json;
        note: string | null;
        occurred_at: string;
        organization_id: string;
        risk_id: string;
        to_status: DatabaseEnums["risk_status"] | null;
      }>;
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: DatabaseEnums;
    CompositeTypes: Record<never, never>;
  };
};
