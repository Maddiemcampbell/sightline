import type {
  RiskAnalysisInput,
  RiskAnalysisOutput,
} from "@/domain/ai/risk-analysis";

export type RiskAnalysisFixture = {
  id: "expiring-insurance" | "weather-delay" | "owner-dispute";
  name: string;
  input: RiskAnalysisInput;
  expectedCategory: RiskAnalysisOutput["category"];
  deterministicFallback: RiskAnalysisOutput;
};

const organizationId = "10000000-0000-4000-8000-000000000001";
const observedAt = "2026-07-18T12:00:00.000Z";

function citations(id: string): RiskAnalysisOutput["claimEvidenceReferences"] {
  return {
    suggestedRiskTitle: [id],
    category: [id],
    severity: [id],
    confidenceScore: [id],
    whyItMatters: [id],
    potentialImpactExplanation: [id],
    recommendedNextAction: [id],
  };
}

export const riskAnalysisFixtures: readonly RiskAnalysisFixture[] = [
  {
    id: "expiring-insurance",
    name: "Expiring subcontractor insurance",
    expectedCategory: "insurance",
    input: {
      organizationId,
      project: {
        id: "20000000-0000-4000-8000-000000000001",
        name: "Cedar Grove Medical Pavilion",
        status: "active",
        location: "Sacramento, CA",
      },
      documentExcerpts: [
        {
          id: "coi-expiration",
          documentId: "50000000-0000-4000-8000-000000000001",
          label: "Apex Electrical certificate",
          excerpt: "Policy expiration: July 25, 2026.",
          observedAt,
        },
      ],
      existingRiskEvidence: [],
      historicalRelatedRisks: [],
    },
    deterministicFallback: {
      suggestedRiskTitle: "Apex Electrical insurance expires July 25",
      category: "insurance",
      severity: "high",
      confidenceScore: 94,
      whyItMatters:
        "The supplied certificate expires during the current project period.",
      potentialImpactExplanation:
        "An expired certificate may require a human review of whether work can continue.",
      recommendedNextAction:
        "Request and verify a renewed certificate before July 25.",
      evidenceReferencesUsed: ["coi-expiration"],
      claimEvidenceReferences: citations("coi-expiration"),
    },
  },
  {
    id: "weather-delay",
    name: "Weather-sensitive concrete pour",
    expectedCategory: "weather",
    input: {
      organizationId,
      project: {
        id: "20000000-0000-4000-8000-000000000002",
        name: "Riverfront Distribution Center",
        status: "active",
        location: "Stockton, CA",
      },
      documentExcerpts: [
        {
          id: "pour-forecast",
          documentId: "50000000-0000-4000-8000-000000000002",
          label: "Riverfront two-week lookahead",
          excerpt: "Concrete pour: July 20, 2026. Forecast high: 101°F.",
          observedAt,
        },
      ],
      existingRiskEvidence: [],
      historicalRelatedRisks: [],
    },
    deterministicFallback: {
      suggestedRiskTitle: "Extreme heat overlaps Riverfront concrete pour",
      category: "weather",
      severity: "high",
      confidenceScore: 91,
      whyItMatters:
        "The supplied schedule and forecast place the pour during a 101°F high.",
      potentialImpactExplanation:
        "The temperature may require changes to the planned placement procedure or timing.",
      recommendedNextAction:
        "Have the project team approve a hot-weather placement plan or alternate pour window.",
      evidenceReferencesUsed: ["pour-forecast"],
      claimEvidenceReferences: citations("pour-forecast"),
    },
  },
  {
    id: "owner-dispute",
    name: "Repeated undocumented owner direction",
    expectedCategory: "contract",
    input: {
      organizationId,
      project: {
        id: "20000000-0000-4000-8000-000000000003",
        name: "Northgate Civic Center",
        status: "active",
        location: "Roseville, CA",
      },
      documentExcerpts: [
        {
          id: "daily-log-direction",
          documentId: "50000000-0000-4000-8000-000000000003",
          label: "Northgate daily logs",
          excerpt:
            "Three daily logs record owner-directed added backing; T&M tags are pending.",
          observedAt,
        },
      ],
      existingRiskEvidence: [],
      historicalRelatedRisks: [],
    },
    deterministicFallback: {
      suggestedRiskTitle: "Owner-directed backing remains undocumented",
      category: "contract",
      severity: "high",
      confidenceScore: 88,
      whyItMatters:
        "Three supplied daily logs record added work while T&M documentation remains pending.",
      potentialImpactExplanation:
        "Incomplete contemporaneous documentation may weaken recovery of added-work costs.",
      recommendedNextAction:
        "Review the logs, preserve T&M records, and issue contract notice for human approval.",
      evidenceReferencesUsed: ["daily-log-direction"],
      claimEvidenceReferences: citations("daily-log-direction"),
    },
  },
];

export function getRiskAnalysisFixture(id: string): RiskAnalysisFixture {
  const fixture = riskAnalysisFixtures.find((candidate) => candidate.id === id);
  if (!fixture) throw new Error("Unknown evaluation fixture.");
  return fixture;
}
