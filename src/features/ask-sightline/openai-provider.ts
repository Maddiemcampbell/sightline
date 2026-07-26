import { z } from "zod";

import {
  RISK_QUESTION_PROMPT_VERSION,
  riskQuestionOutputSchema,
  validateRiskQuestionGrounding,
  type RiskQuestionContext,
} from "@/domain/ai/risk-question";
import {
  organizationQuestionOutputSchema,
  validateOrganizationQuestionGrounding,
  type OrganizationQuestionContext,
} from "@/domain/ai/organization-question";
import type {
  OrganizationQuestionProvider,
  RiskQuestionProvider,
} from "@/features/ai/provider";
import {
  organizationSystemInstructions,
  organizationUserPrompt,
  riskSystemInstructions,
} from "@/features/ask-sightline/prompt-templates";

const outputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "answerStatus",
    "answer",
    "evidenceCitations",
    "confidence",
    "missingInformation",
    "suggestedFollowUpQuestions",
  ],
  properties: {
    answerStatus: { type: "string", enum: ["answered", "unavailable"] },
    answer: { type: "string" },
    evidenceCitations: { type: "array", items: { type: "string" } },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    missingInformation: { type: "array", items: { type: "string" } },
    suggestedFollowUpQuestions: { type: "array", items: { type: "string" } },
  },
} as const;

export class OpenAiRiskQuestionProvider
  implements RiskQuestionProvider, OrganizationQuestionProvider
{
  readonly name = "openai";
  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  async answer(input: RiskQuestionContext) {
    const started = performance.now();
    const response = await this.fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: `${riskSystemInstructions(input.advisorMode)}

Prompt version: ${RISK_QUESTION_PROMPT_VERSION}.`,
        input: `Question and bounded context follow as JSON data:\n${JSON.stringify(input)}`,
        text: {
          format: {
            type: "json_schema",
            name: "sightline_risk_answer",
            strict: true,
            schema: outputJsonSchema,
          },
        },
      }),
    });
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    const payload: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        `Question provider failed with status ${response.status}.`,
      );
    const parsed = responseSchema.parse(payload);
    const text = parsed.output
      .flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text;
    if (!text)
      throw new Error("Question provider returned no structured answer.");
    return {
      output: validateRiskQuestionGrounding(
        riskQuestionOutputSchema.parse(JSON.parse(text)),
        input,
      ),
      model: parsed.model ?? this.model,
      latencyMs,
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? null,
        outputTokens: parsed.usage?.output_tokens ?? null,
        totalTokens: parsed.usage?.total_tokens ?? null,
      },
    };
  }

  async answerOrganization(input: OrganizationQuestionContext) {
    const started = performance.now();
    const response = await this.fetcher("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        instructions: organizationSystemInstructions(input),
        input: organizationUserPrompt(input),
        text: {
          format: {
            type: "json_schema",
            name: "sightline_organization_answer",
            strict: true,
            schema: organizationOutputJsonSchema,
          },
        },
      }),
    });
    const latencyMs = Math.max(0, Math.round(performance.now() - started));
    const payload: unknown = await response.json();
    if (!response.ok)
      throw new Error(
        `Organization question provider failed with status ${response.status}.`,
      );
    const parsed = responseSchema.parse(payload);
    const text = parsed.output
      .flatMap((item) => item.content ?? [])
      .find((item) => item.type === "output_text")?.text;
    if (!text)
      throw new Error(
        "Organization question provider returned no structured answer.",
      );
    return {
      output: validateOrganizationQuestionGrounding(
        organizationQuestionOutputSchema.parse(JSON.parse(text)),
        input,
      ),
      model: parsed.model ?? this.model,
      latencyMs,
      usage: {
        inputTokens: parsed.usage?.input_tokens ?? null,
        outputTokens: parsed.usage?.output_tokens ?? null,
        totalTokens: parsed.usage?.total_tokens ?? null,
      },
    };
  }
}

const organizationOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "answerStatus",
    "answer",
    "citationIds",
    "confidence",
    "missingInformation",
    "suggestedFollowUpQuestions",
  ],
  properties: {
    answerStatus: { type: "string", enum: ["answered", "unavailable"] },
    answer: { type: "string" },
    citationIds: { type: "array", items: { type: "string" } },
    confidence: { type: "integer", minimum: 0, maximum: 100 },
    missingInformation: { type: "array", items: { type: "string" } },
    suggestedFollowUpQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const;

const responseSchema = z.object({
  model: z.string().optional(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .optional(),
});
