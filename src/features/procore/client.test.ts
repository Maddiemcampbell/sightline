import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProcoreClient } from "./client";

describe("ProcoreClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("acquires and caches a client-credentials token while paginating projects", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token", expires_in: 3600 }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 1, name: "One" }],
            page: 1,
            per_page: 100,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new ProcoreClient({
      environment: "sandbox",
      clientId: "client",
      clientSecret: "secret",
      companyId: "123",
    });

    await expect(client.listProjects()).resolves.toEqual([
      { id: 1, name: "One" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain(
      "sandbox.procore.com/rest/v1.0/projects",
    );
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("company_id=123");
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject(
      {
        Authorization: "Bearer token",
        "Procore-Company-Id": "123",
      },
    );
  });

  it("classifies permission failures without retrying unsafe requests", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "token", expires_in: 3600 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new ProcoreClient({
      environment: "production",
      clientId: "client-2",
      clientSecret: "secret",
      companyId: "456",
    });

    await expect(client.listProjects()).rejects.toMatchObject({
      code: "permission",
      status: 403,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("refreshes a cached token once when Procore rejects it", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "stale", expires_in: 3600 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response('{"error":"Invalid Token"}', { status: 401 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ access_token: "fresh", expires_in: 3600 }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 7, name: "Seven" }] }), {
          status: 200,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const client = new ProcoreClient({
      environment: "sandbox",
      clientId: "refresh-client",
      clientSecret: "secret",
      companyId: "789",
    });

    await expect(client.listProjects()).resolves.toEqual([
      { id: 7, name: "Seven" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).headers).toMatchObject(
      { Authorization: "Bearer stale" },
    );
    expect((fetchMock.mock.calls[3]?.[1] as RequestInit).headers).toMatchObject(
      { Authorization: "Bearer fresh" },
    );
  });
});
