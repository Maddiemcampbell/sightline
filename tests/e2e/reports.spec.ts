import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

test("presents live portfolio reporting and downloads authorized PDFs", async ({
  page,
}) => {
  await page.goto("/reports");
  const main = page.getByRole("main");

  await expect(
    main.getByRole("heading", { name: "Portfolio reports" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Executive attention queue" }),
  ).toBeVisible();
  await expect(
    main.getByRole("heading", { name: "Risk concentration" }),
  ).toBeVisible();

  const riskResponse = await page.request.get("/api/reports/risk");
  expect(riskResponse.ok()).toBe(true);
  expect(riskResponse.headers()["content-type"]).toBe("application/pdf");
  expect(riskResponse.headers()["content-disposition"]).toMatch(
    /attachment; filename="sightline-risk-report-\d{4}-\d{2}-\d{2}\.pdf"/,
  );
  const riskPdf = await riskResponse.body();
  expect(riskPdf.subarray(0, 5).toString()).toBe("%PDF-");
  if (process.env.REPORT_PDF_QA === "1") {
    await mkdir("tmp/pdfs", { recursive: true });
    await writeFile("tmp/pdfs/sightline-risk-report-qa.pdf", riskPdf);
  }

  const financialDownload = main.getByRole("link", {
    name: "Download financial PDF",
  });
  if (await financialDownload.isVisible()) {
    const financialResponse = await page.request.get("/api/reports/financial");
    expect(financialResponse.ok()).toBe(true);
    expect(financialResponse.headers()["content-type"]).toBe("application/pdf");
    const financialPdf = await financialResponse.body();
    expect(financialPdf.subarray(0, 5).toString()).toBe("%PDF-");
    if (process.env.REPORT_PDF_QA === "1")
      await writeFile(
        "tmp/pdfs/sightline-financial-report-qa.pdf",
        financialPdf,
      );
  }
});
