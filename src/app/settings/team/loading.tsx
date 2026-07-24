export default function TeamSettingsLoading() {
  return (
    <div
      className="mx-auto max-w-6xl animate-pulse px-[var(--page-gutter)] py-10"
      aria-label="Loading team"
    >
      <div className="bg-border h-4 w-32 rounded" />
      <div className="bg-border mt-4 h-10 w-72 rounded" />
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="border-border h-52 rounded-lg border" />
        ))}
      </div>
    </div>
  );
}
