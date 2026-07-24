import { describe, expect, it } from "vitest";

import {
  applySecurityHeaders,
  contentSecurityPolicy,
} from "@/lib/security/headers";

describe("production response headers", () => {
  it("uses a strict nonce-based script policy", () => {
    const policy = contentSecurityPolicy("test-nonce", false);
    expect(policy).toContain(
      "script-src 'self' 'nonce-test-nonce' 'strict-dynamic'",
    );
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it("sets transport, embedding, MIME, privacy, and cache protections", () => {
    const headers = new Headers();
    applySecurityHeaders(headers, "default-src 'self'", true);
    expect(headers.get("strict-transport-security")).toContain("max-age=");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("cache-control")).toBe("private, no-store");
  });
});
