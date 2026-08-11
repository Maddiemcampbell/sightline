import {
  BriefcaseBusiness,
  FileText,
  Gauge,
  Settings,
  ShieldAlert,
  ListChecks,
  History,
  BarChart3,
  ChartNoAxesCombined,
  Blocks,
  Sparkles,
  House,
  CalendarCheck2,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = Readonly<{
  href: string;
  label: string;
  icon: LucideIcon;
}>;

export const primaryNavigation: readonly NavigationItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/brief", label: "Daily Brief", icon: Gauge },
  { href: "/ask", label: "Ask Sightline", icon: Sparkles },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/risks", label: "Risks", icon: ShieldAlert },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/meetings", label: "Meetings", icon: CalendarCheck2 },
  { href: "/activity", label: "Activity", icon: History },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/forecasts", label: "Forecasting", icon: ChartNoAxesCombined },
  { href: "/integrations", label: "Integrations", icon: Blocks },
  { href: "/settings", label: "Settings", icon: Settings },
];
