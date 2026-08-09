import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MicrosoftGraphClient } from "./client";

function configureEnvironment() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
  vi.stubEnv("CRON_SECRET", "a".repeat(32));
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("MICROSOFT365_CLIENT_ID", "client-id");
  vi.stubEnv("MICROSOFT365_CLIENT_SECRET", "client-secret");
}

describe("MicrosoftGraphClient", () => {
  beforeEach(() => configureEnvironment());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses client credentials and caches the tenant token", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token", expires_in: 3600 }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ value: [{ id: "tenant", displayName: "Contoso" }] }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ value: [] }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new MicrosoftGraphClient("tenant-id");

    await expect(client.organization()).resolves.toEqual({
      id: "tenant",
      displayName: "Contoso",
    });
    await expect(client.drives("site-id")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      "tenant-id/oauth2/v2.0/token",
    );
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject(
      {
        Authorization: "Bearer token",
      },
    );
  });

  it("rejects non-SharePoint site URLs before calling Graph", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const client = new MicrosoftGraphClient("tenant-id");

    await expect(
      client.resolveSite("https://example.com/sites/project"),
    ).rejects.toThrow("valid SharePoint Online site URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes Graph permission failures", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token", expires_in: 3600 }),
          {
            status: 200,
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: "Access denied" } }), {
          status: 403,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      new MicrosoftGraphClient("tenant-id").drives("site-id"),
    ).rejects.toMatchObject({
      code: "permission",
      status: 403,
    });
  });
});
