import { cn } from "@/lib/utils";

type LoadingStateProps = Readonly<{
  label?: string;
  rows?: number;
  className?: string;
}>;

export function LoadingState({
  label = "Loading content",
  rows = 3,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "border-border bg-surface shadow-surface rounded-lg border p-5 sm:p-6",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{label}</span>
      <div className="bg-border h-4 w-32 rounded-full motion-safe:animate-pulse" />
      <div className="mt-6 space-y-3" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className={cn(
              "bg-border h-3 rounded-full motion-safe:animate-pulse",
              index === rows - 1 ? "w-3/5" : "w-full",
            )}
          />
        ))}
      </div>
    </div>
  );
}
