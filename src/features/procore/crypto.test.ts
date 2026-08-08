import { beforeEach, describe, expect, it } from "vitest";

import { decryptProcoreSecret, encryptProcoreSecret } from "./crypto";

describe("Procore credential encryption", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.CRON_SECRET = "test-cron-secret-that-is-long-enough";
    process.env.APP_URL = "http://localhost:3000";
    process.env.PROCORE_CREDENTIAL_ENCRYPTION_KEY =
      "01234567890123456789012345678901";
  });

  it("round trips credentials without storing plaintext", () => {
    const secret = "procore-client-secret";
    const ciphertext = encryptProcoreSecret(secret);
    expect(ciphertext).not.toContain(secret);
    expect(decryptProcoreSecret(ciphertext)).toBe(secret);
  });

  it("rejects tampered ciphertext", () => {
    const ciphertext = encryptProcoreSecret("secret");
    const parts = ciphertext.split(":");
    parts[2] = `${parts[2]}x`;
    expect(() => decryptProcoreSecret(parts.join(":"))).toThrow();
  });
});
