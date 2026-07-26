import "server-only";

export type AdminListItem = Readonly<{
  id: string;
  title: string;
  subtitle: string;
  status?: "healthy" | "warning" | "critical" | "info";
}>;

export type PlatformMetric = Readonly<{
  label: string;
  value: string;
  detail: string;
  status: "healthy" | "warning" | "critical" | "info";
}>;

export interface OrganizationService {
  recent(): Promise<readonly AdminListItem[]>;
  search(query: string): Promise<readonly AdminListItem[]>;
}

export interface UserService {
  search(query: string): Promise<readonly AdminListItem[]>;
}

export interface AuditService {
  recent(): Promise<readonly AdminListItem[]>;
}

export interface JobService {
  summary(): Promise<readonly PlatformMetric[]>;
}

export interface AIUsageService {
  summary(): Promise<readonly PlatformMetric[]>;
}

export interface HealthService {
  status(): Promise<readonly PlatformMetric[]>;
}

export interface SupportService {
  recent(): Promise<readonly AdminListItem[]>;
}

const organizations: readonly AdminListItem[] = [
  {
    id: "organization-1",
    title: "BuildCo Construction",
    subtitle: "24 projects · Active design partner",
    status: "healthy",
  },
  {
    id: "organization-2",
    title: "Northstar Builders",
    subtitle: "Invited today · Onboarding",
    status: "info",
  },
  {
    id: "organization-3",
    title: "Atlas Commercial",
    subtitle: "Export job needs review",
    status: "warning",
  },
];

const users: readonly AdminListItem[] = [
  {
    id: "user-1",
    title: "Matt Anderson",
    subtitle: "matt@example.test · BuildCo Construction",
    status: "healthy",
  },
  {
    id: "user-2",
    title: "Alex Rivera",
    subtitle: "alex@example.test · BuildCo Construction",
    status: "healthy",
  },
];

function matches(item: AdminListItem, query: string) {
  const normalized = query.trim().toLowerCase();
  return (
    normalized.length > 0 &&
    `${item.title} ${item.subtitle}`.toLowerCase().includes(normalized)
  );
}

export class MockOrganizationService implements OrganizationService {
  async recent() {
    return organizations;
  }

  async search(query: string) {
    return organizations.filter((item) => matches(item, query));
  }
}

export class MockUserService implements UserService {
  async search(query: string) {
    return users.filter((item) => matches(item, query));
  }
}

export class MockAuditService implements AuditService {
  async recent() {
    return [
      {
        id: "activity-1",
        title: "Portfolio refresh completed",
        subtitle: "BuildCo Construction · 8 minutes ago",
        status: "healthy" as const,
      },
      {
        id: "activity-2",
        title: "Operator viewed an organization",
        subtitle: "Morgan · 21 minutes ago",
        status: "info" as const,
      },
      {
        id: "activity-3",
        title: "Daily Brief delivery retried",
        subtitle: "Atlas Commercial · 37 minutes ago",
        status: "warning" as const,
      },
    ];
  }
}

export class MockJobService implements JobService {
  async summary() {
    return [
      metric(
        "Jobs succeeded",
        "98.7%",
        "Placeholder · last 24 hours",
        "healthy",
      ),
      metric("Retries pending", "3", "Placeholder operational data", "warning"),
    ];
  }
}

export class MockAIUsageService implements AIUsageService {
  async summary() {
    return [
      metric("AI requests", "1,284", "Placeholder · last 24 hours", "info"),
      metric("Tokens", "4.8M", "Placeholder · estimated usage", "info"),
    ];
  }
}

export class MockHealthService implements HealthService {
  async status() {
    return [
      metric("Application", "Operational", "Placeholder status", "healthy"),
      metric("Database", "Operational", "Placeholder status", "healthy"),
      metric("Email delivery", "Degraded", "Placeholder status", "warning"),
    ];
  }
}

export class MockSupportService implements SupportService {
  async recent() {
    return [
      {
        id: "error-1",
        title: "Brief delivery timeout",
        subtitle: "Atlas Commercial · 37 minutes ago",
        status: "warning" as const,
      },
      {
        id: "error-2",
        title: "Document preview failed",
        subtitle: "BuildCo Construction · 2 hours ago",
        status: "critical" as const,
      },
    ];
  }
}

function metric(
  label: string,
  value: string,
  detail: string,
  status: PlatformMetric["status"],
): PlatformMetric {
  return { label, value, detail, status };
}

export const platformServices = {
  organizations: new MockOrganizationService(),
  users: new MockUserService(),
  audit: new MockAuditService(),
  jobs: new MockJobService(),
  aiUsage: new MockAIUsageService(),
  health: new MockHealthService(),
  support: new MockSupportService(),
};
