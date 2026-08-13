import type { OrganizationCitation } from "@/domain/ai/organization-question";

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

const organizationCitationWeight: Readonly<
  Record<OrganizationCitation["entityType"], number>
> = {
  observation: 60,
  evidence: 50,
  risk: 40,
  action: 35,
  resolution: 30,
  project: 25,
  activity: 20,
  document: 15,
  forecast: 70,
};

export function selectRelevantOrganizationCitations(
  question: string,
  citations: readonly OrganizationCitation[],
  limit = 40,
): OrganizationCitation[] {
  const terms = question
    .toLocaleLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 3);
  return citations
    .map((citation) => {
      const searchable =
        `${citation.title} ${citation.excerpt}`.toLocaleLowerCase();
      const matches = terms.filter((term) => searchable.includes(term)).length;
      return {
        citation,
        score:
          organizationCitationWeight[citation.entityType] +
          matches * 30 +
          organizationIntentBoost(question, citation.entityType),
      };
    })
    .toSorted(
      (left, right) =>
        right.score - left.score ||
        left.citation.title.localeCompare(right.citation.title),
    )
    .slice(0, limit)
    .map(({ citation }) => citation);
}

function organizationIntentBoost(
  question: string,
  type: OrganizationCitation["entityType"],
): number {
  const normalized = question.toLocaleLowerCase();
  if (/change|week|recent|activity/.test(normalized) && type === "activity")
    return 80;
  if (/overdue|action|priorit/.test(normalized) && type === "action") return 80;
  if (
    /document|evidence|source|missing/.test(normalized) &&
    (type === "document" || type === "evidence")
  )
    return 70;
  if (
    /histor|similar|resolved|outcome/.test(normalized) &&
    type === "resolution"
  )
    return 80;
  if (
    /forecast|outlook|cash.?flow|margin|trajectory|scenario|likely|confidence|estimated/.test(
      normalized,
    ) &&
    type === "forecast"
  )
    return 100;
  if (
    /financial|exposure|profit|cost|saving/.test(normalized) &&
    (type === "risk" || type === "project" || type === "forecast")
  )
    return 60;
  if (/project|compare|performance/.test(normalized) && type === "project")
    return 60;
  return 0;
}
