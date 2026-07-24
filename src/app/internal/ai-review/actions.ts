"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createRiskAnalysisSuggestion } from "@/features/ai/analysis-service";
import { getRiskAnalysisFixture } from "@/features/ai/evaluation-fixtures";
import {
  approveRiskSuggestion,
  rejectRiskSuggestion,
} from "@/features/ai/review-service";
import {
  assertSameOrganization,
} from "@/lib/auth/authorization";
import { assertInternalAdmin } from "@/lib/auth/internal-admin";
import { requireActorContext } from "@/lib/auth/request-context";
import { recordAuditEvent } from "@/features/audit/service";

function requireDevelopment() {
  if (process.env.NODE_ENV === "production")
    throw new Error("AI review development tooling is disabled in production.");
}

export async function analyzeFixtureAction(formData: FormData) {
  requireDevelopment();
  const context = await requireActorContext();
  assertInternalAdmin(context);
  const fixture = getRiskAnalysisFixture(
    String(formData.get("fixtureId") ?? ""),
  );
  assertSameOrganization(context, fixture.input.organizationId);
  await createRiskAnalysisSuggestion({
    context,
    input: fixture.input,
    deterministicFallback: fixture.deterministicFallback,
  });
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "ai.review_updated",
    resourceType: "ai_analysis_fixture",
    metadata: { operation: "analyzed", fixtureId: fixture.id },
  });
  revalidatePath("/internal/ai-review");
}

export async function approveSuggestionAction(formData: FormData) {
  requireDevelopment();
  const context = await requireActorContext();
  assertInternalAdmin(context);
  const suggestionId = z.uuid().parse(formData.get("suggestionId"));
  await approveRiskSuggestion({
    organizationId: context.organizationId,
    suggestionId,
    reviewerUserId: context.userId,
    reviewNote: String(formData.get("reviewNote") ?? ""),
  });
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "ai.review_updated",
    resourceType: "ai_risk_suggestion",
    resourceId: suggestionId,
    metadata: { operation: "approved" },
  });
  revalidatePath("/internal/ai-review");
  revalidatePath("/risks");
}

export async function rejectSuggestionAction(formData: FormData) {
  requireDevelopment();
  const context = await requireActorContext();
  assertInternalAdmin(context);
  const suggestionId = z.uuid().parse(formData.get("suggestionId"));
  await rejectRiskSuggestion({
    organizationId: context.organizationId,
    suggestionId,
    reviewerUserId: context.userId,
    reason: String(formData.get("reviewNote") ?? ""),
  });
  await recordAuditEvent({
    organizationId: context.organizationId,
    actorAuthUserId: context.authUserId,
    actorUserId: context.userId,
    action: "ai.review_updated",
    resourceType: "ai_risk_suggestion",
    resourceId: suggestionId,
    metadata: { operation: "rejected" },
  });
  revalidatePath("/internal/ai-review");
}
