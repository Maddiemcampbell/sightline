import type { RiskCategory, RiskSeverity } from "@/domain/types";

export type DetectionDocument = {
  id: string;
  projectId: string | null;
  vendorId: string | null;
  category: string;
  name: string;
  documentDate: string | null;
  fields: Readonly<Record<string, unknown>>;
};

export type DetectionProject = {
  id: string;
  name: string;
  status: "planning" | "active" | "on_hold" | "complete" | "cancelled";
  concreteTemperatureThresholdF: number;
};

export type DetectionVendor = { id: string; name: string };

export type DetectionContext = {
  now: Date;
  documents: readonly DetectionDocument[];
  projects: readonly DetectionProject[];
  vendors: readonly DetectionVendor[];
  activeProjectVendorPairs: ReadonlySet<string>;
};

export type DetectedEvidence = {
  detectionKey: string;
  documentId: string;
  title: string;
  description: string;
  sourceExcerpt: string;
  observedAt: string;
};

export type DetectedRisk = {
  detectionKey: string;
  projectId: string;
  vendorId: string | null;
  title: string;
  summary: string;
  category: RiskCategory;
  severity: RiskSeverity;
  potentialExposureCents: number;
  estimatedMarginImpactCents: number;
  confidenceScore: number;
  whyItMatters: string;
  dueAt: string | null;
  evidence: readonly DetectedEvidence[];
  recommendedAction: string;
};

export type DetectionRule = {
  id: string;
  detect(context: DetectionContext): readonly DetectedRisk[];
};

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export function stringField(
  document: DetectionDocument,
  key: string,
): string | null {
  const value = document.fields[key];
  return typeof value === "string" ? value : null;
}

export function numberField(
  document: DetectionDocument,
  key: string,
): number | null {
  const value = document.fields[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function stringArrayField(
  document: DetectionDocument,
  key: string,
): readonly string[] {
  const value = document.fields[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
