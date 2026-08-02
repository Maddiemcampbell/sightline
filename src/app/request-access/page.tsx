import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { RequestAccessForm } from "./request-access-form";

export default function RequestAccessPage() {
  return (
    <AuthCard
      title="Request access"
      description="Sightline is onboarding design partners through a guided, invite-only process. Requesting access does not create an account or workspace."
      footer={
        <>
          Already invited?{" "}
          <Link
            href="/login"
            className="text-deep-green font-semibold hover:underline"
          >
            Log in
          </Link>
        </>
      }
    >
      <RequestAccessForm />
    </AuthCard>
  );
}
