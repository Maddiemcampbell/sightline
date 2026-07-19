import type {
  RiskQuestionContext,
  RiskQuestionOutput,
} from "@/domain/ai/risk-question";

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
