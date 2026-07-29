import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Pagination } from "@/features/portfolio/pagination-controls";

describe("portfolio pagination", () => {
  it("preserves filters in accessible previous and next links", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        path="/risks"
        page={2}
        pageSize={20}
        total={45}
        parameters={{
          view: "active",
          q: "insurance",
          category: "all",
          page: 2,
        }}
      />,
    );

    expect(markup).toContain('aria-label="Previous page"');
    expect(markup).toContain('href="/risks?view=active&amp;q=insurance"');
    expect(markup).toContain('aria-label="Next page"');
    expect(markup).toContain(
      'href="/risks?view=active&amp;q=insurance&amp;page=3"',
    );
    expect(markup).toContain("Page <span");
    expect(markup).toContain(">2</span> of");
  });

  it("renders the previous control as disabled on the first page", () => {
    const markup = renderToStaticMarkup(
      <Pagination
        path="/projects"
        page={1}
        pageSize={20}
        total={21}
        parameters={{ q: "", stage: "all", sort: "name", page: 1 }}
      />,
    );

    expect(markup).toContain('aria-disabled="true"');
    expect(markup).toContain('aria-label="Next page"');
    expect(markup).toContain('href="/projects?sort=name&amp;page=2"');
  });
});
