import { FolderOpen } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type EmptyStateProps = Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>;

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card className="flex min-h-64 flex-col items-center justify-center border-dashed px-6 py-12 text-center">
      <span className="bg-soft-green text-deep-green grid size-11 place-items-center rounded-full">
        <FolderOpen aria-hidden="true" className="size-5" />
      </span>
      <h2 className="text-ink mt-4 text-base font-semibold">{title}</h2>
      <p className="text-muted mt-2 max-w-md text-sm leading-6">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
