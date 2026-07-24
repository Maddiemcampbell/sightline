import { getServerEnv } from "@/lib/env";

export function isSameOriginMutation(request: Request): boolean {
  const suppliedOrigin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin") return true;
  if (!suppliedOrigin || fetchSite === "cross-site") return false;
  try {
    const expectedOrigin =
      process.env.NODE_ENV === "production"
        ? new URL(getServerEnv().APP_URL).origin
        : new URL(request.url).origin;
    return new URL(suppliedOrigin).origin === expectedOrigin;
  } catch {
    return false;
  }
}

export function rejectCrossSiteMutation(request: Request): Response | null {
  return isSameOriginMutation(request)
    ? null
    : Response.json({ error: "Forbidden." }, { status: 403 });
}
