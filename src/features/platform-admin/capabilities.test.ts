import { describe, expect, it } from "vitest";

import { platformCan } from "@/features/platform-admin/capabilities";

describe("platform capabilities", () => {
  it("grants only explicitly assigned capabilities", () => {
    const operator = {
      status: "active" as const,
      permissions: new Set(["platform.jobs.read"] as const),
    };
    expect(platformCan(operator, "platform.jobs.read")).toBe(true);
    expect(platformCan(operator, "platform.jobs.retry")).toBe(false);
  });

  it("denies every capability to suspended operators", () => {
    expect(
      platformCan(
        {
          status: "suspended",
          permissions: new Set(["platform.admin.manage"] as const),
        },
        "platform.admin.manage",
      ),
    ).toBe(false);
  });

  it("does not infer access from customer organization roles", () => {
    expect(platformCan(null, "platform.dashboard.read")).toBe(false);
  });
});
