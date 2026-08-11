import "server-only";

import {
  customerDataExportsHandler,
  dailyBriefHandler,
  portfolioRefreshHandler,
  procoreSyncHandler,
  microsoft365SyncHandler,
  privacyCleanupHandler,
  riskDetectionHandler,
  exceptionAlertsHandler,
} from "./handlers";
import { SchedulerRegistry } from "./registry";

export const schedulerRegistry = new SchedulerRegistry([
  {
    key: "exception-alerts",
    name: "Business exception evaluation",
    description:
      "Evaluate configurable business thresholds and resolve recovered exceptions.",
    cron: "*/15 * * * *",
    enabled: true,
    timeoutMs: 15 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 60_000,
      maximumBackoffMs: 10 * 60_000,
    },
    concurrency: "forbid",
    handler: exceptionAlertsHandler,
  },
  {
    key: "microsoft365-sync",
    name: "Microsoft 365 synchronization",
    description:
      "Process queued SharePoint document library delta synchronization work.",
    cron: "*/5 * * * *",
    enabled: true,
    timeoutMs: 20 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 5 * 60_000,
      maximumBackoffMs: 30 * 60_000,
    },
    concurrency: "forbid",
    handler: microsoft365SyncHandler,
  },
  {
    key: "procore-sync",
    name: "Procore synchronization",
    description:
      "Process queued Procore project and financial synchronization work.",
    cron: "*/5 * * * *",
    enabled: true,
    timeoutMs: 20 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 5 * 60_000,
      maximumBackoffMs: 30 * 60_000,
    },
    concurrency: "forbid",
    handler: procoreSyncHandler,
  },
  {
    key: "risk-detection",
    name: "Risk detection",
    description: "Run deterministic risk detection for active organizations.",
    cron: "0 3 * * *",
    enabled: true,
    timeoutMs: 15 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 5 * 60_000,
      maximumBackoffMs: 30 * 60_000,
    },
    concurrency: "forbid",
    handler: riskDetectionHandler,
  },
  {
    key: "portfolio-refresh",
    name: "Portfolio refresh",
    description: "Refresh portfolio intelligence and analytics snapshots.",
    cron: "*/5 * * * *",
    enabled: true,
    timeoutMs: 20 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 5 * 60_000,
      maximumBackoffMs: 30 * 60_000,
    },
    concurrency: "forbid",
    handler: portfolioRefreshHandler,
  },
  {
    key: "daily-brief",
    name: "Daily Brief generation",
    description: "Generate and deliver organization Daily Briefs.",
    cron: "*/5 * * * *",
    enabled: true,
    timeoutMs: 15 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 5 * 60_000,
      maximumBackoffMs: 30 * 60_000,
    },
    concurrency: "forbid",
    handler: dailyBriefHandler,
  },
  {
    key: "privacy-cleanup",
    name: "Privacy cleanup",
    description: "Apply privacy retention and deletion policies.",
    cron: "30 2 * * *",
    enabled: true,
    timeoutMs: 15 * 60_000,
    retry: {
      maximumRetries: 1,
      backoffMs: 10 * 60_000,
      maximumBackoffMs: 30 * 60_000,
    },
    concurrency: "forbid",
    handler: privacyCleanupHandler,
  },
  {
    key: "customer-data-exports",
    name: "Customer data exports",
    description: "Process pending customer export requests.",
    cron: "*/5 * * * *",
    enabled: true,
    timeoutMs: 15 * 60_000,
    retry: {
      maximumRetries: 2,
      backoffMs: 2 * 60_000,
      maximumBackoffMs: 15 * 60_000,
    },
    concurrency: "forbid",
    handler: customerDataExportsHandler,
  },
]);
