import { describe,expect,it } from "vitest";
import { formatCompactCurrency,formatDueUrgency,heatmapCellLabel,projectScopeLabel,riskStatusLabel } from "@/features/dashboard/presentation";

describe("dashboard presentation",()=>{
  it("describes accessible portfolio scope without ambiguous all-project wording",()=>{
    expect(projectScopeLabel(null,7)).toBe("All accessible projects (7)");
    expect(projectScopeLabel("Atlas",7)).toBe("Atlas");
  });
  it("formats due dates with explicit urgency",()=>{
    expect(formatDueUrgency("2026-07-25T10:00:00Z","2026-07-25T12:00:00Z")).toBe("Due today · overdue");
    expect(formatDueUrgency("2026-07-22T10:00:00Z","2026-07-25T12:00:00Z")).toBe("3 days overdue");
    expect(formatDueUrgency(null,"2026-07-25T12:00:00Z")).toBe("Due date unavailable");
  });
  it("provides a non-color heatmap description",()=>{
    expect(heatmapCellLabel("Atlas","Safety",{
      projectId:"p",category:"safety",activeRiskCount:2,highestSeverity:"critical",
      attentionScore:100,assessedExposureCents:null,expectedExposureCents:null,
      overdueActionCount:1,unassignedCount:0,withoutEvidenceCount:1,trendState:"unavailable",
      contributingRiskIds:["r"],href:"/risks",explanation:"",quality:"partial",
    })).toContain("highest severity critical; 1 overdue mitigation action; trend unavailable; data partial");
  });
  it("pairs priority color with text",()=>expect(riskStatusLabel("high")).toBe("High priority"));
  it("keeps executive currency values within compact metric cards",()=>{
    expect(formatCompactCurrency(-100_000_000)).toBe("−$1.0M");
    expect(formatCompactCurrency(32_500_000)).toBe("$325K");
  });
});
