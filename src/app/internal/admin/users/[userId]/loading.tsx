export default function PlatformUserDetailLoading() {
  return (
    <div
      className="mx-auto max-w-[90rem] animate-pulse space-y-6 px-5 py-8 sm:px-7"
      aria-label="Loading user details"
      role="status"
    >
      <div className="h-4 w-24 rounded bg-slate-200" />
      <div className="h-9 w-72 rounded bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-24 rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="h-80 rounded-lg bg-slate-100" />
    </div>
  );
}
