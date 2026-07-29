import { describe, expect, it, vi } from "vitest";

import { collectAllRows } from "@/lib/supabase/pagination";

describe("collectAllRows", () => {
  it("returns every risk when an organization has more than 2,000 risks", async () => {
    const organizationRisks = Array.from({ length: 2_005 }, (_, index) => ({
      id: `risk-${String(index).padStart(4, "0")}`,
      organizationId: "organization-1",
    }));
    const fetchPage = vi.fn((from: number, to: number) =>
      Promise.resolve({
        data: organizationRisks.slice(from, to + 1),
        error: null,
        count: organizationRisks.length,
      }),
    );

    const risks = await collectAllRows(fetchPage);

    expect(risks).toHaveLength(2_005);
    expect(risks.at(-1)?.id).toBe("risk-2004");
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 2_000, 2_999);
  });

  it("does not skip risks when the server returns fewer rows than requested", async () => {
    const organizationRisks = Array.from({ length: 2_005 }, (_, id) => ({
      id,
    }));

    const risks = await collectAllRows((from, to) =>
      Promise.resolve({
        data: organizationRisks.slice(from, Math.min(to + 1, from + 500)),
        error: null,
        count: organizationRisks.length,
      }),
    );

    expect(risks).toEqual(organizationRisks);
  });

  it("propagates page failures instead of returning partial rows", async () => {
    await expect(
      collectAllRows(() =>
        Promise.resolve({ data: null, error: { message: "Query failed" } }),
      ),
    ).rejects.toThrow("Query failed");
  });
});
