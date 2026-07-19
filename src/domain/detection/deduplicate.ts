import type { DetectedRisk } from "@/domain/detection/types";

export function deduplicateDetections(
  detections: readonly DetectedRisk[],
): readonly DetectedRisk[] {
  const byKey = new Map<string, DetectedRisk>();
  for (const detection of detections) {
    const existing = byKey.get(detection.detectionKey);
    if (!existing) {
      byKey.set(detection.detectionKey, detection);
      continue;
    }
    const preferred =
      detection.confidenceScore > existing.confidenceScore
        ? detection
        : existing;
    const evidence = [...existing.evidence, ...detection.evidence].filter(
      (item, index, all) =>
        all.findIndex(
          (candidate) => candidate.detectionKey === item.detectionKey,
        ) === index,
    );
    byKey.set(detection.detectionKey, { ...preferred, evidence });
  }
  return [...byKey.values()];
}
