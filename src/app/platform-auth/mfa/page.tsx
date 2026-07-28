import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { MfaEnrollmentForm, MfaVerificationForm } from "./mfa-form";
import { AuthCard } from "@/components/auth/auth-card";
import { requirePlatformOperator } from "@/features/platform-admin/authorization";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Platform identity verification",
  robots: { index: false, follow: false },
};

export default async function PlatformMfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const operator = await requirePlatformOperator({ enforceMfa: false });
  if (!operator.mfaRequired) notFound();
  const next = safeRedirectPath((await searchParams).next, "/internal/admin");
  const client = await createServerSupabaseClient();
  const [assurance, factors] = await Promise.all([
    client.auth.mfa.getAuthenticatorAssuranceLevel(),
    client.auth.mfa.listFactors(),
  ]);
  if (assurance.error || factors.error)
    throw new Error("Platform identity verification is unavailable.");
  if (assurance.data.currentLevel === "aal2") redirect(next);
  const verifiedFactor = factors.data.totp.find(
    (factor) => factor.status === "verified",
  );

  return (
    <AuthCard
      title={
        verifiedFactor ? "Verify your identity" : "Secure your operator account"
      }
      description={
        verifiedFactor
          ? "Enter the current code from your authenticator app to access platform administration."
          : "Platform administration requires a time-based authenticator code in addition to your password."
      }
    >
      {verifiedFactor ? (
        <MfaVerificationForm factorId={verifiedFactor.id} next={next} />
      ) : (
        <MfaEnrollmentForm next={next} />
      )}
    </AuthCard>
  );
}
