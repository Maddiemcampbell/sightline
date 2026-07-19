import type { EvidenceSupportType, EvidenceType } from "@/domain/types";

export type EvidenceItemView = Readonly<{
  id: string;
  documentId: string | null;
  documentAvailable: boolean;
  evidenceType: EvidenceType;
  supportType: EvidenceSupportType;
  title: string;
  excerpt: string;
  sourceLabel: string;
  sourceLocation: string | null;
  pageNumber: number | null;
  lineStart: number | null;
  lineEnd: number | null;
  occurredAt: string;
  relevanceScore: number;
  whyItMatters: string;
}>;

export type EvidenceExperience = Readonly<{
  riskId: string;
  confidenceScore: number;
  items: readonly EvidenceItemView[];
  groups: Readonly<
    Record<"direct" | "inferred" | "assumption", readonly EvidenceItemView[]>
  >;
  explanation: Readonly<{
    evidenceSummary: string;
    confidenceFactors: readonly string[];
    missingInformation: readonly string[];
    assumptions: readonly string[];
  }>;
}>;
