export type Json =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: Json | undefined }
  | readonly Json[];

export type DatabaseEnums = {
  ai_review_status: "pending" | "approved" | "rejected";
  action_status:
    "suggested" | "accepted" | "in_progress" | "completed" | "dismissed";
  activity_type:
    | "risk_detected"
    | "risk_acknowledged"
    | "risk_updated"
    | "status_changed"
    | "severity_changed"
    | "owner_assigned"
    | "due_date_changed"
    | "action_suggested"
    | "action_accepted"
    | "action_started"
    | "action_completed"
    | "action_dismissed"
    | "evidence_added"
    | "document_uploaded"
    | "email_drafted"
    | "email_marked_sent"
    | "comment_added"
    | "risk_resolved"
    | "risk_reopened"
    | "system_analysis_completed"
    | "created"
    | "assigned"
    | "commented"
    | "action_updated"
    | "resolved"
    | "dismissed";
  brief_status: "draft" | "published";
  document_type:
    | "contract"
    | "insurance"
    | "daily_log"
    | "rfi"
    | "schedule"
    | "change_order"
    | "incident_report"
    | "safety"
    | "financial"
    | "other";
  document_processing_status: "pending" | "ready" | "failed";
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
  delivery_timezone: string;
  email: string;
  email_delivery_enabled: boolean;
  full_name: string;
  id: string;
  organization_id: string;
  preferred_delivery_time: string;
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
  detection_key: string | null;
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
          archived_at: string | null;
          document_date: string | null;
          document_type: DatabaseEnums["document_type"];
          external_id: string | null;
          id: string;
          integration_source_id: string | null;
          mime_type: string | null;
          name: string;
          organization_id: string;
          original_filename: string | null;
          processing_status: DatabaseEnums["document_processing_status"];
          project_id: string | null;
          size_bytes: number | null;
          storage_path: string | null;
          vendor_id: string | null;
        }
      >;
      document_extracted_fields: Table<
        Timestamped & {
          document_id: string;
          extracted_at: string;
          field_key: string;
          field_value: Json;
          id: string;
          organization_id: string;
        }
      >;
      project_detection_settings: Table<
        Timestamped & {
          concrete_temperature_threshold_f: number;
          organization_id: string;
          project_id: string;
        }
      >;
      detection_runs: Table<{
        completed_at: string | null;
        created_at: string;
        error_message: string | null;
        id: string;
        organization_id: string;
        risks_created: number;
        risks_updated: number;
        rule_results: Json;
        started_at: string;
        status: "running" | "complete" | "failed";
        trigger_source: "manual" | "scheduled";
      }>;
      ai_analysis_runs: Table<{
        created_at: string;
        error_message: string | null;
        id: string;
        input_snapshot: Json;
        input_tokens: number | null;
        latency_ms: number;
        model_name: string;
        organization_id: string;
        output_snapshot: Json | null;
        output_tokens: number | null;
        project_id: string | null;
        prompt_version: string;
        provider: string;
        status: "complete" | "failed" | "fallback";
        total_tokens: number | null;
      }>;
      ai_risk_suggestions: Table<
        Timestamped & {
          activated_risk_id: string | null;
          analysis_run_id: string;
          id: string;
          organization_id: string;
          project_id: string | null;
          review_note: string | null;
          review_status: DatabaseEnums["ai_review_status"];
          reviewed_at: string | null;
          reviewed_by_user_id: string | null;
          suggested_risk: Json;
        }
      >;
      daily_brief_deliveries: Table<
        Timestamped & {
          attempt_count: number;
          daily_brief_id: string;
          delivery_kind: "scheduled" | "test";
          error_message: string | null;
          id: string;
          idempotency_key: string;
          last_attempt_at: string | null;
          next_retry_at: string | null;
          organization_id: string;
          provider: string;
          provider_message_id: string | null;
          recipient_email: string;
          sent_at: string | null;
          status: "pending" | "sending" | "sent" | "failed";
          user_id: string;
        }
      >;
      document_activities: Table<{
        activity_type: "uploaded" | "edited" | "archived";
        actor_user_id: string | null;
        created_at: string;
        document_id: string;
        id: string;
        metadata: Json;
        note: string;
        occurred_at: string;
        organization_id: string;
      }>;
      risks: Table<RiskRow>;
      risk_evidence: Table<{
        created_at: string;
        document_id: string | null;
        detection_key: string | null;
        evidence_type:
          | "document_excerpt"
          | "contract_clause"
          | "insurance_expiration"
          | "daily_log_entry"
          | "weather_event"
          | "schedule_event"
          | "project_metadata"
          | "historical_risk"
          | "manual_note"
          | "system_rule";
        excerpt: string;
        id: string;
        integration_source_id: string | null;
        occurred_at: string;
        organization_id: string;
        page_number: number | null;
        line_start: number | null;
        line_end: number | null;
        relevance_score: number;
        risk_id: string;
        source_label: string;
        source_location: string | null;
        support_type: "direct" | "inferred" | "assumption";
        title: string;
        why_it_matters: string;
      }>;
      risk_email_drafts: Table<
        Timestamped & {
          id: string;
          organization_id: string;
          risk_id: string;
          recommended_action_id: string | null;
          created_by_user_id: string;
          recipient_user_id: string | null;
          recipient_vendor_id: string | null;
          recipient_name: string | null;
          recipient_email: string | null;
          intended_recipient_role: string;
          desired_tone: "concise" | "collaborative" | "firm" | "formal";
          suggested_urgency: "routine" | "soon" | "urgent";
          subject: string;
          body: string;
          evidence_ids: string[];
          generation_source: "ai" | "deterministic_fallback";
          provider: string;
          model_name: string;
          prompt_version: string;
          latency_ms: number;
          input_tokens: number | null;
          output_tokens: number | null;
          total_tokens: number | null;
          status: "draft" | "manually_sent";
          manually_sent_at: string | null;
          manually_sent_by_user_id: string | null;
        }
      >;
      recommended_actions: Table<
        Timestamped & {
          owner_user_id: string | null;
          completed_at: string | null;
          dismissed_at: string | null;
          dismissal_reason: string | null;
          description: string;
          detection_key: string | null;
          due_at: string | null;
          id: string;
          organization_id: string;
          risk_id: string;
          status: DatabaseEnums["action_status"];
          priority: "low" | "normal" | "high" | "urgent";
          action_type:
            | "email"
            | "review_document"
            | "contact_vendor"
            | "notify_team"
            | "schedule_meeting"
            | "open_rfi"
            | "request_document"
            | "update_schedule"
            | "add_mitigation"
            | "other";
          created_by_user_id: string;
          source: "human" | "deterministic_rule" | "ai_suggestion";
          title: string;
        }
      >;
      risk_resolutions: Table<{
        created_at: string;
        id: string;
        organization_id: string;
        realized_impact_cents: number | null;
        resolution_type:
          "mitigated" | "avoided" | "accepted" | "realized" | "unknown";
        resolved_at: string;
        resolved_by_user_id: string;
        risk_id: string;
        summary: string;
      }>;
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
        actor_type: "user" | "system" | "ai" | "integration";
        actor_user_id: string | null;
        created_at: string;
        from_status: DatabaseEnums["risk_status"] | null;
        id: string;
        metadata: Json;
        summary: string;
        mentioned_user_ids: string[];
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
