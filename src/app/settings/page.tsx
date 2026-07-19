import { Card } from "@/components/ui/card";
import { EmailPreferencesForm } from "@/features/email/email-preferences-form";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireActorContext();
  const client = createAdminSupabaseClient();
  const [userResult, deliveriesResult] = await Promise.all([
    client
      .from("users")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("id", context.userId)
      .single(),
    client
      .from("daily_brief_deliveries")
      .select("*")
      .eq("organization_id", context.organizationId)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  if (userResult.error) throw new Error(userResult.error.message);
  if (deliveriesResult.error) throw new Error(deliveriesResult.error.message);
  const user = userResult.data;
  return (
    <div className="mx-auto max-w-4xl px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-muted text-sm font-semibold">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Settings
        </h1>
        <p className="text-muted mt-2">
          Control how Sightline delivers your executive Daily Brief.
        </p>
      </header>
      <div className="mt-7 space-y-6">
        <Card>
          <h2 className="text-lg font-semibold">Morning email</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            Delivery is evaluated in your timezone and begins at your preferred
            time.
          </p>
          <EmailPreferencesForm
            enabled={user.email_delivery_enabled}
            preferredTime={user.preferred_delivery_time}
            timezone={user.delivery_timezone}
          />
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Recent delivery log</h2>
          {deliveriesResult.data.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-muted border-b text-xs uppercase">
                  <tr>
                    <th className="py-3">Type</th>
                    <th className="py-3">Recipient</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Attempts</th>
                    <th className="py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {deliveriesResult.data.map((delivery) => (
                    <tr key={delivery.id}>
                      <td className="py-3 capitalize">
                        {delivery.delivery_kind}
                      </td>
                      <td className="py-3">{delivery.recipient_email}</td>
                      <td className="py-3 capitalize">{delivery.status}</td>
                      <td className="py-3">{delivery.attempt_count}</td>
                      <td className="py-3">
                        {new Date(delivery.created_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted mt-4 text-sm">
              No emails have been attempted yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
