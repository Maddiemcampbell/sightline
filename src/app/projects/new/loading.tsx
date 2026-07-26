import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-[var(--page-gutter)] py-12">
      <div className="bg-border h-11 w-11 rounded-full" />
      <div className="bg-border mt-5 h-4 w-32 rounded" />
      <div className="bg-border mt-3 h-10 w-72 max-w-full rounded" />
      <div className="bg-border mt-3 h-5 w-full max-w-xl rounded" />
      <Card className="mt-8 h-[34rem]" />
    </div>
  );
}
