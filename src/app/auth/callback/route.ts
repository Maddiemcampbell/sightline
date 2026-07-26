import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordPrincipalAuditEvent } from "@/features/audit/service";
import { resolveOnboardingDestination } from "@/lib/auth/onboarding";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeRedirectPath(request.nextUrl.searchParams.get("next"));
  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_callback", request.url),
    );
  }

  const client = await createServerSupabaseClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_callback", request.url),
    );
  }
  if (data.user) {
    await recordPrincipalAuditEvent({
      actorAuthUserId: data.user.id,
      action: "auth.login",
      resourceType: "session",
      metadata: { authenticationMethod: "email_link" },
    });
  }

  if (!data.user?.email) {
    return NextResponse.redirect(
      new URL("/login?error=invalid_callback", request.url),
    );
  }
  const resolution = await resolveOnboardingDestination(
    {
      id: data.user.id,
      email: data.user.email,
      emailVerified: Boolean(data.user.email_confirmed_at),
    },
    { next, welcome: "signup" },
  );
  const response = NextResponse.redirect(
    new URL(resolution.destination, request.url),
  );
  if (resolution.organizationId) {
    response.cookies.set(
      ACTIVE_ORGANIZATION_COOKIE,
      resolution.organizationId,
      {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure:
          process.env.NODE_ENV === "production" &&
          process.env.SIGHTLINE_E2E !== "true",
      },
    );
  }
  return response;
}
