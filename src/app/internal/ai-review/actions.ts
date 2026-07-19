"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BUILDCO_ORGANIZATION_ID,
  MATT_USER_ID,
} from "@/features/daily-brief/data";
import { createRiskAnalysisSuggestion } from "@/features/ai/analysis-service";
import { getRiskAnalysisFixture } from "@/features/ai/evaluation-fixtures";
import {
  approveRiskSuggestion,
  rejectRiskSuggestion,
} from "@/features/ai/review-service";

function requireDevelopment() {
  if (process.env.NODE_ENV === "production")
    throw new Error("AI review development tooling is disabled in production.");
}

export async function analyzeFixtureAction(formData: FormData) {
  requireDevelopment();
  const fixture = getRiskAnalysisFixture(
    String(formData.get("fixtureId") ?? ""),
  );
  await createRiskAnalysisSuggestion({
    input: fixture.input,
    deterministicFallback: fixture.deterministicFallback,
  });
  revalidatePath("/internal/ai-review");
}

export async function approveSuggestionAction(formData: FormData) {
  requireDevelopment();
  const suggestionId = z.uuid().parse(formData.get("suggestionId"));
  await approveRiskSuggestion({
    organizationId: BUILDCO_ORGANIZATION_ID,
    suggestionId,
    reviewerUserId: MATT_USER_ID,
    reviewNote: String(formData.get("reviewNote") ?? ""),
  });
  revalidatePath("/internal/ai-review");
  revalidatePath("/risks");
}

export async function rejectSuggestionAction(formData: FormData) {
  requireDevelopment();
  const suggestionId = z.uuid().parse(formData.get("suggestionId"));
  await rejectRiskSuggestion({
    organizationId: BUILDCO_ORGANIZATION_ID,
    suggestionId,
    reviewerUserId: MATT_USER_ID,
    reason: String(formData.get("reviewNote") ?? ""),
  });
  revalidatePath("/internal/ai-review");
}
