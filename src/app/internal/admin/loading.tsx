export default function PlatformAdminLoading() {
  return (
    <div
      className="mx-auto max-w-[90rem] animate-pulse space-y-5 px-5 py-8 sm:px-7"
      aria-busy="true"
    >
      <div className="h-8 w-48 rounded bg-slate-200" />
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-56 rounded-lg bg-slate-200" />
        ))}
      </div>
    </div>
  );
}
