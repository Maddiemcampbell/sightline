import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");

  return (
    <AuthCard
      title="Create your account"
      description="Use your work email to get started with Sightline."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-deep-green font-semibold underline-offset-4 hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthCard>
  );
}
