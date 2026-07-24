import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUser } from "@/lib/auth/session";

type VerifyEmailPageProps = Readonly<{
  searchParams: Promise<{ email?: string }>;
}>;

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const user = await getCurrentUser();
  const { email } = await searchParams;

  return (
    <AuthCard
      title={user ? "Email verified" : "Check your email"}
      description={
        user
          ? "Your email address has been verified and your session is active."
          : `We sent a verification link${email ? ` to ${email}` : ""}. Open it to activate your account.`
      }
      footer={
        <Link
          href={user ? "/" : "/login"}
          className="text-deep-green font-semibold underline-offset-4 hover:underline"
        >
          {user ? "Continue to Sightline" : "Back to login"}
        </Link>
      }
    >
      <div className="bg-soft-green text-deep-green rounded-md p-4 text-sm leading-6">
        {user
          ? "You can safely continue to your workspace."
          : "The link may take a minute to arrive. Check your spam folder if you don’t see it."}
      </div>
    </AuthCard>
  );
}
