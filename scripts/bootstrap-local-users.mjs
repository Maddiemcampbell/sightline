import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey)
  throw new Error("Local Supabase environment variables are not configured.");
const host = new URL(url).hostname;
if (!["127.0.0.1", "localhost"].includes(host))
  throw new Error("Refusing to bootstrap users outside local Supabase.");

class UnusedWebSocketTransport {
  constructor() {
    throw new Error("Realtime is not used while bootstrapping local users.");
  }
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: UnusedWebSocketTransport },
});
const organizationId = "10000000-0000-4000-8000-000000000001";
const password = "Sightline-E2E-2026!";
const users = [
  {
    preferredAuthId: "12000000-0000-4000-8000-000000000001",
    applicationUserId: "11000000-0000-4000-8000-000000000001",
    email: "e2e-owner@sightline.local",
    role: "owner",
  },
  {
    preferredAuthId: "12000000-0000-4000-8000-000000000002",
    applicationUserId: "11000000-0000-4000-8000-000000000002",
    email: "alex-rivera@sightline.local",
    role: "contributor",
  },
];

for (const user of users) {
  const authUserId = await ensureAuthUser(user);
  const { error: userError } = await admin
    .from("users")
    .update({ auth_user_id: authUserId, email: user.email })
    .eq("organization_id", organizationId)
    .eq("id", user.applicationUserId);
  if (userError) throw new Error(userError.message);
  const { data: membership, error: membershipError } = await admin
    .from("organization_memberships")
    .upsert(
      {
        organization_id: organizationId,
        auth_user_id: authUserId,
        application_user_id: user.applicationUserId,
        role: user.role,
      },
      { onConflict: "organization_id,application_user_id" },
    )
    .select("id")
    .single();
  if (membershipError) throw new Error(membershipError.message);
  if (user.role === "contributor") {
    const { data: projects, error: projectsError } = await admin
      .from("projects")
      .select("id")
      .eq("organization_id", organizationId);
    if (projectsError) throw new Error(projectsError.message);
    const { error: accessError } = await admin
      .from("project_memberships")
      .upsert(
        (projects ?? []).map((project) => ({
          organization_id: organizationId,
          project_id: project.id,
          organization_membership_id: membership.id,
          role: "contributor",
        })),
        { onConflict: "project_id,organization_membership_id" },
      );
    if (accessError) throw new Error(accessError.message);
  }
}

console.log("Local Sightline users are ready:");
for (const user of users) console.log(`- ${user.email}`);
console.log(`Password: ${password}`);

async function ensureAuthUser(user) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1_000,
  });
  if (listError) throw new Error(listError.message);
  const existing = listed.users.find(
    (candidate) => candidate.email?.toLowerCase() === user.email,
  );
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      email: user.email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    id: user.preferredAuthId,
    email: user.email,
    password,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(error?.message ?? "User not created.");
  return data.user.id;
}
