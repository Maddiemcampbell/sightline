import type { Metadata } from "next";

import { AdminShell } from "@/features/platform-admin/admin-shell";
import { requirePlatformOperator } from "@/features/platform-admin/authorization";

export const metadata: Metadata = {
  title: {
    default: "Platform Administration",
    template: "%s | Sightline Platform Administration",
  },
  robots: { index: false, follow: false },
};

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const operator = await requirePlatformOperator();
  return <AdminShell operator={operator}>{children}</AdminShell>;
}
