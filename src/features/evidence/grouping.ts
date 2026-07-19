import type { EvidenceItemView } from "@/features/evidence/types";

export function groupEvidence(items: readonly EvidenceItemView[]) {
  return {
    direct: items.filter((item) => item.supportType === "direct"),
    inferred: items.filter((item) => item.supportType === "inferred"),
    assumption: items.filter((item) => item.supportType === "assumption"),
  } as const;
}
