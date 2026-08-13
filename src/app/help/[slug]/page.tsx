import { notFound } from "next/navigation";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { AboutSightline } from "@/features/help/about-sightline";
import { ProductGuide } from "@/features/help/product-guide";
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
  if (slug === "about") return <AboutSightline />;
  if (slug === "documentation") return <ProductGuide />;
  const content: HelpPageContent = helpPages[slug];

  return (
    <div className="mx-auto w-full max-w-5xl px-[var(--page-gutter)] py-8 sm:py-10">
      <header>
        <Link
          href="/help/documentation#workflow-guides"
          className="text-muted hover:text-deep-green text-sm font-semibold"
        >
          ← All guides
        </Link>
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
          <Card key={section.title} id={section.id} className="scroll-mt-24">
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
