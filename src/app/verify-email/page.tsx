import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { ResendVerificationForm } from "@/components/auth/resend-verification-form";
import { logout } from "@/app/auth/actions";
import { resolveOnboardingDestination } from "@/lib/auth/onboarding";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/auth/session";

type VerifyEmailPageProps = Readonly<{
  searchParams: Promise<{ email?: string; next?: string }>;
}>;

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  if (user?.emailVerified) {
    redirect((await resolveOnboardingDestination(user, { next })).destination);
  }
  const email = user?.email ?? params.email;

  return (
    <AuthCard
      title="Check your email"
      description={`We sent a verification link${email ? ` to ${email}` : ""}. Open it to activate your account.`}
      footer={
        user ? (
          <form action={logout}>
            <button className="text-deep-green font-semibold underline-offset-4 hover:underline">
              Use a different account
            </button>
          </form>
        ) : (
          "You can close this page after opening the verification link."
        )
      }
    >
      <div className="bg-soft-green text-deep-green rounded-md p-4 text-sm leading-6">
        The link may take a minute to arrive. Check your spam folder if you
        don’t see it.
      </div>
      {email ? <ResendVerificationForm email={email} next={next} /> : null}
    </AuthCard>
  );
}
