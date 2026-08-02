import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { resolveOnboardingDestination } from "@/lib/auth/onboarding";
import { getCurrentUser } from "@/lib/auth/session";

type LoginPageProps = Readonly<{
  searchParams: Promise<{
    next?: string;
    reset?: string;
    error?: string;
  }>;
}>;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  const user = await getCurrentUser();
  if (user) {
    redirect((await resolveOnboardingDestination(user, { next })).destination);
  }

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to your Sightline workspace."
      footer={
        <>
          Interested in Sightline?{" "}
          <Link
            href="/request-access"
            className="text-deep-green font-semibold underline-offset-4 hover:underline"
          >
            Request access
          </Link>
        </>
      }
    >
      {params.reset === "success" ? (
        <p
          role="status"
          className="bg-soft-green text-deep-green mb-5 rounded-md p-3 text-sm"
        >
          Your password has been updated. Log in with your new password.
        </p>
      ) : null}
      {params.error ? (
        <p
          role="alert"
          className="bg-soft-red text-danger mb-5 rounded-md p-3 text-sm"
        >
          That email link is invalid or expired. Please try again.
        </p>
      ) : null}
      <AuthForm mode="login" next={next} />
    </AuthCard>
  );
}
