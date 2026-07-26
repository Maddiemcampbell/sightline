import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { resolveOnboardingDestination } from "@/lib/auth/onboarding";
import { safeRedirectPath } from "@/lib/auth/redirects";
import { getCurrentUser } from "@/lib/auth/session";

type SignupPageProps = Readonly<{
  searchParams: Promise<{ next?: string }>;
}>;

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const next = safeRedirectPath(params.next);
  const user = await getCurrentUser();
  if (user) {
    redirect((await resolveOnboardingDestination(user, { next })).destination);
  }

  return (
    <AuthCard
      title="Create your account"
      description="Use your work email to get started with Sightline."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-deep-green font-semibold underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" next={next} />
    </AuthCard>
  );
}
