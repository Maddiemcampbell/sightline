import type {
  ExecutiveRecommendation,
  HistoricalRiskMatch,
  HomepageIntelligence,
  ObservationEvidence,
  PortfolioObservation,
  RootCauseSuggestion,
  RiskRelationship,
} from "@/features/portfolio-intelligence/types";

export const PORTFOLIO_ALGORITHM_VERSION = "portfolio-deterministic-v1";

type ProjectInput = Readonly<{
  id: string;
  name: string;
  status: string;
}>;
type RiskInput = Readonly<{
  id: string;
  project_id: string | null;
  vendor_id: string | null;
  detection_key: string | null;
  category: string;
  title: string;
  summary: string;
  status: string;
  detected_at: string;
  resolved_at: string | null;
  potential_exposure_cents: number;
}>;
type ActionInput = Readonly<{
  id: string;
  risk_id: string;
  title: string;
  status: string;
  due_at: string | null;
}>;
type DocumentInput = Readonly<{
  id: string;
  project_id: string | null;
  archived_at: string | null;
}>;
type VendorInput = Readonly<{ id: string; name: string }>;
type EvidenceInput = Readonly<{
  risk_id: string;
  document_id: string | null;
}>;
type ResolutionInput = Readonly<{
  risk_id: string;
  summary: string;
  resolution_type: string;
  resolved_at: string;
  exposure_before_cents: number;
  remaining_exposure_cents: number;
  estimated_loss_avoided_cents: number | null;
  warning_useful: boolean;
  prediction_accurate: boolean;
  reopened_at: string | null;
}>;

export function derivePortfolioObservations(input: {
  projects: readonly ProjectInput[];
  risks: readonly RiskInput[];
  actions: readonly ActionInput[];
  documents: readonly DocumentInput[];
  vendors: readonly VendorInput[];
  now: Date;
}): PortfolioObservation[] {
  const activeProjects = input.projects.filter(
    (project) => project.status === "active",
  );
  const projectById = new Map(
    input.projects.map((project) => [project.id, project]),
  );
  const activeRisks = input.risks.filter(
    (risk) => !["resolved", "dismissed"].includes(risk.status),
  );
  const observations: PortfolioObservation[] = [];

  const documentedProjects = new Set(
    input.documents
      .filter((document) => !document.archived_at && document.project_id)
      .map((document) => document.project_id!),
  );
  const missingDocuments = activeProjects.filter(
    (project) => !documentedProjects.has(project.id),
  );
  if (missingDocuments.length >= 2) {
    const projectIds = missingDocuments.map((project) => project.id);
    const relatedRisks = activeRisks.filter(
      (risk) => risk.project_id && projectIds.includes(risk.project_id),
    );
    observations.push({
      key: `documentation-gap:${projectIds.toSorted().join(",")}`,
      type: "documentation_gap",
      title: `Document coverage is missing on ${missingDocuments.length} active projects`,
      summary:
        "These active projects have no current document metadata in Sightline, limiting evidence-backed detection and follow-through.",
      supportingEvidence: missingDocuments.map((project) =>
        evidence("project", project.id, project.name, "0 active documents"),
      ),
      confidence: 100,
      affectedProjectIds: projectIds,
      affectedProjects: missingDocuments.map(projectView),
      businessImpactEstimateCents: sumExposure(relatedRisks),
      businessImpactExplanation:
        "Impact is the current estimated exposure of unresolved risks on the affected projects; it is not an estimate of missing-document cost.",
      recommendedNextStep:
        "Ask each project lead to upload or connect the current contract, insurance, schedule, and daily-log records.",
      algorithmVersion: PORTFOLIO_ALGORITHM_VERSION,
    });
  }

  const vendorById = new Map(
    input.vendors.map((vendor) => [vendor.id, vendor]),
  );
  const vendorCounts = groupCount(
    activeRisks.flatMap((risk) => (risk.vendor_id ? [risk.vendor_id] : [])),
  );
  const rankedVendors = [...vendorCounts.entries()].toSorted(
    (a, b) => b[1] - a[1],
  );
  const vendorRiskTotal = rankedVendors.reduce(
    (sum, [, count]) => sum + count,
    0,
  );
  const topVendors = rankedVendors.slice(0, 2);
  const topVendorCount = topVendors.reduce((sum, [, count]) => sum + count, 0);
  const vendorShare = vendorRiskTotal
    ? Math.round((topVendorCount / vendorRiskTotal) * 100)
    : 0;
  if (vendorRiskTotal >= 3 && topVendors.length >= 1 && vendorShare >= 40) {
    const topIds = new Set(topVendors.map(([id]) => id));
    const relatedRisks = activeRisks.filter(
      (risk) => risk.vendor_id && topIds.has(risk.vendor_id),
    );
    const affected = affectedProjects(relatedRisks, projectById);
    observations.push({
      key: `vendor-concentration:${topVendors
        .map(([id]) => id)
        .toSorted()
        .join(",")}`,
      type: "vendor_concentration",
      title: `${topVendors.length === 1 ? "One vendor accounts" : "Two vendors account"} for ${vendorShare}% of vendor-linked unresolved risks`,
      summary: `${topVendorCount} of ${vendorRiskTotal} unresolved risks with an assigned vendor are concentrated among ${topVendors.length === 1 ? "one vendor" : "two vendors"}.`,
      supportingEvidence: topVendors.map(([id, count]) =>
        evidence(
          "vendor",
          id,
          vendorById.get(id)?.name ?? "Unknown vendor",
          `${count} unresolved risks`,
        ),
      ),
      confidence: 100,
      affectedProjectIds: affected.map((project) => project.id),
      affectedProjects: affected,
      businessImpactEstimateCents: sumExposure(relatedRisks),
      businessImpactExplanation:
        "Impact is the summed current estimated exposure of the unresolved risks linked to these vendors.",
      recommendedNextStep:
        "Review the concentrated vendors with project leaders and assign one accountable owner for cross-project follow-through.",
      algorithmVersion: PORTFOLIO_ALGORITHM_VERSION,
    });
  }

  const categoryGroups = groupBy(activeRisks, (risk) => risk.category);
  const recurring = [...categoryGroups.entries()]
    .map(([category, risks]) => ({
      category,
      risks,
      projects: affectedProjects(risks, projectById),
    }))
    .filter((item) => item.risks.length >= 3 && item.projects.length >= 2)
    .toSorted((a, b) => b.risks.length - a.risks.length)[0];
  if (recurring) {
    observations.push({
      key: `recurring-risk:${recurring.category}`,
      type: "recurring_risk",
      title: `${titleCase(recurring.category)} risks recur across ${recurring.projects.length} projects`,
      summary: `${recurring.risks.length} unresolved ${recurring.category.replaceAll("_", " ")} risks appear across multiple projects.`,
      supportingEvidence: recurring.projects.map((project) => {
        const count = recurring.risks.filter(
          (risk) => risk.project_id === project.id,
        ).length;
        return evidence(
          "project",
          project.id,
          project.name,
          `${count} unresolved risks`,
        );
      }),
      confidence: 100,
      affectedProjectIds: recurring.projects.map((project) => project.id),
      affectedProjects: recurring.projects,
      businessImpactEstimateCents: sumExposure(recurring.risks),
      businessImpactExplanation:
        "Impact is the summed current estimated exposure of unresolved risks in this category.",
      recommendedNextStep:
        "Compare the affected projects for a shared control gap and assign an organization-level corrective action.",
      algorithmVersion: PORTFOLIO_ALGORITHM_VERSION,
    });
  }

  const riskById = new Map(input.risks.map((risk) => [risk.id, risk]));
  const overdue = input.actions.filter(
    (action) =>
      action.due_at &&
      Date.parse(action.due_at) < input.now.getTime() &&
      !["completed", "dismissed"].includes(action.status),
  );
  const overdueRisks = overdue.flatMap((action) => {
    const risk = riskById.get(action.risk_id);
    return risk ? [risk] : [];
  });
  const overdueProjects = affectedProjects(overdueRisks, projectById);
  if (overdue.length >= 3 && overdueProjects.length >= 2) {
    observations.push({
      key: `overdue-actions:${overdueProjects
        .map((project) => project.id)
        .toSorted()
        .join(",")}`,
      type: "overdue_actions",
      title: `${overdue.length} risk actions are overdue across ${overdueProjects.length} projects`,
      summary:
        "Open follow-up has passed its due date across multiple projects, increasing the chance that known risks remain unmitigated.",
      supportingEvidence: overdue
        .slice(0, 8)
        .map((action) =>
          evidence(
            "action",
            action.id,
            action.title,
            `Due ${action.due_at!.slice(0, 10)}`,
          ),
        ),
      confidence: 100,
      affectedProjectIds: overdueProjects.map((project) => project.id),
      affectedProjects: overdueProjects,
      businessImpactEstimateCents: sumExposure(overdueRisks),
      businessImpactExplanation:
        "Impact is the de-duplicated estimated exposure of risks with overdue actions.",
      recommendedNextStep:
        "Review overdue owners and dates in the action register, then escalate actions without a credible completion plan.",
      algorithmVersion: PORTFOLIO_ALGORITHM_VERSION,
    });
  }
  return observations;
}

export function deriveRiskRelationships(
  risks: readonly RiskInput[],
  evidenceRows: readonly EvidenceInput[],
): RiskRelationship[] {
  const documentIds = new Map<string, Set<string>>();
  for (const row of evidenceRows) {
    if (!row.document_id) continue;
    const set = documentIds.get(row.risk_id) ?? new Set<string>();
    set.add(row.document_id);
    documentIds.set(row.risk_id, set);
  }
  const relationships: RiskRelationship[] = [];
  for (let leftIndex = 0; leftIndex < risks.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < risks.length;
      rightIndex += 1
    ) {
      const left = risks[leftIndex]!;
      const right = risks[rightIndex]!;
      if (left.detection_key && left.detection_key === right.detection_key) {
        relationships.push(
          relationship(left.id, right.id, "duplicate", 100, [
            evidence(
              "risk",
              right.id,
              right.title,
              `Matching detection key: ${left.detection_key}`,
            ),
          ]),
        );
      }
      if (left.vendor_id && left.vendor_id === right.vendor_id) {
        relationships.push(
          relationship(left.id, right.id, "same_vendor", 100, [
            evidence(
              "vendor",
              left.vendor_id,
              "Shared vendor",
              "Both risks reference the same vendor record",
            ),
          ]),
        );
      }
      const sharedDocument = [...(documentIds.get(left.id) ?? [])].find((id) =>
        documentIds.get(right.id)?.has(id),
      );
      if (sharedDocument) {
        relationships.push(
          relationship(left.id, right.id, "same_document", 100, [
            evidence(
              "document",
              sharedDocument,
              "Shared source document",
              "Both risks cite this document",
            ),
          ]),
        );
      }
    }
  }
  return relationships;
}

export function findHistoricalRiskMatches(input: {
  current: RiskInput;
  resolvedRisks: readonly RiskInput[];
  resolutions: readonly ResolutionInput[];
  projects: readonly ProjectInput[];
}): HistoricalRiskMatch[] {
  const projectById = new Map(
    input.projects.map((project) => [project.id, project]),
  );
  const resolutionByRisk = new Map(
    input.resolutions
      .filter((resolution) => !resolution.reopened_at)
      .map((resolution) => [resolution.risk_id, resolution]),
  );
  return input.resolvedRisks
    .flatMap((risk) => {
      const resolution = resolutionByRisk.get(risk.id);
      if (!resolution || risk.id === input.current.id) return [];
      const reasons: string[] = [];
      let score = 0;
      if (
        input.current.detection_key &&
        input.current.detection_key === risk.detection_key
      ) {
        score += 60;
        reasons.push("same deterministic detection pattern");
      }
      if (
        input.current.vendor_id &&
        input.current.vendor_id === risk.vendor_id
      ) {
        score += 25;
        reasons.push("same vendor");
      }
      if (input.current.category === risk.category) {
        score += 30;
        reasons.push("same risk category");
      }
      const titleSimilarity = jaccard(
        tokens(input.current.title),
        tokens(risk.title),
      );
      if (titleSimilarity >= 0.25) {
        score += Math.round(titleSimilarity * 25);
        reasons.push("similar risk language");
      }
      if (score < 30) return [];
      const resolvedAt = resolution.resolved_at;
      return [
        {
          riskId: risk.id,
          projectId: risk.project_id,
          projectName: risk.project_id
            ? (projectById.get(risk.project_id)?.name ?? "Unknown project")
            : "No project",
          title: risk.title,
          summary: risk.summary,
          detectedAt: risk.detected_at,
          resolvedAt,
          resolutionSummary: resolution.summary,
          resolutionType: resolution.resolution_type,
          timeToResolutionHours: Math.max(
            0,
            Math.round(
              (Date.parse(resolvedAt) - Date.parse(risk.detected_at)) /
                3_600_000,
            ),
          ),
          estimatedExposureCents: resolution.exposure_before_cents,
          remainingExposureCents: resolution.remaining_exposure_cents,
          estimatedLossAvoidedCents: resolution.estimated_loss_avoided_cents,
          outcome: `${titleCase(resolution.resolution_type)} · warning ${resolution.warning_useful ? "useful" : "not useful"} · prediction ${resolution.prediction_accurate ? "accurate" : "not accurate"}`,
          similarityScore: Math.min(score, 100),
          matchReasons: reasons,
        },
      ];
    })
    .toSorted((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, 3);
}

export function deriveHomepageIntelligence(input: {
  observations: readonly PortfolioObservation[];
  risks: readonly RiskInput[];
  resolutions: readonly ResolutionInput[];
  projects: readonly ProjectInput[];
  now: Date;
}): HomepageIntelligence {
  const ranked = [...input.observations].toSorted(
    (left, right) =>
      (right.businessImpactEstimateCents ?? 0) -
        (left.businessImpactEstimateCents ?? 0) ||
      right.affectedProjectIds.length - left.affectedProjectIds.length,
  );
  const portfolioWatch = ranked.slice(0, 3);
  const watchKeys = new Set(portfolioWatch.map((item) => item.key));
  const recentCutoff = input.now.getTime() - 30 * 86_400_000;
  const activeRisks = input.risks.filter(
    (risk) => !["resolved", "dismissed"].includes(risk.status),
  );
  const recentRiskProjectCounts = groupCount(
    activeRisks.flatMap((risk) =>
      risk.project_id && Date.parse(risk.detected_at) >= recentCutoff
        ? [risk.project_id]
        : [],
    ),
  );
  const emergingPatterns = ranked
    .filter((observation) => !watchKeys.has(observation.key))
    .map((observation) => ({
      observation,
      recentRiskCount: observation.affectedProjectIds.reduce(
        (sum, projectId) => sum + (recentRiskProjectCounts.get(projectId) ?? 0),
        0,
      ),
    }))
    .filter((pattern) => pattern.recentRiskCount > 0)
    .toSorted((left, right) => right.recentRiskCount - left.recentRiskCount)
    .slice(0, 3);

  const resolvedRisks = input.risks.filter(
    (risk) => risk.status === "resolved",
  );
  const previousQuarter = previousQuarterBounds(input.now);
  const historicalComparisons = activeRisks
    .flatMap((current) =>
      findHistoricalRiskMatches({
        current,
        resolvedRisks,
        resolutions: input.resolutions,
        projects: input.projects,
      }).map((match) => ({
        currentRiskId: current.id,
        currentRiskTitle: current.title,
        match,
      })),
    )
    .toSorted(
      (left, right) => right.match.similarityScore - left.match.similarityScore,
    )
    .filter(
      (comparison) =>
        Date.parse(comparison.match.resolvedAt) >= previousQuarter.start &&
        Date.parse(comparison.match.resolvedAt) < previousQuarter.end,
    )
    .filter(
      (comparison, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.currentRiskId === comparison.currentRiskId &&
            candidate.match.riskId === comparison.match.riskId,
        ) === index,
    )
    .slice(0, 3);

  const rootCauseSuggestions = deriveRootCauseSuggestions(
    ranked,
    historicalComparisons.map((comparison) => comparison.match),
  );
  return {
    portfolioWatch,
    emergingPatterns,
    historicalComparisons,
    rootCauseSuggestions,
    executiveRecommendations: deriveExecutiveRecommendations(
      portfolioWatch,
      rootCauseSuggestions,
    ),
  };
}

function previousQuarterBounds(now: Date) {
  const currentQuarterStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
  const currentQuarterStart = Date.UTC(
    now.getUTCFullYear(),
    currentQuarterStartMonth,
    1,
  );
  const previousQuarterStart = Date.UTC(
    now.getUTCFullYear(),
    currentQuarterStartMonth - 3,
    1,
  );
  return { start: previousQuarterStart, end: currentQuarterStart };
}

function deriveRootCauseSuggestions(
  observations: readonly PortfolioObservation[],
  historicalCases: readonly HistoricalRiskMatch[],
): RootCauseSuggestion[] {
  const byType = new Map(
    observations.map((observation) => [observation.type, observation]),
  );
  const candidates = [
    hypothesisCandidate({
      left: byType.get("documentation_gap"),
      right: byType.get("recurring_risk"),
      key: "documentation-coverage-recurring-risk",
      title: "Possible root cause: incomplete document coverage",
      hypothesis:
        "Incomplete document coverage may be contributing to recurring risks on the same projects.",
      confidence: 80,
      assumptions: [
        "Document metadata accurately reflects the current records available to Sightline.",
        "The recurring risk category depends on timely project documentation.",
      ],
      steps: [
        "Confirm whether the expected records exist outside Sightline.",
        "Compare missing record types with the evidence cited by each recurring risk.",
        "Interview affected project leads before changing controls or escalating.",
      ],
    }),
    hypothesisCandidate({
      left: byType.get("vendor_concentration"),
      right: byType.get("recurring_risk"),
      key: "vendor-concentration-recurring-risk",
      title: "Possible contributing factor: concentrated vendor exposure",
      hypothesis:
        "Concentration among the same vendors may be contributing to a recurring risk pattern across the affected projects.",
      confidence: 75,
      assumptions: [
        "Vendor assignments are complete and current.",
        "The vendor has meaningful control over the repeated risk condition.",
      ],
      steps: [
        "Validate the vendor assignment on each underlying risk.",
        "Compare contract scope, project controls, and issue chronology.",
        "Ask project leads for counterexamples before escalating to the vendor.",
      ],
    }),
    hypothesisCandidate({
      left: byType.get("overdue_actions"),
      right: byType.get("recurring_risk"),
      key: "overdue-follow-through-recurring-risk",
      title: "Possible contributing factor: delayed follow-through",
      hypothesis:
        "Overdue risk actions may be allowing a recurring issue to remain unresolved across multiple projects.",
      confidence: 70,
      assumptions: [
        "Action due dates remain credible.",
        "Completing the actions would materially mitigate the recurring risks.",
      ],
      steps: [
        "Confirm each overdue action is still relevant and correctly assigned.",
        "Review whether delays preceded worsening risk status.",
        "Escalate only actions with a validated mitigation dependency.",
      ],
    }),
  ].flatMap((candidate) => (candidate ? [candidate] : []));

  return candidates
    .filter(
      (candidate) =>
        candidate.confidence >= 70 &&
        candidate.evidence.length >= 2 &&
        candidate.supportingObservations.length >= 2,
    )
    .map((candidate) => ({
      ...candidate,
      similarHistoricalCases: historicalCases.slice(0, 2),
    }))
    .slice(0, 3);
}

function hypothesisCandidate(input: {
  left: PortfolioObservation | undefined;
  right: PortfolioObservation | undefined;
  key: string;
  title: string;
  hypothesis: string;
  confidence: number;
  assumptions: readonly string[];
  steps: readonly string[];
}): Omit<RootCauseSuggestion, "similarHistoricalCases"> | null {
  if (!input.left || !input.right) return null;
  const overlap = input.left.affectedProjectIds.filter((projectId) =>
    input.right?.affectedProjectIds.includes(projectId),
  );
  if (overlap.length < 2) return null;
  return {
    key: input.key,
    title: input.title,
    hypothesis: input.hypothesis,
    confidence: input.confidence,
    evidence: [
      ...input.left.supportingEvidence.slice(0, 2),
      ...input.right.supportingEvidence.slice(0, 2),
    ],
    assumptions: input.assumptions,
    supportingObservations: [input.left, input.right].map((observation) => ({
      key: observation.key,
      title: observation.title,
    })),
    recommendedInvestigationSteps: input.steps,
  };
}

function deriveExecutiveRecommendations(
  observations: readonly PortfolioObservation[],
  hypotheses: readonly RootCauseSuggestion[],
): ExecutiveRecommendation[] {
  const hypothesisRecommendations = hypotheses.map((hypothesis, index) => ({
    key: `hypothesis:${hypothesis.key}`,
    priority: index + 1,
    title: `Investigate: ${hypothesis.title.replace(/^Possible (root cause|contributing factor): /, "")}`,
    rationale: `${hypothesis.confidence}% hypothesis confidence based on ${hypothesis.supportingObservations.length} supporting observations.`,
    nextStep: hypothesis.recommendedInvestigationSteps[0]!,
    href: `#hypothesis-${hypothesis.key}`,
    source: "hypothesis" as const,
  }));
  const observationRecommendations = observations.map((observation, index) => ({
    key: `observation:${observation.key}`,
    priority: hypothesisRecommendations.length + index + 1,
    title: observation.title,
    rationale: observation.businessImpactExplanation,
    nextStep: observation.recommendedNextStep,
    href: observation.affectedProjectIds[0]
      ? `/projects/${observation.affectedProjectIds[0]}`
      : "/risks",
    source: "observation" as const,
  }));
  return [...hypothesisRecommendations, ...observationRecommendations]
    .slice(0, 5)
    .map((recommendation, index) => ({
      ...recommendation,
      priority: index + 1,
    }));
}

function relationship(
  sourceRiskId: string,
  targetRiskId: string,
  type: RiskRelationship["type"],
  confidence: number,
  supportingEvidence: ObservationEvidence[],
): RiskRelationship {
  return {
    sourceRiskId,
    targetRiskId,
    type,
    confidence,
    supportingEvidence,
    algorithmVersion: PORTFOLIO_ALGORITHM_VERSION,
  };
}

function evidence(
  entityType: ObservationEvidence["entityType"],
  entityId: string,
  label: string,
  value: string,
): ObservationEvidence {
  return { entityType, entityId, label, value };
}

function projectView(project: ProjectInput) {
  return { id: project.id, name: project.name };
}

function affectedProjects(
  risks: readonly RiskInput[],
  projects: ReadonlyMap<string, ProjectInput>,
) {
  return [
    ...new Set(
      risks.flatMap((risk) => (risk.project_id ? [risk.project_id] : [])),
    ),
  ].flatMap((id) => {
    const project = projects.get(id);
    return project ? [projectView(project)] : [];
  });
}

function sumExposure(risks: readonly RiskInput[]) {
  return [...new Map(risks.map((risk) => [risk.id, risk])).values()].reduce(
    (sum, risk) => sum + risk.potential_exposure_cents,
    0,
  );
}

function groupCount(values: readonly string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

function groupBy<T>(values: readonly T[], key: (value: T) => string) {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), value]);
  }
  return groups;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2),
  );
}

function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>) {
  const union = new Set([...left, ...right]);
  if (!union.size) return 0;
  return [...left].filter((token) => right.has(token)).length / union.size;
}
