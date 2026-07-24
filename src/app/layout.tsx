import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentMembership, getCurrentUser } from "@/lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Sightline",
    template: "%s | Sightline",
  },
  description: "Profit intelligence for commercial construction companies.",
};

const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/callback",
]);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = (await headers()).get("x-sightline-pathname") ?? "/";
  const isPublic = PUBLIC_ROUTES.has(pathname);
  const user = await getCurrentUser();

  if (!isPublic && !user) {
    const next = encodeURIComponent(pathname);
    redirect(`/login?next=${next}`);
  }
  const permitsMembershipOnboarding =
    pathname === "/organizations/new" || pathname.startsWith("/invitations/");
  if (
    !isPublic &&
    user &&
    !permitsMembershipOnboarding &&
    !(await getCurrentMembership())
  ) {
    redirect("/organizations/new");
  }

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <a
          href="#main-content"
          className="bg-deep-green sr-only z-50 rounded-md px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to main content
        </a>
        {isPublic ? children : <AppShell>{children}</AppShell>}
      </body>
    </html>
  );
}
