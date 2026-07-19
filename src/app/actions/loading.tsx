import { LoadingState } from "@/components/loading-state";
export default function Loading() {
  return (
    <main className="p-8">
      <LoadingState label="Loading actions…" />
    </main>
  );
}
