import { cn } from "@/lib/utils";

type SightlineMarkProps = Readonly<{
  className?: string;
}>;

export function SightlineMark({ className }: SightlineMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-deep-green relative block size-9 overflow-hidden rounded-md",
        className,
      )}
    >
      <span className="bg-accent absolute top-2 left-2 h-1.5 w-5 rounded-full" />
      <span className="absolute top-4 left-2 h-1.5 w-3.5 rounded-full bg-white" />
      <span className="bg-accent absolute top-6 left-2 h-1.5 w-2 rounded-full" />
    </span>
  );
}
