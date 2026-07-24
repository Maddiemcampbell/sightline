"use client";

import { useActionState, useState } from "react";

import {
  assignProjectMembersAction,
  inviteProjectMemberAction,
  removeProjectMembersAction,
  type ProjectPermissionState,
} from "@/app/projects/[projectId]/permissions/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ProjectInvitationView,
  ProjectMemberView,
} from "@/features/project-access/repository";
import type { ProjectRole } from "@/lib/auth/authorization";

const roles: readonly ProjectRole[] = [
  "owner",
  "manager",
  "contributor",
  "viewer",
];

export function ProjectPermissions({
  projectId,
  canAssign,
  members,
  eligibleMembers,
  invitations,
}: {
  projectId: string;
  canAssign: boolean;
  members: readonly ProjectMemberView[];
  eligibleMembers: readonly Readonly<{
    membershipId: string;
    fullName: string;
    email: string;
    organizationRole: string;
  }>[];
  invitations: readonly ProjectInvitationView[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-muted mt-1 text-sm">
            Project roles control access within this project.
          </p>
        </div>
        {canAssign ? <Button onClick={() => setOpen(true)}>Manage access</Button> : null}
      </div>
      {members.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-muted border-b text-xs uppercase">
              <tr>
                <th className="py-3">Member</th>
                <th>Role</th>
                <th>Access level</th>
                <th>Recently active</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => (
                <tr key={member.assignmentId}>
                  <td className="py-4">
                    <p className="font-semibold">{member.fullName}</p>
                    <p className="text-muted text-xs">{member.email}</p>
                  </td>
                  <td className="capitalize">{member.projectRole}</td>
                  <td>{accessLabel(member.projectRole)}</td>
                  <td>{formatActivity(member.lastActiveAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted mt-5 text-sm">
          No explicit project members. Organization Owners and Administrators
          retain automatic access.
        </p>
      )}
      {invitations.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Pending invitations</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex justify-between gap-4">
                <span>{invitation.email}</span>
                <span className="text-muted capitalize">{invitation.role}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {open ? (
        <ProjectAccessDialog
          projectId={projectId}
          members={members}
          eligibleMembers={eligibleMembers}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </Card>
  );
}

function ProjectAccessDialog({
  projectId,
  members,
  eligibleMembers,
  onClose,
}: {
  projectId: string;
  members: readonly ProjectMemberView[];
  eligibleMembers: readonly Readonly<{
    membershipId: string;
    fullName: string;
    email: string;
  }>[];
  onClose: () => void;
}) {
  const [assignState, assignAction, assigning] = useActionState<
    ProjectPermissionState,
    FormData
  >(assignProjectMembersAction, {});
  const [removeState, removeAction, removing] = useActionState<
    ProjectPermissionState,
    FormData
  >(removeProjectMembersAction, {});
  const [inviteState, inviteAction, inviting] = useActionState<
    ProjectPermissionState,
    FormData
  >(inviteProjectMemberAction, {});
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-access-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex justify-between gap-4">
          <div>
            <h2 id="project-access-title" className="text-xl font-semibold">
              Project access
            </h2>
            <p className="text-muted mt-1 text-sm">
              Assign or remove multiple members at once.
            </p>
          </div>
          <Button intent="secondary" onClick={onClose}>Close</Button>
        </div>

        <form action={assignAction} className="mt-6">
          <input type="hidden" name="projectId" value={projectId} />
          <fieldset>
            <legend className="font-semibold">Organization members</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {eligibleMembers.map((member) => (
                <label key={member.membershipId} className="border-border flex gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" name="membershipId" value={member.membershipId} />
                  <span>
                    <strong className="block">{member.fullName}</strong>
                    <span className="text-muted">{member.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Project role
              <select name="role" defaultValue="contributor" className="border-border bg-background h-10 rounded-md border px-3">
                {roles.map((role) => <option key={role} value={role} className="capitalize">{role}</option>)}
              </select>
            </label>
            <Button type="submit" disabled={assigning}>
              {assigning ? "Assigning…" : "Assign selected"}
            </Button>
          </div>
          {assignState.message ? <p role="status" className="text-muted mt-2 text-sm">{assignState.message}</p> : null}
        </form>

        <form action={removeAction} className="border-border mt-7 border-t pt-6">
          <input type="hidden" name="projectId" value={projectId} />
          <fieldset>
            <legend className="font-semibold">Remove existing access</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {members.map((member) => (
                <label key={member.membershipId} className="border-border flex gap-2 rounded-md border p-3 text-sm">
                  <input type="checkbox" name="membershipId" value={member.membershipId} />
                  {member.fullName} · {member.projectRole}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" intent="secondary" className="mt-4" disabled={removing}>
            {removing ? "Removing…" : "Remove selected"}
          </Button>
          {removeState.message ? <p role="status" className="text-muted mt-2 text-sm">{removeState.message}</p> : null}
        </form>

        <form action={inviteAction} className="border-border mt-7 border-t pt-6">
          <input type="hidden" name="projectId" value={projectId} />
          <h3 className="font-semibold">Invite by email</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
            <input aria-label="Project invite email" name="email" type="email" required className="border-border bg-background h-10 rounded-md border px-3" />
            <select aria-label="Project invite role" name="role" defaultValue="viewer" className="border-border bg-background h-10 rounded-md border px-3">
              {roles.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
            <Button type="submit" disabled={inviting}>{inviting ? "Inviting…" : "Invite"}</Button>
          </div>
          {inviteState.message ? <p role="status" className="text-muted mt-2 text-sm">{inviteState.message}</p> : null}
          {inviteState.invitationUrl ? (
            <input aria-label="Project invitation link" readOnly value={inviteState.invitationUrl} className="border-border bg-background mt-2 w-full rounded-md border px-3 py-2 text-sm" />
          ) : null}
        </form>
      </Card>
    </div>
  );
}

function accessLabel(role: ProjectRole): string {
  return {
    owner: "Full project control",
    manager: "Manage project work",
    contributor: "Contribute to assigned work",
    viewer: "Read only",
  }[role];
}

function formatActivity(value: string | null): string {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
