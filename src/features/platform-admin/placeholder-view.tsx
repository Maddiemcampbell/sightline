export function AdminPlaceholderView({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-[90rem] px-5 py-8 sm:px-7">
      <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
        Platform Operations
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
      <section className="border-border mt-7 rounded-lg border bg-white p-8 text-center shadow-sm">
        <h2 className="font-semibold">Infrastructure ready</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Live operational data is intentionally deferred. Authentication,
          capability authorization, navigation, and staff audit logging are
          active for this route.
        </p>
      </section>
    </div>
  );
}
