"use client";

import { useState } from "react";

export function CopyIdButton({
  id,
  label = "Copy ID",
}: {
  id: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
      onClick={async () => {
        await navigator.clipboard.writeText(id);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1_500);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
