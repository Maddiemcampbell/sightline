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

export type OrganizationMembershipRow = Timestamped & {
  application_user_id: string;
  auth_user_id: string;
  id: string;
  avatar_url: string | null;
  last_active_at: string | null;
  organization_id: string;
  role: "owner" | "administrator" | "manager" | "contributor";
};

export type InvitationRow = {
  accepted_at: string | null;
  accepted_by_auth_user_id: string | null;
  created_at: string;
  email: string;
  expires_at: string;
  id: string;
  invited_by_membership_id: string;
  last_sent_at: string;
  organization_id: string;
  role: "administrator" | "manager" | "contributor";
  revoked_at: string | null;
  send_count: number;
  token_hash: string;
};

export type AuditLogRow = {
  actor_auth_user_id: string | null;
  actor_user_id: string | null;
  correlation_id: string;
  created_at: string;
  event_type: string;
  id: string;
  ip_address: string | null;
  metadata: Json;
  occurred_at: string;
  organization_id: string | null;
  outcome: "success" | "denied" | "failed";
  resource_id: string | null;
  resource_type: string;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type View<Row> = {
  Row: Row;
  Relationships: [];
};

type Timestamped = {
  created_at: string;
  updated_at: string;
};

type OrganizationRow = Timestamped & {
  brand_color: string;
  company_size:
    "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1001+" | null;
  created_by_auth_user_id: string | null;
  default_currency: string;
  default_document_permissions: "project_members" | "managers" | "organization";
  default_project_role: "manager" | "contributor" | "viewer";
  default_project_visibility: "private" | "organization";
  id: string;
  industry: string | null;
  deletion_requested_at: string | null;
  scheduled_deletion_at: string | null;
  privacy_status: "active" | "pending_deletion" | "archived";
  legal_hold_enabled: boolean;
  logo_url: string | null;
  name: string;
  notification_defaults: Json;
  slug: string;
  timezone: string;
};

type UserRow = Timestamped & {
  assignment_notifications_enabled: boolean;
  auth_user_id: string | null;
  delivery_timezone: string;
  email: string;
  email_delivery_enabled: boolean;
  full_name: string;
  id: string;
  mention_notifications_enabled: boolean;
  organization_id: string;
  preferred_delivery_time: string;
  role: DatabaseEnums["user_role"];
  title: string | null;
  weekly_summary_enabled: boolean;
  digest_frequency: "off" | "daily" | "weekly";
  deletion_requested_at: string | null;
  scheduled_deletion_at: string | null;
};

type ProjectRow = Timestamped & {
  address_line_1: string | null;
  city: string | null;
  contract_value_cents: number | null;
  image_url: string | null;
  projected_margin_cents: number;
  id: string;
  name: string;
  organization_id: string;
  postal_code: string | null;
  project_number: string;
  start_date: string | null;
  state_code: string | null;
  status: DatabaseEnums["project_status"];
  updated_by_user_id: string | null;
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
  updated_by_user_id: string | null;
  normalized_category_id?: string | null;
  category_mapping_source?: string | null;
  category_mapping_confidence?: number | null;
  taxonomy_version?: string | null;
  financial_exposure_assessed?: boolean;
  last_assessed_at?: string | null;
};

export type Database = {
  public: {
    Tables: {
      organizations: Table<OrganizationRow>;
      organization_memberships: Table<OrganizationMembershipRow>;
      invitations: Table<InvitationRow>;
      audit_logs: Table<AuditLogRow>;
      platform_operators: Table<
        Timestamped & {
          auth_user_id: string;
          display_name: string;
          email: string;
          id: string;
          last_login_at: string | null;
          mfa_required: boolean;
          status: "active" | "suspended";
        }
      >;
      platform_operator_permissions: Table<{
        granted_at: string;
        granted_by_operator_id: string | null;
        operator_id: string;
        permission:
          | "platform.dashboard.read"
          | "platform.organizations.read"
          | "platform.users.read"
          | "platform.audit.read"
          | "platform.jobs.read"
          | "platform.jobs.retry"
          | "platform.ai.read"
          | "platform.health.read"
          | "platform.support.read"
          | "platform.support.write"
          | "platform.flags.manage"
          | "platform.releases.read"
          | "platform.admin.manage";
      }>;
      platform_audit_logs: Table<{
        action: string;
        affected_auth_user_id: string | null;
        created_at: string;
        id: string;
        ip_address: string | null;
        metadata: Json;
        occurred_at: string;
        operator_id: string;
        organization_id: string | null;
        outcome: "success" | "denied" | "failed";
        request_id: string;
        resource_id: string | null;
        resource_type: string;
        user_agent: string | null;
      }>;
      organization_job_schedules: Table<
        Timestamped & {
          daily_brief_enabled: boolean;
          daily_brief_time: string;
          max_attempts: number;
          organization_id: string;
          portfolio_refresh_enabled: boolean;
          portfolio_refresh_time: string;
          timezone: string;
        }
      >;
      organization_job_runs: Table<
        Timestamped & {
          attempt_count: number;
          completed_at: string | null;
          correlation_id: string;
          duration_ms: number | null;
          error_message: string | null;
          id: string;
          idempotency_key: string;
          job_type: "portfolio_refresh" | "daily_executive_brief";
          max_attempts: number;
          metrics: Json;
          next_retry_at: string | null;
          organization_id: string;
          requested_by_membership_id: string | null;
          scheduled_for: string | null;
          started_at: string | null;
          status: "queued" | "running" | "succeeded" | "failed";
          trigger_source: "scheduled" | "manual" | "retry";
        }
      >;
      scheduler_job_definitions: Table<
        Timestamped & {
          job_key: string;
          display_name: string;
          description: string;
          cron_schedule: string;
          enabled: boolean;
          timeout_ms: number;
          max_retries: number;
          backoff_ms: number;
          maximum_backoff_ms: number;
          concurrency_policy: "forbid";
        }
      >;
      scheduler_job_executions: Table<
        Timestamped & {
          id: string;
          job_key: string;
          trigger_type: "scheduled" | "manual" | "retry";
          status:
            | "queued"
            | "running"
            | "succeeded"
            | "failed"
            | "retrying"
            | "timed_out"
            | "skipped"
            | "dead_lettered";
          scheduled_for: string | null;
          started_at: string | null;
          completed_at: string | null;
          duration_ms: number | null;
          attempt_number: number;
          parent_execution_id: string | null;
          root_execution_id: string | null;
          next_retry_at: string | null;
          correlation_id: string;
          safe_error_code: string | null;
          safe_error_summary: string | null;
          initiating_operator_id: string | null;
          safe_metadata: Json;
        }
      >;
      scheduler_job_locks: Table<{
        job_key: string;
        lease_token: string;
        acquired_at: string;
        lease_expires_at: string;
        execution_id: string;
      }>;
      feature_flags: Table<
        Timestamped & {
          id: string;
          flag_key: string;
          name: string;
          description: string;
          enabled: boolean;
          default_enabled: boolean;
          environments: string[];
          organization_ids: string[];
          user_ids: string[];
          rollout_percentage: number;
          created_by_operator_id: string | null;
          updated_by_operator_id: string | null;
        }
      >;
      feature_flag_changes: Table<{
        id: string;
        feature_flag_id: string;
        operator_id: string;
        change_type: "created" | "updated" | "enabled" | "disabled";
        previous_state: Json | null;
        new_state: Json;
        created_at: string;
      }>;
      feature_flag_evaluation_logs: Table<{
        id: string;
        feature_flag_id: string | null;
        flag_key: string;
        environment: string;
        organization_id: string | null;
        user_id: string | null;
        result: boolean;
        reason: string;
        correlation_id: string | null;
        created_at: string;
      }>;
      releases: Table<
        Timestamped & {
          id: string;
          release_identifier: string;
          application_version: string;
          environment: string;
          status:
            "planned" | "deploying" | "deployed" | "failed" | "rolled_back";
          deployed_at: string | null;
          commit_sha: string | null;
          source_reference: string | null;
          deployed_by: string | null;
          release_notes: string;
          rollback_status:
            "not_rolled_back" | "rollback_pending" | "rolled_back";
          created_by_operator_id: string | null;
          updated_by_operator_id: string | null;
        }
      >;
      release_feature_flags: Table<{
        release_id: string;
        feature_flag_id: string;
        created_at: string;
      }>;
      bug_reports: Table<
        Timestamped & {
          id: string;
          organization_id: string;
          reporting_user_id: string;
          title: string;
          description: string;
          steps_to_reproduce: string | null;
          expected_behavior: string | null;
          actual_behavior: string | null;
          customer_severity: "blocking" | "major" | "minor" | "cosmetic" | null;
          relevant_route: string | null;
          relevant_feature: string | null;
          diagnostic_consent: boolean;
          application_version: string;
          environment: string;
          browser_os: string | null;
          viewport_width: number | null;
          viewport_height: number | null;
          correlation_id: string;
          client_error_reference: string | null;
          idempotency_key: string;
          status:
            | "new"
            | "triaged"
            | "in_progress"
            | "resolved"
            | "closed"
            | "duplicate"
            | "cannot_reproduce";
          assigned_operator_id: string | null;
          resolution_notes: string | null;
          related_release_id: string | null;
          external_issue_reference: string | null;
          resolved_at: string | null;
        }
      >;
      bug_report_attachments: Table<{
        id: string;
        bug_report_id: string;
        organization_id: string;
        storage_path: string;
        original_filename: string;
        mime_type: "image/jpeg" | "image/png" | "image/webp";
        size_bytes: number;
        created_at: string;
      }>;
      bug_report_internal_notes: Table<{
        id: string;
        bug_report_id: string;
        operator_id: string;
        body: string;
        created_at: string;
      }>;
      application_error_reports: Table<{
        application_user_id: string | null;
        application_version: string;
        auth_user_id: string | null;
        browser_context: Json;
        correlation_id: string;
        created_at: string;
        environment: string;
        error_message: string;
        error_name: string;
        id: string;
        occurred_at: string;
        organization_id: string | null;
        request_id: string;
        request_method: string | null;
        request_path: string | null;
        safe_metadata: Json;
        severity: "warning" | "error" | "fatal";
        source: "client" | "server" | "api" | "background_job";
        stack_trace: string | null;
        user_agent: string | null;
      }>;
      job_monitoring_alerts: Table<
        Timestamped & {
          alert_type: "execution_failed" | "repeated_failures" | "long_running";
          details: Json;
          first_detected_at: string;
          id: string;
          job_run_id: string | null;
          job_type: "portfolio_refresh" | "daily_executive_brief";
          last_detected_at: string;
          occurrence_count: number;
          organization_id: string;
          recovered_at: string | null;
          severity: "warning" | "critical";
          status: "open" | "recovered";
          summary: string;
        }
      >;
      job_monitoring_alert_events: Table<{
        alert_id: string;
        channel: string | null;
        created_at: string;
        details: Json;
        event_type:
          | "opened"
          | "repeated"
          | "recovered"
          | "channel_dispatched"
          | "channel_failed";
        id: string;
        occurred_at: string;
        organization_id: string;
      }>;
      organization_data_exports: Table<{
        artifact_mime_type: string | null;
        artifact_name: string | null;
        artifact_size_bytes: number | null;
        attempt_count: number;
        checksum_sha256: string | null;
        completed_at: string | null;
        expired_at: string | null;
        expires_at: string | null;
        export_format: "csv" | "json" | "zip";
        failure_code: string | null;
        id: string;
        manifest: Json;
        next_retry_at: string | null;
        organization_id: string;
        processing_started_at: string | null;
        requested_at: string;
        requested_by_auth_user_id: string | null;
        requested_by_email: string;
        requested_by_membership_id: string | null;
        requested_by_name: string;
        schedule_id: string | null;
        schedule_occurrence_key: string | null;
        status:
          "queued" | "processing" | "retrying" | "ready" | "failed" | "expired";
        storage_path: string | null;
        updated_at: string;
      }>;
      organization_data_export_schedules: Table<{
        cadence: "daily" | "weekly" | "monthly";
        configured_by_auth_user_id: string | null;
        configured_by_email: string;
        configured_by_membership_id: string | null;
        configured_by_name: string;
        created_at: string;
        day_of_month: number;
        enabled: boolean;
        export_format: "csv" | "json" | "zip";
        id: string;
        local_time: string;
        organization_id: string;
        timezone: string;
        updated_at: string;
        weekday: number;
      }>;
      portfolio_observations: Table<{
        affected_project_ids: string[];
        algorithm_version: string;
        business_impact_estimate_cents: number | null;
        business_impact_explanation: string;
        confidence_score: number;
        created_at: string;
        first_observed_at: string;
        id: string;
        last_observed_at: string;
        observation_key: string;
        observation_type:
          | "documentation_gap"
          | "vendor_concentration"
          | "recurring_risk"
          | "overdue_actions";
        organization_id: string;
        recommended_next_step: string;
        status: "active" | "superseded";
        summary: string;
        supporting_evidence: Json;
        title: string;
        updated_at: string;
      }>;
      risk_relationships: Table<{
        algorithm_version: string;
        confidence_score: number;
        created_at: string;
        created_by_user_id: string | null;
        id: string;
        organization_id: string;
        relationship_type:
          | "duplicate"
          | "caused_by"
          | "contributes_to"
          | "blocks"
          | "same_vendor"
          | "same_subcontractor"
          | "same_document"
          | "same_project_phase"
          | "same_root_cause";
        source: "deterministic" | "human";
        source_risk_id: string;
        supporting_evidence: Json;
        target_risk_id: string;
        updated_at: string;
      }>;
      project_memberships: Table<{
        created_at: string;
        created_by_membership_id: string | null;
        id: string;
        last_active_at: string | null;
        organization_id: string;
        organization_membership_id: string;
        project_id: string;
        role: "owner" | "manager" | "contributor" | "viewer";
        updated_at: string;
      }>;
      project_invitations: Table<{
        accepted_at: string | null;
        accepted_by_membership_id: string | null;
        created_at: string;
        email: string;
        expires_at: string;
        id: string;
        invited_by_membership_id: string;
        last_sent_at: string;
        organization_id: string;
        project_id: string;
        revoked_at: string | null;
        role: "owner" | "manager" | "contributor" | "viewer";
        send_count: number;
        token_hash: string;
      }>;
      team_activity_events: Table<{
        actor_membership_id: string | null;
        created_at: string;
        event_type:
          | "member_invited"
          | "invitation_revoked"
          | "invitation_resent"
          | "member_removed"
          | "member_role_changed"
          | "ownership_transferred"
          | "project_members_changed";
        id: string;
        metadata: Json;
        organization_id: string;
        summary: string;
        target_membership_id: string | null;
      }>;
      notifications: Table<{
        actor_membership_id: string | null;
        body: string;
        created_at: string;
        href: string | null;
        id: string;
        notification_type:
          | "mention"
          | "assignment"
          | "role_change"
          | "invitation"
          | "project_added"
          | "risk_assigned"
          | "action_completed"
          | "data_export_ready"
          | "data_export_failed"
          | "background_job_failed";
        organization_id: string;
        payload: Json;
        read_at: string | null;
        recipient_membership_id: string | null;
        title: string;
        updated_at: string;
      }>;
      organization_privacy_settings: Table<{
        activity_retention_days: number;
        ai_retention_days: number;
        audit_retention_days: number;
        created_at: string;
        deleted_record_retention_days: number;
        document_retention_days: number;
        organization_id: string;
        soft_delete_grace_days: number;
        updated_at: string;
      }>;
      privacy_deletion_requests: Table<{
        attempt_count: number;
        cancelled_at: string | null;
        completed_at: string | null;
        created_at: string;
        failure_code: string | null;
        id: string;
        last_attempt_at: string | null;
        metadata: Json;
        organization_id: string | null;
        organization_identifier_hash: string | null;
        processing_started_at: string | null;
        requested_at: string;
        requested_by_auth_user_id: string | null;
        requested_by_user_id: string | null;
        scheduled_for: string;
        scope: "user_only" | "organization_only" | "organization_all_data";
        status:
          "scheduled" | "processing" | "completed" | "cancelled" | "failed";
        target_auth_user_id: string | null;
        target_user_id: string | null;
        updated_at: string;
      }>;
      collaboration_comments: Table<{
        author_membership_id: string;
        body_markdown: string;
        created_at: string;
        deleted_at: string | null;
        deleted_by_membership_id: string | null;
        edited_at: string | null;
        id: string;
        organization_id: string;
        project_id: string;
        subject_id: string;
        subject_type: "project" | "risk" | "action" | "document";
        updated_at: string;
      }>;
      comment_revisions: Table<{
        body_markdown: string;
        comment_id: string;
        created_at: string;
        edited_by_membership_id: string;
        id: string;
        organization_id: string;
      }>;
      comment_mentions: Table<{
        comment_id: string;
        created_at: string;
        mentioned_membership_id: string;
        organization_id: string;
      }>;
      comment_reactions: Table<{
        comment_id: string;
        created_at: string;
        membership_id: string;
        organization_id: string;
        reaction: "like" | "celebrate" | "eyes" | "resolved";
      }>;
      assignment_history: Table<{
        assignee_user_id: string | null;
        assigned_by_membership_id: string;
        created_at: string;
        id: string;
        organization_id: string;
        previous_assignee_user_id: string | null;
        project_id: string;
        subject_id: string;
        subject_type: "risk" | "action";
      }>;
      resource_presence: Table<{
        created_at: string;
        id: string;
        last_viewed_at: string;
        membership_id: string;
        organization_id: string;
        project_id: string | null;
        resource_id: string;
        resource_type: "project" | "risk" | "action" | "document";
        updated_at: string;
      }>;
      users: Table<UserRow>;
      projects: Table<ProjectRow>;
      project_financials: Table<{
        actual_cost_cents: number | null;
        committed_cost_cents: number | null;
        created_at: string;
        currency_code: string;
        data_as_of_date: string | null;
        forecast_cost_to_complete_cents: number | null;
        organization_id: string;
        original_budget_cents: number | null;
        project_id: string;
        updated_at: string;
      }>;
      financial_change_orders: Table<{
        amount_cents: number;
        created_at: string;
        effective_date: string | null;
        id: string;
        organization_id: string;
        project_id: string;
        status: "approved" | "pending" | "rejected";
        title: string;
        updated_at: string;
      }>;
      financial_cash_events: Table<{
        amount_cents: number;
        confidence: "high" | "medium" | "low";
        created_at: string;
        description: string;
        direction: "inflow" | "outflow";
        expected_date: string;
        id: string;
        organization_id: string;
        project_id: string;
        source_type:
          "payment_schedule" | "invoice" | "commitment" | "forecast" | "manual";
        updated_at: string;
      }>;
      portfolio_financial_snapshots: Table<{
        active_projects: number;
        calculated_at: string;
        calculation_version: string;
        completeness:
          "complete" | "partial" | "estimated" | "missing" | "unavailable";
        created_at: string;
        currency_code: string;
        forecast_cost_cents: number | null;
        id: string;
        net_budget_variance_cents: number | null;
        organization_id: string;
        portfolio_budget_cents: number | null;
        project_metrics: Json;
        projects_missing_financial_data: number;
        projects_over_budget: number;
        projects_under_budget: number;
        snapshot_month: string;
      }>;
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
          updated_by_user_id: string | null;
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
      ai_observability_events: Table<{
        created_at: string;
        error_code: string | null;
        evidence_available_count: number | null;
        evidence_cited_count: number | null;
        id: string;
        input_tokens: number | null;
        latency_ms: number;
        model_name: string;
        operation_type:
          | "risk_analysis"
          | "email_draft"
          | "risk_question"
          | "organization_question";
        organization_id: string;
        output_tokens: number | null;
        prompt_version: string;
        provider: string;
        retrieval_candidate_count: number | null;
        retrieval_selected_count: number | null;
        source_record_id: string | null;
        status: "success" | "fallback" | "failure";
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
          review_context: Json | null;
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
      portfolio_risk_snapshots: Table<{
        id: string;
        organization_id: string;
        snapshot_month: string;
        analytics_payload: Json;
        calculation_version: string;
        taxonomy_version: string;
        ranking_version: string;
        data_quality: "complete" | "partial" | "not_assessed" | "unavailable";
        calculated_at: string;
        created_at: string;
      }>;
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
      risk_conversations: Table<{
        id: string;
        organization_id: string;
        risk_id: string;
        user_id: string;
        created_at: string;
        updated_at: string;
      }>;
      risk_conversation_messages: Table<{
        id: string;
        organization_id: string;
        conversation_id: string;
        role: "user" | "assistant";
        content: string;
        answer_status: "answered" | "unavailable" | null;
        evidence_ids: string[];
        confidence: number | null;
        missing_information: string[];
        suggested_follow_ups: string[];
        provider: string | null;
        model_name: string | null;
        prompt_version: string | null;
        latency_ms: number | null;
        input_tokens: number | null;
        output_tokens: number | null;
        total_tokens: number | null;
        created_at: string;
      }>;
      risk_answer_feedback: Table<{
        id: string;
        organization_id: string;
        message_id: string;
        user_id: string;
        rating: "helpful" | "not_helpful" | "incorrect";
        created_at: string;
        updated_at: string;
      }>;
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
          updated_by_user_id: string | null;
        }
      >;
      risk_resolutions: Table<{
        completed_action_ids: string[];
        created_at: string;
        estimated_loss_avoided_cents: number;
        exposure_before_cents: number;
        final_owner_user_id: string;
        id: string;
        initial_prediction: Json;
        internal_notes: string | null;
        organization_id: string;
        prediction_accurate: boolean;
        realized_impact_cents: number | null;
        resolution_type:
          | "prevented"
          | "mitigated"
          | "accepted"
          | "transferred"
          | "expired"
          | "false_positive"
          | "duplicate"
          | "no_longer_relevant"
          | "other";
        remaining_exposure_cents: number;
        reopen_reason: string | null;
        reopened_at: string | null;
        resolved_at: string;
        resolved_by_user_id: string;
        resolved_date: string;
        risk_id: string;
        summary: string;
        warning_useful: boolean;
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
    Views: {
      platform_customer_health: View<{
        account_status: "active" | "pending_deletion" | "archived";
        activity_events_30d: number;
        adopted_feature_count: number;
        available_feature_count: number;
        created_at: string;
        feature_adoption_percent: number;
        health_rank: number;
        health_status: "healthy" | "watch" | "needs_attention";
        id: string;
        job_failures_30d: number;
        last_activity_at: string | null;
        last_job_failure_at: string | null;
        last_login_at: string | null;
        name: string;
        onboarding_completion_percent: number;
        slug: string;
      }>;
      platform_organization_directory: View<{
        account_status: "active" | "pending_deletion" | "archived";
        active_project_count: number;
        created_at: string;
        failed_ai_count: number;
        failed_delivery_count: number;
        failed_export_count: number;
        failed_job_count: number;
        id: string;
        last_activity_at: string | null;
        member_count: number;
        name: string;
        slug: string;
        storage_bytes: number;
        timezone: string;
      }>;
      platform_user_directory: View<{
        account_status: "active" | "unverified" | "suspended" | "deleted";
        auth_provider: string;
        created_at: string;
        email: string | null;
        email_confirmed_at: string | null;
        full_name: string;
        id: string;
        last_activity_at: string | null;
        last_sign_in_at: string | null;
        membership_count: number;
        mfa_enabled: boolean;
        organization_names: string[];
      }>;
    };
    Functions: {
      create_organization_for_user: {
        Args: {
          organization_name: string;
          organization_slug: string;
          principal_auth_user_id: string;
          principal_email: string;
          principal_full_name: string;
        };
        Returns: string;
      };
      accept_organization_invitation: {
        Args: {
          invitation_token_hash: string;
          principal_auth_user_id: string;
          principal_email: string;
          principal_full_name: string;
        };
        Returns: string;
      };
      leave_organization: {
        Args: {
          target_membership_id: string;
          principal_auth_user_id: string;
        };
        Returns: undefined;
      };
      transfer_organization_ownership: {
        Args: {
          target_organization_id: string;
          actor_membership_id: string;
          target_membership_id: string;
        };
        Returns: undefined;
      };
      claim_due_privacy_requests: {
        Args: { batch_size?: number };
        Returns: Database["public"]["Tables"]["privacy_deletion_requests"]["Row"][];
      };
      purge_expired_organization_data: {
        Args: { target_organization_id: string };
        Returns: Json;
      };
      claim_organization_data_exports: {
        Args: { batch_size?: number };
        Returns: Database["public"]["Tables"]["organization_data_exports"]["Row"][];
      };
      acquire_scheduler_job_lock: {
        Args: {
          requested_job_key: string;
          requested_execution_id: string;
          requested_lease_token: string;
          requested_now: string;
          requested_lease_expires_at: string;
        };
        Returns: boolean;
      };
      release_scheduler_job_lock: {
        Args: {
          requested_job_key: string;
          requested_lease_token: string;
        };
        Returns: boolean;
      };
      list_portfolio_projects_page: {
        Args: {
          requested_organization_id: string;
          search_query?: string;
          stage_filter?: string;
          sort_key?: string;
          page_size?: number;
          page_offset?: number;
        };
        Returns: Json;
      };
      list_portfolio_risks_page: {
        Args: {
          requested_organization_id: string;
          view_filter?: string;
          search_query?: string;
          category_filter?: string;
          severity_filter?: string;
          status_filter?: string;
          project_filter?: string;
          due_filter?: string;
          sort_key?: string;
          page_size?: number;
          page_offset?: number;
        };
        Returns: Json;
      };
      get_resolution_value_summary: {
        Args: {
          requested_organization_id: string;
        };
        Returns: Json;
      };
      get_dashboard_portfolio_aggregates: {
        Args: {
          requested_organization_id: string;
          requested_now?: string;
        };
        Returns: Json;
      };
    };
    Enums: DatabaseEnums;
    CompositeTypes: Record<never, never>;
  };
};
