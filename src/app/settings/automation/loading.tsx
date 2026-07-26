import { Card } from "@/components/ui/card";

export default function AutomationSettingsLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading automation">
      <Card className="h-80 animate-pulse" />
      <Card className="h-40 animate-pulse" />
      <Card className="h-72 animate-pulse" />
    </div>
  );
}
