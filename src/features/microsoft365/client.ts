import "server-only";

import { getServerEnv } from "@/lib/env";
import type {
  DriveItem,
  GraphPage,
  MicrosoftOrganization,
  SharePointDrive,
  SharePointSite,
} from "./types";
import { MicrosoftGraphError } from "./types";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

export class MicrosoftGraphClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly tenantId: string) {}

  async organization(): Promise<MicrosoftOrganization> {
    const page = await this.json<GraphPage<MicrosoftOrganization>>(
      "/organization?$select=id,displayName",
    );
    const organization = page.value[0];
    if (!organization) throw new Error("Microsoft tenant was not found.");
    return organization;
  }

  async resolveSite(siteUrl: string): Promise<SharePointSite> {
    const parsed = new URL(siteUrl);
    if (
      !parsed.hostname.endsWith(".sharepoint.com") ||
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error("Enter a valid SharePoint Online site URL.");
    }
    const path = parsed.pathname.replace(/\/$/, "") || "/";
    return this.json<SharePointSite>(
      `/sites/${encodeURIComponent(parsed.hostname)}:${encodeURI(path)}?$select=id,name,displayName,webUrl`,
    );
  }

  async drives(siteId: string): Promise<SharePointDrive[]> {
    const page = await this.json<GraphPage<SharePointDrive>>(
      `/sites/${encodeURIComponent(siteId)}/drives?$select=id,name,webUrl,driveType`,
    );
    return page.value;
  }

  async delta(driveId: string, deltaLink?: string | null) {
    const path =
      deltaLink ?? `/drives/${encodeURIComponent(driveId)}/root/delta`;
    return this.json<GraphPage<DriveItem>>(path);
  }

  async download(driveId: string, itemId: string): Promise<Uint8Array> {
    const response = await this.request(
      `/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/content`,
    );
    return new Uint8Array(await response.arrayBuffer());
  }

  private async json<T>(path: string): Promise<T> {
    return (await this.request(path)).json() as Promise<T>;
  }

  private async request(path: string, attempt = 0): Promise<Response> {
    const token = await this.accessToken();
    const url = path.startsWith("https://") ? path : `${GRAPH_ROOT}${path}`;
    if (new URL(url).origin !== "https://graph.microsoft.com") {
      throw new Error("Microsoft Graph returned an invalid continuation URL.");
    }
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      redirect: "follow",
    });
    if (response.ok) return response;
    if ((response.status === 429 || response.status >= 500) && attempt < 2) {
      const retrySeconds = Math.min(
        Number(response.headers.get("retry-after") ?? 1),
        10,
      );
      await new Promise((resolve) => setTimeout(resolve, retrySeconds * 1000));
      return this.request(path, attempt + 1);
    }
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    const code =
      response.status === 401
        ? "authentication"
        : response.status === 403
          ? "permission"
          : response.status === 429
            ? "throttled"
            : "request";
    throw new MicrosoftGraphError(
      body?.error?.message?.slice(0, 500) ??
        `Microsoft Graph request failed (${response.status}).`,
      response.status,
      code,
    );
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const env = getServerEnv();
    if (!env.MICROSOFT365_CLIENT_ID || !env.MICROSOFT365_CLIENT_SECRET) {
      throw new Error("Microsoft 365 is not configured on this server.");
    }
    const response = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(this.tenantId)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: env.MICROSOFT365_CLIENT_ID,
          client_secret: env.MICROSOFT365_CLIENT_SECRET,
          grant_type: "client_credentials",
          scope: "https://graph.microsoft.com/.default",
        }),
        cache: "no-store",
      },
    );
    const data = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!response.ok || !data.access_token) {
      throw new MicrosoftGraphError(
        data.error_description?.slice(0, 500) ??
          "Microsoft rejected the application credentials.",
        response.status,
        "authentication",
      );
    }
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    };
    return this.token.value;
  }
}
