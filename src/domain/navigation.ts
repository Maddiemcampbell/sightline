import {
  BriefcaseBusiness,
  FileText,
  Gauge,
  Settings,
  ShieldAlert,
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
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];
