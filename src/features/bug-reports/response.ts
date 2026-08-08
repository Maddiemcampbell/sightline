export type BugReportFieldErrors = Record<string, string[] | undefined>;

export type BugReportFailureBody = {
  error?: string;
  fieldErrors?: BugReportFieldErrors;
  message?: string;
  reference?: string;
};

export function bugReportFailureMessage(
  status: number,
  body: BugReportFailureBody,
): string {
  if (body.message) return body.message;
  if (status === 422 && body.fieldErrors)
    return "Check the highlighted fields and try again.";
  if (status === 401)
    return "Your session expired. Refresh the page, sign in, and try again.";
  if (status === 403)
    return "Sightline could not verify this request. Refresh the page and try again.";
  const base = "We could not save the report. Try again.";
  return body.reference ? `${base} Reference: ${body.reference}` : base;
}
