import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we’ll send you a secure reset link."
      footer={
        <Link
          href="/login"
          className="text-deep-green font-semibold underline-offset-4 hover:underline"
        >
          Back to login
        </Link>
      }
    >
      <AuthForm mode="forgot-password" />
    </AuthCard>
  );
}
