import { TeamManagement } from "@/features/team/team-management";
import { OrganizationRepository } from "@/features/organizations/repository";
import {
  canManageMembers,
  canManageProjectMembers,
} from "@/lib/auth/authorization";
import { requireCurrentMembership } from "@/lib/auth/session";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeamSettingsPage() {
  const membership = await requireCurrentMembership();
  const repository = new OrganizationRepository(createAdminSupabaseClient());
  const client = createAdminSupabaseClient();
  const [members, invitations, projectsResult] = await Promise.all([
    repository.listMemberProfiles(membership.organizationId),
    repository.listInvitations(membership.organizationId),
    client
      .from("projects")
      .select("id,name")
      .eq("organization_id", membership.organizationId)
      .order("name"),
  ]);
  if (projectsResult.error) throw new Error(projectsResult.error.message);

  return (
    <TeamManagement
      organizationName={membership.organization.name}
      currentMembershipId={membership.id}
      canManage={canManageMembers(membership)}
      canManageProjects={canManageProjectMembers(membership)}
      members={members}
      invitations={invitations}
      projects={projectsResult.data}
    />
  );
}
