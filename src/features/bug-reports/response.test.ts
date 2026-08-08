import { describe, expect, it } from "vitest";

import { bugReportFailureMessage } from "./response";

describe("bug report failure responses", () => {
  it("preserves a safe server message", () => {
    expect(
      bugReportFailureMessage(429, {
        message: "Too many reports. Please wait a minute and try again.",
      }),
    ).toBe("Too many reports. Please wait a minute and try again.");
  });

  it("explains inline validation failures", () => {
    expect(
      bugReportFailureMessage(422, {
        fieldErrors: { description: ["Describe what happened."] },
      }),
    ).toBe("Check the highlighted fields and try again.");
  });

  it("distinguishes authentication and request-verification failures", () => {
    expect(bugReportFailureMessage(401, { error: "Unauthorized" })).toBe(
      "Your session expired. Refresh the page, sign in, and try again.",
    );
    expect(bugReportFailureMessage(403, { error: "Forbidden." })).toBe(
      "Sightline could not verify this request. Refresh the page and try again.",
    );
  });

  it("includes a server reference for an unexpected persistence failure", () => {
    expect(
      bugReportFailureMessage(500, {
        reference: "735f25d7-a4ca-410c-8d7c-3c09db5955c8",
      }),
    ).toBe(
      "We could not save the report. Try again. Reference: 735f25d7-a4ca-410c-8d7c-3c09db5955c8",
    );
  });
});
