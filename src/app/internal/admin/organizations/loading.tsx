export default function PlatformOrganizationsLoading() {
  return (
    <div
      className="mx-auto max-w-[90rem] animate-pulse space-y-6 px-5 py-8 sm:px-7"
      aria-label="Loading organizations"
      role="status"
    >
      <div className="h-9 w-64 rounded bg-slate-200" />
      <div className="h-24 rounded-lg bg-slate-100" />
      <div className="h-[30rem] rounded-lg bg-slate-100" />
    </div>
  );
}
