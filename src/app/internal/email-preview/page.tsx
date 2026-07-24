import { notFound } from "next/navigation";

import { getDailyBriefView } from "@/features/daily-brief/data";
import { renderMorningBriefEmail } from "@/features/email/render-morning-brief";
import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertInternalAdmin } from "@/lib/auth/internal-admin";

export const dynamic = "force-dynamic";

export default async function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const context = await requireActorContext();
  assertInternalAdmin(context);
  const client = await createServerSupabaseClient();
  const [brief, organizationResult, userResult] = await Promise.all([
    getDailyBriefView(),
    client
      .from("organizations")
      .select("name")
      .eq("id", context.organizationId)
      .single(),
    client
      .from("users")
      .select("full_name")
      .eq("organization_id", context.organizationId)
      .eq("id", context.userId)
      .single(),
  ]);
  if (!brief)
    return <p className="p-8">No published Daily Brief is available.</p>;
  if (organizationResult.error)
    throw new Error(organizationResult.error.message);
  if (userResult.error) throw new Error(userResult.error.message);
  const email = renderMorningBriefEmail({
    organizationName: organizationResult.data.name,
    recipientName: userResult.data.full_name,
    brief,
    appUrl: "http://localhost:3000",
  });
  return (
    <div className="mx-auto max-w-5xl px-[var(--page-gutter)] py-8">
      <span className="bg-soft-amber text-warning rounded-full px-3 py-1 text-xs font-semibold">
        Internal email preview
      </span>
      <h1 className="mt-5 text-2xl font-semibold">{email.subject}</h1>
      <p className="text-muted mt-2 mb-5 text-sm">
        Responsive HTML preview. The plain-text fallback is shown below.
      </p>
      <iframe
        title="Morning email HTML preview"
        srcDoc={email.html}
        className="border-border h-[900px] w-full rounded-xl border bg-white"
      />
      <details className="border-border bg-surface mt-6 rounded-xl border p-5">
        <summary className="cursor-pointer font-semibold">
          Plain-text fallback
        </summary>
        <pre className="mt-4 overflow-x-auto text-sm leading-6 whitespace-pre-wrap">
          {email.text}
        </pre>
      </details>
    </div>
  );
}
