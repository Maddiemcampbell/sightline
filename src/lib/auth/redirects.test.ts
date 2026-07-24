import { describe, expect, it } from "vitest";

import { safeRedirectPath } from "@/lib/auth/redirects";

describe("safeRedirectPath", () => {
  it("accepts application-relative paths", () => {
    expect(safeRedirectPath("/risks?status=open")).toBe("/risks?status=open");
  });

  it("rejects absolute and protocol-relative redirects", () => {
    expect(safeRedirectPath("https://example.com")).toBe("/");
    expect(safeRedirectPath("//example.com")).toBe("/");
  });

  it("uses the requested fallback for missing values", () => {
    expect(safeRedirectPath(undefined, "/login")).toBe("/login");
  });
});
