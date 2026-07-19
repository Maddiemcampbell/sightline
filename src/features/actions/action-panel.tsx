import { ActionControls } from "@/features/actions/action-controls";
import type { ActionOwner, ActionView } from "@/features/actions/types";

export function ActionPanel({
  actions,
  owners,
}: {
  actions: readonly ActionView[];
  owners: readonly ActionOwner[];
}) {
  if (!actions.length)
    return <p className="text-muted text-sm">No recommended actions yet.</p>;
  return (
    <ul className="space-y-4">
      {actions.map((action) => (
        <li key={action.id} className="bg-background rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{action.title}</h3>
              <p className="text-muted mt-1 text-sm">{action.description}</p>
            </div>
            <span className="text-muted text-xs capitalize">
              {action.actionType.replaceAll("_", " ")}
            </span>
          </div>
          <div className="mt-4">
            <ActionControls initialAction={action} owners={owners} />
          </div>
        </li>
      ))}
    </ul>
  );
}
