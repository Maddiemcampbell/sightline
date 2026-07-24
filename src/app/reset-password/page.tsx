import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function ResetPasswordPage() {
  if (!(await getCurrentUser())) redirect("/forgot-password");

  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least 8 characters. Your previous password will no longer work."
    >
      <AuthForm mode="reset-password" />
    </AuthCard>
  );
}
