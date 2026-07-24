import { LoadingState } from "@/components/loading-state";

export default function AuditViewerLoading() {
  return <LoadingState label="Loading audit records" rows={8} />;
}
