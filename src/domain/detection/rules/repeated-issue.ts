import type { DetectionRule } from "@/domain/detection/types";
import { daysBetween, slug, stringArrayField } from "@/domain/detection/types";

export function repeatedIssueConfidence(logCount: number): number {
  return Math.min(94, 86 + Math.max(0, logCount - 3) * 4);
}

export const repeatedIssueRule: DetectionRule = {
  id: "repeated_unresolved_issue",
  detect(context) {
    const projects = new Map(
      context.projects.map((project) => [project.id, project]),
    );
    const rfiKeys = new Set(
      context.documents
        .filter((document) => document.category === "rfi" && document.projectId)
        .flatMap((document) =>
          stringArrayField(document, "related_issue_keywords").map(
            (keyword) =>
              `${document.projectId}:${keyword.toLowerCase().trim()}`,
          ),
        ),
    );
    const groups = new Map<
      string,
      {
        projectId: string;
        keyword: string;
        documents: (typeof context.documents)[number][];
      }
    >();
    for (const document of context.documents) {
      if (
        document.category !== "daily_log" ||
        !document.projectId ||
        !document.documentDate
      )
        continue;
      const logDate = new Date(`${document.documentDate}T12:00:00Z`);
      const age = daysBetween(logDate, context.now);
      if (age < 0 || age > 7) continue;
      for (const rawKeyword of stringArrayField(document, "issue_keywords")) {
        const keyword = rawKeyword.toLowerCase().trim();
        if (!keyword) continue;
        const key = `${document.projectId}:${keyword}`;
        const group = groups.get(key) ?? {
          projectId: document.projectId,
          keyword,
          documents: [],
        };
        if (!group.documents.some((item) => item.id === document.id))
          group.documents.push(document);
        groups.set(key, group);
      }
    }
    return [...groups.values()].flatMap((group) => {
      const project = projects.get(group.projectId);
      if (
        !project ||
        project.status !== "active" ||
        group.documents.length < 3 ||
        rfiKeys.has(`${group.projectId}:${group.keyword}`)
      )
        return [];
      const detectionKey = `repeated-issue:${slug(project.name)}:${slug(group.keyword)}`;
      return [
        {
          detectionKey,
          projectId: project.id,
          vendorId: null,
          title: `Daily logs repeatedly mention unresolved ${group.keyword}`,
          summary: `${group.documents.length} daily logs in seven days mention ${group.keyword}, and no related RFI is recorded.`,
          category: "documentation" as const,
          severity:
            group.documents.length >= 5
              ? ("high" as const)
              : ("medium" as const),
          potentialExposureCents: 14_500_000,
          estimatedMarginImpactCents: 7_200_000,
          confidenceScore: repeatedIssueConfidence(group.documents.length),
          whyItMatters:
            "Repeated field direction without a formal RFI weakens notice and entitlement records, increasing the chance that added work becomes unrecoverable cost.",
          dueAt: null,
          evidence: group.documents.map((document) => ({
            detectionKey: `${detectionKey}:${document.id}`,
            documentId: document.id,
            title: `Daily log mentions ${group.keyword}`,
            description: `${document.name} repeats the unresolved issue keyword.`,
            sourceExcerpt: `Issue keyword: ${group.keyword}`,
            observedAt: `${document.documentDate}T12:00:00Z`,
          })),
          recommendedAction: `Issue an RFI for ${group.keyword}, preserve daily records, and notify the owner before related work continues.`,
        },
      ];
    });
  },
};
