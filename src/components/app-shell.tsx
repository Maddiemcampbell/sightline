import { CircleDollarSign } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { primaryNavigation } from "@/domain/navigation";

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="border-b border-slate-200 bg-slate-950 text-white lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center gap-3 px-5 lg:h-20">
          <span className="grid size-9 place-items-center rounded-lg bg-amber-400 text-slate-950">
            <CircleDollarSign aria-hidden="true" className="size-5" />
          </span>
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Sightline
          </Link>
        </div>
        <nav
          aria-label="Primary navigation"
          className="overflow-x-auto px-3 pb-3 lg:py-4"
        >
          <ul className="flex min-w-max gap-1 lg:min-w-0 lg:flex-col">
            {primaryNavigation.map(({ href, icon: Icon, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
