import { notFound } from "next/navigation";

import { Card } from "@/components/ui/card";
import { helpPages, isHelpPageSlug } from "@/features/help/content";
import type { HelpPageContent } from "@/features/help/content";

export function generateStaticParams() {
  return Object.keys(helpPages).map((slug) => ({ slug }));
}

export default async function HelpPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isHelpPageSlug(slug)) notFound();
  const content: HelpPageContent = helpPages[slug];

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <p className="text-deep-green text-sm font-semibold">
          {content.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
          {content.title}
        </h1>
        <p className="text-muted mt-3 max-w-3xl leading-7">
          {content.introduction}
        </p>
      </header>

      <div className="mt-8 grid gap-4">
        {content.sections.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-muted mt-2 text-sm leading-6">{section.body}</p>
            {section.items && (
              <ul className="text-muted mt-4 space-y-2 text-sm">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden="true" className="text-deep-green">
                      •
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
