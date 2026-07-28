import { z } from "zod";

import { BUG_SEVERITIES, BUG_STATUSES } from "./types";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

export const customerBugReportSchema = z.object({
  title: z.string().trim().min(3, "Enter a descriptive title.").max(160),
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened in at least 10 characters.")
    .max(10_000),
  stepsToReproduce: optionalText(10_000),
  expectedBehavior: optionalText(5_000),
  actualBehavior: optionalText(5_000),
  severity: z.enum(BUG_SEVERITIES).optional(),
  relevantRoute: optionalText(500),
  relevantFeature: optionalText(160),
  diagnosticConsent: z.boolean().default(false),
  viewportWidth: z.coerce.number().int().min(1).max(20_000).optional(),
  viewportHeight: z.coerce.number().int().min(1).max(20_000).optional(),
  browserOs: optionalText(500),
  clientErrorReference: optionalText(240),
  idempotencyKey: z.uuid(),
  correlationId: z.uuid(),
});

export const bugReportAdminUpdateSchema = z.object({
  reportId: z.uuid(),
  status: z.enum(BUG_STATUSES),
  assignedOperatorId: z.uuid().nullable(),
  resolutionNotes: optionalText(10_000),
  relatedReleaseId: z.uuid().nullable(),
  externalIssueReference: optionalText(500),
});

export const bugReportNoteSchema = z.object({
  reportId: z.uuid(),
  body: z.string().trim().min(1).max(10_000),
});

export const MAX_BUG_IMAGE_BYTES = 5 * 1024 * 1024;
export type ValidatedImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
};

export async function validateBugImage(file: File): Promise<ValidatedImage> {
  if (file.size < 1 || file.size > MAX_BUG_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 5 MB.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectImageType(bytes);
  if (!mimeType) throw new Error("Upload a valid PNG, JPEG, or WebP image.");
  return { bytes, mimeType };
}

export function detectImageType(
  bytes: Uint8Array,
): ValidatedImage["mimeType"] | null {
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    )
  )
    return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return "image/webp";
  return null;
}

export function sanitizeFilename(filename: string): string {
  const normalized = filename
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || "screenshot";
}
