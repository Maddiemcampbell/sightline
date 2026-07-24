import { z } from "zod";

export const DOCUMENT_BUCKET = "source-documents";
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const documentCategorySchema = z.enum([
  "contract",
  "insurance",
  "daily_log",
  "rfi",
  "change_order",
  "schedule",
  "incident_report",
  "other",
]);

const nullableId = z.preprocess(
  (value) => (value === "" ? null : value),
  z.uuid().nullable(),
);

export const documentMetadataSchema = z.object({
  name: z.string().trim().min(1).max(240),
  category: documentCategorySchema,
  projectId: nullableId,
  vendorId: nullableId,
  documentDate: z.preprocess(
    (value) => (value === "" ? null : value),
    z.iso.date().nullable(),
  ),
});

export const documentSearchSchema = z.object({
  q: z.preprocess(
    (value) => (Array.isArray(value) ? value[0] : value),
    z.string().trim().max(120).catch(""),
  ),
});

export const editDocumentSchema = documentMetadataSchema.extend({
  documentId: z.uuid(),
});

export const archiveDocumentSchema = z.object({ documentId: z.uuid() });
export const documentIdSchema = z.uuid();

export type AllowedDocumentMime =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/csv"
  | "image/jpeg"
  | "image/png";

export function sanitizeFilename(filename: string): string {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
  const collapsed = normalized
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return (collapsed || "document").slice(-120);
}

export function detectDocumentMime(
  bytes: Uint8Array,
  filename: string,
): AllowedDocumentMime | null {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) && extension === "pdf") {
    return "application/pdf";
  }
  if (
    startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) &&
    extension === "docx" &&
    containsAscii(bytes, "[Content_Types].xml") &&
    containsAscii(bytes, "word/")
  ) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (
    startsWith(bytes, [0xff, 0xd8, 0xff]) &&
    (extension === "jpg" || extension === "jpeg")
  ) {
    return "image/jpeg";
  }
  if (
    startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) &&
    extension === "png"
  ) {
    return "image/png";
  }
  if (extension === "csv" && isLikelyText(bytes)) {
    return "text/csv";
  }
  return null;
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function containsAscii(bytes: Uint8Array, value: string): boolean {
  const needle = new TextEncoder().encode(value);
  return bytes.some((_, index) =>
    needle.every((byte, offset) => bytes[index + offset] === byte),
  );
}

function isLikelyText(bytes: Uint8Array): boolean {
  if (bytes.length === 0 || bytes.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
}

export async function validateUploadFile(file: File): Promise<{
  bytes: Uint8Array;
  mimeType: AllowedDocumentMime;
  safeFilename: string;
}> {
  if (file.size === 0) throw new Error("Choose a non-empty file.");
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("Files must be 10 MB or smaller.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectDocumentMime(bytes, file.name);
  if (!mimeType) {
    throw new Error("Use a PDF, DOCX, CSV, JPG, or PNG file.");
  }
  if (file.type && file.type.toLowerCase() !== mimeType) {
    throw new Error("The file type does not match its contents.");
  }
  return { bytes, mimeType, safeFilename: sanitizeFilename(file.name) };
}
