import { riskQuestionContextSchema } from "@/domain/ai/risk-question";

const base = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  userId: "11000000-0000-4000-8000-000000000001",
  risk: {
    id: "60000000-0000-4000-8000-000000000001",
    title: "Apex insurance expires",
    summary: "The certificate expires during active work.",
    severity: "critical",
    status: "action_needed",
    dueAt: "2026-07-25T17:00:00.000Z",
  },
  project: {
    name: "Cedar Grove Medical Pavilion",
    projectNumber: "BC-24017",
    status: "active",
  },
  vendor: { name: "Apex Electrical", trade: "Electrical" },
  documents: [
    { name: "Apex COI", documentType: "insurance", documentDate: "2026-07-18" },
  ],
  actions: [
    {
      title: "Obtain renewed certificate",
      description: "Request a compliant certificate.",
      status: "suggested",
      dueAt: "2026-07-23T17:00:00.000Z",
    },
  ],
  recentActivity: [],
  historicalRisks: [],
  history: [],
  evidence: [
    {
      id: "70000000-0000-4000-8000-000000000001",
      title: "Certificate expiration",
      excerpt: "Policy expiration: July 25, 2026",
      whyItMatters: "Coverage expires during active work.",
      evidenceType: "insurance_expiration",
    },
  ],
};

export const riskQuestionEvaluationFixtures = [
  {
    name: "insurance expiration",
    expectedEvidenceId: base.evidence[0]!.id,
    input: riskQuestionContextSchema.parse({
      ...base,
      question: "When does the insurance expire?",
    }),
  },
  {
    name: "recommended response",
    expectedEvidenceId: base.evidence[0]!.id,
    input: riskQuestionContextSchema.parse({
      ...base,
      question: "What should we do next?",
    }),
  },
  {
    name: "missing information",
    expectedEvidenceId: base.evidence[0]!.id,
    input: riskQuestionContextSchema.parse({
      ...base,
      question: "What information is missing?",
    }),
  },
] as const;
