import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

type ErrorStateProps = Readonly<{
  title?: string;
  description: string;
  action?: ReactNode;
  reference?: string;
}>;

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  reference,
}: ErrorStateProps) {
  return (
    <div
      className="border-danger/20 bg-soft-red rounded-lg border p-5 sm:p-6"
      role="alert"
    >
      <div className="flex gap-3">
        <AlertCircle
          aria-hidden="true"
          className="text-danger mt-0.5 size-5 shrink-0"
        />
        <div>
          <h2 className="text-danger text-sm font-semibold">{title}</h2>
          <p className="text-ink mt-1 text-sm leading-6">{description}</p>
          {reference ? (
            <p className="text-muted mt-2 text-xs">
              Support reference: <code>{reference}</code>
            </p>
          ) : null}
          {action ? <div className="mt-4">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
