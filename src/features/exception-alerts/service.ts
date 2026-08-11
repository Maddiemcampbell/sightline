import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { evaluateExceptions } from "@/features/exception-alerts/evaluate";
import type { ExceptionRuleSettings } from "@/features/exception-alerts/types";
import { NotificationRepository } from "@/features/notifications/repository";
import { NotificationService } from "@/features/notifications/service";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class ExceptionAlertService {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async evaluateOrganization(organizationId: string, now = new Date()) {
    const [
      settingsResult,
      projectsResult,
      financialsResult,
      changesResult,
      risksResult,
      actionsResult,
      documentsResult,
      connectionsResult,
      activeResult,
      recipientsResult,
    ] = await Promise.all([
      this.client
        .from("exception_alert_rules")
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle(),
      this.client
        .from("projects")
        .select("id,name,contract_value_cents,projected_margin_cents")
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .in("status", ["planning", "active", "on_hold"]),
      this.client
        .from("project_financials")
        .select(
          "project_id,original_budget_cents,actual_cost_cents,forecast_cost_to_complete_cents,data_as_of_date",
        )
        .eq("organization_id", organizationId),
      this.client
        .from("financial_change_orders")
        .select("project_id,amount_cents")
        .eq("organization_id", organizationId)
        .eq("status", "approved"),
      this.client
        .from("risks")
        .select("id,title,severity,assigned_user_id,status")
        .eq("organization_id", organizationId),
      this.client
        .from("recommended_actions")
        .select("id,title,due_at,status")
        .eq("organization_id", organizationId),
      this.client
        .from("documents")
        .select("id,name,expires_on")
        .eq("organization_id", organizationId)
        .is("archived_at", null),
      this.client
        .from("integration_connections")
        .select(
          "id,provider,company_name,status,created_at,last_successful_sync_at",
        )
        .eq("organization_id", organizationId),
      this.client
        .from("exception_alerts")
        .select("id,fingerprint,status,occurrence_count")
        .eq("organization_id", organizationId)
        .eq("status", "active"),
      this.client
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", organizationId)
        .in("role", ["owner", "administrator"]),
    ]);
    for (const result of [
      settingsResult,
      projectsResult,
      financialsResult,
      changesResult,
      risksResult,
      actionsResult,
      documentsResult,
      connectionsResult,
      activeResult,
      recipientsResult,
    ])
      if (result.error) throw new Error(result.error.message);

    let settingsRow = settingsResult.data;
    if (!settingsRow) {
      const created = await this.client
        .from("exception_alert_rules")
        .insert({ organization_id: organizationId })
        .select("*")
        .single();
      if (created.error) throw new Error(created.error.message);
      settingsRow = created.data;
    }
    const settings = mapSettings(settingsRow);
    const detected = evaluateExceptions({
      now,
      settings,
      projects: (projectsResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        contractValueCents: row.contract_value_cents,
        projectedMarginCents: row.projected_margin_cents,
      })),
      financials: (financialsResult.data ?? []).map((row) => ({
        projectId: row.project_id,
        originalBudgetCents: row.original_budget_cents,
        actualCostCents: row.actual_cost_cents,
        forecastCostToCompleteCents: row.forecast_cost_to_complete_cents,
        dataAsOfDate: row.data_as_of_date,
      })),
      approvedChanges: (changesResult.data ?? []).map((row) => ({
        projectId: row.project_id,
        amountCents: row.amount_cents,
      })),
      risks: (risksResult.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        severity: row.severity,
        assignedUserId: row.assigned_user_id,
        status: row.status,
      })),
      actions: (actionsResult.data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        dueAt: row.due_at,
        status: row.status,
      })),
      documents: (documentsResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        expiresOn: row.expires_on,
      })),
      connections: (connectionsResult.data ?? []).map((row) => ({
        id: row.id,
        provider: row.provider,
        companyName: row.company_name,
        status: row.status,
        createdAt: row.created_at,
        lastSuccessfulSyncAt: row.last_successful_sync_at,
      })),
    });

    const existing = new Map(
      (activeResult.data ?? []).map((row) => [row.fingerprint, row]),
    );
    const detectedFingerprints = new Set(
      detected.map((alert) => alert.fingerprint),
    );
    let opened = 0;
    for (const alert of detected) {
      const current = existing.get(alert.fingerprint);
      const row = {
        organization_id: organizationId,
        rule_type: alert.ruleType,
        fingerprint: alert.fingerprint,
        subject_type: alert.subjectType,
        subject_id: alert.subjectId,
        severity: alert.severity,
        title: alert.title,
        body: alert.body,
        href: alert.href,
        payload: alert.payload ?? {},
        status: "active" as const,
        last_detected_at: now.toISOString(),
        resolved_at: null,
        occurrence_count: (current?.occurrence_count ?? 0) + 1,
      };
      const saved = await this.client
        .from("exception_alerts")
        .upsert(row, { onConflict: "organization_id,fingerprint" });
      if (saved.error) throw new Error(saved.error.message);
      if (!current) {
        opened += 1;
        await this.notifyRecipients(
          organizationId,
          recipientsResult.data ?? [],
          alert,
        );
      }
    }

    let resolved = 0;
    for (const alert of activeResult.data ?? []) {
      if (detectedFingerprints.has(alert.fingerprint)) continue;
      const result = await this.client
        .from("exception_alerts")
        .update({ status: "resolved", resolved_at: now.toISOString() })
        .eq("organization_id", organizationId)
        .eq("id", alert.id);
      if (result.error) throw new Error(result.error.message);
      resolved += 1;
    }
    return { detected: detected.length, opened, resolved };
  }

  private async notifyRecipients(
    organizationId: string,
    recipients: readonly { id: string }[],
    alert: ReturnType<typeof evaluateExceptions>[number],
  ) {
    const service = new NotificationService(
      new NotificationRepository(this.client),
    );
    await Promise.all(
      recipients.map((recipient) =>
        service.notify({
          organizationId,
          recipientMembershipId: recipient.id,
          actorMembershipId: null,
          type: "exception_alert",
          title: alert.title,
          body: alert.body,
          href: alert.href,
        }),
      ),
    );
  }
}

export function mapSettings(row: {
  margin_enabled: boolean;
  margin_floor_percent: number;
  budget_enabled: boolean;
  budget_variance_percent: number;
  unowned_risk_enabled: boolean;
  action_due_enabled: boolean;
  action_due_days: number;
  document_expiry_enabled: boolean;
  document_expiry_days: number;
  sync_stale_enabled: boolean;
  sync_stale_hours: number;
  forecast_stale_enabled: boolean;
  forecast_stale_days: number;
}): ExceptionRuleSettings {
  return {
    marginEnabled: row.margin_enabled,
    marginFloorPercent: Number(row.margin_floor_percent),
    budgetEnabled: row.budget_enabled,
    budgetVariancePercent: Number(row.budget_variance_percent),
    unownedRiskEnabled: row.unowned_risk_enabled,
    actionDueEnabled: row.action_due_enabled,
    actionDueDays: row.action_due_days,
    documentExpiryEnabled: row.document_expiry_enabled,
    documentExpiryDays: row.document_expiry_days,
    syncStaleEnabled: row.sync_stale_enabled,
    syncStaleHours: row.sync_stale_hours,
    forecastStaleEnabled: row.forecast_stale_enabled,
    forecastStaleDays: row.forecast_stale_days,
  };
}
