import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { createRiskEvidenceSchema } from "@/domain/validation";
import {
  EvidenceCard,
  formatSourceLocation,
} from "@/features/evidence/evidence-experience";
import { groupEvidence } from "@/features/evidence/grouping";
import type { EvidenceItemView } from "@/features/evidence/types";

const evidence: EvidenceItemView = {
  id: "70000000-0000-4000-8000-000000000001",
  documentId: "50000000-0000-4000-8000-000000000001",
  documentAvailable: true,
  evidenceType: "insurance_expiration",
  supportType: "direct",
  title: "Apex certificate expiration",
  excerpt: "Coverage expires July 23, 2026.",
  sourceLabel: "Apex Electric COI",
  sourceLocation: "Expiration date field",
  pageNumber: 1,
  lineStart: 12,
  lineEnd: 13,
  occurredAt: "2026-07-18T12:00:00.000Z",
  relevanceScore: 96,
  whyItMatters: "An expired certificate could stop site access.",
};

describe("risk evidence", () => {
  it("validates citations and rejects reversed line ranges", () => {
    const base = {
      organizationId: "10000000-0000-4000-8000-000000000001",
      riskId: "60000000-0000-4000-8000-000000000001",
      documentId: evidence.documentId,
      evidenceType: evidence.evidenceType,
      title: evidence.title,
      excerpt: evidence.excerpt,
      sourceLabel: evidence.sourceLabel,
      sourceLocation: evidence.sourceLocation,
      pageNumber: 1,
      lineStart: 13,
      lineEnd: 12,
      occurredAt: evidence.occurredAt,
      relevanceScore: evidence.relevanceScore,
      whyItMatters: evidence.whyItMatters,
    };
    expect(createRiskEvidenceSchema.safeParse(base).success).toBe(false);
    expect(
      createRiskEvidenceSchema.parse({ ...base, lineEnd: 14 }).supportType,
    ).toBe("direct");
  });

  it("groups direct evidence separately from inferences and assumptions", () => {
    const groups = groupEvidence([
      evidence,
      { ...evidence, id: "inferred", supportType: "inferred" },
      { ...evidence, id: "assumption", supportType: "assumption" },
    ]);
    expect(groups.direct).toHaveLength(1);
    expect(groups.inferred).toHaveLength(1);
    expect(groups.assumption).toHaveLength(1);
  });

  it("renders source details, highlighted excerpts, and secure links", () => {
    const markup = renderToStaticMarkup(<EvidenceCard item={evidence} />);
    expect(markup).toContain("Apex Electric COI");
    expect(markup).toContain("<mark");
    expect(markup).toContain("Page 1 · Lines 12–13 · Expiration date field");
    expect(markup).toContain(`/api/documents/${evidence.documentId}/download`);
  });

  it("handles missing documents without exposing a broken file link", () => {
    const unavailable = { ...evidence, documentAvailable: false };
    const markup = renderToStaticMarkup(<EvidenceCard item={unavailable} />);
    expect(markup).toContain("unavailable or archived");
    expect(markup).not.toContain("Open source document");
    expect(formatSourceLocation({ ...unavailable, pageNumber: null })).toBe(
      "Lines 12–13 · Expiration date field",
    );
  });
});
