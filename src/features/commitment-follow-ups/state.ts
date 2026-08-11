import type { CommitmentFollowUpRow } from "@/lib/supabase/database-row.types";

export type CommitmentTiming =
  "upcoming" | "due_today" | "overdue" | "received" | "resolved";

export function commitmentTiming(
  followUp: Pick<CommitmentFollowUpRow, "status" | "expected_response_at">,
  now = new Date(),
): CommitmentTiming {
  if (followUp.status === "resolved") return "resolved";
  if (followUp.status === "response_received") return "received";
  const due = new Date(followUp.expected_response_at);
  const dueDay = Date.UTC(
    due.getUTCFullYear(),
    due.getUTCMonth(),
    due.getUTCDate(),
  );
  const nowDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (dueDay < nowDay) return "overdue";
  if (dueDay === nowDay) return "due_today";
  return "upcoming";
}

export function shouldRemind(
  followUp: Pick<
    CommitmentFollowUpRow,
    "status" | "expected_response_at" | "last_reminded_at"
  >,
  now = new Date(),
) {
  if (commitmentTiming(followUp, now) !== "overdue") return false;
  if (!followUp.last_reminded_at) return true;
  return (
    now.getTime() - new Date(followUp.last_reminded_at).getTime() >=
    24 * 60 * 60 * 1_000
  );
}
