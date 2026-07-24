import { describe, expect, it } from "vitest";
import {
  isInternalAdminAuthUser,
  readInternalAdminAuthUserIds,
} from "@/lib/auth/internal-admin-policy";

const operator = "10000000-0000-4000-8000-000000000001";

describe("internal platform administrator policy", () => {
  it("fails closed when no operator allowlist is configured", () => {
    expect(isInternalAdminAuthUser(operator, undefined)).toBe(false);
  });

  it("accepts only exact UUID allowlist matches", () => {
    expect(isInternalAdminAuthUser(operator, ` ${operator.toUpperCase()} `)).toBe(true);
    expect(
      isInternalAdminAuthUser(
        "10000000-0000-4000-8000-000000000002",
        operator,
      ),
    ).toBe(false);
  });

  it("rejects malformed production configuration", () => {
    expect(() => readInternalAdminAuthUserIds("not-a-user-id")).toThrow();
  });
});

