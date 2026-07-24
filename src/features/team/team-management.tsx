"use client";

import { useActionState, useMemo, useState, useTransition } from "react";

import {
  changeMemberRoleAction,
  assignMemberProjectsAction,
  removeMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
  type TeamActionState,
} from "@/app/settings/team/actions";
import {
  createInvitationAction,
  type OrganizationActionState,
} from "@/app/organization/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  Invitation,
  OrganizationMemberProfile,
} from "@/features/organizations/types";
import type { OrganizationRole } from "@/lib/auth/authorization";

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Owner",
  administrator: "Administrator",
  manager: "Manager",
  contributor: "Contributor",
};

type Props = Readonly<{
  organizationName: string;
  currentMembershipId: string;
  canManage: boolean;
  canManageProjects: boolean;
  members: readonly OrganizationMemberProfile[];
  invitations: readonly Invitation[];
  projects: readonly Readonly<{ id: string; name: string }>[];
}>;

export function TeamManagement(props: Props) {
  const [members, setMembers] = useState(props.members);
  const [invitations, setInvitations] = useState(props.invitations);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | OrganizationRole>("all");
  const [sort, setSort] = useState<
    "name" | "last_active" | "invitation_status"
  >("name");
  const [editing, setEditing] =
    useState<OrganizationMemberProfile | null>(null);
  const [assigning, setAssigning] =
    useState<OrganizationMemberProfile | null>(null);
  const [message, setMessage] = useState("");
  const [resentInvitationUrl, setResentInvitationUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const [inviteState, inviteAction, invitePending] = useActionState<
    OrganizationActionState,
    FormData
  >(createInvitationAction, {});

  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members
      .filter(
        (member) =>
          (role === "all" || member.role === role) &&
          (!needle ||
            member.fullName.toLowerCase().includes(needle) ||
            member.email.toLowerCase().includes(needle)),
      )
      .toSorted((a, b) => {
        if (sort === "last_active")
          return (
            Date.parse(b.lastActiveAt ?? "1970-01-01") -
            Date.parse(a.lastActiveAt ?? "1970-01-01")
          );
        if (sort === "invitation_status") return 0;
        return a.fullName.localeCompare(b.fullName);
      });
  }, [members, query, role, sort]);

  function mutate(
    action: (
      state: TeamActionState,
      formData: FormData,
    ) => Promise<TeamActionState>,
    formData: FormData,
    optimistic: () => void,
    rollback: () => void,
  ) {
    setMessage("");
    optimistic();
    startTransition(async () => {
      const result = await action({}, formData);
      if (!result.ok) rollback();
      setMessage(result.message ?? "");
      if (result.invitationUrl)
        setResentInvitationUrl(result.invitationUrl);
      if (result.ok && result.changedMembershipId && result.role) {
        setMembers((current) =>
          current.map((member) =>
            member.membershipId === result.changedMembershipId
              ? { ...member, role: result.role as OrganizationRole }
              : member,
          ),
        );
      }
      setEditing(null);
    });
  }

  function remove(member: OrganizationMemberProfile) {
    if (!window.confirm(`Remove ${member.fullName} from this organization?`))
      return;
    const previous = members;
    const formData = new FormData();
    formData.set("membershipId", member.membershipId);
    mutate(
      removeMemberAction,
      formData,
      () =>
        setMembers((current) =>
          current.filter(
            (candidate) => candidate.membershipId !== member.membershipId,
          ),
        ),
      () => setMembers(previous),
    );
  }

  function invitationMutation(
    invitation: Invitation,
    action: typeof revokeInvitationAction | typeof resendInvitationAction,
  ) {
    const previous = invitations;
    const formData = new FormData();
    formData.set("invitationId", invitation.id);
    mutate(
      action,
      formData,
      () => {
        if (action === revokeInvitationAction)
          setInvitations((current) =>
            current.map((item) =>
              item.id === invitation.id
                ? { ...item, revokedAt: new Date().toISOString() }
                : item,
            ),
          );
      },
      () => setInvitations(previous),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-[var(--page-gutter)] py-8 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-muted text-sm font-semibold">Organization settings</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
            Team management
          </h1>
          <p className="text-muted mt-2">
            Manage access to {props.organizationName}.
          </p>
        </div>
        <span className="bg-soft-green text-deep-green rounded-full px-3 py-1 text-sm font-semibold">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </header>

      {props.canManage ? (
        <Card className="mt-7">
          <h2 className="text-lg font-semibold">Invite a teammate</h2>
          <form action={inviteAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_13rem_auto]">
            <label className="grid gap-1 text-sm font-medium">
              Email
              <input
                name="email"
                type="email"
                required
                className="border-border bg-background h-11 rounded-md border px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Role
              <select
                name="role"
                defaultValue="contributor"
                className="border-border bg-background h-11 rounded-md border px-3"
              >
                <option value="administrator">Administrator</option>
                <option value="manager">Manager</option>
                <option value="contributor">Contributor</option>
              </select>
            </label>
            <Button type="submit" className="self-end" disabled={invitePending}>
              {invitePending ? "Inviting…" : "Send invitation"}
            </Button>
          </form>
          {inviteState.message ? (
            <p
              role={inviteState.error ? "alert" : "status"}
              className="text-muted mt-3 text-sm"
            >
              {inviteState.message}
            </p>
          ) : null}
          {inviteState.invitationUrl ? (
            <label className="mt-3 grid gap-1 text-sm">
              Secure invitation link
              <input
                readOnly
                value={inviteState.invitationUrl}
                className="border-border bg-background rounded-md border px-3 py-2"
              />
            </label>
          ) : null}
        </Card>
      ) : (
        <p className="bg-soft-amber text-warning mt-7 rounded-lg p-4 text-sm">
          You can view this team. Only owners and administrators can change
          organization membership.
        </p>
      )}

      <section className="mt-8" aria-labelledby="members-heading">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="members-heading" className="mr-auto text-xl font-semibold">
            Members
          </h2>
          <input
            aria-label="Search members"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            className="border-border bg-surface h-10 rounded-md border px-3 text-sm"
          />
          <select
            aria-label="Filter by role"
            value={role}
            onChange={(event) =>
              setRole(event.target.value as "all" | OrganizationRole)
            }
            className="border-border bg-surface h-10 rounded-md border px-3 text-sm"
          >
            <option value="all">All roles</option>
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort members"
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value as
                  | "name"
                  | "last_active"
                  | "invitation_status",
              )
            }
            className="border-border bg-surface h-10 rounded-md border px-3 text-sm"
          >
            <option value="name">Name</option>
            <option value="last_active">Last active</option>
            <option value="invitation_status">Invitation status</option>
          </select>
        </div>

        {visibleMembers.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {visibleMembers.map((member) => (
              <Card key={member.membershipId}>
                <div className="flex items-start gap-4">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="bg-soft-green text-deep-green grid h-11 w-11 place-items-center rounded-full font-semibold"
                    >
                      {initials(member.fullName)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{member.fullName}</h3>
                    <p className="text-muted truncate text-sm">{member.email}</p>
                  </div>
                  <span className="bg-background rounded-full px-2.5 py-1 text-xs font-semibold">
                    {roleLabels[member.role]}
                  </span>
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Last active</dt>
                    <dd className="mt-1">{formatLastActive(member.lastActiveAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Invitation status</dt>
                    <dd className="mt-1">Active</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-muted">Assigned projects</dt>
                    <dd className="mt-1">
                      {member.assignedProjects.length
                        ? member.assignedProjects
                            .map((project) => project.name)
                            .join(", ")
                        : "No assigned projects"}
                    </dd>
                  </div>
                </dl>
                {props.canManage &&
                member.membershipId !== props.currentMembershipId ? (
                  <div className="mt-5 flex gap-2">
                    <Button
                      intent="secondary"
                      onClick={() => setEditing(member)}
                      disabled={pending}
                    >
                      Change role
                    </Button>
                    {member.role !== "owner" ? (
                      <Button
                        intent="secondary"
                        onClick={() => remove(member)}
                        disabled={pending}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {props.canManageProjects ? (
                  <Button
                    className="mt-2"
                    intent="secondary"
                    onClick={() => setAssigning(member)}
                    disabled={pending}
                  >
                    Edit projects
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <div className="border-border mt-4 rounded-lg border border-dashed p-10 text-center">
            <h3 className="font-semibold">No matching members</h3>
            <p className="text-muted mt-2 text-sm">
              Change the search or role filter to see more teammates.
            </p>
          </div>
        )}
      </section>

      <section className="mt-10" aria-labelledby="invitations-heading">
        <h2 id="invitations-heading" className="text-xl font-semibold">
          Pending invitations
        </h2>
        {invitations.filter((invitation) => !invitation.acceptedAt).length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-muted border-b text-xs uppercase">
                <tr>
                  <th className="py-3">Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last sent</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invitations
                  .filter((invitation) => !invitation.acceptedAt)
                  .map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="py-4">{invitation.email}</td>
                      <td>{roleLabels[invitation.role]}</td>
                      <td>{invitationStatus(invitation)}</td>
                      <td>{formatDate(invitation.lastSentAt)}</td>
                      <td>
                        {props.canManage && !invitation.revokedAt ? (
                          <div className="flex gap-2">
                            <Button
                              intent="secondary"
                              disabled={pending}
                              onClick={() =>
                                invitationMutation(
                                  invitation,
                                  resendInvitationAction,
                                )
                              }
                            >
                              Resend
                            </Button>
                            <Button
                              intent="secondary"
                              disabled={pending}
                              onClick={() =>
                                invitationMutation(
                                  invitation,
                                  revokeInvitationAction,
                                )
                              }
                            >
                              Revoke
                            </Button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted mt-3 text-sm">No pending invitations.</p>
        )}
      </section>

      {message ? (
        <p role="status" className="bg-surface border-border fixed right-5 bottom-5 rounded-lg border px-4 py-3 shadow-lg">
          {message}
        </p>
      ) : null}
      {resentInvitationUrl ? (
        <div className="bg-surface border-border fixed right-5 bottom-20 z-40 max-w-md rounded-lg border p-4 shadow-lg">
          <label className="grid gap-1 text-sm font-medium">
            New secure invitation link
            <input
              readOnly
              value={resentInvitationUrl}
              className="border-border bg-background rounded-md border px-3 py-2"
            />
          </label>
        </div>
      ) : null}

      {editing ? (
        <RoleDialog
          member={editing}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSubmit={(nextRole, confirmed) => {
            const previous = members;
            const formData = new FormData();
            formData.set("membershipId", editing.membershipId);
            formData.set("role", nextRole);
            if (confirmed) formData.set("confirmed", "yes");
            mutate(
              changeMemberRoleAction,
              formData,
              () =>
                setMembers((current) =>
                  current.map((member) =>
                    member.membershipId === editing.membershipId
                      ? { ...member, role: nextRole }
                      : member,
                  ),
                ),
              () => setMembers(previous),
            );
          }}
        />
      ) : null}
      {assigning ? (
        <ProjectDialog
          member={assigning}
          projects={props.projects}
          pending={pending}
          onCancel={() => setAssigning(null)}
          onSubmit={(projectIds) => {
            const formData = new FormData();
            formData.set("membershipId", assigning.membershipId);
            for (const projectId of projectIds)
              formData.append("projectId", projectId);
            startTransition(async () => {
              const result = await assignMemberProjectsAction({}, formData);
              setMessage(result.message ?? "");
              if (result.ok)
                setMembers((current) =>
                  current.map((member) =>
                    member.membershipId === assigning.membershipId
                      ? {
                          ...member,
                          assignedProjects: props.projects.filter((project) =>
                            projectIds.includes(project.id),
                          ),
                        }
                      : member,
                  ),
                );
              setAssigning(null);
            });
          }}
        />
      ) : null}
    </div>
  );
}

function ProjectDialog({
  member,
  projects,
  pending,
  onCancel,
  onSubmit,
}: {
  member: OrganizationMemberProfile;
  projects: readonly Readonly<{ id: string; name: string }>[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (projectIds: readonly string[]) => void;
}) {
  const [selected, setSelected] = useState(
    member.assignedProjects.map((project) => project.id),
  );
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <Card className="max-h-[85vh] w-full max-w-lg overflow-y-auto">
        <h2 id="project-dialog-title" className="text-xl font-semibold">
          Assign projects
        </h2>
        <p className="text-muted mt-2 text-sm">
          Choose the projects {member.fullName} can access.
        </p>
        <div className="mt-5 grid gap-2">
          {projects.length ? (
            projects.map((project) => (
              <label
                key={project.id}
                className="border-border flex items-center gap-3 rounded-md border p-3 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(project.id)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, project.id]
                        : current.filter((id) => id !== project.id),
                    )
                  }
                />
                {project.name}
              </label>
            ))
          ) : (
            <p className="text-muted text-sm">No projects are available.</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button intent="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(selected)} disabled={pending}>
            {pending ? "Saving…" : "Save assignments"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function RoleDialog({
  member,
  pending,
  onCancel,
  onSubmit,
}: {
  member: OrganizationMemberProfile;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (role: OrganizationRole, confirmed: boolean) => void;
}) {
  const [role, setRole] = useState<OrganizationRole>(member.role);
  const sensitive =
    role === "owner" ||
    (member.role === "administrator" && role !== "administrator");
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-dialog-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <Card className="w-full max-w-lg">
        <h2 id="role-dialog-title" className="text-xl font-semibold">
          Assign a role
        </h2>
        <p className="text-muted mt-2 text-sm">
          Change {member.fullName}’s organization access.
        </p>
        <label className="mt-5 grid gap-2 text-sm font-medium">
          Role
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as OrganizationRole)
            }
            className="border-border bg-background h-11 rounded-md border px-3"
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {sensitive ? (
          <p className="bg-soft-amber text-warning mt-4 rounded-md p-3 text-sm">
            {role === "owner"
              ? "Confirming transfers ownership and changes your role to Administrator."
              : "This removes administrator-level organization access."}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button intent="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(role, sensitive)}
            disabled={pending || role === member.role}
          >
            {pending ? "Saving…" : sensitive ? "Confirm change" : "Save role"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatLastActive(value: string | null): string {
  return value ? formatDate(value) : "Not recorded";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function invitationStatus(invitation: Invitation): string {
  if (invitation.revokedAt) return "Revoked";
  if (Date.parse(invitation.expiresAt) <= Date.now()) return "Expired";
  return "Pending";
}
