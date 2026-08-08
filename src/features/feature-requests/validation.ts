import { z } from "zod";

import { FEATURE_REQUEST_PRIORITIES, FEATURE_REQUEST_STATUSES } from "./types";

const optionalText = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

export const customerFeatureRequestSchema = z.object({
  title: z.string().trim().min(3, "Enter a descriptive title.").max(160),
  description: z
    .string()
    .trim()
    .min(10, "Describe the feature in at least 10 characters.")
    .max(10_000),
  useCase: optionalText(10_000),
  desiredOutcome: optionalText(5_000),
  relevantRoute: optionalText(500),
  relevantFeature: optionalText(160),
  priority: z.enum(FEATURE_REQUEST_PRIORITIES).optional(),
  diagnosticConsent: z.boolean().default(false),
  viewportWidth: z.coerce.number().int().min(1).max(20_000).optional(),
  viewportHeight: z.coerce.number().int().min(1).max(20_000).optional(),
  browserOs: optionalText(500),
  idempotencyKey: z.uuid(),
  correlationId: z.uuid(),
});

export const featureRequestAdminUpdateSchema = z.object({
  requestId: z.uuid(),
  status: z.enum(FEATURE_REQUEST_STATUSES),
  assignedOperatorId: z.uuid().nullable(),
  resolutionNotes: optionalText(10_000),
  relatedReleaseId: z.uuid().nullable(),
  externalIssueReference: optionalText(500),
});

export const featureRequestNoteSchema = z.object({
  requestId: z.uuid(),
  body: z.string().trim().min(1).max(10_000),
});

export const MAX_FEATURE_REQUEST_IMAGE_BYTES = 5 * 1024 * 1024;

export type ValidatedFeatureImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  bytes: Uint8Array;
};

export async function validateFeatureImage(
  file: File,
): Promise<ValidatedFeatureImage> {
  if (file.size < 1 || file.size > MAX_FEATURE_REQUEST_IMAGE_BYTES)
    throw new Error("Image must be smaller than 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every(
      (value, index) => bytes[index] === value,
    )
  )
    return { mimeType: "image/png", bytes };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { mimeType: "image/jpeg", bytes };
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  )
    return { mimeType: "image/webp", bytes };
  throw new Error("Upload a valid PNG, JPEG, or WebP image.");
}

export function sanitizeFeatureFilename(filename: string): string {
  const normalized = filename
    .normalize("NFKC")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || "screenshot";
}
