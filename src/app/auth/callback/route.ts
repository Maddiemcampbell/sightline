import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordPrincipalAuditEvent } from "@/features/audit/service";

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

  return NextResponse.redirect(new URL(next, request.url));
}
