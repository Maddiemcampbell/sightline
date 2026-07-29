import {
  RISK_TAXONOMY_VERSION,
  type AnalyticsRisk,
  type NormalizedRiskCategory,
  type RiskMapping,
} from "@/features/risk-analytics/types";

const taxonomyPairs: readonly (readonly [NormalizedRiskCategory, string])[] = [
  ["financial", "Financial"],
  ["schedule", "Schedule"],
  ["safety", "Safety"],
  ["compliance", "Compliance"],
  ["quality", "Quality"],
  ["contractual", "Contractual"],
  ["procurement", "Procurement"],
  ["labor", "Labor"],
  ["vendor_subcontractor", "Vendor / subcontractor"],
  ["documentation", "Documentation"],
  ["change_orders", "Change orders"],
  ["environmental", "Environmental"],
  ["operational", "Operational"],
  ["insurance_claims", "Insurance / claims"],
  ["other", "Other / unmapped"],
];
export const riskTaxonomy: readonly {
  id: NormalizedRiskCategory;
  label: string;
}[] = taxonomyPairs.map(([id, label]) => ({ id, label }));

const allowed = new Set(riskTaxonomy.map(({ id }) => id));
const structured: Record<string, NormalizedRiskCategory> = {
  financial: "financial",
  schedule: "schedule",
  safety: "safety",
  contract: "contractual",
  vendor: "vendor_subcontractor",
  documentation: "documentation",
  weather: "environmental",
  insurance: "insurance_claims",
  other: "other",
};
const aliases: Record<string, NormalizedRiskCategory> = {
  budget: "financial",
  cost: "financial",
  regulatory: "compliance",
  workmanship: "quality",
  subcontractor: "vendor_subcontractor",
  procurement: "procurement",
  labor: "labor",
  "change order": "change_orders",
  operations: "operational",
};

export function normalizeRiskCategory(risk: AnalyticsRisk): RiskMapping {
  const manual = risk.normalized_category_id?.trim().toLowerCase();
  if (manual && allowed.has(manual as NormalizedRiskCategory))
    return {
      originalCategory: risk.category,
      normalizedCategory: manual as NormalizedRiskCategory,
      source: "manual",
      confidence: risk.category_mapping_confidence ?? 100,
      version: risk.taxonomy_version ?? RISK_TAXONOMY_VERSION,
    };
  const exact = structured[risk.category];
  if (exact)
    return {
      originalCategory: risk.category,
      normalizedCategory: exact,
      source: "structured",
      confidence: 100,
      version: RISK_TAXONOMY_VERSION,
    };
  const alias = aliases[risk.category.toLowerCase()];
  return {
    originalCategory: risk.category,
    normalizedCategory: alias ?? "other",
    source: alias ? "exact_alias" : "unmapped",
    confidence: alias ? 90 : 0,
    version: RISK_TAXONOMY_VERSION,
  };
}

export function categoryLabel(id: NormalizedRiskCategory) {
  return (
    riskTaxonomy.find((item) => item.id === id)?.label ?? "Other / unmapped"
  );
}
