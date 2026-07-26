import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeRedirectPath } from "@/lib/auth/redirects";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import {
  applySecurityHeaders,
  contentSecurityPolicy,
} from "@/lib/security/headers";

const AUTH_STORAGE_KEY = "sightline-auth";
const COOKIE_CHUNK_SIZE = 3_500;
const MAX_COOKIE_CHUNKS = 8;
const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
  "/api/health",
]);

function cookieName(key: string, index: number): string {
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return index === 0 ? safeKey : `${safeKey}.${index}`;
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname) || pathname.startsWith("/api/cron/");
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const production = process.env.NODE_ENV === "production";
  const csp = contentSecurityPolicy(nonce, !production);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sightline-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applySecurityHeaders(response.headers, csp, production);

  const client = createClient<AppDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        persistSession: true,
        storageKey: AUTH_STORAGE_KEY,
        storage: {
          isServer: true,
          getItem: (key) => {
            let value = "";
            for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
              const chunk = request.cookies.get(cookieName(key, index))?.value;
              if (!chunk) break;
              value += chunk;
            }
            return value || null;
          },
          setItem: (key, value) => {
            const chunks = Array.from(
              { length: Math.ceil(value.length / COOKIE_CHUNK_SIZE) },
              (_, index) =>
                value.slice(
                  index * COOKIE_CHUNK_SIZE,
                  (index + 1) * COOKIE_CHUNK_SIZE,
                ),
            );
            chunks.forEach((chunk, index) => {
              const name = cookieName(key, index);
              request.cookies.set(name, chunk);
              response.cookies.set(name, chunk, {
                httpOnly: true,
                path: "/",
                sameSite: "lax",
                secure:
                  process.env.NODE_ENV === "production" &&
                  process.env.SIGHTLINE_E2E !== "true",
              });
            });
            for (
              let index = chunks.length;
              index < MAX_COOKIE_CHUNKS;
              index += 1
            ) {
              response.cookies.delete(cookieName(key, index));
            }
          },
          removeItem: (key) => {
            for (let index = 0; index < MAX_COOKIE_CHUNKS; index += 1) {
              response.cookies.delete(cookieName(key, index));
            }
          },
        },
      },
    },
  );

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user && !isPublicRoute(request.nextUrl.pathname)) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const unauthorized = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
      applySecurityHeaders(unauthorized.headers, csp, production);
      return unauthorized;
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      safeRedirectPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );
    const redirect = NextResponse.redirect(loginUrl);
    applySecurityHeaders(redirect.headers, csp, production);
    return redirect;
  }

  if (
    user &&
    !user.email_confirmed_at &&
    !isPublicRoute(request.nextUrl.pathname)
  ) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const forbidden = NextResponse.json(
        { error: "Email verification required." },
        { status: 403 },
      );
      applySecurityHeaders(forbidden.headers, csp, production);
      return forbidden;
    }
    const verification = NextResponse.redirect(
      new URL("/verify-email", request.url),
    );
    applySecurityHeaders(verification.headers, csp, production);
    return verification;
  }

  if (user && request.nextUrl.pathname.startsWith("/internal/admin")) {
    const { data: operator, error } = await client
      .from("platform_operators")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (error || !operator) {
      const hidden = new NextResponse("Not Found", { status: 404 });
      applySecurityHeaders(hidden.headers, csp, production);
      return hidden;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
