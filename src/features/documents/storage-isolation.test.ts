import { describe, expect, it } from "vitest";

import {
  assertOrganizationStoragePath,
  isDocumentStoragePath,
  isOrganizationStoragePath,
  organizationStoragePath,
} from "@/features/documents/storage-isolation";

describe("document storage tenant isolation", () => {
  it("always creates paths below the owning organization prefix", () => {
    expect(organizationStoragePath("org-a", "doc-1", "report.pdf")).toBe(
      "org-a/doc-1/report.pdf",
    );
  });

  it("rejects downloads from another organization prefix", () => {
    expect(isOrganizationStoragePath("org-a", "org-b/doc-1/report.pdf")).toBe(
      false,
    );
    expect(() =>
      assertOrganizationStoragePath("org-a", "org-b/doc-1/report.pdf"),
    ).toThrow("File not found.");
  });

  it("does not accept prefix-confusion paths", () => {
    expect(
      isOrganizationStoragePath("org-a", "org-attacker/doc-1/report.pdf"),
    ).toBe(false);
  });

  it("binds a path to the exact document as well as its organization", () => {
    expect(
      isDocumentStoragePath("org-a", "doc-1", "org-a/doc-1/report.pdf"),
    ).toBe(true);
    expect(
      isDocumentStoragePath("org-a", "doc-1", "org-a/doc-2/report.pdf"),
    ).toBe(false);
  });
});
