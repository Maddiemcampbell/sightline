import Link from "next/link";

import { CustomerProvisioningRepository } from "@/features/customer-provisioning/repository";
import { CustomerProvisioningService } from "@/features/customer-provisioning/service";
import type { AccessRequestStatus } from "@/features/customer-provisioning/types";
import { recordPlatformAuditEvent } from "@/features/platform-admin/audit";
import { requirePlatformPermission } from "@/features/platform-admin/authorization";
import { getServerEnv } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { MockApprovalForm } from "./mock-approval-form";
import { StripeCheckoutForm } from "./stripe-checkout-form";

export const dynamic = "force-dynamic";

const STATUSES = [
  "submitted",
  "payment_pending",
  "ready_for_owner",
  "provisioning",
  "provisioned",
  "failed",
] as const;

export default async function CustomerProvisioningPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const operator = await requirePlatformPermission(
    "platform.provisioning.manage",
    "customer_provisioning_queue",
    "queue",
  );
  const rawStatus = (await searchParams).status;
  const status: AccessRequestStatus | "all" = STATUSES.includes(
    rawStatus as (typeof STATUSES)[number],
  )
    ? (rawStatus as AccessRequestStatus)
    : "all";
  const requests = await new CustomerProvisioningService(
    new CustomerProvisioningRepository(createAdminSupabaseClient()),
  ).list(status);
  const env = getServerEnv();
  const mockWorkflowEnabled =
    (env.BILLING_PROVIDER ?? "mock") === "mock" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.SIGHTLINE_E2E === "true");
  const stripeWorkflowEnabled = env.BILLING_PROVIDER === "stripe";
  await recordPlatformAuditEvent({
    operator,
    action: "platform.customer_provisioning.list_view",
    resourceType: "customer_provisioning_queue",
    metadata: { status, resultCount: requests.length },
  });
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
        Invite-only onboarding
      </p>
      <h1 className="mt-2 text-3xl font-semibold">Customer provisioning</h1>
      <p className="mt-2 text-sm text-slate-600">
        Review access requests and exercise the local/test mock billing
        workflow. No payment is collected.
      </p>
      <nav
        aria-label="Provisioning filters"
        className="mt-5 flex flex-wrap gap-2"
      >
        {["all", ...STATUSES].map((item) => (
          <Link
            key={item}
            href={
              item === "all"
                ? "/internal/admin/provisioning"
                : `/internal/admin/provisioning?status=${item}`
            }
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-slate-200 ${status === item ? "bg-slate-900 text-white" : "bg-white"}`}
          >
            {humanize(item)}
          </Link>
        ))}
      </nav>
      <section className="border-border mt-5 overflow-x-auto rounded-lg border bg-white">
        {requests.length ? (
          <table className="w-full min-w-[70rem] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr>
                {[
                  "Company",
                  "Owner",
                  "Requested",
                  "State",
                  "Billing",
                  "Correlation ID",
                  "Billing workflow",
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.id} className="align-top">
                  <td className="px-4 py-4 font-semibold">
                    {request.companyName}
                    <p className="mt-1 font-mono text-xs font-normal text-slate-500">
                      {request.id}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    {request.ownerName}
                    <p className="mt-1 text-xs text-slate-500">
                      {request.ownerEmail}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {new Date(request.requestedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-4">{humanize(request.status)}</td>
                  <td className="px-4 py-4">
                    {request.billingProvider
                      ? `${request.billingProvider} · ${humanize(request.billingStatus ?? "unknown")}`
                      : "Not established"}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs">
                    {request.correlationId}
                  </td>
                  <td className="px-4 py-4">
                    {request.status === "provisioned" ? (
                      <span className="text-emerald-800">Provisioned</span>
                    ) : mockWorkflowEnabled ? (
                      <MockApprovalForm
                        requestId={request.id}
                        defaultSlug={
                          request.requestedSlug ?? slugify(request.companyName)
                        }
                        rotate={request.status === "ready_for_owner"}
                      />
                    ) : stripeWorkflowEnabled ? (
                      <StripeCheckoutForm
                        requestId={request.id}
                        defaultSlug={
                          request.requestedSlug ?? slugify(request.companyName)
                        }
                        checkoutUrl={request.checkoutUrl}
                      />
                    ) : (
                      <span className="text-xs text-slate-500">
                        Awaiting the configured billing provider
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center">
            <h2 className="font-semibold">No access requests</h2>
            <p className="mt-2 text-sm text-slate-500">
              Requests matching this state will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
