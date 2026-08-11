export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_analysis_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_snapshot: Json
          input_tokens: number | null
          latency_ms: number
          model_name: string
          organization_id: string
          output_snapshot: Json | null
          output_tokens: number | null
          project_id: string | null
          prompt_version: string
          provider: string
          status: string
          total_tokens: number | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_snapshot: Json
          input_tokens?: number | null
          latency_ms: number
          model_name: string
          organization_id: string
          output_snapshot?: Json | null
          output_tokens?: number | null
          project_id?: string | null
          prompt_version: string
          provider: string
          status: string
          total_tokens?: number | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_snapshot?: Json
          input_tokens?: number | null
          latency_ms?: number
          model_name?: string
          organization_id?: string
          output_snapshot?: Json | null
          output_tokens?: number | null
          project_id?: string | null
          prompt_version?: string
          provider?: string
          status?: string
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_analysis_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_observability_events: {
        Row: {
          created_at: string
          error_code: string | null
          evidence_available_count: number | null
          evidence_cited_count: number | null
          id: string
          input_tokens: number | null
          latency_ms: number
          model_name: string
          operation_type: string
          organization_id: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          retrieval_candidate_count: number | null
          retrieval_selected_count: number | null
          source_record_id: string | null
          status: string
          total_tokens: number | null
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          evidence_available_count?: number | null
          evidence_cited_count?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms: number
          model_name: string
          operation_type: string
          organization_id: string
          output_tokens?: number | null
          prompt_version: string
          provider: string
          retrieval_candidate_count?: number | null
          retrieval_selected_count?: number | null
          source_record_id?: string | null
          status: string
          total_tokens?: number | null
        }
        Update: {
          created_at?: string
          error_code?: string | null
          evidence_available_count?: number | null
          evidence_cited_count?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number
          model_name?: string
          operation_type?: string
          organization_id?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          retrieval_candidate_count?: number | null
          retrieval_selected_count?: number | null
          source_record_id?: string | null
          status?: string
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_observability_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_observability_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_observability_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_risk_suggestions: {
        Row: {
          activated_risk_id: string | null
          analysis_run_id: string
          created_at: string
          id: string
          organization_id: string
          project_id: string | null
          review_context: Json | null
          review_note: string | null
          review_status: Database["public"]["Enums"]["ai_review_status"]
          reviewed_at: string | null
          reviewed_by_user_id: string | null
          suggested_risk: Json
          updated_at: string
        }
        Insert: {
          activated_risk_id?: string | null
          analysis_run_id: string
          created_at?: string
          id?: string
          organization_id: string
          project_id?: string | null
          review_context?: Json | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["ai_review_status"]
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          suggested_risk: Json
          updated_at?: string
        }
        Update: {
          activated_risk_id?: string | null
          analysis_run_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          project_id?: string | null
          review_context?: Json | null
          review_note?: string | null
          review_status?: Database["public"]["Enums"]["ai_review_status"]
          reviewed_at?: string | null
          reviewed_by_user_id?: string | null
          suggested_risk?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_risk_suggestions_activated_risk_id_organization_id_fkey"
            columns: ["activated_risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_risk_suggestions_analysis_run_id_organization_id_fkey"
            columns: ["analysis_run_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "ai_analysis_runs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "ai_risk_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_risk_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_risk_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_risk_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_risk_suggestions_reviewed_by_user_id_organization_id_fkey"
            columns: ["reviewed_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      application_error_reports: {
        Row: {
          application_user_id: string | null
          application_version: string
          auth_user_id: string | null
          browser_context: Json
          correlation_id: string
          created_at: string
          environment: string
          error_message: string
          error_name: string
          id: string
          occurred_at: string
          organization_id: string | null
          request_id: string
          request_method: string | null
          request_path: string | null
          safe_metadata: Json
          severity: string
          source: string
          stack_trace: string | null
          user_agent: string | null
        }
        Insert: {
          application_user_id?: string | null
          application_version: string
          auth_user_id?: string | null
          browser_context?: Json
          correlation_id: string
          created_at?: string
          environment: string
          error_message: string
          error_name: string
          id?: string
          occurred_at: string
          organization_id?: string | null
          request_id: string
          request_method?: string | null
          request_path?: string | null
          safe_metadata?: Json
          severity?: string
          source: string
          stack_trace?: string | null
          user_agent?: string | null
        }
        Update: {
          application_user_id?: string | null
          application_version?: string
          auth_user_id?: string | null
          browser_context?: Json
          correlation_id?: string
          created_at?: string
          environment?: string
          error_message?: string
          error_name?: string
          id?: string
          occurred_at?: string
          organization_id?: string | null
          request_id?: string
          request_method?: string | null
          request_path?: string | null
          safe_metadata?: Json
          severity?: string
          source?: string
          stack_trace?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_error_reports_application_user_id_organization_fkey"
            columns: ["application_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      assignment_history: {
        Row: {
          assigned_by_membership_id: string
          assignee_user_id: string | null
          created_at: string
          id: string
          organization_id: string
          previous_assignee_user_id: string | null
          project_id: string
          subject_id: string
          subject_type: string
        }
        Insert: {
          assigned_by_membership_id: string
          assignee_user_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          previous_assignee_user_id?: string | null
          project_id: string
          subject_id: string
          subject_type: string
        }
        Update: {
          assigned_by_membership_id?: string
          assignee_user_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          previous_assignee_user_id?: string | null
          project_id?: string
          subject_id?: string
          subject_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_history_assigned_by_membership_id_organization__fkey"
            columns: ["assigned_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "assignment_history_assignee_user_id_organization_id_fkey"
            columns: ["assignee_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "assignment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_history_previous_assignee_user_id_organization__fkey"
            columns: ["previous_assignee_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "assignment_history_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_auth_user_id: string | null
          actor_user_id: string | null
          correlation_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json
          occurred_at: string
          organization_id: string | null
          outcome: string
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          actor_auth_user_id?: string | null
          actor_user_id?: string | null
          correlation_id?: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          outcome?: string
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          actor_auth_user_id?: string | null
          actor_user_id?: string | null
          correlation_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          organization_id?: string | null
          outcome?: string
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_auth_user_id_fkey"
            columns: ["actor_auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_user_id_organization_id_fkey"
            columns: ["actor_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_provider_events: {
        Row: {
          access_request_id: string | null
          correlation_id: string
          created_at: string
          event_type: string
          id: string
          occurred_at: string
          processing_status: string
          provider: string
          provider_event_id: string
          safe_metadata: Json
        }
        Insert: {
          access_request_id?: string | null
          correlation_id: string
          created_at?: string
          event_type: string
          id?: string
          occurred_at?: string
          processing_status?: string
          provider: string
          provider_event_id: string
          safe_metadata?: Json
        }
        Update: {
          access_request_id?: string | null
          correlation_id?: string
          created_at?: string
          event_type?: string
          id?: string
          occurred_at?: string
          processing_status?: string
          provider?: string
          provider_event_id?: string
          safe_metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "billing_provider_events_access_request_id_fkey"
            columns: ["access_request_id"]
            isOneToOne: false
            referencedRelation: "customer_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      brief_items: {
        Row: {
          created_at: string
          daily_brief_id: string
          headline: string
          id: string
          organization_id: string
          priority: number
          recommended_next_step: string
          risk_id: string
          summary: string
        }
        Insert: {
          created_at?: string
          daily_brief_id: string
          headline: string
          id?: string
          organization_id: string
          priority: number
          recommended_next_step: string
          risk_id: string
          summary: string
        }
        Update: {
          created_at?: string
          daily_brief_id?: string
          headline?: string
          id?: string
          organization_id?: string
          priority?: number
          recommended_next_step?: string
          risk_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "brief_items_daily_brief_id_organization_id_fkey"
            columns: ["daily_brief_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "daily_briefs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "brief_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brief_items_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      bug_report_attachments: {
        Row: {
          bug_report_id: string
          created_at: string
          id: string
          mime_type: string
          organization_id: string
          original_filename: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          bug_report_id: string
          created_at?: string
          id?: string
          mime_type: string
          organization_id: string
          original_filename: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          bug_report_id?: string
          created_at?: string
          id?: string
          mime_type?: string
          organization_id?: string
          original_filename?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_attachments_bug_report_id_organization_id_fkey"
            columns: ["bug_report_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "bug_report_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_report_internal_notes: {
        Row: {
          body: string
          bug_report_id: string
          created_at: string
          id: string
          operator_id: string
        }
        Insert: {
          body: string
          bug_report_id: string
          created_at?: string
          id?: string
          operator_id: string
        }
        Update: {
          body?: string
          bug_report_id?: string
          created_at?: string
          id?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bug_report_internal_notes_bug_report_id_fkey"
            columns: ["bug_report_id"]
            isOneToOne: false
            referencedRelation: "bug_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_report_internal_notes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          actual_behavior: string | null
          application_version: string
          assigned_operator_id: string | null
          browser_os: string | null
          client_error_reference: string | null
          correlation_id: string
          created_at: string
          customer_severity: string | null
          description: string
          diagnostic_consent: boolean
          environment: string
          expected_behavior: string | null
          external_issue_reference: string | null
          id: string
          idempotency_key: string
          organization_id: string
          related_release_id: string | null
          relevant_feature: string | null
          relevant_route: string | null
          reporting_user_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          steps_to_reproduce: string | null
          title: string
          updated_at: string
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          actual_behavior?: string | null
          application_version: string
          assigned_operator_id?: string | null
          browser_os?: string | null
          client_error_reference?: string | null
          correlation_id: string
          created_at?: string
          customer_severity?: string | null
          description: string
          diagnostic_consent?: boolean
          environment: string
          expected_behavior?: string | null
          external_issue_reference?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          related_release_id?: string | null
          relevant_feature?: string | null
          relevant_route?: string | null
          reporting_user_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          steps_to_reproduce?: string | null
          title: string
          updated_at?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          actual_behavior?: string | null
          application_version?: string
          assigned_operator_id?: string | null
          browser_os?: string | null
          client_error_reference?: string | null
          correlation_id?: string
          created_at?: string
          customer_severity?: string | null
          description?: string
          diagnostic_consent?: boolean
          environment?: string
          expected_behavior?: string | null
          external_issue_reference?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          related_release_id?: string | null
          relevant_feature?: string | null
          relevant_route?: string | null
          reporting_user_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          steps_to_reproduce?: string | null
          title?: string
          updated_at?: string
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_related_release_id_fkey"
            columns: ["related_release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_reporting_user_id_organization_id_fkey"
            columns: ["reporting_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      collaboration_comments: {
        Row: {
          author_membership_id: string
          body_markdown: string
          created_at: string
          deleted_at: string | null
          deleted_by_membership_id: string | null
          edited_at: string | null
          id: string
          organization_id: string
          project_id: string
          subject_id: string
          subject_type: string
          updated_at: string
        }
        Insert: {
          author_membership_id: string
          body_markdown: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_membership_id?: string | null
          edited_at?: string | null
          id?: string
          organization_id: string
          project_id: string
          subject_id: string
          subject_type: string
          updated_at?: string
        }
        Update: {
          author_membership_id?: string
          body_markdown?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by_membership_id?: string | null
          edited_at?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          subject_id?: string
          subject_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaboration_comments_author_membership_id_organization_i_fkey"
            columns: ["author_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "collaboration_comments_deleted_by_membership_id_organizati_fkey"
            columns: ["deleted_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "collaboration_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_comments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaboration_comments_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string
          mentioned_membership_id: string
          organization_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          mentioned_membership_id: string
          organization_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          mentioned_membership_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_organization_id_fkey"
            columns: ["comment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "collaboration_comments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_membership_id_organization_id_fkey"
            columns: ["mentioned_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          membership_id: string
          organization_id: string
          reaction: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          membership_id: string
          organization_id: string
          reaction: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          membership_id?: string
          organization_id?: string
          reaction?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_organization_id_fkey"
            columns: ["comment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "collaboration_comments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "comment_reactions_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      comment_revisions: {
        Row: {
          body_markdown: string
          comment_id: string
          created_at: string
          edited_by_membership_id: string
          id: string
          organization_id: string
        }
        Insert: {
          body_markdown: string
          comment_id: string
          created_at?: string
          edited_by_membership_id: string
          id?: string
          organization_id: string
        }
        Update: {
          body_markdown?: string
          comment_id?: string
          created_at?: string
          edited_by_membership_id?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_revisions_comment_id_organization_id_fkey"
            columns: ["comment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "collaboration_comments"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "comment_revisions_edited_by_membership_id_organization_id_fkey"
            columns: ["edited_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      customer_access_requests: {
        Row: {
          activation_consumed_at: string | null
          activation_expires_at: string | null
          activation_token_hash: string | null
          company_name: string
          company_size: string | null
          correlation_id: string
          created_at: string
          id: string
          message: string | null
          organization_id: string | null
          owner_email: string
          owner_name: string
          requested_at: string
          requested_slug: string | null
          reviewed_at: string | null
          reviewed_by_operator_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activation_consumed_at?: string | null
          activation_expires_at?: string | null
          activation_token_hash?: string | null
          company_name: string
          company_size?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string | null
          owner_email: string
          owner_name: string
          requested_at?: string
          requested_slug?: string | null
          reviewed_at?: string | null
          reviewed_by_operator_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activation_consumed_at?: string | null
          activation_expires_at?: string | null
          activation_token_hash?: string | null
          company_name?: string
          company_size?: string | null
          correlation_id?: string
          created_at?: string
          id?: string
          message?: string | null
          organization_id?: string | null
          owner_email?: string
          owner_name?: string
          requested_at?: string
          requested_slug?: string | null
          reviewed_at?: string | null
          reviewed_by_operator_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_access_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_access_requests_reviewed_by_operator_id_fkey"
            columns: ["reviewed_by_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_provisioning_attempts: {
        Row: {
          access_request_id: string
          completed_at: string | null
          correlation_id: string
          created_at: string
          failure_code: string | null
          id: string
          started_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          access_request_id: string
          completed_at?: string | null
          correlation_id: string
          created_at?: string
          failure_code?: string | null
          id?: string
          started_at?: string
          status: string
          trigger_source: string
        }
        Update: {
          access_request_id?: string
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          failure_code?: string | null
          id?: string
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_provisioning_attempts_access_request_id_fkey"
            columns: ["access_request_id"]
            isOneToOne: false
            referencedRelation: "customer_access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_brief_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          daily_brief_id: string
          delivery_kind: string
          error_message: string | null
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          next_retry_at: string | null
          organization_id: string
          provider: string
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          daily_brief_id: string
          delivery_kind: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          organization_id: string
          provider: string
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          daily_brief_id?: string
          delivery_kind?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          organization_id?: string
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_brief_deliveries_daily_brief_id_organization_id_fkey"
            columns: ["daily_brief_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "daily_briefs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "daily_brief_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_brief_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_brief_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_brief_deliveries_user_id_organization_id_fkey"
            columns: ["user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      daily_briefs: {
        Row: {
          brief_date: string
          created_at: string
          headline: string
          id: string
          introduction: string
          organization_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["brief_status"]
          updated_at: string
        }
        Insert: {
          brief_date: string
          created_at?: string
          headline: string
          id?: string
          introduction: string
          organization_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          updated_at?: string
        }
        Update: {
          brief_date?: string
          created_at?: string
          headline?: string
          id?: string
          introduction?: string
          organization_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["brief_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_briefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          organization_id: string
          risks_created: number
          risks_updated: number
          rule_results: Json
          started_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id: string
          risks_created?: number
          risks_updated?: number
          rule_results?: Json
          started_at?: string
          status: string
          trigger_source: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          risks_created?: number
          risks_updated?: number
          rule_results?: Json
          started_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "detection_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detection_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detection_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      document_activities: {
        Row: {
          activity_type: string
          actor_user_id: string | null
          created_at: string
          document_id: string
          id: string
          metadata: Json
          note: string
          occurred_at: string
          organization_id: string
        }
        Insert: {
          activity_type: string
          actor_user_id?: string | null
          created_at?: string
          document_id: string
          id?: string
          metadata?: Json
          note: string
          occurred_at?: string
          organization_id: string
        }
        Update: {
          activity_type?: string
          actor_user_id?: string | null
          created_at?: string
          document_id?: string
          id?: string
          metadata?: Json
          note?: string
          occurred_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_activities_actor_user_id_organization_id_fkey"
            columns: ["actor_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "document_activities_document_id_organization_id_fkey"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "document_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extracted_fields: {
        Row: {
          created_at: string
          document_id: string
          extracted_at: string
          field_key: string
          field_value: Json
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id: string
          extracted_at?: string
          field_key: string
          field_value: Json
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          extracted_at?: string
          field_key?: string
          field_value?: Json
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extracted_fields_document_id_organization_id_fkey"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "document_extracted_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extracted_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_extracted_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          created_at: string
          document_date: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          external_id: string | null
          id: string
          integration_source_id: string | null
          mime_type: string | null
          name: string
          organization_id: string
          original_filename: string | null
          processing_status: Database["public"]["Enums"]["document_processing_status"]
          project_id: string | null
          size_bytes: number | null
          storage_path: string | null
          updated_at: string
          updated_by_user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          external_id?: string | null
          id?: string
          integration_source_id?: string | null
          mime_type?: string | null
          name: string
          organization_id: string
          original_filename?: string | null
          processing_status?: Database["public"]["Enums"]["document_processing_status"]
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          external_id?: string | null
          id?: string
          integration_source_id?: string | null
          mime_type?: string | null
          name?: string
          organization_id?: string
          original_filename?: string | null
          processing_status?: Database["public"]["Enums"]["document_processing_status"]
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_integration_source_id_organization_id_fkey"
            columns: ["integration_source_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_sources"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_updated_by_user_id_organization_id_fkey"
            columns: ["updated_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "documents_vendor_id_organization_id_fkey"
            columns: ["vendor_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      feature_flag_changes: {
        Row: {
          change_type: string
          created_at: string
          feature_flag_id: string
          id: string
          new_state: Json
          operator_id: string
          previous_state: Json | null
        }
        Insert: {
          change_type: string
          created_at?: string
          feature_flag_id: string
          id?: string
          new_state: Json
          operator_id: string
          previous_state?: Json | null
        }
        Update: {
          change_type?: string
          created_at?: string
          feature_flag_id?: string
          id?: string
          new_state?: Json
          operator_id?: string
          previous_state?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_changes_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flag_changes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flag_evaluation_logs: {
        Row: {
          correlation_id: string | null
          created_at: string
          environment: string
          feature_flag_id: string | null
          flag_key: string
          id: string
          organization_id: string | null
          reason: string
          result: boolean
          user_id: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          environment: string
          feature_flag_id?: string | null
          flag_key: string
          id?: string
          organization_id?: string | null
          reason: string
          result: boolean
          user_id?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          environment?: string
          feature_flag_id?: string | null
          flag_key?: string
          id?: string
          organization_id?: string | null
          reason?: string
          result?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flag_evaluation_logs_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          created_by_operator_id: string | null
          default_enabled: boolean
          description: string
          enabled: boolean
          environments: string[]
          flag_key: string
          id: string
          name: string
          organization_ids: string[]
          rollout_percentage: number
          updated_at: string
          updated_by_operator_id: string | null
          user_ids: string[]
        }
        Insert: {
          created_at?: string
          created_by_operator_id?: string | null
          default_enabled?: boolean
          description?: string
          enabled?: boolean
          environments?: string[]
          flag_key: string
          id?: string
          name: string
          organization_ids?: string[]
          rollout_percentage?: number
          updated_at?: string
          updated_by_operator_id?: string | null
          user_ids?: string[]
        }
        Update: {
          created_at?: string
          created_by_operator_id?: string | null
          default_enabled?: boolean
          description?: string
          enabled?: boolean
          environments?: string[]
          flag_key?: string
          id?: string
          name?: string
          organization_ids?: string[]
          rollout_percentage?: number
          updated_at?: string
          updated_by_operator_id?: string | null
          user_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_operator_id_fkey"
            columns: ["created_by_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_updated_by_operator_id_fkey"
            columns: ["updated_by_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_attachments: {
        Row: {
          created_at: string
          feature_request_id: string
          id: string
          mime_type: string
          organization_id: string
          original_filename: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          feature_request_id: string
          id?: string
          mime_type: string
          organization_id: string
          original_filename: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          feature_request_id?: string
          id?: string
          mime_type?: string
          organization_id?: string
          original_filename?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_attachments_feature_request_id_organizatio_fkey"
            columns: ["feature_request_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "feature_request_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_internal_notes: {
        Row: {
          body: string
          created_at: string
          feature_request_id: string
          id: string
          operator_id: string
        }
        Insert: {
          body: string
          created_at?: string
          feature_request_id: string
          id?: string
          operator_id: string
        }
        Update: {
          body?: string
          created_at?: string
          feature_request_id?: string
          id?: string
          operator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_internal_notes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_internal_notes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          application_version: string
          assigned_operator_id: string | null
          browser_os: string | null
          correlation_id: string
          created_at: string
          customer_priority: string | null
          description: string
          desired_outcome: string | null
          diagnostic_consent: boolean
          environment: string
          external_issue_reference: string | null
          id: string
          idempotency_key: string
          organization_id: string
          related_release_id: string | null
          relevant_feature: string | null
          relevant_route: string | null
          reporting_user_id: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string
          title: string
          updated_at: string
          use_case: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          application_version: string
          assigned_operator_id?: string | null
          browser_os?: string | null
          correlation_id: string
          created_at?: string
          customer_priority?: string | null
          description: string
          desired_outcome?: string | null
          diagnostic_consent?: boolean
          environment: string
          external_issue_reference?: string | null
          id?: string
          idempotency_key: string
          organization_id: string
          related_release_id?: string | null
          relevant_feature?: string | null
          relevant_route?: string | null
          reporting_user_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          updated_at?: string
          use_case?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          application_version?: string
          assigned_operator_id?: string | null
          browser_os?: string | null
          correlation_id?: string
          created_at?: string
          customer_priority?: string | null
          description?: string
          desired_outcome?: string | null
          diagnostic_consent?: boolean
          environment?: string
          external_issue_reference?: string | null
          id?: string
          idempotency_key?: string
          organization_id?: string
          related_release_id?: string | null
          relevant_feature?: string | null
          relevant_route?: string | null
          reporting_user_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          use_case?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_assigned_operator_id_fkey"
            columns: ["assigned_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_related_release_id_fkey"
            columns: ["related_release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_reporting_user_id_organization_id_fkey"
            columns: ["reporting_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      financial_cash_events: {
        Row: {
          amount_cents: number
          confidence: string
          created_at: string
          description: string
          direction: string
          expected_date: string
          id: string
          organization_id: string
          project_id: string
          source_type: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          confidence: string
          created_at?: string
          description: string
          direction: string
          expected_date: string
          id?: string
          organization_id: string
          project_id: string
          source_type: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          confidence?: string
          created_at?: string
          description?: string
          direction?: string
          expected_date?: string
          id?: string
          organization_id?: string
          project_id?: string
          source_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_cash_events_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      financial_change_orders: {
        Row: {
          amount_cents: number
          created_at: string
          effective_date: string | null
          id: string
          organization_id: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          effective_date?: string | null
          id?: string
          organization_id: string
          project_id: string
          status: string
          title: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          effective_date?: string | null
          id?: string
          organization_id?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_change_orders_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          company_id: string
          company_name: string
          created_at: string
          current_error: string | null
          environment: string
          id: string
          installation_reference: string | null
          last_attempted_sync_at: string | null
          last_successful_sync_at: string | null
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          current_error?: string | null
          environment: string
          id?: string
          installation_reference?: string | null
          last_attempted_sync_at?: string | null
          last_successful_sync_at?: string | null
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          current_error?: string | null
          environment?: string
          id?: string
          installation_reference?: string | null
          last_attempted_sync_at?: string | null
          last_successful_sync_at?: string | null
          organization_id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          connection_id: string
          created_at: string
          credential_type: string
          encrypted_client_id: string
          encrypted_client_secret: string
          encryption_key_version: string
          id: string
          organization_id: string
          rotated_at: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          credential_type?: string
          encrypted_client_id: string
          encrypted_client_secret: string
          encryption_key_version?: string
          id?: string
          organization_id: string
          rotated_at?: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          credential_type?: string
          encrypted_client_id?: string
          encrypted_client_secret?: string
          encryption_key_version?: string
          id?: string
          organization_id?: string
          rotated_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "integration_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_credentials_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_external_records: {
        Row: {
          connection_id: string
          content_checksum: string | null
          created_at: string
          external_id: string
          external_updated_at: string | null
          first_observed_at: string
          id: string
          last_observed_at: string
          organization_id: string
          procore_project_id: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          resource_type: string
          sightline_project_id: string | null
          sightline_record_id: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          content_checksum?: string | null
          created_at?: string
          external_id: string
          external_updated_at?: string | null
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          organization_id: string
          procore_project_id?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          resource_type: string
          sightline_project_id?: string | null
          sightline_record_id?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          content_checksum?: string | null
          created_at?: string
          external_id?: string
          external_updated_at?: string | null
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          organization_id?: string
          procore_project_id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          resource_type?: string
          sightline_project_id?: string | null
          sightline_record_id?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_external_records_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "integration_external_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_external_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_external_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_external_records_sightline_project_id_organiza_fkey"
            columns: ["sightline_project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      integration_project_mappings: {
        Row: {
          approved_by_user_id: string | null
          connection_id: string
          created_at: string
          id: string
          last_discovered_at: string
          mapping_method: string
          mapping_status: string
          organization_id: string
          procore_company_id: string
          procore_project_id: string
          procore_project_name: string
          procore_project_number: string | null
          sightline_project_id: string | null
          updated_at: string
        }
        Insert: {
          approved_by_user_id?: string | null
          connection_id: string
          created_at?: string
          id?: string
          last_discovered_at?: string
          mapping_method?: string
          mapping_status?: string
          organization_id: string
          procore_company_id: string
          procore_project_id: string
          procore_project_name: string
          procore_project_number?: string | null
          sightline_project_id?: string | null
          updated_at?: string
        }
        Update: {
          approved_by_user_id?: string | null
          connection_id?: string
          created_at?: string
          id?: string
          last_discovered_at?: string
          mapping_method?: string
          mapping_status?: string
          organization_id?: string
          procore_company_id?: string
          procore_project_id?: string
          procore_project_name?: string
          procore_project_number?: string | null
          sightline_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_project_mappings_approved_by_user_id_organizat_fkey"
            columns: ["approved_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "integration_project_mappings_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "integration_project_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_project_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_project_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_project_mappings_sightline_project_id_organiza_fkey"
            columns: ["sightline_project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      integration_sources: {
        Row: {
          created_at: string
          external_account_id: string | null
          id: string
          is_active: boolean
          last_synced_at: string | null
          name: string
          organization_id: string
          provider: Database["public"]["Enums"]["integration_provider"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_account_id?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name: string
          organization_id: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_account_id?: string | null
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          name?: string
          organization_id?: string
          provider?: Database["public"]["Enums"]["integration_provider"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_cursors: {
        Row: {
          connection_id: string
          created_at: string
          cursor: string | null
          high_water_mark: string | null
          id: string
          last_attempted_at: string | null
          last_completed_at: string | null
          metadata: Json
          organization_id: string
          resource_type: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          cursor?: string | null
          high_water_mark?: string | null
          id?: string
          last_attempted_at?: string | null
          last_completed_at?: string | null
          metadata?: Json
          organization_id: string
          resource_type: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          cursor?: string | null
          high_water_mark?: string | null
          id?: string
          last_attempted_at?: string | null
          last_completed_at?: string | null
          metadata?: Json
          organization_id?: string
          resource_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_cursors_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "integration_sync_cursors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_cursors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_sync_cursors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_auth_user_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_membership_id: string
          last_sent_at: string
          organization_id: string
          revoked_at: string | null
          role: string
          send_count: number
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_auth_user_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by_membership_id: string
          last_sent_at?: string
          organization_id: string
          revoked_at?: string | null
          role?: string
          send_count?: number
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_auth_user_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_membership_id?: string
          last_sent_at?: string
          organization_id?: string
          revoked_at?: string | null
          role?: string
          send_count?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_auth_user_id_fkey"
            columns: ["accepted_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_membership_id_organization_id_fkey"
            columns: ["invited_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      job_monitoring_alert_events: {
        Row: {
          alert_id: string
          channel: string | null
          created_at: string
          details: Json
          event_type: string
          id: string
          occurred_at: string
          organization_id: string
        }
        Insert: {
          alert_id: string
          channel?: string | null
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          occurred_at: string
          organization_id: string
        }
        Update: {
          alert_id?: string
          channel?: string | null
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_monitoring_alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "job_monitoring_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_monitoring_alert_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_monitoring_alert_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_monitoring_alert_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      job_monitoring_alerts: {
        Row: {
          alert_type: string
          created_at: string
          details: Json
          first_detected_at: string
          id: string
          job_run_id: string | null
          job_type: string
          last_detected_at: string
          occurrence_count: number
          organization_id: string
          recovered_at: string | null
          severity: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          details?: Json
          first_detected_at: string
          id?: string
          job_run_id?: string | null
          job_type: string
          last_detected_at: string
          occurrence_count?: number
          organization_id: string
          recovered_at?: string | null
          severity: string
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          details?: Json
          first_detected_at?: string
          id?: string
          job_run_id?: string | null
          job_type?: string
          last_detected_at?: string
          occurrence_count?: number
          organization_id?: string
          recovered_at?: string | null
          severity?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_monitoring_alerts_job_run_id_organization_id_fkey"
            columns: ["job_run_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_job_runs"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "job_monitoring_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_monitoring_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_monitoring_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_decisions: {
        Row: {
          created_at: string
          id: string
          meeting_id: string
          organization_id: string
          project_id: string | null
          rationale: string | null
          recorded_by_user_id: string
          risk_id: string | null
          summary: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_id: string
          organization_id: string
          project_id?: string | null
          rationale?: string | null
          recorded_by_user_id: string
          risk_id?: string | null
          summary: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_id?: string
          organization_id?: string
          project_id?: string | null
          rationale?: string | null
          recorded_by_user_id?: string
          risk_id?: string | null
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_decisions_meeting_id_organization_id_fkey"
            columns: ["meeting_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_decisions_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_decisions_recorded_by_user_id_organization_id_fkey"
            columns: ["recorded_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_decisions_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      meeting_follow_ups: {
        Row: {
          action_id: string
          created_at: string
          meeting_id: string
          organization_id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          meeting_id: string
          organization_id: string
        }
        Update: {
          action_id?: string
          created_at?: string
          meeting_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_follow_ups_action_id_organization_id_fkey"
            columns: ["action_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "recommended_actions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_follow_ups_meeting_id_organization_id_fkey"
            columns: ["meeting_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meeting_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: Json
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          facilitator_user_id: string
          id: string
          meeting_type: string
          organization_id: string
          project_ids: string[]
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          facilitator_user_id: string
          id?: string
          meeting_type: string
          organization_id: string
          project_ids?: string[]
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          facilitator_user_id?: string
          id?: string
          meeting_type?: string
          organization_id?: string
          project_ids?: string[]
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_created_by_user_id_organization_id_fkey"
            columns: ["created_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meetings_facilitator_user_id_organization_id_fkey"
            columns: ["facilitator_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      microsoft365_consent_states: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          organization_id: string
          requested_by_user_id: string
          state_hash: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          organization_id: string
          requested_by_user_id: string
          state_hash: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          organization_id?: string
          requested_by_user_id?: string
          state_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "microsoft365_consent_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft365_consent_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft365_consent_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft365_consent_states_requested_by_user_id_organizat_fkey"
            columns: ["requested_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      microsoft365_library_mappings: {
        Row: {
          connection_id: string
          created_at: string
          delta_link: string | null
          drive_id: string
          drive_name: string
          id: string
          integration_source_id: string
          last_attempted_at: string | null
          last_completed_at: string | null
          last_error: string | null
          organization_id: string
          project_id: string | null
          selected: boolean
          site_id: string
          site_name: string
          site_url: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          delta_link?: string | null
          drive_id: string
          drive_name: string
          id?: string
          integration_source_id: string
          last_attempted_at?: string | null
          last_completed_at?: string | null
          last_error?: string | null
          organization_id: string
          project_id?: string | null
          selected?: boolean
          site_id: string
          site_name: string
          site_url: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          delta_link?: string | null
          drive_id?: string
          drive_name?: string
          id?: string
          integration_source_id?: string
          last_attempted_at?: string | null
          last_completed_at?: string | null
          last_error?: string | null
          organization_id?: string
          project_id?: string | null
          selected?: boolean
          site_id?: string
          site_name?: string
          site_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "microsoft365_library_mappings_connection_id_organization_i_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "microsoft365_library_mappings_integration_source_id_organi_fkey"
            columns: ["integration_source_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_sources"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "microsoft365_library_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft365_library_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft365_library_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "microsoft365_library_mappings_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_membership_id: string | null
          body: string
          created_at: string
          href: string | null
          id: string
          notification_type: string
          organization_id: string
          payload: Json
          read_at: string | null
          recipient_membership_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actor_membership_id?: string | null
          body: string
          created_at?: string
          href?: string | null
          id?: string
          notification_type: string
          organization_id: string
          payload?: Json
          read_at?: string | null
          recipient_membership_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actor_membership_id?: string | null
          body?: string
          created_at?: string
          href?: string | null
          id?: string
          notification_type?: string
          organization_id?: string
          payload?: Json
          read_at?: string | null
          recipient_membership_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_placeholders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_placeholders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_placeholders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_placeholders_recipient_membership_id_organiza_fkey"
            columns: ["recipient_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "notifications_actor_membership_id_organization_id_fkey"
            columns: ["actor_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_billing_accounts: {
        Row: {
          access_request_id: string
          billing_email: string
          cancelled_at: string | null
          checkout_url: string | null
          created_at: string
          current_period_end: string | null
          id: string
          organization_id: string | null
          plan_key: string
          provider: string
          provider_checkout_session_id: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          access_request_id: string
          billing_email: string
          cancelled_at?: string | null
          checkout_url?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string | null
          plan_key?: string
          provider: string
          provider_checkout_session_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_request_id?: string
          billing_email?: string
          cancelled_at?: string | null
          checkout_url?: string | null
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string | null
          plan_key?: string
          provider?: string
          provider_checkout_session_id?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_billing_accounts_access_request_id_fkey"
            columns: ["access_request_id"]
            isOneToOne: true
            referencedRelation: "customer_access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_billing_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_billing_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_billing_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_data_export_schedules: {
        Row: {
          cadence: string
          configured_by_auth_user_id: string | null
          configured_by_email: string
          configured_by_membership_id: string | null
          configured_by_name: string
          created_at: string
          day_of_month: number
          enabled: boolean
          export_format: string
          id: string
          local_time: string
          organization_id: string
          timezone: string
          updated_at: string
          weekday: number
        }
        Insert: {
          cadence?: string
          configured_by_auth_user_id?: string | null
          configured_by_email: string
          configured_by_membership_id?: string | null
          configured_by_name: string
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          export_format?: string
          id?: string
          local_time?: string
          organization_id: string
          timezone?: string
          updated_at?: string
          weekday?: number
        }
        Update: {
          cadence?: string
          configured_by_auth_user_id?: string | null
          configured_by_email?: string
          configured_by_membership_id?: string | null
          configured_by_name?: string
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          export_format?: string
          id?: string
          local_time?: string
          organization_id?: string
          timezone?: string
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_data_export_sche_configured_by_membership_id__fkey"
            columns: ["configured_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_data_export_schedu_configured_by_auth_user_id_fkey"
            columns: ["configured_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_export_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_export_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_export_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_data_exports: {
        Row: {
          artifact_mime_type: string | null
          artifact_name: string | null
          artifact_size_bytes: number | null
          attempt_count: number
          checksum_sha256: string | null
          completed_at: string | null
          expired_at: string | null
          expires_at: string | null
          export_format: string
          failure_code: string | null
          id: string
          manifest: Json
          next_retry_at: string | null
          organization_id: string
          processing_started_at: string | null
          requested_at: string
          requested_by_auth_user_id: string | null
          requested_by_email: string
          requested_by_membership_id: string | null
          requested_by_name: string
          schedule_id: string | null
          schedule_occurrence_key: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          artifact_mime_type?: string | null
          artifact_name?: string | null
          artifact_size_bytes?: number | null
          attempt_count?: number
          checksum_sha256?: string | null
          completed_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          export_format: string
          failure_code?: string | null
          id?: string
          manifest?: Json
          next_retry_at?: string | null
          organization_id: string
          processing_started_at?: string | null
          requested_at?: string
          requested_by_auth_user_id?: string | null
          requested_by_email: string
          requested_by_membership_id?: string | null
          requested_by_name: string
          schedule_id?: string | null
          schedule_occurrence_key?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          artifact_mime_type?: string | null
          artifact_name?: string | null
          artifact_size_bytes?: number | null
          attempt_count?: number
          checksum_sha256?: string | null
          completed_at?: string | null
          expired_at?: string | null
          expires_at?: string | null
          export_format?: string
          failure_code?: string | null
          id?: string
          manifest?: Json
          next_retry_at?: string | null
          organization_id?: string
          processing_started_at?: string | null
          requested_at?: string
          requested_by_auth_user_id?: string | null
          requested_by_email?: string
          requested_by_membership_id?: string | null
          requested_by_name?: string
          schedule_id?: string | null
          schedule_occurrence_key?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_data_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_exports_requested_by_auth_user_id_fkey"
            columns: ["requested_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_data_exports_requested_by_membership_id_organ_fkey"
            columns: ["requested_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_data_exports_schedule_id_organization_id_fkey"
            columns: ["schedule_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_data_export_schedules"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_job_runs: {
        Row: {
          attempt_count: number
          completed_at: string | null
          correlation_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          idempotency_key: string
          job_type: string
          max_attempts: number
          metrics: Json
          next_retry_at: string | null
          organization_id: string
          requested_by_membership_id: string | null
          scheduled_for: string | null
          started_at: string | null
          status: string
          trigger_source: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          job_type: string
          max_attempts?: number
          metrics?: Json
          next_retry_at?: string | null
          organization_id: string
          requested_by_membership_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_source: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          job_type?: string
          max_attempts?: number
          metrics?: Json
          next_retry_at?: string | null
          organization_id?: string
          requested_by_membership_id?: string | null
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_job_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_job_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_job_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_job_runs_requested_by_membership_id_organizat_fkey"
            columns: ["requested_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_job_schedules: {
        Row: {
          created_at: string
          daily_brief_enabled: boolean
          daily_brief_time: string
          max_attempts: number
          organization_id: string
          portfolio_refresh_enabled: boolean
          portfolio_refresh_time: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_brief_enabled?: boolean
          daily_brief_time?: string
          max_attempts?: number
          organization_id: string
          portfolio_refresh_enabled?: boolean
          portfolio_refresh_time?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_brief_enabled?: boolean
          daily_brief_time?: string
          max_attempts?: number
          organization_id?: string
          portfolio_refresh_enabled?: boolean
          portfolio_refresh_time?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_job_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_job_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_job_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          application_user_id: string
          auth_user_id: string
          avatar_url: string | null
          created_at: string
          id: string
          last_active_at: string | null
          organization_id: string
          role: string
          updated_at: string
        }
        Insert: {
          application_user_id: string
          auth_user_id: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          organization_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          application_user_id?: string
          auth_user_id?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          organization_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_application_user_id_organization__fkey"
            columns: ["application_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "organization_memberships_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_privacy_settings: {
        Row: {
          activity_retention_days: number
          ai_retention_days: number
          audit_retention_days: number
          created_at: string
          deleted_record_retention_days: number
          document_retention_days: number
          organization_id: string
          soft_delete_grace_days: number
          updated_at: string
        }
        Insert: {
          activity_retention_days?: number
          ai_retention_days?: number
          audit_retention_days?: number
          created_at?: string
          deleted_record_retention_days?: number
          document_retention_days?: number
          organization_id: string
          soft_delete_grace_days?: number
          updated_at?: string
        }
        Update: {
          activity_retention_days?: number
          ai_retention_days?: number
          audit_retention_days?: number
          created_at?: string
          deleted_record_retention_days?: number
          document_retention_days?: number
          organization_id?: string
          soft_delete_grace_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_privacy_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_privacy_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_privacy_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          brand_color: string
          company_size: string | null
          created_at: string
          created_by_auth_user_id: string | null
          default_currency: string
          default_document_permissions: string
          default_project_role: string
          default_project_visibility: string
          deletion_requested_at: string | null
          id: string
          industry: string | null
          legal_hold_enabled: boolean
          logo_url: string | null
          name: string
          notification_defaults: Json
          plan_key: string
          privacy_status: string
          scheduled_deletion_at: string | null
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          brand_color?: string
          company_size?: string | null
          created_at?: string
          created_by_auth_user_id?: string | null
          default_currency?: string
          default_document_permissions?: string
          default_project_role?: string
          default_project_visibility?: string
          deletion_requested_at?: string | null
          id?: string
          industry?: string | null
          legal_hold_enabled?: boolean
          logo_url?: string | null
          name: string
          notification_defaults?: Json
          plan_key?: string
          privacy_status?: string
          scheduled_deletion_at?: string | null
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          brand_color?: string
          company_size?: string | null
          created_at?: string
          created_by_auth_user_id?: string | null
          default_currency?: string
          default_document_permissions?: string
          default_project_role?: string
          default_project_visibility?: string
          deletion_requested_at?: string | null
          id?: string
          industry?: string | null
          legal_hold_enabled?: boolean
          logo_url?: string | null
          name?: string
          notification_defaults?: Json
          plan_key?: string
          privacy_status?: string
          scheduled_deletion_at?: string | null
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_auth_user_id_fkey"
            columns: ["created_by_auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: string
          affected_auth_user_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          occurred_at: string
          operator_id: string
          organization_id: string | null
          outcome: string
          request_id: string
          resource_id: string | null
          resource_type: string
          user_agent: string | null
        }
        Insert: {
          action: string
          affected_auth_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          operator_id: string
          organization_id?: string | null
          outcome?: string
          request_id: string
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          affected_auth_user_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          operator_id?: string
          organization_id?: string | null
          outcome?: string
          request_id?: string
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_operator_permissions: {
        Row: {
          granted_at: string
          granted_by_operator_id: string | null
          operator_id: string
          permission: string
        }
        Insert: {
          granted_at?: string
          granted_by_operator_id?: string | null
          operator_id: string
          permission: string
        }
        Update: {
          granted_at?: string
          granted_by_operator_id?: string | null
          operator_id?: string
          permission?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_operator_permissions_granted_by_operator_id_fkey"
            columns: ["granted_by_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_operator_permissions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_operators: {
        Row: {
          auth_user_id: string
          created_at: string
          display_name: string
          email: string
          id: string
          last_login_at: string | null
          mfa_required: boolean
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          display_name: string
          email: string
          id?: string
          last_login_at?: string | null
          mfa_required?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          display_name?: string
          email?: string
          id?: string
          last_login_at?: string | null
          mfa_required?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_financial_snapshots: {
        Row: {
          active_projects: number
          calculated_at: string
          calculation_version: string
          completeness: string
          created_at: string
          currency_code: string
          forecast_cost_cents: number | null
          id: string
          net_budget_variance_cents: number | null
          organization_id: string
          portfolio_budget_cents: number | null
          project_metrics: Json
          projects_missing_financial_data: number
          projects_over_budget: number
          projects_under_budget: number
          snapshot_month: string
        }
        Insert: {
          active_projects: number
          calculated_at: string
          calculation_version: string
          completeness: string
          created_at?: string
          currency_code: string
          forecast_cost_cents?: number | null
          id?: string
          net_budget_variance_cents?: number | null
          organization_id: string
          portfolio_budget_cents?: number | null
          project_metrics?: Json
          projects_missing_financial_data: number
          projects_over_budget: number
          projects_under_budget: number
          snapshot_month: string
        }
        Update: {
          active_projects?: number
          calculated_at?: string
          calculation_version?: string
          completeness?: string
          created_at?: string
          currency_code?: string
          forecast_cost_cents?: number | null
          id?: string
          net_budget_variance_cents?: number | null
          organization_id?: string
          portfolio_budget_cents?: number | null
          project_metrics?: Json
          projects_missing_financial_data?: number
          projects_over_budget?: number
          projects_under_budget?: number
          snapshot_month?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_observations: {
        Row: {
          affected_project_ids: string[]
          algorithm_version: string
          business_impact_estimate_cents: number | null
          business_impact_explanation: string
          confidence_score: number
          created_at: string
          first_observed_at: string
          id: string
          last_observed_at: string
          observation_key: string
          observation_type: string
          organization_id: string
          recommended_next_step: string
          status: string
          summary: string
          supporting_evidence: Json
          title: string
          updated_at: string
        }
        Insert: {
          affected_project_ids?: string[]
          algorithm_version: string
          business_impact_estimate_cents?: number | null
          business_impact_explanation: string
          confidence_score: number
          created_at?: string
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          observation_key: string
          observation_type: string
          organization_id: string
          recommended_next_step: string
          status?: string
          summary: string
          supporting_evidence?: Json
          title: string
          updated_at?: string
        }
        Update: {
          affected_project_ids?: string[]
          algorithm_version?: string
          business_impact_estimate_cents?: number | null
          business_impact_explanation?: string
          confidence_score?: number
          created_at?: string
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          observation_key?: string
          observation_type?: string
          organization_id?: string
          recommended_next_step?: string
          status?: string
          summary?: string
          supporting_evidence?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_observations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_risk_snapshots: {
        Row: {
          analytics_payload: Json
          calculated_at: string
          calculation_version: string
          created_at: string
          data_quality: string
          id: string
          organization_id: string
          ranking_version: string
          snapshot_month: string
          taxonomy_version: string
        }
        Insert: {
          analytics_payload: Json
          calculated_at?: string
          calculation_version: string
          created_at?: string
          data_quality: string
          id?: string
          organization_id: string
          ranking_version: string
          snapshot_month: string
          taxonomy_version: string
        }
        Update: {
          analytics_payload?: Json
          calculated_at?: string
          calculation_version?: string
          created_at?: string
          data_quality?: string
          id?: string
          organization_id?: string
          ranking_version?: string
          snapshot_month?: string
          taxonomy_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_risk_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_risk_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_risk_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      privacy_deletion_requests: {
        Row: {
          attempt_count: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          failure_code: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json
          organization_id: string | null
          organization_identifier_hash: string | null
          processing_started_at: string | null
          requested_at: string
          requested_by_auth_user_id: string | null
          requested_by_user_id: string | null
          scheduled_for: string
          scope: string
          status: string
          target_auth_user_id: string | null
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          failure_code?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          organization_id?: string | null
          organization_identifier_hash?: string | null
          processing_started_at?: string | null
          requested_at?: string
          requested_by_auth_user_id?: string | null
          requested_by_user_id?: string | null
          scheduled_for: string
          scope: string
          status?: string
          target_auth_user_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          failure_code?: string | null
          id?: string
          last_attempt_at?: string | null
          metadata?: Json
          organization_id?: string | null
          organization_identifier_hash?: string | null
          processing_started_at?: string | null
          requested_at?: string
          requested_by_auth_user_id?: string | null
          requested_by_user_id?: string | null
          scheduled_for?: string
          scope?: string
          status?: string
          target_auth_user_id?: string | null
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      procore_change_events: {
        Row: {
          connection_id: string
          cost_impact_cents: number | null
          created_at: string
          external_id: string
          external_updated_at: string | null
          id: string
          organization_id: string
          procore_project_id: string
          revenue_impact_cents: number | null
          sightline_project_id: string | null
          status: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          connection_id: string
          cost_impact_cents?: number | null
          created_at?: string
          external_id: string
          external_updated_at?: string | null
          id?: string
          organization_id: string
          procore_project_id: string
          revenue_impact_cents?: number | null
          sightline_project_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          connection_id?: string
          cost_impact_cents?: number | null
          created_at?: string
          external_id?: string
          external_updated_at?: string | null
          id?: string
          organization_id?: string
          procore_project_id?: string
          revenue_impact_cents?: number | null
          sightline_project_id?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procore_change_events_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "procore_change_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_change_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_change_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_change_events_sightline_project_id_organization_id_fkey"
            columns: ["sightline_project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      procore_financial_line_items: {
        Row: {
          budget_cents: number | null
          committed_cents: number | null
          connection_id: string
          cost_code: string | null
          cost_type: string | null
          created_at: string
          currency_code: string
          description: string | null
          direct_cost_cents: number | null
          external_id: string
          external_updated_at: string | null
          forecast_cents: number | null
          id: string
          organization_id: string
          procore_project_id: string
          sightline_project_id: string | null
          updated_at: string
        }
        Insert: {
          budget_cents?: number | null
          committed_cents?: number | null
          connection_id: string
          cost_code?: string | null
          cost_type?: string | null
          created_at?: string
          currency_code: string
          description?: string | null
          direct_cost_cents?: number | null
          external_id: string
          external_updated_at?: string | null
          forecast_cents?: number | null
          id?: string
          organization_id: string
          procore_project_id: string
          sightline_project_id?: string | null
          updated_at?: string
        }
        Update: {
          budget_cents?: number | null
          committed_cents?: number | null
          connection_id?: string
          cost_code?: string | null
          cost_type?: string | null
          created_at?: string
          currency_code?: string
          description?: string | null
          direct_cost_cents?: number | null
          external_id?: string
          external_updated_at?: string | null
          forecast_cents?: number | null
          id?: string
          organization_id?: string
          procore_project_id?: string
          sightline_project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procore_financial_line_items_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "procore_financial_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_line_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_line_items_sightline_project_id_organiza_fkey"
            columns: ["sightline_project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      procore_financial_signals: {
        Row: {
          baseline_value_cents: number | null
          category_key: string | null
          completeness: string
          confidence_score: number | null
          connection_id: string
          created_at: string
          current_value_cents: number | null
          exposure_cents: number | null
          exposure_percent: number | null
          first_observed_at: string
          id: string
          last_observed_at: string
          materiality: string
          organization_id: string
          sightline_project_id: string | null
          signal_type: string
          source_external_ids: string[]
          trend: string | null
          updated_at: string
        }
        Insert: {
          baseline_value_cents?: number | null
          category_key?: string | null
          completeness: string
          confidence_score?: number | null
          connection_id: string
          created_at?: string
          current_value_cents?: number | null
          exposure_cents?: number | null
          exposure_percent?: number | null
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          materiality: string
          organization_id: string
          sightline_project_id?: string | null
          signal_type: string
          source_external_ids?: string[]
          trend?: string | null
          updated_at?: string
        }
        Update: {
          baseline_value_cents?: number | null
          category_key?: string | null
          completeness?: string
          confidence_score?: number | null
          connection_id?: string
          created_at?: string
          current_value_cents?: number | null
          exposure_cents?: number | null
          exposure_percent?: number | null
          first_observed_at?: string
          id?: string
          last_observed_at?: string
          materiality?: string
          organization_id?: string
          sightline_project_id?: string | null
          signal_type?: string
          source_external_ids?: string[]
          trend?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procore_financial_signals_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "procore_financial_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_signals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_signals_sightline_project_id_organizatio_fkey"
            columns: ["sightline_project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      procore_financial_snapshots: {
        Row: {
          budget_completeness: string
          commitments_completeness: string
          committed_cost_cents: number | null
          connection_id: string
          contingency_remaining_cents: number | null
          contract_value_cents: number | null
          created_at: string
          currency_code: string
          current_budget_cents: number | null
          direct_cost_cents: number | null
          direct_costs_completeness: string
          forecast_completeness: string
          forecast_cost_at_completion_cents: number | null
          id: string
          observed_at: string
          organization_id: string
          original_budget_cents: number | null
          procore_project_id: string
          remaining_cost_cents: number | null
          revenue_completeness: string
          sightline_project_id: string | null
          source_record_count: number
        }
        Insert: {
          budget_completeness: string
          commitments_completeness: string
          committed_cost_cents?: number | null
          connection_id: string
          contingency_remaining_cents?: number | null
          contract_value_cents?: number | null
          created_at?: string
          currency_code: string
          current_budget_cents?: number | null
          direct_cost_cents?: number | null
          direct_costs_completeness: string
          forecast_completeness: string
          forecast_cost_at_completion_cents?: number | null
          id?: string
          observed_at?: string
          organization_id: string
          original_budget_cents?: number | null
          procore_project_id: string
          remaining_cost_cents?: number | null
          revenue_completeness: string
          sightline_project_id?: string | null
          source_record_count?: number
        }
        Update: {
          budget_completeness?: string
          commitments_completeness?: string
          committed_cost_cents?: number | null
          connection_id?: string
          contingency_remaining_cents?: number | null
          contract_value_cents?: number | null
          created_at?: string
          currency_code?: string
          current_budget_cents?: number | null
          direct_cost_cents?: number | null
          direct_costs_completeness?: string
          forecast_completeness?: string
          forecast_cost_at_completion_cents?: number | null
          id?: string
          observed_at?: string
          organization_id?: string
          original_budget_cents?: number | null
          procore_project_id?: string
          remaining_cost_cents?: number | null
          revenue_completeness?: string
          sightline_project_id?: string | null
          source_record_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "procore_financial_snapshots_connection_id_organization_id_fkey"
            columns: ["connection_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "procore_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_snapshots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procore_financial_snapshots_sightline_project_id_organizat_fkey"
            columns: ["sightline_project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_detection_settings: {
        Row: {
          concrete_temperature_threshold_f: number
          created_at: string
          organization_id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          concrete_temperature_threshold_f?: number
          created_at?: string
          organization_id: string
          project_id: string
          updated_at?: string
        }
        Update: {
          concrete_temperature_threshold_f?: number
          created_at?: string
          organization_id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_detection_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_detection_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_detection_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_detection_settings_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_financials: {
        Row: {
          actual_cost_cents: number | null
          committed_cost_cents: number | null
          created_at: string
          currency_code: string
          data_as_of_date: string | null
          forecast_cost_to_complete_cents: number | null
          organization_id: string
          original_budget_cents: number | null
          project_id: string
          updated_at: string
        }
        Insert: {
          actual_cost_cents?: number | null
          committed_cost_cents?: number | null
          created_at?: string
          currency_code?: string
          data_as_of_date?: string | null
          forecast_cost_to_complete_cents?: number | null
          organization_id: string
          original_budget_cents?: number | null
          project_id: string
          updated_at?: string
        }
        Update: {
          actual_cost_cents?: number | null
          committed_cost_cents?: number | null
          created_at?: string
          currency_code?: string
          data_as_of_date?: string | null
          forecast_cost_to_complete_cents?: number | null
          organization_id?: string
          original_budget_cents?: number | null
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_financials_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_membership_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_membership_id: string
          last_sent_at: string
          organization_id: string
          project_id: string
          revoked_at: string | null
          role: string
          send_count: number
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_membership_id?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by_membership_id: string
          last_sent_at?: string
          organization_id: string
          project_id: string
          revoked_at?: string | null
          role: string
          send_count?: number
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_membership_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by_membership_id?: string
          last_sent_at?: string
          organization_id?: string
          project_id?: string
          revoked_at?: string | null
          role?: string
          send_count?: number
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_invitations_accepted_by_membership_id_organization_fkey"
            columns: ["accepted_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_invitations_invited_by_membership_id_organization__fkey"
            columns: ["invited_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_invitations_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_memberships: {
        Row: {
          created_at: string
          created_by_membership_id: string | null
          id: string
          last_active_at: string | null
          organization_id: string
          organization_membership_id: string
          project_id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          last_active_at?: string | null
          organization_id: string
          organization_membership_id: string
          project_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_membership_id?: string | null
          id?: string
          last_active_at?: string | null
          organization_id?: string
          organization_membership_id?: string
          project_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_memberships_created_by_membership_id_organization__fkey"
            columns: ["created_by_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_memberships_organization_membership_id_organizatio_fkey"
            columns: ["organization_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_memberships_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      project_vendors: {
        Row: {
          created_at: string
          organization_id: string
          project_id: string
          scope_of_work: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          project_id: string
          scope_of_work?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          project_id?: string
          scope_of_work?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_vendors_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "project_vendors_vendor_id_organization_id_fkey"
            columns: ["vendor_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      projects: {
        Row: {
          address_line_1: string | null
          archived_at: string | null
          archived_by_user_id: string | null
          city: string | null
          contract_value_cents: number | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          organization_id: string
          postal_code: string | null
          project_number: string
          projected_margin_cents: number
          start_date: string | null
          state_code: string | null
          status: Database["public"]["Enums"]["project_status"]
          target_completion_date: string | null
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          address_line_1?: string | null
          archived_at?: string | null
          archived_by_user_id?: string | null
          city?: string | null
          contract_value_cents?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          organization_id: string
          postal_code?: string | null
          project_number: string
          projected_margin_cents?: number
          start_date?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_completion_date?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          address_line_1?: string | null
          archived_at?: string | null
          archived_by_user_id?: string | null
          city?: string | null
          contract_value_cents?: number | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          organization_id?: string
          postal_code?: string | null
          project_number?: string
          projected_margin_cents?: number
          start_date?: string | null
          state_code?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          target_completion_date?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_archived_by_user_id_fkey"
            columns: ["archived_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_user_id_organization_id_fkey"
            columns: ["updated_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      recommended_actions: {
        Row: {
          action_type: string
          completed_at: string | null
          created_at: string
          created_by_user_id: string
          description: string
          detection_key: string | null
          dismissal_reason: string | null
          dismissed_at: string | null
          due_at: string | null
          id: string
          organization_id: string
          owner_user_id: string | null
          priority: string
          risk_id: string
          source: string
          status: string
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id: string
          description: string
          detection_key?: string | null
          dismissal_reason?: string | null
          dismissed_at?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          owner_user_id?: string | null
          priority?: string
          risk_id: string
          source?: string
          status?: string
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          created_at?: string
          created_by_user_id?: string
          description?: string
          detection_key?: string | null
          dismissal_reason?: string | null
          dismissed_at?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          owner_user_id?: string | null
          priority?: string
          risk_id?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommended_actions_assigned_user_id_organization_id_fkey"
            columns: ["owner_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recommended_actions_created_by_organization_fkey"
            columns: ["created_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recommended_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommended_actions_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "recommended_actions_updated_by_user_id_organization_id_fkey"
            columns: ["updated_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      release_feature_flags: {
        Row: {
          created_at: string
          feature_flag_id: string
          release_id: string
        }
        Insert: {
          created_at?: string
          feature_flag_id: string
          release_id: string
        }
        Update: {
          created_at?: string
          feature_flag_id?: string
          release_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "release_feature_flags_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "release_feature_flags_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          application_version: string
          commit_sha: string | null
          created_at: string
          created_by_operator_id: string | null
          deployed_at: string | null
          deployed_by: string | null
          environment: string
          id: string
          release_identifier: string
          release_notes: string
          rollback_status: string
          source_reference: string | null
          status: string
          updated_at: string
          updated_by_operator_id: string | null
        }
        Insert: {
          application_version: string
          commit_sha?: string | null
          created_at?: string
          created_by_operator_id?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment: string
          id?: string
          release_identifier: string
          release_notes?: string
          rollback_status?: string
          source_reference?: string | null
          status: string
          updated_at?: string
          updated_by_operator_id?: string | null
        }
        Update: {
          application_version?: string
          commit_sha?: string | null
          created_at?: string
          created_by_operator_id?: string | null
          deployed_at?: string | null
          deployed_by?: string | null
          environment?: string
          id?: string
          release_identifier?: string
          release_notes?: string
          rollback_status?: string
          source_reference?: string | null
          status?: string
          updated_at?: string
          updated_by_operator_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "releases_created_by_operator_id_fkey"
            columns: ["created_by_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "releases_updated_by_operator_id_fkey"
            columns: ["updated_by_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_presence: {
        Row: {
          created_at: string
          id: string
          last_viewed_at: string
          membership_id: string
          organization_id: string
          project_id: string | null
          resource_id: string
          resource_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          membership_id: string
          organization_id: string
          project_id?: string | null
          resource_id: string
          resource_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_viewed_at?: string
          membership_id?: string
          organization_id?: string
          project_id?: string | null
          resource_id?: string
          resource_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_presence_membership_id_organization_id_fkey"
            columns: ["membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "resource_presence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_presence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_presence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_presence_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_activities: {
        Row: {
          activity_type: string
          actor_type: string
          actor_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["risk_status"] | null
          id: string
          mentioned_user_ids: string[]
          metadata: Json
          occurred_at: string
          organization_id: string
          risk_id: string
          summary: string
          to_status: Database["public"]["Enums"]["risk_status"] | null
        }
        Insert: {
          activity_type: string
          actor_type: string
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["risk_status"] | null
          id?: string
          mentioned_user_ids?: string[]
          metadata?: Json
          occurred_at?: string
          organization_id: string
          risk_id: string
          summary: string
          to_status?: Database["public"]["Enums"]["risk_status"] | null
        }
        Update: {
          activity_type?: string
          actor_type?: string
          actor_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["risk_status"] | null
          id?: string
          mentioned_user_ids?: string[]
          metadata?: Json
          occurred_at?: string
          organization_id?: string
          risk_id?: string
          summary?: string
          to_status?: Database["public"]["Enums"]["risk_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_activities_actor_user_id_organization_id_fkey"
            columns: ["actor_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_activities_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_answer_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          organization_id: string
          rating: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          organization_id: string
          rating: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          organization_id?: string
          rating?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_answer_feedback_message_id_organization_id_fkey"
            columns: ["message_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risk_conversation_messages"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_answer_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_answer_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_answer_feedback_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_answer_feedback_user_id_organization_id_fkey"
            columns: ["user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_conversation_messages: {
        Row: {
          answer_status: string | null
          confidence: number | null
          content: string
          conversation_id: string
          created_at: string
          evidence_ids: string[]
          id: string
          input_tokens: number | null
          latency_ms: number | null
          missing_information: string[]
          model_name: string | null
          organization_id: string
          output_tokens: number | null
          prompt_version: string | null
          provider: string | null
          role: string
          suggested_follow_ups: string[]
          total_tokens: number | null
        }
        Insert: {
          answer_status?: string | null
          confidence?: number | null
          content: string
          conversation_id: string
          created_at?: string
          evidence_ids?: string[]
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          missing_information?: string[]
          model_name?: string | null
          organization_id: string
          output_tokens?: number | null
          prompt_version?: string | null
          provider?: string | null
          role: string
          suggested_follow_ups?: string[]
          total_tokens?: number | null
        }
        Update: {
          answer_status?: string | null
          confidence?: number | null
          content?: string
          conversation_id?: string
          created_at?: string
          evidence_ids?: string[]
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          missing_information?: string[]
          model_name?: string | null
          organization_id?: string
          output_tokens?: number | null
          prompt_version?: string | null
          provider?: string | null
          role?: string
          suggested_follow_ups?: string[]
          total_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "risk_conversation_messages_conversation_id_organization_id_fkey"
            columns: ["conversation_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risk_conversations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_conversation_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_conversation_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_conversation_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      risk_conversations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          risk_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          risk_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          risk_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_conversations_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_conversations_user_id_organization_id_fkey"
            columns: ["user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_email_drafts: {
        Row: {
          body: string
          created_at: string
          created_by_user_id: string
          desired_tone: string
          evidence_ids: string[]
          generation_source: string
          id: string
          input_tokens: number | null
          intended_recipient_role: string
          latency_ms: number
          manually_sent_at: string | null
          manually_sent_by_user_id: string | null
          model_name: string
          organization_id: string
          output_tokens: number | null
          prompt_version: string
          provider: string
          recipient_email: string | null
          recipient_name: string | null
          recipient_user_id: string | null
          recipient_vendor_id: string | null
          recommended_action_id: string | null
          risk_id: string
          status: string
          subject: string
          suggested_urgency: string
          total_tokens: number | null
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by_user_id: string
          desired_tone: string
          evidence_ids?: string[]
          generation_source: string
          id?: string
          input_tokens?: number | null
          intended_recipient_role: string
          latency_ms: number
          manually_sent_at?: string | null
          manually_sent_by_user_id?: string | null
          model_name: string
          organization_id: string
          output_tokens?: number | null
          prompt_version: string
          provider: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_user_id?: string | null
          recipient_vendor_id?: string | null
          recommended_action_id?: string | null
          risk_id: string
          status?: string
          subject: string
          suggested_urgency: string
          total_tokens?: number | null
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by_user_id?: string
          desired_tone?: string
          evidence_ids?: string[]
          generation_source?: string
          id?: string
          input_tokens?: number | null
          intended_recipient_role?: string
          latency_ms?: number
          manually_sent_at?: string | null
          manually_sent_by_user_id?: string | null
          model_name?: string
          organization_id?: string
          output_tokens?: number | null
          prompt_version?: string
          provider?: string
          recipient_email?: string | null
          recipient_name?: string | null
          recipient_user_id?: string | null
          recipient_vendor_id?: string | null
          recommended_action_id?: string | null
          risk_id?: string
          status?: string
          subject?: string
          suggested_urgency?: string
          total_tokens?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_email_drafts_created_by_user_id_organization_id_fkey"
            columns: ["created_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_email_drafts_manually_sent_by_user_id_organization_id_fkey"
            columns: ["manually_sent_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_email_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_email_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_email_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_email_drafts_recipient_user_id_organization_id_fkey"
            columns: ["recipient_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_email_drafts_recipient_vendor_id_organization_id_fkey"
            columns: ["recipient_vendor_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_email_drafts_recommended_action_id_organization_id_fkey"
            columns: ["recommended_action_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "recommended_actions"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_email_drafts_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_evidence: {
        Row: {
          created_at: string
          detection_key: string | null
          document_id: string | null
          evidence_type: string
          excerpt: string
          id: string
          integration_source_id: string | null
          line_end: number | null
          line_start: number | null
          occurred_at: string
          organization_id: string
          page_number: number | null
          relevance_score: number
          risk_id: string
          source_label: string
          source_location: string | null
          support_type: string
          title: string
          why_it_matters: string
        }
        Insert: {
          created_at?: string
          detection_key?: string | null
          document_id?: string | null
          evidence_type: string
          excerpt: string
          id?: string
          integration_source_id?: string | null
          line_end?: number | null
          line_start?: number | null
          occurred_at: string
          organization_id: string
          page_number?: number | null
          relevance_score: number
          risk_id: string
          source_label: string
          source_location?: string | null
          support_type?: string
          title: string
          why_it_matters: string
        }
        Update: {
          created_at?: string
          detection_key?: string | null
          document_id?: string | null
          evidence_type?: string
          excerpt?: string
          id?: string
          integration_source_id?: string | null
          line_end?: number | null
          line_start?: number | null
          occurred_at?: string
          organization_id?: string
          page_number?: number | null
          relevance_score?: number
          risk_id?: string
          source_label?: string
          source_location?: string | null
          support_type?: string
          title?: string
          why_it_matters?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_evidence_document_id_organization_id_fkey"
            columns: ["document_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_evidence_integration_source_id_organization_id_fkey"
            columns: ["integration_source_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "integration_sources"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_evidence_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_evidence_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_relationships: {
        Row: {
          algorithm_version: string
          confidence_score: number
          created_at: string
          created_by_user_id: string | null
          id: string
          organization_id: string
          relationship_type: string
          source: string
          source_risk_id: string
          supporting_evidence: Json
          target_risk_id: string
          updated_at: string
        }
        Insert: {
          algorithm_version: string
          confidence_score: number
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          organization_id: string
          relationship_type: string
          source?: string
          source_risk_id: string
          supporting_evidence?: Json
          target_risk_id: string
          updated_at?: string
        }
        Update: {
          algorithm_version?: string
          confidence_score?: number
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          organization_id?: string
          relationship_type?: string
          source?: string
          source_risk_id?: string
          supporting_evidence?: Json
          target_risk_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "risk_relationships_created_by_user_id_organization_id_fkey"
            columns: ["created_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_relationships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_relationships_source_risk_id_organization_id_fkey"
            columns: ["source_risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_relationships_target_risk_id_organization_id_fkey"
            columns: ["target_risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risk_resolutions: {
        Row: {
          completed_action_ids: string[]
          created_at: string
          estimated_loss_avoided_cents: number
          exposure_before_cents: number
          final_owner_user_id: string
          id: string
          initial_prediction: Json
          internal_notes: string | null
          organization_id: string
          prediction_accurate: boolean
          realized_impact_cents: number | null
          remaining_exposure_cents: number
          reopen_reason: string | null
          reopened_at: string | null
          resolution_type: string
          resolved_at: string
          resolved_by_user_id: string
          resolved_date: string
          risk_id: string
          summary: string
          warning_useful: boolean
        }
        Insert: {
          completed_action_ids?: string[]
          created_at?: string
          estimated_loss_avoided_cents: number
          exposure_before_cents: number
          final_owner_user_id: string
          id?: string
          initial_prediction?: Json
          internal_notes?: string | null
          organization_id: string
          prediction_accurate: boolean
          realized_impact_cents?: number | null
          remaining_exposure_cents: number
          reopen_reason?: string | null
          reopened_at?: string | null
          resolution_type: string
          resolved_at?: string
          resolved_by_user_id: string
          resolved_date: string
          risk_id: string
          summary: string
          warning_useful: boolean
        }
        Update: {
          completed_action_ids?: string[]
          created_at?: string
          estimated_loss_avoided_cents?: number
          exposure_before_cents?: number
          final_owner_user_id?: string
          id?: string
          initial_prediction?: Json
          internal_notes?: string | null
          organization_id?: string
          prediction_accurate?: boolean
          realized_impact_cents?: number | null
          remaining_exposure_cents?: number
          reopen_reason?: string | null
          reopened_at?: string | null
          resolution_type?: string
          resolved_at?: string
          resolved_by_user_id?: string
          resolved_date?: string
          risk_id?: string
          summary?: string
          warning_useful?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "risk_resolutions_final_owner_fk"
            columns: ["final_owner_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_resolutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risk_resolutions_resolved_by_user_id_organization_id_fkey"
            columns: ["resolved_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risk_resolutions_risk_id_organization_id_fkey"
            columns: ["risk_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "risks"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      risks: {
        Row: {
          assigned_user_id: string | null
          category: Database["public"]["Enums"]["risk_category"]
          category_mapping_confidence: number | null
          category_mapping_source: string | null
          confidence_score: number
          created_at: string
          detected_at: string
          detection_key: string | null
          due_at: string | null
          estimated_margin_impact_cents: number
          financial_exposure_assessed: boolean
          id: string
          last_assessed_at: string | null
          normalized_category_id: string | null
          organization_id: string
          potential_exposure_cents: number
          project_id: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["risk_severity"]
          status: Database["public"]["Enums"]["risk_status"]
          summary: string
          taxonomy_version: string | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          vendor_id: string | null
          why_it_matters: string
        }
        Insert: {
          assigned_user_id?: string | null
          category: Database["public"]["Enums"]["risk_category"]
          category_mapping_confidence?: number | null
          category_mapping_source?: string | null
          confidence_score: number
          created_at?: string
          detected_at: string
          detection_key?: string | null
          due_at?: string | null
          estimated_margin_impact_cents?: number
          financial_exposure_assessed?: boolean
          id?: string
          last_assessed_at?: string | null
          normalized_category_id?: string | null
          organization_id: string
          potential_exposure_cents?: number
          project_id?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["risk_severity"]
          status?: Database["public"]["Enums"]["risk_status"]
          summary: string
          taxonomy_version?: string | null
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
          vendor_id?: string | null
          why_it_matters: string
        }
        Update: {
          assigned_user_id?: string | null
          category?: Database["public"]["Enums"]["risk_category"]
          category_mapping_confidence?: number | null
          category_mapping_source?: string | null
          confidence_score?: number
          created_at?: string
          detected_at?: string
          detection_key?: string | null
          due_at?: string | null
          estimated_margin_impact_cents?: number
          financial_exposure_assessed?: boolean
          id?: string
          last_assessed_at?: string | null
          normalized_category_id?: string | null
          organization_id?: string
          potential_exposure_cents?: number
          project_id?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["risk_severity"]
          status?: Database["public"]["Enums"]["risk_status"]
          summary?: string
          taxonomy_version?: string | null
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
          vendor_id?: string | null
          why_it_matters?: string
        }
        Relationships: [
          {
            foreignKeyName: "risks_assigned_user_organization_fkey"
            columns: ["assigned_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "risks_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risks_updated_by_user_id_organization_id_fkey"
            columns: ["updated_by_user_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "risks_vendor_id_organization_id_fkey"
            columns: ["vendor_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      scheduler_job_definitions: {
        Row: {
          backoff_ms: number
          concurrency_policy: string
          created_at: string
          cron_schedule: string
          description: string
          display_name: string
          enabled: boolean
          job_key: string
          max_retries: number
          maximum_backoff_ms: number
          timeout_ms: number
          updated_at: string
        }
        Insert: {
          backoff_ms?: number
          concurrency_policy?: string
          created_at?: string
          cron_schedule: string
          description?: string
          display_name: string
          enabled?: boolean
          job_key: string
          max_retries?: number
          maximum_backoff_ms?: number
          timeout_ms: number
          updated_at?: string
        }
        Update: {
          backoff_ms?: number
          concurrency_policy?: string
          created_at?: string
          cron_schedule?: string
          description?: string
          display_name?: string
          enabled?: boolean
          job_key?: string
          max_retries?: number
          maximum_backoff_ms?: number
          timeout_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      scheduler_job_executions: {
        Row: {
          attempt_number: number
          completed_at: string | null
          correlation_id: string
          created_at: string
          duration_ms: number | null
          id: string
          initiating_operator_id: string | null
          job_key: string
          next_retry_at: string | null
          parent_execution_id: string | null
          root_execution_id: string | null
          safe_error_code: string | null
          safe_error_summary: string | null
          safe_metadata: Json
          scheduled_for: string | null
          started_at: string | null
          status: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          initiating_operator_id?: string | null
          job_key: string
          next_retry_at?: string | null
          parent_execution_id?: string | null
          root_execution_id?: string | null
          safe_error_code?: string | null
          safe_error_summary?: string | null
          safe_metadata?: Json
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          correlation_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          initiating_operator_id?: string | null
          job_key?: string
          next_retry_at?: string | null
          parent_execution_id?: string | null
          root_execution_id?: string | null
          safe_error_code?: string | null
          safe_error_summary?: string | null
          safe_metadata?: Json
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_job_executions_initiating_operator_id_fkey"
            columns: ["initiating_operator_id"]
            isOneToOne: false
            referencedRelation: "platform_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_job_executions_job_key_fkey"
            columns: ["job_key"]
            isOneToOne: false
            referencedRelation: "scheduler_job_definitions"
            referencedColumns: ["job_key"]
          },
          {
            foreignKeyName: "scheduler_job_executions_parent_execution_id_fkey"
            columns: ["parent_execution_id"]
            isOneToOne: false
            referencedRelation: "scheduler_job_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_job_executions_root_execution_id_fkey"
            columns: ["root_execution_id"]
            isOneToOne: false
            referencedRelation: "scheduler_job_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_job_locks: {
        Row: {
          acquired_at: string
          execution_id: string
          job_key: string
          lease_expires_at: string
          lease_token: string
        }
        Insert: {
          acquired_at: string
          execution_id: string
          job_key: string
          lease_expires_at: string
          lease_token: string
        }
        Update: {
          acquired_at?: string
          execution_id?: string
          job_key?: string
          lease_expires_at?: string
          lease_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduler_job_locks_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "scheduler_job_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduler_job_locks_job_key_fkey"
            columns: ["job_key"]
            isOneToOne: true
            referencedRelation: "scheduler_job_definitions"
            referencedColumns: ["job_key"]
          },
        ]
      }
      team_activity_events: {
        Row: {
          actor_membership_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          organization_id: string
          summary: string
          target_membership_id: string | null
        }
        Insert: {
          actor_membership_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          organization_id: string
          summary: string
          target_membership_id?: string | null
        }
        Update: {
          actor_membership_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          summary?: string
          target_membership_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_activity_events_actor_membership_id_organization_id_fkey"
            columns: ["actor_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "team_activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_activity_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_activity_events_target_membership_id_organization_id_fkey"
            columns: ["target_membership_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      users: {
        Row: {
          assignment_notifications_enabled: boolean
          auth_user_id: string | null
          created_at: string
          deletion_requested_at: string | null
          delivery_timezone: string
          digest_frequency: string
          email: string
          email_delivery_enabled: boolean
          full_name: string
          id: string
          mention_notifications_enabled: boolean
          organization_id: string
          preferred_delivery_time: string
          role: Database["public"]["Enums"]["user_role"]
          scheduled_deletion_at: string | null
          title: string | null
          updated_at: string
          weekly_summary_enabled: boolean
        }
        Insert: {
          assignment_notifications_enabled?: boolean
          auth_user_id?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          delivery_timezone?: string
          digest_frequency?: string
          email: string
          email_delivery_enabled?: boolean
          full_name: string
          id?: string
          mention_notifications_enabled?: boolean
          organization_id: string
          preferred_delivery_time?: string
          role?: Database["public"]["Enums"]["user_role"]
          scheduled_deletion_at?: string | null
          title?: string | null
          updated_at?: string
          weekly_summary_enabled?: boolean
        }
        Update: {
          assignment_notifications_enabled?: boolean
          auth_user_id?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          delivery_timezone?: string
          digest_frequency?: string
          email?: string
          email_delivery_enabled?: boolean
          full_name?: string
          id?: string
          mention_notifications_enabled?: boolean
          organization_id?: string
          preferred_delivery_time?: string
          role?: Database["public"]["Enums"]["user_role"]
          scheduled_deletion_at?: string | null
          title?: string | null
          updated_at?: string
          weekly_summary_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "users_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "platform_user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          created_at: string
          id: string
          name: string
          organization_id: string
          trade: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          organization_id: string
          trade?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          trade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_customer_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "platform_organization_directory"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      platform_customer_health: {
        Row: {
          account_status: string | null
          activity_events_30d: number | null
          adopted_feature_count: number | null
          available_feature_count: number | null
          created_at: string | null
          feature_adoption_percent: number | null
          health_rank: number | null
          health_status: string | null
          id: string | null
          job_failures_30d: number | null
          last_activity_at: string | null
          last_job_failure_at: string | null
          last_login_at: string | null
          name: string | null
          onboarding_completion_percent: number | null
          slug: string | null
        }
        Relationships: []
      }
      platform_organization_directory: {
        Row: {
          account_status: string | null
          active_project_count: number | null
          created_at: string | null
          failed_ai_count: number | null
          failed_delivery_count: number | null
          failed_export_count: number | null
          failed_job_count: number | null
          id: string | null
          last_activity_at: string | null
          member_count: number | null
          name: string | null
          slug: string | null
          storage_bytes: number | null
          timezone: string | null
        }
        Relationships: []
      }
      platform_user_directory: {
        Row: {
          account_status: string | null
          auth_provider: string | null
          created_at: string | null
          email: string | null
          email_confirmed_at: string | null
          full_name: string | null
          id: string | null
          last_activity_at: string | null
          last_sign_in_at: string | null
          membership_count: number | null
          mfa_enabled: boolean | null
          organization_names: string[] | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_organization_invitation: {
        Args: {
          invitation_token_hash: string
          principal_auth_user_id: string
          principal_email: string
          principal_full_name: string
        }
        Returns: string
      }
      acquire_scheduler_job_lock: {
        Args: {
          requested_execution_id: string
          requested_job_key: string
          requested_lease_expires_at: string
          requested_lease_token: string
          requested_now: string
        }
        Returns: boolean
      }
      can_access_project: {
        Args: { target_organization_id: string; target_project_id: string }
        Returns: boolean
      }
      claim_due_privacy_requests: {
        Args: { batch_size?: number }
        Returns: {
          attempt_count: number
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          failure_code: string | null
          id: string
          last_attempt_at: string | null
          metadata: Json
          organization_id: string | null
          organization_identifier_hash: string | null
          processing_started_at: string | null
          requested_at: string
          requested_by_auth_user_id: string | null
          requested_by_user_id: string | null
          scheduled_for: string
          scope: string
          status: string
          target_auth_user_id: string | null
          target_user_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "privacy_deletion_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_organization_data_exports: {
        Args: { batch_size?: number }
        Returns: {
          artifact_mime_type: string | null
          artifact_name: string | null
          artifact_size_bytes: number | null
          attempt_count: number
          checksum_sha256: string | null
          completed_at: string | null
          expired_at: string | null
          expires_at: string | null
          export_format: string
          failure_code: string | null
          id: string
          manifest: Json
          next_retry_at: string | null
          organization_id: string
          processing_started_at: string | null
          requested_at: string
          requested_by_auth_user_id: string | null
          requested_by_email: string
          requested_by_membership_id: string | null
          requested_by_name: string
          schedule_id: string | null
          schedule_occurrence_key: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "organization_data_exports"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_stripe_billing_event: {
        Args: {
          supplied_access_request_id: string
          supplied_correlation_id: string
          supplied_event_type: string
          supplied_provider_event_id: string
          supplied_safe_metadata: Json
        }
        Returns: boolean
      }
      complete_customer_owner_activation: {
        Args: {
          principal_auth_user_id: string
          supplied_activation_token_hash: string
        }
        Returns: string
      }
      create_entitled_project: {
        Args: {
          principal_application_user_id: string
          project_address_line_1: string
          project_city: string
          project_name: string
          project_number_value: string
          project_postal_code: string
          project_start_date: string
          project_state_code: string
          project_target_completion_date: string
          target_organization_id: string
        }
        Returns: string
      }
      create_organization_for_user: {
        Args: {
          organization_name: string
          organization_slug: string
          principal_auth_user_id: string
          principal_email: string
          principal_full_name: string
        }
        Returns: string
      }
      current_organization_role: {
        Args: { target_organization_id: string }
        Returns: string
      }
      current_project_role: {
        Args: { target_organization_id: string; target_project_id: string }
        Returns: string
      }
      dashboard_severity_from_rank: { Args: { rank: number }; Returns: string }
      get_dashboard_portfolio_aggregates: {
        Args: { requested_now?: string; requested_organization_id: string }
        Returns: Json
      }
      get_resolution_value_summary: {
        Args: { requested_organization_id: string }
        Returns: Json
      }
      is_organization_member: {
        Args: { target_auth_user_id?: string; target_organization_id: string }
        Returns: boolean
      }
      leave_organization: {
        Args: { principal_auth_user_id: string; target_membership_id: string }
        Returns: undefined
      }
      list_portfolio_projects_page: {
        Args: {
          page_offset?: number
          page_size?: number
          requested_organization_id: string
          search_query?: string
          sort_key?: string
          stage_filter?: string
        }
        Returns: Json
      }
      list_portfolio_risks_page: {
        Args: {
          category_filter?: string
          due_filter?: string
          page_offset?: number
          page_size?: number
          project_filter?: string
          requested_organization_id: string
          search_query?: string
          severity_filter?: string
          sort_key?: string
          status_filter?: string
          view_filter?: string
        }
        Returns: Json
      }
      organization_project_limit: {
        Args: { target_plan_key: string }
        Returns: number
      }
      purge_expired_organization_data: {
        Args: { target_organization_id: string }
        Returns: Json
      }
      release_scheduler_job_lock: {
        Args: { requested_job_key: string; requested_lease_token: string }
        Returns: boolean
      }
      set_project_archived: {
        Args: {
          principal_application_user_id: string
          should_archive: boolean
          target_organization_id: string
          target_project_id: string
        }
        Returns: undefined
      }
      transfer_organization_ownership: {
        Args: {
          actor_membership_id: string
          target_membership_id: string
          target_organization_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      action_status: "open" | "in_progress" | "complete" | "dismissed"
      activity_type:
        | "created"
        | "status_changed"
        | "assigned"
        | "commented"
        | "evidence_added"
        | "action_updated"
        | "resolved"
        | "dismissed"
      ai_review_status: "pending" | "approved" | "rejected"
      brief_status: "draft" | "published"
      document_processing_status: "pending" | "ready" | "failed"
      document_type:
        | "contract"
        | "insurance"
        | "daily_log"
        | "schedule"
        | "change_order"
        | "safety"
        | "financial"
        | "other"
        | "rfi"
        | "incident_report"
      integration_provider:
        | "manual"
        | "procore"
        | "autodesk"
        | "email"
        | "sharepoint"
        | "other"
      project_status:
        | "planning"
        | "active"
        | "on_hold"
        | "complete"
        | "cancelled"
      risk_category:
        | "insurance"
        | "schedule"
        | "documentation"
        | "contract"
        | "safety"
        | "financial"
        | "vendor"
        | "weather"
        | "other"
      risk_severity: "low" | "medium" | "high" | "critical"
      risk_status:
        | "monitoring"
        | "action_needed"
        | "in_progress"
        | "resolved"
        | "dismissed"
      user_role: "executive" | "operations" | "project_manager" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_status: ["open", "in_progress", "complete", "dismissed"],
      activity_type: [
        "created",
        "status_changed",
        "assigned",
        "commented",
        "evidence_added",
        "action_updated",
        "resolved",
        "dismissed",
      ],
      ai_review_status: ["pending", "approved", "rejected"],
      brief_status: ["draft", "published"],
      document_processing_status: ["pending", "ready", "failed"],
      document_type: [
        "contract",
        "insurance",
        "daily_log",
        "schedule",
        "change_order",
        "safety",
        "financial",
        "other",
        "rfi",
        "incident_report",
      ],
      integration_provider: [
        "manual",
        "procore",
        "autodesk",
        "email",
        "sharepoint",
        "other",
      ],
      project_status: [
        "planning",
        "active",
        "on_hold",
        "complete",
        "cancelled",
      ],
      risk_category: [
        "insurance",
        "schedule",
        "documentation",
        "contract",
        "safety",
        "financial",
        "vendor",
        "weather",
        "other",
      ],
      risk_severity: ["low", "medium", "high", "critical"],
      risk_status: [
        "monitoring",
        "action_needed",
        "in_progress",
        "resolved",
        "dismissed",
      ],
      user_role: ["executive", "operations", "project_manager", "admin"],
    },
  },
} as const

