import "server-only";

import {
  organizationQuestionContextSchema,
  type OrganizationCitation,
  type OrganizationQuestionContext,
} from "@/domain/ai/organization-question";
import { sanitizeUntrustedExcerpt } from "@/features/ai/prompt-security";
import type { AskSightlineRepository } from "@/features/ask-sightline/repository";
import { selectRelevantOrganizationCitations } from "@/features/ask-sightline/retrieval";
import { classifyOrganizationQuestion } from "@/features/ask-sightline/prompt-templates";
import {
  deriveHomepageIntelligence,
  derivePortfolioObservations,
} from "@/features/portfolio-intelligence/core";
import { formatMoney } from "@/features/daily-brief/formatters";
import type { ActorContext } from "@/lib/auth/authorization";
import type { AdvisorMode } from "@/features/workspace/types";

type RetrievedOrganization = Awaited<
  ReturnType<AskSightlineRepository["retrieveOrganization"]>
>;

export function buildOrganizationQuestionContext({
  context,
  retrieved,
  question,
  advisorMode,
  history,
  projectId,
  canViewFinancials,
  now,
}: {
  context: ActorContext;
  retrieved: RetrievedOrganization;
  question: string;
  advisorMode: AdvisorMode;
  history: OrganizationQuestionContext["history"];
  projectId: string | null;
  canViewFinancials: boolean;
  now: Date;
}): OrganizationQuestionContext {
  const projectById = new Map(
    retrieved.projects.map((project) => [project.id, project]),
  );
  const vendorById = new Map(
    retrieved.vendors.map((vendor) => [vendor.id, vendor]),
  );
  const riskById = new Map(retrieved.risks.map((risk) => [risk.id, risk]));
  const safeRisks = retrieved.risks.map((risk) =>
    canViewFinancials ? risk : { ...risk, potential_exposure_cents: 0 },
  );
  const observations = derivePortfolioObservations({
    projects: retrieved.projects,
    risks: safeRisks,
    actions: retrieved.actions,
    documents: retrieved.documents,
    vendors: retrieved.vendors,
    now,
  }).map((observation) =>
    canViewFinancials
      ? observation
      : {
          ...observation,
          businessImpactEstimateCents: null,
          businessImpactExplanation:
            "Financial impact is hidden because this role cannot view financial exposure.",
        },
  );
  const intelligence = deriveHomepageIntelligence({
    observations,
    projects: retrieved.projects,
    risks: safeRisks,
    resolutions: retrieved.resolutions.map((resolution) =>
      canViewFinancials
        ? resolution
        : {
            ...resolution,
            exposure_before_cents: 0,
            remaining_exposure_cents: 0,
            estimated_loss_avoided_cents: null,
          },
    ),
    now,
  });

  const citations: OrganizationCitation[] = [
    ...observations.map((observation): OrganizationCitation => ({
      id: `observation:${observation.key}`,
      entityType: "observation",
      title: observation.title,
      excerpt: sanitizeUntrustedExcerpt(
        [
          observation.title,
          observation.summary,
          `${observation.confidence}% confidence.`,
          observation.businessImpactEstimateCents != null
            ? `${formatMoney(observation.businessImpactEstimateCents)} supported exposure across affected unresolved risks.`
            : observation.businessImpactExplanation,
          `Affected projects: ${
            observation.affectedProjects
              .map((project) => project.name)
              .join(", ") || "none identified"
          }.`,
          `Recommended next step: ${observation.recommendedNextStep}`,
        ].join(" "),
      ),
      href: observation.affectedProjectIds[0]
        ? `/projects/${observation.affectedProjectIds[0]}`
        : "/risks",
    })),
    ...intelligence.rootCauseSuggestions.map(
      (suggestion): OrganizationCitation => ({
        id: `observation:hypothesis:${suggestion.key}`,
        entityType: "observation",
        title: suggestion.title,
        excerpt: sanitizeUntrustedExcerpt(
          [
            suggestion.hypothesis,
            `${suggestion.confidence}% hypothesis confidence.`,
            `Assumptions: ${suggestion.assumptions.join(" ")}`,
            `Investigation: ${suggestion.recommendedInvestigationSteps.join(
              " ",
            )}`,
          ].join(" "),
        ),
        href: `/#hypothesis-${suggestion.key}`,
      }),
    ),
    ...retrieved.projects.map((project): OrganizationCitation => ({
      id: `project:${project.id}`,
      entityType: "project",
      title: project.name,
      excerpt: sanitizeUntrustedExcerpt(
        [
          `Project ${project.name}.`,
          `Project number ${project.project_number}.`,
          `Status ${project.status}.`,
          canViewFinancials && project.contract_value_cents != null
            ? `Contract value ${formatMoney(project.contract_value_cents)}.`
            : "",
          canViewFinancials && project.projected_margin_cents != null
            ? `Estimated projected margin ${formatMoney(
                project.projected_margin_cents,
              )}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
      href: `/projects/${project.id}`,
    })),
    ...retrieved.risks.map((risk): OrganizationCitation => {
      const project = projectById.get(risk.project_id ?? "");
      const vendor = vendorById.get(risk.vendor_id ?? "");
      return {
        id: `risk:${risk.id}`,
        entityType: "risk",
        title: risk.title,
        excerpt: sanitizeUntrustedExcerpt(
          [
            `Risk ${risk.title}.`,
            risk.summary,
            `Status ${risk.status}. Severity ${risk.severity}. Category ${risk.category}.`,
            project ? `Project ${project.name}.` : "No assigned project.",
            vendor ? `Vendor ${vendor.name}.` : "",
            canViewFinancials
              ? `Potential exposure ${formatMoney(
                  risk.potential_exposure_cents,
                )}.`
              : "",
            `Detected ${displayDate(risk.detected_at)}.`,
          ]
            .filter(Boolean)
            .join(" "),
        ),
        href: `/risks/${risk.id}`,
      };
    }),
    ...retrieved.actions.map((action): OrganizationCitation => {
      const risk = riskById.get(action.risk_id);
      return {
        id: `action:${action.id}`,
        entityType: "action",
        title: action.title,
        excerpt: sanitizeUntrustedExcerpt(
          [
            `Action ${action.title}.`,
            action.description,
            `Status ${action.status}.`,
            risk ? `Related risk ${risk.title}.` : "",
            action.due_at
              ? `Due ${displayDate(action.due_at)}.`
              : "No due date.",
          ]
            .filter(Boolean)
            .join(" "),
        ),
        href: `/risks/${action.risk_id}`,
      };
    }),
    ...retrieved.documents.map((document): OrganizationCitation => ({
      id: `document:${document.id}`,
      entityType: "document",
      title: document.name,
      excerpt: sanitizeUntrustedExcerpt(
        [
          `Document ${document.name}.`,
          `Type ${document.document_type}.`,
          document.document_date
            ? `Document date ${displayDate(document.document_date)}.`
            : "",
          document.archived_at ? "Archived." : "Active.",
          projectById.get(document.project_id ?? "")
            ? `Project ${projectById.get(document.project_id!)!.name}.`
            : "No assigned project.",
        ]
          .filter(Boolean)
          .join(" "),
      ),
      href: `/documents/${document.id}`,
    })),
    ...retrieved.evidence.map((evidence): OrganizationCitation => ({
      id: `evidence:${evidence.id}`,
      entityType: "evidence",
      title: evidence.title,
      excerpt: sanitizeUntrustedExcerpt(
        [
          evidence.excerpt,
          evidence.why_it_matters,
          `Evidence type ${evidence.evidence_type}.`,
          riskById.get(evidence.risk_id)
            ? `Related risk ${riskById.get(evidence.risk_id)!.title}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
      href: `/risks/${evidence.risk_id}`,
    })),
    ...retrieved.activity.map((activity): OrganizationCitation => ({
      id: `activity:${activity.id}`,
      entityType: "activity",
      title: "Risk activity",
      excerpt: sanitizeUntrustedExcerpt(
        [
          activity.summary,
          `Occurred ${displayDate(activity.occurred_at)}.`,
          riskById.get(activity.risk_id)
            ? `Related risk ${riskById.get(activity.risk_id)!.title}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
      href: `/risks/${activity.risk_id}`,
    })),
    ...retrieved.resolutions.map((resolution): OrganizationCitation => ({
      id: `resolution:${resolution.id}`,
      entityType: "resolution",
      title: "Historical risk resolution",
      excerpt: sanitizeUntrustedExcerpt(
        [
          resolution.summary,
          `Resolution type ${resolution.resolution_type}.`,
          `Resolved ${displayDate(resolution.resolved_at)}.`,
          canViewFinancials
            ? `Exposure before ${formatMoney(
                resolution.exposure_before_cents,
              )}. Remaining exposure ${formatMoney(
                resolution.remaining_exposure_cents,
              )}.`
            : "",
          riskById.get(resolution.risk_id)
            ? `Related risk ${riskById.get(resolution.risk_id)!.title}.`
            : "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
      href: `/risks/${resolution.risk_id}`,
    })),
  ];

  return organizationQuestionContextSchema.parse({
    organizationId: context.organizationId,
    userId: context.userId,
    advisorMode,
    purpose: classifyOrganizationQuestion(question),
    projectScope: projectId
      ? {
          id: projectId,
          name: projectById.get(projectId)?.name ?? "Selected project",
        }
      : null,
    citations: selectRelevantOrganizationCitations(question, citations),
    // Organization conversations are currently client-session persisted.
    // Reuse prior questions for continuity, but never trust or replay cached
    // assistant facts after project access may have changed.
    history: history
      .filter((message) => message.role === "user")
      .slice(-6)
      .map((message) => ({
        role: "user" as const,
        content: sanitizeUntrustedExcerpt(message.content),
      })),
    question: sanitizeUntrustedExcerpt(question),
  });
}

function displayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })} (${date.toISOString()})`;
}
