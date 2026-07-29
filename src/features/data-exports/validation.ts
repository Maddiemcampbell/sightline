import { z } from "zod";

export const EXPORT_FORMATS = ["csv", "json", "zip"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const dataExportRequestSchema = z.object({
  format: z.enum(EXPORT_FORMATS),
});

export const dataExportIdSchema = z.uuid();
