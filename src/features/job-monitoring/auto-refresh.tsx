"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function JobDashboardAutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [router]);
  return (
    <span className="text-xs text-slate-500">Refreshes every 30 seconds</span>
  );
}
