export default function PlatformOrganizationDetailLoading() {
  return (
    <div
      className="mx-auto max-w-[90rem] animate-pulse space-y-5 px-5 py-8 sm:px-7"
      aria-busy="true"
      aria-label="Loading organization"
    >
      <div className="h-9 w-80 rounded bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-28 rounded bg-slate-200" />
        ))}
      </div>
      <div className="h-72 rounded bg-slate-200" />
    </div>
  );
}
