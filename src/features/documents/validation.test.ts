import { describe, expect, it } from "vitest";

import { assertOrganizationAccess } from "@/lib/auth/authorization";
import { allowDocumentUpload } from "@/features/documents/rate-limit";
import {
  detectDocumentMime,
  documentMetadataSchema,
  MAX_DOCUMENT_BYTES,
  sanitizeFilename,
  validateUploadFile,
} from "@/features/documents/validation";

describe("document upload validation", () => {
  it("detects file content instead of trusting a supplied MIME type", () => {
    expect(
      detectDocumentMime(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "bid.pdf"),
    ).toBe("application/pdf");
    expect(
      detectDocumentMime(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "bid.png"),
    ).toBeNull();
  });

  it("sanitizes filenames before constructing storage paths", () => {
    expect(sanitizeFilename("../../Owner Dispute (final).PDF")).toBe(
      "Owner-Dispute-final-.PDF",
    );
  });

  it("rejects a declared MIME type that conflicts with file bytes", async () => {
    const file = new File(
      [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
      "report.pdf",
      { type: "image/png" },
    );
    await expect(validateUploadFile(file)).rejects.toThrow(
      "The file type does not match its contents.",
    );
  });

  it("rejects empty and oversized files before storage access", async () => {
    await expect(
      validateUploadFile(
        new File([], "empty.pdf", { type: "application/pdf" }),
      ),
    ).rejects.toThrow("Choose a non-empty file.");
    await expect(
      validateUploadFile(
        new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], "large.pdf", {
          type: "application/pdf",
        }),
      ),
    ).rejects.toThrow("Files must be 10 MB or smaller.");
  });

  it("validates and normalizes upload metadata", () => {
    expect(
      documentMetadataSchema.parse({
        name: "  Executed subcontract  ",
        category: "contract",
        projectId: "",
        vendorId: "",
        documentDate: "",
      }),
    ).toEqual({
      name: "Executed subcontract",
      category: "contract",
      projectId: null,
      vendorId: null,
      documentDate: null,
    });
  });
});

describe("document authorization", () => {
  it("rejects resources outside the active organization", () => {
    expect(() =>
      assertOrganizationAccess(
        { organization_id: "other" },
        { organizationId: "buildco" },
      ),
    ).toThrow("Resource not found");
    expect(() =>
      assertOrganizationAccess(
        { organization_id: "buildco" },
        { organizationId: "buildco" },
      ),
    ).not.toThrow();
  });

  it("limits a caller to ten upload attempts per minute", () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let index = 0; index < 10; index += 1) {
      expect(allowDocumentUpload(key, 1_000)).toBe(true);
    }
    expect(allowDocumentUpload(key, 1_000)).toBe(false);
    expect(allowDocumentUpload(key, 61_001)).toBe(true);
  });
});
