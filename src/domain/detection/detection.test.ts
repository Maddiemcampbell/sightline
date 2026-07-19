import { describe, expect, it } from "vitest";

import { deduplicateDetections } from "@/domain/detection/deduplicate";
import {
  expiringInsuranceRule,
  insuranceConfidence,
} from "@/domain/detection/rules/expiring-insurance";
import {
  repeatedIssueConfidence,
  repeatedIssueRule,
} from "@/domain/detection/rules/repeated-issue";
import {
  weatherConfidence,
  weatherDelayRule,
} from "@/domain/detection/rules/weather-delay";
import type {
  DetectedRisk,
  DetectionContext,
  DetectionDocument,
} from "@/domain/detection/types";
import { cronSecretMatches } from "@/features/detection/cron-auth";

const now = new Date("2026-07-18T12:00:00Z");

function context(documents: readonly DetectionDocument[]): DetectionContext {
  return {
    now,
    documents,
    projects: [
      {
        id: "project-1",
        name: "Riverfront Center",
        status: "active",
        concreteTemperatureThresholdF: 95,
      },
    ],
    vendors: [{ id: "vendor-1", name: "Apex Electric" }],
    activeProjectVendorPairs: new Set(["project-1:vendor-1"]),
  };
}

function document(
  overrides: Partial<DetectionDocument> = {},
): DetectionDocument {
  return {
    id: "document-1",
    projectId: "project-1",
    vendorId: "vendor-1",
    category: "insurance",
    name: "Source document",
    documentDate: "2026-07-18",
    fields: {},
    ...overrides,
  };
}

describe("expiring insurance rule", () => {
  it.each([
    ["2026-07-18", 1],
    ["2026-08-01", 1],
    ["2026-08-02", 0],
    ["2026-07-17", 0],
  ])(
    "applies the inclusive 14-day threshold for %s",
    (expiration, expected) => {
      const results = expiringInsuranceRule.detect(
        context([document({ fields: { coi_expiration_date: expiration } })]),
      );
      expect(results).toHaveLength(expected);
    },
  );

  it("requires an active project-vendor association", () => {
    const base = context([
      document({ fields: { coi_expiration_date: "2026-07-25" } }),
    ]);
    expect(
      expiringInsuranceRule.detect({
        ...base,
        activeProjectVendorPairs: new Set(),
      }),
    ).toHaveLength(0);
  });

  it("scores confidence deterministically by urgency", () => {
    expect([
      insuranceConfidence(2),
      insuranceConfidence(6),
      insuranceConfidence(12),
    ]).toEqual([98, 94, 88]);
  });
});

describe("weather delay rule", () => {
  it("requires a pour within seven days and a forecast strictly above threshold", () => {
    const atThreshold = document({
      category: "schedule",
      fields: {
        concrete_pour_date: "2026-07-25",
        forecast_high_temperature_f: 95,
      },
    });
    const aboveThreshold = document({
      ...atThreshold,
      fields: {
        concrete_pour_date: "2026-07-25",
        forecast_high_temperature_f: 96,
      },
    });
    expect(weatherDelayRule.detect(context([atThreshold]))).toHaveLength(0);
    expect(weatherDelayRule.detect(context([aboveThreshold]))).toHaveLength(1);
    expect(
      weatherDelayRule.detect(
        context([
          {
            ...aboveThreshold,
            fields: {
              ...aboveThreshold.fields,
              concrete_pour_date: "2026-07-26",
            },
          },
        ]),
      ),
    ).toHaveLength(0);
  });

  it("caps deterministic confidence", () => {
    expect(weatherConfidence(1, 30)).toBe(95);
    expect(weatherConfidence(7, 1)).toBe(81);
  });
});

describe("repeated unresolved issue rule", () => {
  const logs = ["2026-07-15", "2026-07-16", "2026-07-17"].map((date, index) =>
    document({
      id: `log-${index}`,
      vendorId: null,
      category: "daily_log",
      documentDate: date,
      fields: { issue_keywords: ["added backing"] },
    }),
  );

  it("detects the third matching daily log inside seven days", () => {
    const result = repeatedIssueRule.detect(context(logs));
    expect(result).toHaveLength(1);
    expect(result[0]?.evidence).toHaveLength(3);
    expect(result[0]?.confidenceScore).toBe(86);
  });

  it("does not detect with only two logs or when a related RFI exists", () => {
    expect(repeatedIssueRule.detect(context(logs.slice(0, 2)))).toHaveLength(0);
    const rfi = document({
      id: "rfi-1",
      vendorId: null,
      category: "rfi",
      fields: { related_issue_keywords: ["added backing"] },
    });
    expect(repeatedIssueRule.detect(context([...logs, rfi]))).toHaveLength(0);
  });

  it("increases and caps confidence as corroborating logs increase", () => {
    expect(repeatedIssueConfidence(3)).toBe(86);
    expect(repeatedIssueConfidence(4)).toBe(90);
    expect(repeatedIssueConfidence(10)).toBe(94);
  });
});

describe("detection idempotency", () => {
  it("collapses duplicate keys and preserves unique evidence", () => {
    const base: DetectedRisk = expiringInsuranceRule.detect(
      context([document({ fields: { coi_expiration_date: "2026-07-25" } })]),
    )[0]!;
    const duplicate = {
      ...base,
      confidenceScore: base.confidenceScore + 1,
      evidence: [
        ...base.evidence,
        { ...base.evidence[0]!, detectionKey: `${base.detectionKey}:second` },
      ],
    };
    const result = deduplicateDetections([base, duplicate]);
    expect(result).toHaveLength(1);
    expect(result[0]?.confidenceScore).toBe(95);
    expect(result[0]?.evidence).toHaveLength(2);
  });
});

describe("scheduled endpoint authorization", () => {
  it("compares the complete cron secret", () => {
    expect(cronSecretMatches("a".repeat(32), "a".repeat(32))).toBe(true);
    expect(cronSecretMatches("a".repeat(32), "b".repeat(32))).toBe(false);
    expect(cronSecretMatches("a".repeat(32), "short")).toBe(false);
  });
});
