import type {
  RiskQuestionContext,
  RiskQuestionOutput,
} from "@/domain/ai/risk-question";
import type {
  OrganizationQuestionContext,
  OrganizationQuestionOutput,
} from "@/domain/ai/organization-question";

export function deterministicAnswer(
  context: RiskQuestionContext,
): RiskQuestionOutput {
  const evidence = context.evidence[0];
  if (!evidence)
    return {
      answerStatus: "unavailable",
      answer:
        "Sightline does not have enough cited evidence to answer that question.",
      evidenceCitations: [],
      confidence: 0,
      missingInformation: [
        "A relevant evidence record or document excerpt is required.",
      ],
      suggestedFollowUpQuestions: ["What information is missing?"],
    };
  const question = context.question.toLowerCase();
  let answer = `${evidence.excerpt} ${evidence.whyItMatters}`;
  if (/next|do|action|mitigat/.test(question) && context.actions[0])
    answer = `${evidence.excerpt} The current recommended action is: ${context.actions[0].title}.`;
  if (/missing/.test(question))
    answer = `The cited evidence is ${evidence.title}. Sightline still needs any source details not present in that record to increase confidence.`;
  return {
    answerStatus: "answered",
    answer,
    evidenceCitations: [evidence.id],
    confidence: Math.min(90, 60 + context.evidence.length * 5),
    missingInformation:
      context.evidence.length < 2
        ? ["Only one relevant evidence source is currently available."]
        : [],
    suggestedFollowUpQuestions: [
      "What should we do next?",
      "What information is missing?",
    ],
  };
}

export function deterministicOrganizationAnswer(
  context: OrganizationQuestionContext,
): OrganizationQuestionOutput {
  if (!context.citations.length)
    return {
      answerStatus: "unavailable",
      answer:
        "Sightline does not have enough authorized organization data to answer that question.",
      citationIds: [],
      confidence: 0,
      missingInformation: [
        "At least one relevant authorized project, risk, action, document, evidence, activity, resolution, or portfolio observation is required.",
      ],
      suggestedFollowUpQuestions: ["Which authorized projects are available?"],
    };

  const preferredTypes =
    context.purpose === "cost_saving"
      ? ["observation", "evidence", "risk", "action"]
      : context.purpose === "project_analysis"
        ? ["project", "risk", "action", "document"]
        : ["observation", "risk", "action", "activity"];
  const selected = [
    ...context.citations.filter((citation) =>
      preferredTypes.includes(citation.entityType),
    ),
    ...context.citations,
  ]
    .filter(
      (citation, index, all) =>
        all.findIndex((candidate) => candidate.id === citation.id) === index,
    )
    .slice(0, 3);

  const answer =
    context.purpose === "cost_saving"
      ? [
          "## Evidence-backed opportunities",
          ...selected.map(
            (citation) =>
              `### Observation\n${citation.title}\n\n**Supporting reasoning:** ${citation.excerpt}\n\n**Confidence:** Cautious deterministic synthesis of the cited record.\n\n**Related projects and risks:** Review the linked authorized source for the related records supplied to Sightline.\n\n**Suggested next step:** Review the cited record with the responsible project lead before changing controls.`,
          ),
          "\nSightline has not estimated savings because the authorized data does not support a defensible savings calculation.",
        ].join("\n\n")
      : [
          context.purpose === "leadership_prep"
            ? "## Leadership meeting prep"
            : context.purpose === "executive_summary"
              ? "## Executive summary"
              : context.purpose === "project_analysis"
                ? "## Supported project analysis"
                : "## Portfolio attention",
          ...selected.map(
            (citation) => `- **${citation.title}:** ${citation.excerpt}`,
          ),
        ].join("\n\n");

  return {
    answerStatus: "answered",
    answer,
    citationIds: selected.map((citation) => citation.id),
    confidence: Math.min(85, 55 + selected.length * 10),
    missingInformation:
      context.purpose === "project_analysis"
        ? [
            "Only stored project, risk, action, document, activity, and resolution records are available; unsupported KPIs and trends were not inferred.",
          ]
        : [],
    suggestedFollowUpQuestions:
      context.projectScope === null
        ? [
            "Which projects are becoming risky?",
            "What actions should I prioritize?",
          ]
        : [
            `What risks deserve attention on ${context.projectScope.name}?`,
            `Which actions are overdue on ${context.projectScope.name}?`,
          ],
  };
}
