import { describe, expect, it } from "vitest";
import { safeUuid, sanitizeMetadata, sanitizeText } from "./sanitize";

describe("observability sanitization", () => {
  it("redacts secrets, email addresses, and sensitive metadata", () => {
    expect(sanitizeText("Bearer abc.def user@example.com")).not.toContain(
      "abc.def",
    );
    expect(sanitizeText("Bearer abc.def user@example.com")).not.toContain(
      "user@example.com",
    );
    expect(
      sanitizeMetadata({
        jobType: "brief",
        password: "unsafe",
        documentExcerpt: "private",
      }),
    ).toEqual({
      jobType: "brief",
      password: "[REDACTED]",
      documentExcerpt: "[REDACTED]",
    });
  });

  it("accepts only valid UUID request identifiers", () => {
    expect(safeUuid("not-a-request-id")).toBeNull();
    expect(safeUuid("10000000-0000-4000-8000-000000000001")).not.toBeNull();
  });
});
