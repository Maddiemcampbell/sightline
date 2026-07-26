import { safeRedirectPath } from "@/lib/auth/redirects";

const AUTH_ROUTES = new Set([
  "/login",
  "/signup",
  "/verify-email",
  "/auth/callback",
]);

export function onboardingNext(
  value: string | null | undefined,
): string | null {
  const destination = safeRedirectPath(value, "");
  if (!destination || destination === "/") return null;
  const pathname = destination.split("?")[0] ?? destination;
  return AUTH_ROUTES.has(pathname) ? null : destination;
}

export function destinationForMembershipState(
  input: Readonly<{
    organizationId: string | null;
    projectCount: number;
    next?: string | null;
    welcome?: "signup" | "organization" | "invitation";
  }>,
): string {
  const next = onboardingNext(input.next);
  if (next === "/reset-password" || next?.startsWith("/invitations/")) {
    return next;
  }
  if (!input.organizationId) return "/organizations/new";
  if (next) return next;
  if (input.projectCount === 0) {
    const query = new URLSearchParams();
    query.set("welcome", input.welcome ?? "signup");
    return `/projects/new?${query.toString()}`;
  }
  return "/";
}
