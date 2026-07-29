import { Card } from "@/components/ui/card";
import {
  terminateOtherSessionsAction,
  updatePasswordAction,
} from "@/app/settings/admin-actions";
import { Field, SettingsForm } from "@/features/settings/settings-forms";
import {
  getCurrentSession,
  requireAuthenticatedUser,
} from "@/lib/auth/session";

export default async function SecuritySettingsPage() {
  const [principal, session] = await Promise.all([
    requireAuthenticatedUser(),
    getCurrentSession(),
  ]);
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-xl font-semibold">Active sessions</h2>
        <p className="text-muted mt-2 text-sm">
          Sightline validates this session with Supabase on every protected
          request.
        </p>
        <div className="border-border mt-5 rounded-md border p-4">
          <p className="font-semibold">Current browser</p>
          <p className="text-muted mt-1 text-sm">
            {principal.email} · Active{" "}
            {session?.expires_at
              ? `until ${new Date(session.expires_at * 1000).toLocaleString()}`
              : "now"}
          </p>
        </div>
        <form action={terminateOtherSessionsAction} className="mt-4">
          <button className="border-border rounded-md border px-4 py-2 text-sm font-semibold">
            Terminate other sessions
          </button>
        </form>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Update password</h2>
        <p className="text-muted mt-2 mb-6 text-sm">
          Use at least eight characters. Other active sessions can be terminated
          above.
        </p>
        <SettingsForm
          action={updatePasswordAction}
          submitLabel="Update password"
        >
          <Field
            label="New password"
            name="password"
            type="password"
            required
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            required
          />
        </SettingsForm>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Placeholder
          title="Multi-factor authentication"
          copy="MFA enrollment and recovery codes will be introduced in a dedicated security release."
        />
        <Placeholder
          title="API keys"
          copy="Personal and service API keys are not available. Integrations currently use server-managed credentials."
        />
      </div>
    </div>
  );
}
function Placeholder({ title, copy }: { title: string; copy: string }) {
  return (
    <Card>
      <p className="text-muted text-xs font-semibold uppercase">Coming later</p>
      <h2 className="mt-2 font-semibold">{title}</h2>
      <p className="text-muted mt-2 text-sm">{copy}</p>
    </Card>
  );
}
