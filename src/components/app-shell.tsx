import type { ReactNode } from "react";
import { createHash } from "node:crypto";

import { AppSidebar } from "@/components/app-sidebar";
import { TopNavigation } from "@/components/top-navigation";
import { QuickAskComposer } from "@/features/workspace/quick-ask-composer";
import { getWorkspaceShellData } from "@/features/workspace/data";
import { WorkspaceProvider } from "@/features/workspace/workspace-provider";
import { getCurrentMembership } from "@/lib/auth/session";
import { SharedAskProvider } from "@/features/ask-sightline/shared-ask-provider";
import { SharedAskDrawer } from "@/features/ask-sightline/shared-ask-drawer";

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export async function AppShell({ children }: AppShellProps) {
  const membership = await getCurrentMembership();
  const workspace = membership
    ? await getWorkspaceShellData()
    : {
        organizationId: "membership-onboarding",
        userId: "membership-onboarding",
        canUseAi: false,
        projects: [],
        searchResources: [],
      };
  const accessFingerprint = createHash("sha256")
    .update(
      workspace.projects
        .map((project) => project.id)
        .toSorted()
        .join(","),
    )
    .digest("hex")
    .slice(0, 16);
  return (
    <WorkspaceProvider {...workspace}>
      <SharedAskProvider
        storageIdentity={`${workspace.userId}:${workspace.organizationId}:${accessFingerprint}`}
      >
        <div className="bg-background text-ink min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
          <AppSidebar />
          <div className="min-w-0">
            <TopNavigation />
            <main id="main-content" className="min-w-0">
              {children}
            </main>
            {membership ? <QuickAskComposer /> : null}
          </div>
        </div>
        <SharedAskDrawer />
      </SharedAskProvider>
    </WorkspaceProvider>
  );
}
