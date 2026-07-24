import { describe, expect, it } from "vitest";

import { isSameOriginMutation } from "@/lib/security/request";

describe("route-handler CSRF protection", () => {
  it("accepts a matching browser origin", () => {
    expect(
      isSameOriginMutation(
        new Request("http://localhost:3000/api/actions", {
          method: "POST",
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).toBe(true);
  });

  it("accepts a browser-verified same-origin request behind a proxy", () => {
    expect(
      isSameOriginMutation(
        new Request("http://internal:3000/api/actions", {
          method: "POST",
          headers: {
            origin: "https://app.example.com",
            "sec-fetch-site": "same-origin",
          },
        }),
      ),
    ).toBe(true);
  });

  it("rejects missing, malformed, and cross-site origins", () => {
    for (const origin of [undefined, "not-a-url", "https://attacker.example"]) {
      expect(
        isSameOriginMutation(
          new Request("http://localhost:3000/api/actions", {
            method: "POST",
            ...(origin
              ? {
                  headers: {
                    origin,
                    "sec-fetch-site": "cross-site",
                  },
                }
              : {}),
          }),
        ),
      ).toBe(false);
    }
  });
});
