export type RetrievalEvidence = Readonly<{
  id: string;
  title: string;
  excerpt: string;
  why_it_matters: string;
  evidence_type: string;
  relevance_score: number;
  document_id: string | null;
}>;

export function selectRelevantEvidence(
  question: string,
  evidence: readonly RetrievalEvidence[],
  limit = 4,
) {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 4);
  return evidence
    .map((item) => {
      const searchable =
        `${item.title} ${item.excerpt} ${item.why_it_matters} ${item.evidence_type}`.toLowerCase();
      const matches = terms.filter((term) => searchable.includes(term)).length;
      return { item, score: item.relevance_score + matches * 25 };
    })
    .toSorted((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item }) => item);
}
