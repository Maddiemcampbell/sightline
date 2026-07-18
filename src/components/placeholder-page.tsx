import { Card } from "@/components/ui/card";

type PlaceholderPageProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function PlaceholderPage({
  eyebrow,
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wide text-amber-700 uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
      </header>
      <Card className="mt-10 border-dashed">
        <h2 className="text-base font-semibold text-slate-900">
          Foundation ready
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This route is intentionally a placeholder. Product behavior will be
          added in a future phase.
        </p>
      </Card>
    </div>
  );
}
