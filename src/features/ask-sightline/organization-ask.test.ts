import { describe, expect, it } from "vitest";

import {
  organizationQuestionContextSchema,
  validateOrganizationQuestionGrounding,
} from "@/domain/ai/organization-question";
import { deterministicOrganizationAnswer } from "@/features/ask-sightline/answers";
import {
  classifyOrganizationQuestion,
  organizationSystemInstructions,
  riskSystemInstructions,
} from "@/features/ask-sightline/prompt-templates";
import { selectRelevantOrganizationCitations } from "@/features/ask-sightline/retrieval";
import {
  getSuggestedOrganizationPrompts,
  getSuggestedRiskPrompts,
} from "@/features/ask-sightline/suggested-prompts";
import { organizationObservationCitationId } from "@/features/ask-sightline/organization-context";

const context = organizationQuestionContextSchema.parse({
  organizationId: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  advisorMode: "executive",
  purpose: "executive_summary",
  projectScope: null,
  citations: [
    {
      id: "project:atlas",
      entityType: "project",
      title: "Project Atlas",
      excerpt: "Project Atlas is active.",
      href: "/projects/atlas",
    },
    {
      id: "risk:renewal",
      entityType: "risk",
      title: "Renewal documentation",
      excerpt:
        "Renewal documentation is high severity with potential exposure $50,000.",
      href: "/risks/renewal",
    },
  ],
  history: [],
  question: "Prepare a morning executive brief.",
});

describe("organization-wide Ask Sightline", () => {
  it("generates a grounded deterministic executive summary", () => {
    const output = deterministicOrganizationAnswer(context);
    expect(output.answerStatus).toBe("answered");
    expect(output.answer).toContain("Executive summary");
    expect(output.citationIds.length).toBeGreaterThan(0);
    expect(() =>
      validateOrganizationQuestionGrounding(output, context),
    ).not.toThrow();
  });

  it("rejects invented citations, uncited answers, and unsupported financial facts", () => {
    const output = deterministicOrganizationAnswer(context);
    expect(() =>
      validateOrganizationQuestionGrounding(
        { ...output, citationIds: ["risk:not-authorized"] },
        context,
      ),
    ).toThrow(/unavailable sources/);
    expect(() =>
      validateOrganizationQuestionGrounding(
        { ...output, citationIds: [] },
        context,
      ),
    ).toThrow(/require citations/);
    expect(() =>
      validateOrganizationQuestionGrounding(
        {
          ...output,
          answer: "The supported exposure is $75,000.",
          citationIds: ["risk:renewal"],
        },
        context,
      ),
    ).toThrow(/unsupported protected fact/);
  });

  it("explains when authorized evidence is unavailable", () => {
    const empty = organizationQuestionContextSchema.parse({
      ...context,
      citations: [],
    });
    expect(deterministicOrganizationAnswer(empty)).toMatchObject({
      answerStatus: "unavailable",
      citationIds: [],
      confidence: 0,
    });
  });

  it("ranks the smallest relevant organization source set", () => {
    const selected = selectRelevantOrganizationCitations(
      "What is the renewal exposure?",
      context.citations,
      1,
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]?.id).toBe("risk:renewal");
  });

  it("centralizes advisor and task behavior without changing permissions", () => {
    expect(riskSystemInstructions("risk")).not.toBe(
      riskSystemInstructions("executive"),
    );
    expect(
      organizationSystemInstructions({
        advisorMode: "financial",
        purpose: "cost_saving",
      }),
    ).toContain("Never calculate a new forecast");
    expect(
      classifyOrganizationQuestion("Prepare for a leadership meeting"),
    ).toBe("leadership_prep");
    expect(classifyOrganizationQuestion("Find cost saving opportunities")).toBe(
      "cost_saving",
    );
    expect(
      organizationSystemInstructions({
        advisorMode: "forecast",
        purpose: "forecast_analysis",
      }),
    ).toContain("current projection");
    expect(
      classifyOrganizationQuestion("What does cash flow look like next?"),
    ).toBe("forecast_analysis");
  });

  it("adapts reusable suggestions to advisor, page, and project context", () => {
    expect(
      getSuggestedOrganizationPrompts({
        advisorMode: "project",
        pathname: "/projects",
        selectedProjectName: "Atlas",
        hasPortfolioObservations: true,
        hasRecentActivity: true,
      }),
    ).toContain("Summarize Atlas.");
    expect(getSuggestedRiskPrompts("financial")[0]).toMatch(/financial/i);
    expect(getSuggestedRiskPrompts("executive")[0]).toMatch(/leadership/i);
    expect(
      getSuggestedOrganizationPrompts({
        advisorMode: "forecast",
        pathname: "/ask",
        selectedProjectName: null,
        hasPortfolioObservations: false,
      }),
    ).toEqual(expect.arrayContaining([expect.stringMatching(/cash flow/i)]));
  });

  it("prioritizes deterministic forecast sources for forecast questions", () => {
    const selected = selectRelevantOrganizationCitations(
      "Which projects are likely to miss their forecast targets?",
      [
        ...context.citations,
        {
          id: "forecast:portfolio",
          entityType: "forecast",
          title: "Current deterministic portfolio outlook",
          excerpt: "Current forecast margin is unavailable.",
          href: "/forecasts",
        },
      ],
      1,
    );
    expect(selected[0]?.id).toBe("forecast:portfolio");
  });

  it("keeps portfolio observation citation IDs short and deterministic", () => {
    const longObservationKey = `documentation-gap:${Array.from(
      { length: 20 },
      (_, index) =>
        `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    ).join(",")}`;
    const id = organizationObservationCitationId(longObservationKey);

    expect(longObservationKey.length).toBeGreaterThan(180);
    expect(id.length).toBeLessThanOrEqual(180);
    expect(organizationObservationCitationId(longObservationKey)).toBe(id);
    expect(
      organizationObservationCitationId(`${longObservationKey}:different`),
    ).not.toBe(id);
  });
});
