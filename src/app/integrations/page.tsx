import { Blocks, CheckCircle2, Clock3, PlugZap } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireActorContext } from "@/lib/auth/request-context";
import { canManageIntegrations } from "@/lib/auth/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProcoreConnectionForm } from "./procore-connection-form";
import { disconnectProcoreAction, syncProcoreAction } from "./actions";

const catalog = [
  {
    name: "QuickBooks",
    providers: [] as string[],
    description: "Financial and accounting data.",
  },
  {
    name: "Microsoft 365",
    providers: ["email"],
    description: "Email and Microsoft workspace signals.",
  },
  {
    name: "SharePoint",
    providers: ["sharepoint"],
    description: "Authorized project document sources.",
  },
  {
    name: "Procore",
    providers: ["procore"],
    description: "Project records, RFIs, and supporting documents.",
  },
  {
    name: "Sage",
    providers: [] as string[],
    description: "Construction accounting data.",
  },
  {
    name: "Email providers",
    providers: ["email"],
    description: "Evidence from authorized project correspondence.",
  },
] as const;

export default async function IntegrationsPage() {
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const result = await client
    .from("integration_connections")
    .select("*")
    .eq("organization_id", context.organizationId)
    .eq("provider", "procore")
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  const mappings = result.data
    ? await client
        .from("integration_project_mappings")
        .select("id,mapping_status")
        .eq("organization_id", context.organizationId)
        .eq("connection_id", result.data.id)
    : { data: [] };
  const canManage = canManageIntegrations(context);

  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          Connected workspace
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Integrations
        </h1>
        <p className="text-muted mt-2 max-w-2xl leading-6">
          Review current sources and the planned integration catalog. External
          authorization and OAuth setup are intentionally not included yet.
        </p>
      </header>
      <section
        aria-label="Integration catalog"
        className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        {catalog.map((integration) => {
          const connected =
            integration.name === "Procore" && result.data ? [result.data] : [];
          const isConnected = connected.some(
            (source) => source.status === "active",
          );
          return (
            <Card key={integration.name} className="flex min-h-56 flex-col">
              <div className="flex items-start justify-between gap-3">
                <span className="bg-soft-green text-deep-green grid size-10 place-items-center rounded-md">
                  <Blocks className="size-5" aria-hidden="true" />
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    isConnected
                      ? "bg-soft-green text-deep-green"
                      : "bg-background text-muted"
                  }`}
                >
                  {isConnected ? (
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Clock3 className="size-3.5" aria-hidden="true" />
                  )}
                  {isConnected ? "Connected" : "Not connected"}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-semibold">{integration.name}</h2>
              <p className="text-muted mt-2 flex-1 text-sm leading-6">
                {integration.description}
              </p>
              {connected[0]?.last_successful_sync_at && (
                <p className="text-muted mt-3 text-xs">
                  Last synchronized{" "}
                  {new Date(
                    connected[0].last_successful_sync_at,
                  ).toLocaleString()}
                </p>
              )}
              {integration.name === "Procore" && canManage ? (
                result.data ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
                      <p className="font-semibold">
                        {result.data.company_name}
                      </p>
                      <p className="mt-1 capitalize">
                        {result.data.environment} ·{" "}
                        {result.data.status.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1">
                        {mappings.data?.filter((mapping) =>
                          ["mapped", "created"].includes(
                            mapping.mapping_status,
                          ),
                        ).length ?? 0}{" "}
                        mapped projects
                      </p>
                      {result.data.current_error ? (
                        <p className="mt-2 text-red-700">
                          {result.data.current_error}
                        </p>
                      ) : null}
                    </div>
                    <form action={disconnectProcoreAction}>
                      <button
                        type="submit"
                        className="border-border inline-flex min-h-10 items-center justify-center gap-2 rounded-md border px-4 text-xs font-semibold"
                      >
                        <PlugZap className="size-4" aria-hidden="true" />{" "}
                        Disconnect
                      </button>
                    </form>
                    <form action={syncProcoreAction}>
                      <button
                        type="submit"
                        className="bg-deep-green inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-xs font-semibold text-white"
                      >
                        Sync now
                      </button>
                    </form>
                    <Link
                      href="/integrations/procore/projects"
                      className="inline-flex min-h-10 items-center rounded-md border px-4 text-xs font-semibold"
                    >
                      Manage projects
                    </Link>
                  </div>
                ) : (
                  <ProcoreConnectionForm />
                )
              ) : (
                <p className="text-muted mt-4 text-xs">
                  {canManage
                    ? "Setup available soon"
                    : "Manager access required"}
                </p>
              )}
            </Card>
          );
        })}
      </section>
    </div>
  );
}
