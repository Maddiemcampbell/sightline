import "server-only";

import { randomUUID } from "node:crypto";

import { getServerEnv } from "@/lib/env";
import {
  ProcoreApiError,
  type ProcoreEnvironment,
  type ProcorePage,
  type ProcoreProject,
} from "./types";

type Token = { accessToken: string; expiresAt: number };
const tokenCache = new Map<string, Token>();

const ENDPOINTS: Record<ProcoreEnvironment, { auth: string; api: string }> = {
  sandbox: {
    auth: "https://login-sandbox.procore.com",
    api: "https://sandbox.procore.com",
  },
  production: {
    auth: "https://login.procore.com",
    api: "https://api.procore.com",
  },
};

export class ProcoreClient {
  constructor(
    private readonly input: {
      environment: ProcoreEnvironment;
      clientId: string;
      clientSecret: string;
      companyId: string;
    },
  ) {}

  async listProjects(): Promise<ProcoreProject[]> {
    return this.list<ProcoreProject>(
      "/rest/v1.0/projects",
      {
        "Procore-Company-Id": this.input.companyId,
      },
      { company_id: this.input.companyId },
    );
  }

  async list<T>(
    path: string,
    headers: Record<string, string> = {},
    query: Record<string, string | number> = {},
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    const perPage = 100;
    while (true) {
      const response = await this.request<ProcorePage<T>>(path, {
        headers,
        query: { ...query, page, per_page: perPage },
      });
      items.push(...(Array.isArray(response.data) ? response.data : []));
      if (!response.data?.length || response.data.length < perPage) break;
      page += 1;
      if (page > 10_000)
        throw new ProcoreApiError(
          "Pagination limit exceeded.",
          "invalid_response",
        );
    }
    return items;
  }

  async request<T>(
    path: string,
    options: {
      method?: "GET";
      headers?: Record<string, string>;
      query?: Record<string, string | number>;
    } = {},
  ): Promise<T> {
    let token = await this.accessToken();
    const url = new URL(path, ENDPOINTS[this.input.environment].api);
    for (const [key, value] of Object.entries(options.query ?? {}))
      url.searchParams.set(key, String(value));
    const correlationId = randomUUID();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: options.method ?? "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "X-Correlation-ID": correlationId,
            ...options.headers,
          },
          signal: AbortSignal.timeout(20_000),
          cache: "no-store",
        });
      } catch (error) {
        if (attempt < 2) {
          await delay(250 * 2 ** attempt);
          continue;
        }
        throw new ProcoreApiError(
          error instanceof Error ? error.message : "Procore request failed.",
          "request",
        );
      }
      if (response.ok) {
        const body: unknown = await response.json().catch(() => null);
        if (!body || typeof body !== "object")
          throw new ProcoreApiError(
            "Procore returned an invalid response.",
            "invalid_response",
            response.status,
          );
        return body as T;
      }
      const retryAfter = Number(response.headers.get("retry-after")) || null;
      const message = await safeErrorMessage(response);
      if (response.status === 401 && attempt === 0) {
        this.invalidateToken();
        token = await this.accessToken();
        continue;
      }
      if (response.status === 401)
        throw new ProcoreApiError(message, "authentication", response.status);
      if (response.status === 403)
        throw new ProcoreApiError(message, "permission", response.status);
      if (response.status === 429) {
        if (attempt < 2) {
          await delay((retryAfter ?? 1) * 1000);
          continue;
        }
        throw new ProcoreApiError(
          message,
          "rate_limit",
          response.status,
          retryAfter,
        );
      }
      if (response.status >= 500 && attempt < 2) {
        await delay(250 * 2 ** attempt);
        continue;
      }
      throw new ProcoreApiError(
        message,
        response.status >= 500 ? "transient" : "request",
        response.status,
      );
    }
    throw new ProcoreApiError("Procore request failed.", "request");
  }

  private async accessToken(): Promise<string> {
    const cacheKey = `${this.input.environment}:${this.input.clientId}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000)
      return cached.accessToken;
    const endpoint = `${ENDPOINTS[this.input.environment].auth}/oauth/token`;
    const form = new FormData();
    form.set("grant_type", "client_credentials");
    form.set("client_id", this.input.clientId);
    form.set("client_secret", this.input.clientSecret);
    const response = await fetch(endpoint, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    }).catch((error) => {
      throw new ProcoreApiError(
        error instanceof Error ? error.message : "Token request failed.",
        "request",
      );
    });
    if (!response.ok) {
      const message = await safeErrorMessage(response);
      throw new ProcoreApiError(
        message,
        response.status === 401 ? "authentication" : "request",
        response.status,
      );
    }
    const body = (await response.json().catch(() => null)) as {
      access_token?: unknown;
      expires_in?: unknown;
    } | null;
    if (typeof body?.access_token !== "string")
      throw new ProcoreApiError(
        "Procore token response was invalid.",
        "invalid_response",
        response.status,
      );
    const expiresIn =
      typeof body.expires_in === "number" ? body.expires_in : 3600;
    tokenCache.set(cacheKey, {
      accessToken: body.access_token,
      expiresAt: Date.now() + expiresIn * 1000,
    });
    return body.access_token;
  }

  private invalidateToken() {
    tokenCache.delete(`${this.input.environment}:${this.input.clientId}`);
  }
}

export function createProcoreClient(input: {
  environment: ProcoreEnvironment;
  companyId: string;
  clientId?: string | undefined;
  clientSecret?: string | undefined;
}): ProcoreClient {
  const env = getServerEnv();
  const clientId = input.clientId ?? env.PROCORE_CLIENT_ID;
  const clientSecret = input.clientSecret ?? env.PROCORE_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Procore client credentials are not configured.");
  return new ProcoreClient({
    environment: input.environment,
    companyId: input.companyId,
    clientId,
    clientSecret,
  });
}

async function safeErrorMessage(response: Response): Promise<string> {
  const body = await response.text().catch(() => "");
  return (
    body.replace(/\s+/g, " ").slice(0, 300) ||
    `Procore request failed (${response.status}).`
  );
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
