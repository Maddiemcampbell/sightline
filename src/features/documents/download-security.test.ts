import { describe, expect, it } from "vitest";

import {
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
  isDocumentDownloadAllowed,
} from "@/features/documents/download-security";

const subject = {
  organizationId: "10000000-0000-4000-8000-000000000001",
  organizationRole: "owner" as const,
};
const document = {
  id: "20000000-0000-4000-8000-000000000001",
  organization_id: subject.organizationId,
  storage_path:
    "10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/report.pdf",
  archived_at: null,
};

describe("document download authorization", () => {
  it("allows an active document with an exact tenant and document path", () => {
    expect(isDocumentDownloadAllowed(subject, document)).toBe(true);
    expect(DOCUMENT_SIGNED_URL_TTL_SECONDS).toBe(60);
  });

  it.each([
    null,
    { ...document, organization_id: crypto.randomUUID() },
    { ...document, archived_at: "2026-07-24T00:00:00.000Z" },
    { ...document, storage_path: null },
    {
      ...document,
      storage_path: `${subject.organizationId}/${crypto.randomUUID()}/report.pdf`,
    },
  ])("denies absent, foreign, archived, or mismatched records", (candidate) => {
    expect(isDocumentDownloadAllowed(subject, candidate)).toBe(false);
  });
});
