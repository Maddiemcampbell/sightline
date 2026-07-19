import type { DetectionRule } from "@/domain/detection/types";
import { daysBetween, slug, stringField } from "@/domain/detection/types";

export function insuranceConfidence(daysUntilExpiration: number): number {
  if (daysUntilExpiration <= 3) return 98;
  if (daysUntilExpiration <= 7) return 94;
  return 88;
}

export const expiringInsuranceRule: DetectionRule = {
  id: "expiring_insurance",
  detect(context) {
    const projects = new Map(
      context.projects.map((project) => [project.id, project]),
    );
    const vendors = new Map(
      context.vendors.map((vendor) => [vendor.id, vendor]),
    );
    return context.documents.flatMap((document) => {
      if (
        document.category !== "insurance" ||
        !document.projectId ||
        !document.vendorId
      )
        return [];
      const expirationValue = stringField(document, "coi_expiration_date");
      if (!expirationValue) return [];
      const expiration = new Date(`${expirationValue}T12:00:00Z`);
      if (Number.isNaN(expiration.getTime())) return [];
      const days = daysBetween(context.now, expiration);
      const project = projects.get(document.projectId);
      const vendor = vendors.get(document.vendorId);
      const activePair = context.activeProjectVendorPairs.has(
        `${document.projectId}:${document.vendorId}`,
      );
      if (
        !project ||
        !vendor ||
        project.status !== "active" ||
        !activePair ||
        days < 0 ||
        days > 14
      )
        return [];
      const detectionKey = `insurance:${slug(vendor.name)}:${slug(project.name)}`;
      return [
        {
          detectionKey,
          projectId: project.id,
          vendorId: vendor.id,
          title: `${vendor.name} insurance expires in ${days === 0 ? "less than one day" : `${days} days`}`,
          summary: `${vendor.name}'s certificate of insurance expires on ${expirationValue} while work remains active on ${project.name}.`,
          category: "insurance" as const,
          severity: days <= 3 ? ("critical" as const) : ("high" as const),
          potentialExposureCents: 32_500_000,
          estimatedMarginImpactCents: 12_500_000,
          confidenceScore: insuranceConfidence(days),
          whyItMatters:
            "An uninsured subcontractor on an active site can stop work, create contractual default, and transfer otherwise insured loss exposure to the general contractor.",
          dueAt: expiration.toISOString(),
          evidence: [
            {
              detectionKey: `${detectionKey}:${document.id}`,
              documentId: document.id,
              title: "Certificate expiration date",
              description: `The certificate expires within the 14-day review window.`,
              sourceExcerpt: `Policy expiration: ${expirationValue}`,
              observedAt: document.documentDate
                ? `${document.documentDate}T12:00:00Z`
                : context.now.toISOString(),
            },
          ],
          recommendedAction: `Require ${vendor.name} to provide a compliant renewal certificate before the current policy expires.`,
        },
      ];
    });
  },
};
