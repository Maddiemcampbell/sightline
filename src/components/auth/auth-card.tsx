import Link from "next/link";
import type { ReactNode } from "react";

import { SightlineMark } from "@/components/sightline-mark";

type AuthCardProps = Readonly<{
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}>;

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <main
      id="main-content"
      className="bg-background flex min-h-screen items-center justify-center px-5 py-12"
    >
      <section
        aria-labelledby="auth-title"
        className="border-border bg-surface shadow-surface w-full max-w-md rounded-xl border p-7 sm:p-9"
      >
        <Link
          href="/login"
          className="mb-8 inline-flex items-center gap-3"
          aria-label="Sightline"
        >
          <SightlineMark />
          <span className="text-ink text-xl font-bold tracking-tight">
            Sightline
          </span>
        </Link>
        <h1
          id="auth-title"
          className="text-ink text-2xl font-bold tracking-tight"
        >
          {title}
        </h1>
        <p className="text-muted mt-2 text-sm leading-6">{description}</p>
        <div className="mt-7">{children}</div>
        {footer ? (
          <div className="border-border text-muted mt-7 border-t pt-6 text-center text-sm">
            {footer}
          </div>
        ) : null}
      </section>
    </main>
  );
}
