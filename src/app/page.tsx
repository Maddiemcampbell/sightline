import { ArrowRight, HardHat } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
      <header className="max-w-3xl">
        <div className="mb-6 grid size-12 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <HardHat aria-hidden="true" className="size-6" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-amber-700 uppercase">
          Profit intelligence
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Know what is most likely to cost you money this week.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          Sightline gives commercial construction executives a focused morning
          view of the three issues that deserve attention first.
        </p>
        <Link
          href="/brief"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
        >
          View the brief
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </header>
      <Card className="mt-12">
        <p className="text-sm font-medium text-slate-500">Current phase</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Technical foundation
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          The application shell, routes, validation, database client boundary,
          and test tooling are in place. No predictive or autonomous features
          are included.
        </p>
      </Card>
    </div>
  );
}
