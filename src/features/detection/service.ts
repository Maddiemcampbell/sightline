import "server-only";

import { selectDailyBriefRisks } from "@/domain/daily-brief-selection";
import { deduplicateDetections } from "@/domain/detection/deduplicate";
import { expiringInsuranceRule } from "@/domain/detection/rules/expiring-insurance";
import { repeatedIssueRule } from "@/domain/detection/rules/repeated-issue";
import { weatherDelayRule } from "@/domain/detection/rules/weather-delay";
import type {
  DetectedRisk,
  DetectionContext,
  DetectionRule,
} from "@/domain/detection/types";
import type { Risk } from "@/domain/types";
import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/features/daily-brief/data";
import type { RiskRow } from "@/lib/supabase/database-row.types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const rules: readonly DetectionRule[] = [
  expiringInsuranceRule,
  weatherDelayRule,
  repeatedIssueRule,
];

export type DetectionRunResult = {
  runId: string;
  created: number;
  updated: number;
  briefItemCount: number;
  rules: readonly {
    ruleId: string;
    found: number;
    detectionKeys: readonly string[];
  }[];
};

export async function runDetection(input: {
  source: "manual" | "scheduled";
  now?: Date;
}): Promise<DetectionRunResult> {
  const now = input.now ?? new Date();
  const client = createAdminSupabaseClient();
  const { data: run, error: runError } = await client
    .from("detection_runs")
    .insert({
      organization_id: BUILDCO_ORGANIZATION_ID,
      trigger_source: input.source,
      status: "running",
      started_at: now.toISOString(),
    })
    .select("id")
    .single();
  if (runError || !run)
    throw new Error(runError?.message ?? "Could not start detection run");

  try {
    const context = await loadDetectionContext(now);
    const ruleResults = rules.map((rule) => {
      const detections = rule.detect(context);
      console.info("Sightline detection rule completed", {
        runId: run.id,
        ruleId: rule.id,
        found: detections.length,
        detectionKeys: detections.map((detection) => detection.detectionKey),
      });
      return {
        ruleId: rule.id,
        found: detections.length,
        detectionKeys: detections.map((detection) => detection.detectionKey),
        detections,
      };
    });
    const existingResult = await client
      .from("risks")
      .select("id,detection_key")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .not("detection_key", "is", null);
    if (existingResult.error) throw new Error(existingResult.error.message);
    const existingKeys = new Set(
      (existingResult.data ?? []).flatMap((risk) =>
        risk.detection_key ? [risk.detection_key] : [],
      ),
    );
    let created = 0;
    let updated = 0;
    const detections = deduplicateDetections(
      ruleResults.flatMap((result) => result.detections),
    );
    for (const detection of detections) {
      const existed = existingKeys.has(detection.detectionKey);
      await persistDetection(detection, now);
      if (existed) updated += 1;
      else {
        created += 1;
        existingKeys.add(detection.detectionKey);
      }
    }
    const briefItemCount = await regenerateDailyBrief(now);
    const serializedResults = ruleResults.map(
      ({ ruleId, found, detectionKeys }) => ({
        ruleId,
        found,
        detectionKeys,
      }),
    );
    const { error: completeError } = await client
      .from("detection_runs")
      .update({
        status: "complete",
        completed_at: new Date().toISOString(),
        risks_created: created,
        risks_updated: updated,
        rule_results: serializedResults,
      })
      .eq("id", run.id)
      .eq("organization_id", BUILDCO_ORGANIZATION_ID);
    if (completeError) throw new Error(completeError.message);
    return {
      runId: run.id,
      created,
      updated,
      briefItemCount,
      rules: serializedResults,
    };
  } catch (error) {
    await client
      .from("detection_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Unknown error",
      })
      .eq("id", run.id)
      .eq("organization_id", BUILDCO_ORGANIZATION_ID);
    throw error;
  }
}

async function loadDetectionContext(now: Date): Promise<DetectionContext> {
  const client = createAdminSupabaseClient();
  const [documents, fields, projects, vendors, links, settings] =
    await Promise.all([
      client
        .from("documents")
        .select("*")
        .eq("organization_id", BUILDCO_ORGANIZATION_ID)
        .is("archived_at", null),
      client
        .from("document_extracted_fields")
        .select("*")
        .eq("organization_id", BUILDCO_ORGANIZATION_ID),
      client
        .from("projects")
        .select("*")
        .eq("organization_id", BUILDCO_ORGANIZATION_ID),
      client
        .from("vendors")
        .select("*")
        .eq("organization_id", BUILDCO_ORGANIZATION_ID),
      client
        .from("project_vendors")
        .select("*")
        .eq("organization_id", BUILDCO_ORGANIZATION_ID),
      client
        .from("project_detection_settings")
        .select("*")
        .eq("organization_id", BUILDCO_ORGANIZATION_ID),
    ]);
  for (const result of [
    documents,
    fields,
    projects,
    vendors,
    links,
    settings,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }
  const fieldsByDocument = new Map<string, Record<string, unknown>>();
  for (const field of fields.data ?? []) {
    const values = fieldsByDocument.get(field.document_id) ?? {};
    values[field.field_key] = field.field_value;
    fieldsByDocument.set(field.document_id, values);
  }
  const thresholdByProject = new Map(
    (settings.data ?? []).map((setting) => [
      setting.project_id,
      setting.concrete_temperature_threshold_f,
    ]),
  );
  const activeProjects = new Set(
    (projects.data ?? [])
      .filter((project) => project.status === "active")
      .map((project) => project.id),
  );
  return {
    now,
    documents: (documents.data ?? []).map((document) => ({
      id: document.id,
      projectId: document.project_id,
      vendorId: document.vendor_id,
      category: document.document_type,
      name: document.name,
      documentDate: document.document_date,
      fields: fieldsByDocument.get(document.id) ?? {},
    })),
    projects: (projects.data ?? []).map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      concreteTemperatureThresholdF: thresholdByProject.get(project.id) ?? 95,
    })),
    vendors: (vendors.data ?? []).map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
    })),
    activeProjectVendorPairs: new Set(
      (links.data ?? [])
        .filter((link) => activeProjects.has(link.project_id))
        .map((link) => `${link.project_id}:${link.vendor_id}`),
    ),
  };
}

async function persistDetection(detection: DetectedRisk, now: Date) {
  const client = createAdminSupabaseClient();
  const ruleId = detection.detectionKey.split(":")[0] ?? "deterministic";
  const existingResult = await client
    .from("risks")
    .select("id,status,resolved_at")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("detection_key", detection.detectionKey)
    .maybeSingle();
  if (existingResult.error) throw new Error(existingResult.error.message);
  const commonValues = {
    organization_id: BUILDCO_ORGANIZATION_ID,
    project_id: detection.projectId,
    vendor_id: detection.vendorId,
    assigned_user_id: MATT_USER_ID,
    detection_key: detection.detectionKey,
    title: detection.title,
    summary: detection.summary,
    category: detection.category,
    severity: detection.severity,
    status: "action_needed",
    potential_exposure_cents: detection.potentialExposureCents,
    estimated_margin_impact_cents: detection.estimatedMarginImpactCents,
    confidence_score: detection.confidenceScore,
    why_it_matters: detection.whyItMatters,
    due_at: detection.dueAt,
  };
  const riskResult = existingResult.data
    ? await client
        .from("risks")
        .update({
          ...commonValues,
          status: existingResult.data.status,
          resolved_at: existingResult.data.resolved_at,
        })
        .eq("organization_id", BUILDCO_ORGANIZATION_ID)
        .eq("id", existingResult.data.id)
        .select("id")
        .single()
    : await client
        .from("risks")
        .insert({
          ...commonValues,
          status: "action_needed",
          detected_at: now.toISOString(),
          resolved_at: null,
        })
        .select("id")
        .single();
  const { data: risk, error } = riskResult;
  if (error || !risk) throw new Error(error?.message ?? "Risk upsert failed");
  for (const evidence of detection.evidence) {
    const { error: evidenceError } = await client.from("risk_evidence").upsert(
      {
        organization_id: BUILDCO_ORGANIZATION_ID,
        risk_id: risk.id,
        document_id: evidence.documentId,
        integration_source_id: null,
        detection_key: evidence.detectionKey,
        title: evidence.title,
        description: evidence.description,
        source_excerpt: evidence.sourceExcerpt,
        observed_at: evidence.observedAt,
      },
      { onConflict: "organization_id,risk_id,detection_key" },
    );
    if (evidenceError) throw new Error(evidenceError.message);
  }
  const actionKey = `${detection.detectionKey}:action`;
  const existingAction = await client
    .from("recommended_actions")
    .select("id")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID)
    .eq("risk_id", risk.id)
    .eq("detection_key", actionKey)
    .maybeSingle();
  if (existingAction.error) throw new Error(existingAction.error.message);
  const actionResult = existingAction.data
    ? await client
        .from("recommended_actions")
        .update({
          title: "Address detected risk",
          description: detection.recommendedAction,
          due_at: detection.dueAt,
        })
        .eq("organization_id", BUILDCO_ORGANIZATION_ID)
        .eq("id", existingAction.data.id)
    : await client.from("recommended_actions").insert({
        organization_id: BUILDCO_ORGANIZATION_ID,
        risk_id: risk.id,
        owner_user_id: MATT_USER_ID,
        detection_key: actionKey,
        title: "Address detected risk",
        description: detection.recommendedAction,
        action_type: "add_mitigation",
        status: "suggested",
        priority: "high",
        due_at: detection.dueAt,
        completed_at: null,
        created_by_user_id: MATT_USER_ID,
        source: "deterministic_rule",
      });
  if (actionResult.error) throw new Error(actionResult.error.message);
  const activityRows = [
    ...(!existingResult.data
      ? [
          {
            organization_id: BUILDCO_ORGANIZATION_ID,
            risk_id: risk.id,
            actor_type: "system" as const,
            actor_user_id: null,
            activity_type: "risk_detected" as const,
            summary: `Sightline detected this risk using the ${ruleId} rule.`,
            metadata: { ruleId, detectionKey: detection.detectionKey },
            mentioned_user_ids: [],
            occurred_at: now.toISOString(),
          },
          {
            organization_id: BUILDCO_ORGANIZATION_ID,
            risk_id: risk.id,
            actor_type: "system" as const,
            actor_user_id: null,
            activity_type: "action_suggested" as const,
            summary: "Sightline suggested a mitigation action.",
            metadata: { detectionKey: actionKey },
            mentioned_user_ids: [],
            occurred_at: now.toISOString(),
          },
        ]
      : []),
    {
      organization_id: BUILDCO_ORGANIZATION_ID,
      risk_id: risk.id,
      actor_type: "system" as const,
      actor_user_id: null,
      activity_type: "system_analysis_completed" as const,
      summary: `Deterministic analysis completed using the ${ruleId} rule.`,
      metadata: { ruleId, detectionKey: detection.detectionKey },
      mentioned_user_ids: [],
      occurred_at: now.toISOString(),
    },
  ];
  const { error: activityError } = await client
    .from("risk_activities")
    .insert(activityRows);
  if (activityError) throw new Error(activityError.message);
}

async function regenerateDailyBrief(now: Date): Promise<number> {
  const client = createAdminSupabaseClient();
  const { data: rows, error } = await client
    .from("risks")
    .select("*")
    .eq("organization_id", BUILDCO_ORGANIZATION_ID);
  if (error) throw new Error(error.message);
  const risks = (rows ?? []).map(mapRisk);
  const selected = selectDailyBriefRisks(risks);
  const briefDate = formatOrganizationDate(now);
  const { data: brief, error: briefError } = await client
    .from("daily_briefs")
    .upsert(
      {
        organization_id: BUILDCO_ORGANIZATION_ID,
        brief_date: briefDate,
        status: "draft",
        headline: "Three issues need executive attention this week",
        introduction:
          "Sightline selected the highest-priority active profit risks using deterministic V1 rules.",
        published_at: null,
      },
      { onConflict: "organization_id,brief_date" },
    )
    .select("id")
    .single();
  if (briefError || !brief)
    throw new Error(briefError?.message ?? "Brief upsert failed");
  const { error: deleteError } = await client
    .from("brief_items")
    .delete()
    .eq("daily_brief_id", brief.id);
  if (deleteError) throw new Error(deleteError.message);
  if (selected.length > 0) {
    const actionResult = await client
      .from("recommended_actions")
      .select("risk_id,description")
      .eq("organization_id", BUILDCO_ORGANIZATION_ID)
      .in(
        "risk_id",
        selected.map((risk) => risk.id),
      );
    if (actionResult.error) throw new Error(actionResult.error.message);
    const actionByRisk = new Map(
      (actionResult.data ?? []).map((action) => [
        action.risk_id,
        action.description,
      ]),
    );
    const { error: itemError } = await client.from("brief_items").insert(
      selected.map((risk, index) => ({
        organization_id: BUILDCO_ORGANIZATION_ID,
        daily_brief_id: brief.id,
        risk_id: risk.id,
        priority: index + 1,
        headline: risk.title,
        summary: risk.summary,
        recommended_next_step:
          actionByRisk.get(risk.id) ??
          "Review the risk and assign a responsible owner.",
      })),
    );
    if (itemError) throw new Error(itemError.message);
  }
  if (selected.length === 3) {
    const { error: publishError } = await client
      .from("daily_briefs")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", brief.id);
    if (publishError) throw new Error(publishError.message);
  }
  return selected.length;
}

function mapRisk(row: RiskRow): Risk {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    vendorId: row.vendor_id,
    assignedUserId: row.assigned_user_id,
    detectionKey: row.detection_key,
    title: row.title,
    summary: row.summary,
    category: row.category,
    severity: row.severity,
    status: row.status,
    potentialExposureCents: row.potential_exposure_cents,
    estimatedMarginImpactCents: row.estimated_margin_impact_cents,
    confidenceScore: row.confidence_score,
    whyItMatters: row.why_it_matters,
    detectedAt: row.detected_at,
    dueAt: row.due_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function formatOrganizationDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}
