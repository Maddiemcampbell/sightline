import { notFound } from "next/navigation";

import { acceptProjectInvitationAction } from "@/app/project-invitations/[token]/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { projectInvitationTokenSchema } from "@/features/project-access/validation";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export default async function ProjectInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  await requireAuthenticatedUser();
  const parsed = projectInvitationTokenSchema.safeParse((await params).token);
  if (!parsed.success) notFound();
  const action = acceptProjectInvitationAction.bind(null, parsed.data);
  return (
    <div className="mx-auto max-w-xl px-[var(--page-gutter)] py-16">
      <Card>
        <p className="text-muted text-sm font-semibold">Project invitation</p>
        <h1 className="mt-2 text-2xl font-semibold">Accept project access</h1>
        <p className="text-muted mt-3">
          This invitation adds the project to your existing organization
          membership with the assigned project role.
        </p>
        <form action={action} className="mt-6">
          <Button type="submit">Accept invitation</Button>
        </form>
      </Card>
    </div>
  );
}
