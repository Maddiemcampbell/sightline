"use client";

export default function ErrorState({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-7 py-12" role="alert">
      <h1 className="text-xl font-semibold">Job monitoring is unavailable</h1>
      <p className="mt-2 text-sm text-slate-600">
        The operational records could not be loaded.
      </p>
      <button onClick={reset} className="mt-5 rounded-md border px-4 py-2">
        Try again
      </button>
    </div>
  );
}
