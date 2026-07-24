"use client";

import { AuthCard } from "@/components/auth/auth-card";
import { PrimaryButton } from "@/components/ui/button";

export default function AuthError({
  reset,
}: Readonly<{ reset: () => void }>) {
  return (
    <AuthCard
      title="Authentication unavailable"
      description="Sightline could not complete this request."
    >
      <PrimaryButton onClick={reset} className="w-full">
        Try again
      </PrimaryButton>
    </AuthCard>
  );
}
