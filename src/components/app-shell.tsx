import type { ReactNode } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { TopNavigation } from "@/components/top-navigation";

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="bg-background text-ink min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <AppSidebar />
      <div className="min-w-0">
        <TopNavigation />
        <main id="main-content" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
