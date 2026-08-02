import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
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
      title="Account creation is invite-only"
      description="Sightline creates customer accounts only through approved owner activations and organization invitations."
      footer={
        <>
          Already invited?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-deep-green font-semibold underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <div className="space-y-3">
        <Link
          href="/request-access"
          className="bg-deep-green block rounded-md px-4 py-3 text-center font-semibold text-white"
        >
          Request access
        </Link>
        <p className="text-center text-sm text-slate-500">
          If you received an invitation, use its private setup link.
        </p>
      </div>
    </AuthCard>
  );
}
