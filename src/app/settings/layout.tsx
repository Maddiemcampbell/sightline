import Link from "next/link";

const items = [
  ["/settings", "Overview"],
  ["/settings/profile", "Profile"],
  ["/settings/team", "Team"],
  ["/settings/organization", "Organization"],
  ["/settings/security", "Security"],
  ["/settings/notifications", "Notifications"],
  ["/settings/audit-log", "Audit log"],
  ["/settings/projects", "Projects"],
  ["/settings/privacy", "Privacy & retention"],
] as const;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[90rem] px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-muted text-sm font-semibold">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          Settings
        </h1>
        <p className="text-muted mt-2 max-w-2xl">
          Manage your profile, organization, security, and collaboration defaults.
        </p>
      </header>
      <div className="mt-7 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Settings navigation">
          <ul className="flex gap-1 overflow-x-auto pb-2 lg:block lg:space-y-1">
            {items.map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="hover:bg-background hover:text-deep-green block whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
