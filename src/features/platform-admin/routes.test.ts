import { describe, expect, it } from "vitest";

import { isPlatformAdminSurface } from "./routes";

describe("platform admin surface routing", () => {
  it("keeps the design system outside the customer application shell", () => {
    expect(isPlatformAdminSurface("/design-system")).toBe(true);
    expect(isPlatformAdminSurface("/internal/admin")).toBe(true);
    expect(isPlatformAdminSurface("/internal/admin/organizations")).toBe(true);
  });

  it("does not classify customer routes as platform surfaces", () => {
    expect(isPlatformAdminSurface("/projects")).toBe(false);
    expect(isPlatformAdminSurface("/settings")).toBe(false);
    expect(isPlatformAdminSurface("/design-system-preview")).toBe(false);
  });
});
