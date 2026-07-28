import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { BugReportRepository } from "@/features/bug-reports/repository";
import { allowBugReportSubmission } from "@/features/bug-reports/rate-limit";
import {
  customerBugReportSchema,
  sanitizeFilename,
  validateBugImage,
} from "@/features/bug-reports/validation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { requireCurrentMembership } from "@/lib/auth/session";
import { rejectCrossSiteMutation } from "@/lib/security/request";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;

  const principal = await requireAuthenticatedUser();
  const membership = await requireCurrentMembership();
  const formData = await request.formData();
  const parsed = customerBugReportSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    stepsToReproduce: formData.get("stepsToReproduce") || undefined,
    expectedBehavior: formData.get("expectedBehavior") || undefined,
    actualBehavior: formData.get("actualBehavior") || undefined,
    severity: formData.get("severity") || undefined,
    relevantRoute: formData.get("relevantRoute") || undefined,
    relevantFeature: formData.get("relevantFeature") || undefined,
    diagnosticConsent: formData.get("diagnosticConsent") === "true",
    viewportWidth: formData.get("viewportWidth") || undefined,
    viewportHeight: formData.get("viewportHeight") || undefined,
    browserOs: formData.get("browserOs") || undefined,
    clientErrorReference: formData.get("clientErrorReference") || undefined,
    idempotencyKey: formData.get("idempotencyKey"),
    correlationId: formData.get("correlationId") || randomUUID(),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const client = createAdminSupabaseClient();
  const repository = new BugReportRepository(client);
  const existing = await repository.findIdempotent(
    membership.organizationId,
    membership.applicationUserId,
    parsed.data.idempotencyKey,
  );
  if (existing)
    return NextResponse.json({ accepted: true });
  if (
    !allowBugReportSubmission(
      `${membership.organizationId}:${principal.id}`,
    )
  ) {
    return NextResponse.json(
      { message: "Too many reports. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const reportId = await repository.create(
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
      const validated = await validateBugImage(image);
      const filename = sanitizeFilename(image.name);
      const path = `${membership.organizationId}/${reportId}/${randomUUID()}-${filename}`;
      const { error } = await client.storage
        .from("bug-report-attachments")
        .upload(path, validated.bytes, {
          contentType: validated.mimeType,
          upsert: false,
        });
      if (error) throw new Error(error.message);
      uploadedPath = path;
      await repository.addAttachment({
        reportId,
        organizationId: membership.organizationId,
        path,
        filename,
        mimeType: validated.mimeType,
        size: image.size,
      });
    } catch {
      if (uploadedPath)
        await client.storage.from("bug-report-attachments").remove([uploadedPath]);
      attachmentWarning =
        "Your report was saved, but the image could not be attached.";
    }
  }

  return NextResponse.json(
    { accepted: true, attachmentWarning },
    { status: 201 },
  );
}
