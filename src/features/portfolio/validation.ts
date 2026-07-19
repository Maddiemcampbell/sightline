import { z } from "zod";

const firstValue = z.preprocess(
  (value) => (Array.isArray(value) ? value[0] : value),
  z.string().optional(),
);

export const projectFiltersSchema = z.object({
  q: firstValue.transform((value) => value?.trim().slice(0, 120) ?? ""),
  stage: firstValue.pipe(
    z
      .enum(["all", "planning", "active", "on_hold", "complete", "cancelled"])
      .catch("all"),
  ),
  sort: firstValue.pipe(
    z.enum(["exposure", "margin", "name", "activity"]).catch("exposure"),
  ),
});

export const riskFiltersSchema = z.object({
  view: firstValue.pipe(z.enum(["active", "resolved", "all"]).catch("active")),
  q: firstValue.transform((value) => value?.trim().slice(0, 120) ?? ""),
  category: firstValue.pipe(
    z
      .enum([
        "all",
        "insurance",
        "schedule",
        "documentation",
        "contract",
        "safety",
        "financial",
        "vendor",
        "weather",
        "other",
      ])
      .catch("all"),
  ),
  severity: firstValue.pipe(
    z.enum(["all", "low", "medium", "high", "critical"]).catch("all"),
  ),
  status: firstValue.pipe(
    z
      .enum([
        "all",
        "monitoring",
        "action_needed",
        "in_progress",
        "resolved",
        "dismissed",
      ])
      .catch("all"),
  ),
  project: firstValue
    .pipe(z.string().max(100).catch("all"))
    .transform((value) => value ?? "all"),
  due: firstValue.pipe(
    z.enum(["all", "overdue", "7_days", "30_days", "none"]).catch("all"),
  ),
  sort: firstValue.pipe(
    z
      .enum(["exposure", "confidence", "severity", "due", "detected"])
      .catch("exposure"),
  ),
});

export type ProjectFilters = z.infer<typeof projectFiltersSchema>;
export type RiskFilters = z.infer<typeof riskFiltersSchema>;
