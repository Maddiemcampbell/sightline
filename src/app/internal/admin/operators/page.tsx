import { createOperatorAction, updateOperatorAction } from "./actions";
import {
  AdminPageHeader,
  formatDateTime,
  StatusPill,
} from "@/features/platform-admin/data-ui";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { PlatformOperatorService } from "@/features/platform-admin/operator-service";
import {
  PLATFORM_PERMISSIONS,
  type PlatformPermission,
} from "@/features/platform-admin/types";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export default async function PlatformOperatorsPage() {
  const actor = await requirePlatformPermission(
    "platform.admin.manage",
    "admin_page",
    "platform_operators",
  );
  const operators = await new PlatformOperatorService(
    createAdminSupabaseClient(),
  ).list();
  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        eyebrow="Access control"
        title="Platform operators"
        description="Provision isolated staff identities and assign explicit platform capabilities. Platform operators cannot also hold customer organization membership."
      />
      <section className="rounded-lg border bg-white p-5">
        <h2 className="font-semibold">Invite an operator</h2>
        <p className="mt-1 text-xs text-slate-500">
          Existing Auth identities are connected by email; otherwise an
          invitation is sent.
        </p>
        <form action={createOperatorAction} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Name
              <input
                required
                name="displayName"
                className="mt-1 min-h-11 w-full rounded-md border px-3 font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Email
              <input
                required
                type="email"
                name="email"
                className="mt-1 min-h-11 w-full rounded-md border px-3 font-normal"
              />
            </label>
          </div>
          <PermissionFields selected={["platform.dashboard.read"]} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="mfaRequired" defaultChecked />
            Require MFA for this operator
          </label>
          <button className="min-h-11 rounded-md bg-slate-900 px-4 font-semibold text-white">
            Send invitation
          </button>
        </form>
      </section>
      <div className="space-y-4">
        {operators.map((operator) => (
          <section key={operator.id} className="rounded-lg border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{operator.displayName}</h2>
                <p className="mt-1 text-sm text-slate-600">{operator.email}</p>
                <p className="mt-1 font-mono text-xs text-slate-400">
                  {operator.id}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {operator.id === actor.id ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
                    Current operator
                  </span>
                ) : null}
                <StatusPill value={operator.status} />
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Last login {formatDateTime(operator.lastLoginAt)} · Added{" "}
              {formatDateTime(operator.createdAt)}
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Manage access
              </summary>
              <form action={updateOperatorAction} className="mt-4 space-y-4">
                <input type="hidden" name="id" value={operator.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Display name
                    <input
                      required
                      name="displayName"
                      defaultValue={operator.displayName}
                      className="mt-1 min-h-11 w-full rounded-md border px-3 font-normal"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Status
                    <select
                      name="status"
                      defaultValue={operator.status}
                      className="mt-1 min-h-11 w-full rounded-md border px-3 font-normal"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </label>
                </div>
                <PermissionFields selected={operator.permissions} />
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    name="mfaRequired"
                    defaultChecked={operator.mfaRequired}
                  />
                  Require MFA for this operator
                </label>
                <button className="min-h-11 rounded-md border border-slate-300 bg-white px-4 font-semibold hover:bg-slate-50">
                  Save operator
                </button>
              </form>
            </details>
          </section>
        ))}
      </div>
    </div>
  );
}

function PermissionFields({
  selected,
}: {
  selected: readonly PlatformPermission[];
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Capabilities</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_PERMISSIONS.map((permission) => (
          <label
            key={permission}
            className="flex items-start gap-2 rounded-md border p-3 text-xs"
          >
            <input
              type="checkbox"
              name="permissions"
              value={permission}
              defaultChecked={selected.includes(permission)}
            />
            <span>{permission}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
