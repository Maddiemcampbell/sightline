import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey)
  throw new Error("Local Supabase environment variables are not configured.");
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Refusing to bootstrap an operator outside local Supabase.");

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used while bootstrapping.");
  }
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: UnusedWebSocketTransport },
});
const email = "platform-operator@sightline.local";
const password = "Sightline-Admin-2026!";
const permissions = [
  "platform.dashboard.read",
  "platform.organizations.read",
  "platform.users.read",
  "platform.audit.read",
  "platform.jobs.read",
  "platform.jobs.retry",
  "platform.ai.read",
  "platform.health.read",
  "platform.support.read",
  "platform.support.write",
  "platform.flags.manage",
  "platform.releases.read",
  "platform.admin.manage",
  "platform.provisioning.manage",
];

const authUserId = await ensureAuthUser();
const { data: operator, error: operatorError } = await admin
  .from("platform_operators")
  .upsert(
    {
      auth_user_id: authUserId,
      email,
      display_name: "Local Platform Operator",
      status: "active",
    },
    { onConflict: "auth_user_id" },
  )
  .select("id")
  .single();
if (operatorError) throw new Error(operatorError.message);
const { error: grantsError } = await admin
  .from("platform_operator_permissions")
  .upsert(
    permissions.map((permission) => ({
      operator_id: operator.id,
      permission,
    })),
    { onConflict: "operator_id,permission" },
  );
if (grantsError) throw new Error(grantsError.message);

console.log("Local platform operator is ready:");
console.log(`- ${email}`);
console.log(`Password: ${password}`);
console.log("Open: http://localhost:3000/internal/admin");

async function ensureAuthUser() {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  if (listError) throw new Error(listError.message);
  const existing = listed.users.find(
    (candidate) => candidate.email?.toLowerCase() === email,
  );
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(error?.message ?? "Operator Auth user was not created.");
  return data.user.id;
}
