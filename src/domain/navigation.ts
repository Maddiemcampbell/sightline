import {
  BriefcaseBusiness,
  FileText,
  Gauge,
  Settings,
  ShieldAlert,
  ListChecks,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = Readonly<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;

export const primaryNavigation: readonly NavigationItem[] = [
  { href: "/brief", label: "Daily Brief", icon: Gauge },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/risks", label: "Risks", icon: ShieldAlert },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
