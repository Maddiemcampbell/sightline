import type { DetectionRule } from "@/domain/detection/types";
import {
  daysBetween,
  numberField,
  slug,
  stringField,
} from "@/domain/detection/types";

export function weatherConfidence(
  daysUntilPour: number,
  degreesAbove: number,
): number {
  const proximity = daysUntilPour <= 2 ? 5 : daysUntilPour <= 4 ? 3 : 0;
  return Math.min(95, 80 + Math.min(10, Math.floor(degreesAbove)) + proximity);
}

export const weatherDelayRule: DetectionRule = {
  id: "weather_delay",
  detect(context) {
    const projects = new Map(
      context.projects.map((project) => [project.id, project]),
    );
    return context.documents.flatMap((document) => {
      if (!document.projectId) return [];
      const pourValue = stringField(document, "concrete_pour_date");
      const temperature = numberField(document, "forecast_high_temperature_f");
      if (!pourValue || temperature === null) return [];
      const pourDate = new Date(`${pourValue}T12:00:00Z`);
      const project = projects.get(document.projectId);
      if (
        !project ||
        project.status !== "active" ||
        Number.isNaN(pourDate.getTime())
      )
        return [];
      const days = daysBetween(context.now, pourDate);
      const degreesAbove = temperature - project.concreteTemperatureThresholdF;
      if (days < 0 || days > 7 || degreesAbove <= 0) return [];
      const detectionKey = `weather:${slug(project.name)}:${slug(pourValue)}`;
      return [
        {
          detectionKey,
          projectId: project.id,
          vendorId: document.vendorId,
          title: `Concrete pour may be delayed by extreme heat`,
          summary: `${project.name} has a concrete pour scheduled for ${pourValue}, when the forecast high of ${temperature}°F exceeds the ${project.concreteTemperatureThresholdF}°F project threshold.`,
          category: "weather" as const,
          severity: degreesAbove >= 8 ? ("high" as const) : ("medium" as const),
          potentialExposureCents: 18_600_000,
          estimatedMarginImpactCents: 8_400_000,
          confidenceScore: weatherConfidence(days, degreesAbove),
          whyItMatters:
            "Unsafe placement temperatures can force a late cancellation, idle committed labor and equipment, and move downstream structural work.",
          dueAt: pourDate.toISOString(),
          evidence: [
            {
              detectionKey: `${detectionKey}:${document.id}`,
              documentId: document.id,
              title: "Pour exceeds temperature threshold",
              description: `Forecast ${temperature}°F; configured threshold ${project.concreteTemperatureThresholdF}°F.`,
              sourceExcerpt: `Concrete pour: ${pourValue}; forecast high: ${temperature}°F`,
              observedAt: context.now.toISOString(),
            },
          ],
          recommendedAction:
            "Confirm a cooled-material, night-pour, or rescheduling plan before releasing labor and pump commitments.",
        },
      ];
    });
  },
};
