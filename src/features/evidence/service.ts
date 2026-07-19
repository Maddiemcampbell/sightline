import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { groupEvidence } from "@/features/evidence/grouping";
import { EvidenceRepository } from "@/features/evidence/repository";
import type {
  EvidenceExperience,
  EvidenceItemView,
} from "@/features/evidence/types";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export class EvidenceRetrievalService {
  private readonly repository: EvidenceRepository;
  constructor(client: SupabaseClient<AppDatabase>) {
    this.repository = new EvidenceRepository(client);
  }

  async listForRisk(context: ActorContext, riskId: string) {
    return this.repository.listForRisk(context, riskId);
  }

  async getExperience(
    context: ActorContext,
    riskId: string,
  ): Promise<EvidenceExperience> {
    const [risk, rows] = await Promise.all([
      this.repository.requireRisk(context, riskId),
      this.repository.listForRisk(context, riskId),
    ]);
    const documentIds = [
      ...new Set(
        rows.flatMap((row) => (row.document_id ? [row.document_id] : [])),
      ),
    ];
    const documents = await this.repository.listDocuments(context, documentIds);
    const documentById = new Map(
      documents.map((document) => [document.id, document]),
    );
    const items = rows.map((row): EvidenceItemView => {
      const document = row.document_id
        ? documentById.get(row.document_id)
        : null;
      return {
        id: row.id,
        documentId: row.document_id,
        documentAvailable: Boolean(
          document?.storage_path && !document.archived_at,
        ),
        evidenceType: row.evidence_type,
        supportType: row.support_type,
        title: row.title,
        excerpt: row.excerpt,
        sourceLabel: row.source_label,
        sourceLocation: row.source_location,
        pageNumber: row.page_number,
        lineStart: row.line_start,
        lineEnd: row.line_end,
        occurredAt: row.occurred_at,
        relevanceScore: row.relevance_score,
        whyItMatters: row.why_it_matters,
      };
    });
    const groups = groupEvidence(items);
    const averageRelevance = items.length
      ? Math.round(
          items.reduce((sum, item) => sum + item.relevanceScore, 0) /
            items.length,
        )
      : 0;
    const sourceTypes = new Set(items.map((item) => item.evidenceType));
    return {
      riskId,
      confidenceScore: risk.confidence_score,
      items,
      groups,
      explanation: {
        evidenceSummary: items.length
          ? `${groups.direct.length} direct source${groups.direct.length === 1 ? "" : "s"} and ${groups.inferred.length} labeled inference${groups.inferred.length === 1 ? "" : "s"} support this risk.`
          : "No evidence has been attached to this risk.",
        confidenceFactors: items.length
          ? [
              `${items.length} cited evidence record${items.length === 1 ? "" : "s"}`,
              `${sourceTypes.size} source type${sourceTypes.size === 1 ? "" : "s"}`,
              `${averageRelevance}% average relevance`,
              `${risk.confidence_score}% risk confidence`,
            ]
          : ["No evidence-based confidence factors are available."],
        missingInformation: [
          ...(items.some((item) => item.documentId && !item.documentAvailable)
            ? ["One or more source documents are unavailable or archived."]
            : []),
          ...(items.some((item) => !item.sourceLocation && !item.pageNumber)
            ? ["Some citations do not include a page or source location."]
            : []),
          ...(!items.length
            ? ["Supporting source records have not been attached."]
            : []),
        ],
        assumptions: groups.assumption.length
          ? groups.assumption.map((item) => item.excerpt)
          : groups.inferred.length
            ? [
                "Inferred conclusions are labeled separately and should be confirmed by a person.",
              ]
            : [
                "No material assumptions are recorded in the supplied evidence.",
              ],
      },
    };
  }
}
