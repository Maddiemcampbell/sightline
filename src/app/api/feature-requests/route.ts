import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { allowBugReportSubmission } from "@/features/bug-reports/rate-limit";
import { FeatureRequestRepository } from "@/features/feature-requests/repository";
import {
  sanitizeFeatureFilename,
  customerFeatureRequestSchema,
  validateFeatureImage,
} from "@/features/feature-requests/validation";
import {
  requireAuthenticatedUser,
  requireCurrentMembership,
} from "@/lib/auth/session";
import { rejectCrossSiteMutation } from "@/lib/security/request";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const principal = await requireAuthenticatedUser();
  const membership = await requireCurrentMembership();
  const formData = await request.formData();
  const parsed = customerFeatureRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    useCase: formData.get("useCase") || undefined,
    desiredOutcome: formData.get("desiredOutcome") || undefined,
    relevantRoute: formData.get("relevantRoute") || undefined,
    relevantFeature: formData.get("relevantFeature") || undefined,
    priority: formData.get("priority") || undefined,
    diagnosticConsent: formData.get("diagnosticConsent") === "true",
    viewportWidth: formData.get("viewportWidth") || undefined,
    viewportHeight: formData.get("viewportHeight") || undefined,
    browserOs: formData.get("browserOs") || undefined,
    idempotencyKey: formData.get("idempotencyKey"),
    correlationId: formData.get("correlationId") || randomUUID(),
  });
  if (!parsed.success)
    return NextResponse.json(
      {
        fieldErrors: parsed.error.flatten().fieldErrors,
        message: "Check the highlighted fields and try again.",
      },
      { status: 422 },
    );

  const client = createAdminSupabaseClient();
  const repository = new FeatureRequestRepository(client);
  const key = `feature:${membership.organizationId}:${principal.id}`;
  try {
    const existing = await repository.findIdempotent(
      membership.organizationId,
      membership.applicationUserId,
      parsed.data.idempotencyKey,
    );
    if (existing)
      return NextResponse.json({ accepted: true, requestId: existing });
    if (!allowBugReportSubmission(key))
      return NextResponse.json(
        { message: "Too many requests. Please wait a minute and try again." },
        { status: 429 },
      );
    const requestId = await repository.create(
      membership.organizationId,
      membership.applicationUserId,
      parsed.data,
      {
        applicationVersion:
          process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 40) ?? "local",
        environment:
          process.env.VERCEL_ENV ??
          (process.env.NODE_ENV === "production"
            ? "production"
            : "development"),
      },
    );
    let attachmentWarning: string | undefined;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      let uploadedPath: string | null = null;
      try {
        const validated = await validateFeatureImage(image);
        const filename = sanitizeFeatureFilename(image.name);
        const path = `${membership.organizationId}/${requestId}/${randomUUID()}-${filename}`;
        const { error } = await client.storage
          .from("feature-request-attachments")
          .upload(path, validated.bytes, {
            contentType: validated.mimeType,
            upsert: false,
          });
        if (error) throw new Error(error.message);
        uploadedPath = path;
        await repository.addAttachment({
          requestId,
          organizationId: membership.organizationId,
          path,
          filename,
          mimeType: validated.mimeType,
          size: image.size,
        });
      } catch (error) {
        console.error("[feature-request] Attachment failed", {
          reference: parsed.data.correlationId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        if (uploadedPath)
          await client.storage
            .from("feature-request-attachments")
            .remove([uploadedPath]);
        attachmentWarning =
          "Your feature request was saved, but the image could not be attached.";
      }
    }
    return NextResponse.json(
      { accepted: true, requestId, attachmentWarning },
      { status: 201 },
    );
  } catch (error) {
    console.error("[feature-request] Submission failed", {
      reference: parsed.data.correlationId,
      organizationId: membership.organizationId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      {
        message: `We could not save the feature request. Try again. Reference: ${parsed.data.correlationId}`,
        reference: parsed.data.correlationId,
      },
      { status: 500 },
    );
  }
}
