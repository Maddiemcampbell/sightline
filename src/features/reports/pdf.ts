import "server-only";

import {
  PDFDocument,
  StandardFonts,
  type PDFFont,
  type PDFPage,
  rgb,
} from "pdf-lib";

import type { getReportsData } from "@/features/reports/data";
import {
  formatInteger,
  formatMoney,
  formatPercent,
  formatReportDate,
} from "@/features/reports/format";

export type ReportKind = "risk" | "financial";
type ReportsData = Awaited<ReturnType<typeof getReportsData>>;

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const COLORS = {
  ink: rgb(0.075, 0.13, 0.165),
  muted: rgb(0.4, 0.44, 0.49),
  green: rgb(0.09, 0.25, 0.2),
  accent: rgb(0.83, 0.91, 0.49),
  border: rgb(0.9, 0.91, 0.89),
  surface: rgb(0.97, 0.98, 0.95),
  danger: rgb(0.62, 0.23, 0.18),
  white: rgb(1, 1, 1),
};

export async function buildReportPdf({
  kind,
  data,
  generatedAt = new Date(),
}: {
  kind: ReportKind;
  data: ReportsData;
  generatedAt?: Date;
}) {
  const document = await PDFDocument.create();
  document.setTitle(
    kind === "risk"
      ? "Sightline Portfolio Risk Report"
      : "Sightline Financial Performance Report",
  );
  document.setAuthor("Sightline");
  document.setCreator("Sightline reporting workspace");
  document.setCreationDate(generatedAt);
  document.setModificationDate(generatedAt);
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const writer = new PdfWriter(document, regular, bold, generatedAt);

  if (kind === "risk") writeRiskReport(writer, data);
  else {
    if (!data.financialAnalytics)
      throw new Error("Financial report unavailable");
    writeFinancialReport(writer, data.financialAnalytics);
  }

  writer.finish();
  return document.save();
}

function writeRiskReport(writer: PdfWriter, data: ReportsData) {
  const risk = data.riskAnalytics;
  writer.cover(
    "Portfolio Risk Report",
    "Executive view of current risk concentration, severity, ownership, and evidence across authorized projects.",
    risk.metadata.calculatedAt,
  );
  writer.metrics([
    ["Active risks", formatInteger(risk.summary.activeRisks)],
    ["High / critical", formatInteger(risk.summary.highCriticalRisks)],
    ["Affected projects", formatInteger(risk.summary.affectedProjects)],
    [
      "Assessed exposure",
      formatMoney(risk.summary.assessedExposureCents, null),
    ],
  ]);
  writer.note(
    `Data quality: ${humanize(risk.metadata.quality)}. ${formatInteger(risk.metadata.recordsIncluded)} records included; ${formatInteger(risk.metadata.recordsExcluded)} excluded.`,
  );

  writer.section("Priority risk drivers");
  writer.table(
    ["Category", "Active", "High / critical", "Projects", "Overdue"],
    risk.drivers
      .slice(0, 10)
      .map((driver) => [
        driver.label,
        String(driver.activeRiskCount),
        String(driver.highCriticalCount),
        String(driver.affectedProjectCount),
        String(driver.overdueActionCount),
      ]),
    [0.38, 0.13, 0.2, 0.14, 0.15],
  );

  writer.section("Risks requiring executive attention");
  if (risk.executiveRisks.length === 0) {
    writer.paragraph("No active risks currently require executive attention.");
  } else {
    for (const item of risk.executiveRisks.slice(0, 15)) {
      writer.callout(
        item.title,
        `${humanize(item.severity)} severity | ${humanize(item.category)} | Attention score ${item.attentionScore}`,
        item.reasons.join("; "),
      );
    }
  }

  writer.section("Methodology and limitations");
  writer.paragraph(
    `Calculated with ${risk.metadata.calculationVersion} and taxonomy ${risk.metadata.taxonomyVersion}. Metrics include only projects the requesting user is authorized to access.`,
  );
  if (risk.metadata.missingInputs.length) {
    writer.paragraph(
      `Missing inputs: ${risk.metadata.missingInputs.join(", ")}.`,
    );
  }
  for (const exclusion of risk.exclusions) writer.bullet(exclusion);
}

function writeFinancialReport(
  writer: PdfWriter,
  financial: NonNullable<ReportsData["financialAnalytics"]>,
) {
  const portfolio = financial.portfolio;
  const currency = portfolio.currencyCode;
  writer.cover(
    "Financial Performance Report",
    "Permission-aware portfolio budget, forecast, variance, and cash-flow performance across authorized projects.",
    portfolio.metadata.calculatedAt,
  );
  writer.metrics([
    [
      "Portfolio budget",
      formatMoney(portfolio.totalPortfolioBudget.valueCents, currency),
    ],
    [
      "Forecast cost",
      formatMoney(portfolio.totalForecastCost.valueCents, currency),
    ],
    [
      "Net variance",
      formatMoney(portfolio.netBudgetVariance.valueCents, currency),
    ],
    ["Forecast margin", formatPercent(portfolio.forecastMarginPercent)],
  ]);
  writer.note(
    `Data quality: ${humanize(portfolio.quality)}. ${portfolio.projectsOverBudget} projects over budget; ${portfolio.projectsMissingFinancialData} missing financial data.`,
  );

  writer.section("Project performance");
  writer.table(
    ["Project", "Budget", "Forecast", "Variance", "Status"],
    [...portfolio.projects]
      .sort((a, b) =>
        a.varianceDirection === b.varianceDirection
          ? a.projectName.localeCompare(b.projectName)
          : a.varianceDirection === "over_budget"
            ? -1
            : 1,
      )
      .slice(0, 20)
      .map((project) => [
        project.projectName,
        formatMoney(project.revisedBudget.valueCents, project.currencyCode),
        formatMoney(
          project.estimateAtCompletion.valueCents,
          project.currencyCode,
        ),
        formatMoney(project.budgetVariance.valueCents, project.currencyCode),
        humanize(project.varianceDirection),
      ]),
    [0.31, 0.18, 0.18, 0.18, 0.15],
  );

  writer.keepTogether(170);
  writer.section("Cash-flow forecast");
  writer.paragraph(
    `${humanize(financial.cashFlow.period)} outlook with ${humanize(financial.cashFlow.confidence)} confidence.`,
  );
  writer.table(
    ["Period", "Inflows", "Outflows", "Net", "Confidence"],
    financial.cashFlow.buckets
      .slice(0, 12)
      .map((bucket) => [
        `${bucket.startsOn} to ${bucket.endsOn}`,
        formatMoney(bucket.expectedInflows.valueCents, currency),
        formatMoney(bucket.expectedOutflows.valueCents, currency),
        formatMoney(bucket.netCashFlow.valueCents, currency),
        humanize(bucket.confidence),
      ]),
    [0.3, 0.18, 0.18, 0.18, 0.16],
  );

  writer.section("Period comparison");
  if (!financial.comparison.previousMonth) {
    writer.paragraph(
      "Historical comparison is unavailable until a prior monthly snapshot has been captured.",
    );
  } else {
    writer.paragraph(
      `Compared ${financial.comparison.currentMonth} with ${financial.comparison.previousMonth}. Net budget variance ${humanize(financial.comparison.netBudgetVariance.direction)}; forecast cost ${humanize(financial.comparison.forecastCost.direction)}.`,
    );
    for (const name of financial.comparison.projectsDeteriorated)
      writer.bullet(`${name}: performance deteriorated`);
    for (const name of financial.comparison.projectsImproved)
      writer.bullet(`${name}: performance improved`);
  }

  writer.section("Methodology and limitations");
  writer.paragraph(
    `Calculated with ${portfolio.metadata.calculationVersion}. Financial information appears only for users with financial-exposure permission and includes only their authorized project scope.`,
  );
  if (portfolio.metadata.missingInputs.length) {
    const missingProjects = portfolio.metadata.missingInputs.filter((input) =>
      input.startsWith("project:"),
    ).length;
    writer.paragraph(
      missingProjects === portfolio.metadata.missingInputs.length
        ? `${missingProjects} projects have missing required financial inputs.`
        : `Missing inputs: ${portfolio.metadata.missingInputs.filter((input) => !input.startsWith("project:")).join(", ")}.`,
    );
  }
}

class PdfWriter {
  private page!: PDFPage;
  private y = 0;
  private pageNumber = 0;

  constructor(
    private readonly document: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly generatedAt: Date,
  ) {
    this.addPage();
  }

  cover(title: string, description: string, calculatedAt: string) {
    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 178,
      width: PAGE_WIDTH,
      height: 178,
      color: COLORS.green,
    });
    this.page.drawRectangle({
      x: MARGIN,
      y: PAGE_HEIGHT - 58,
      width: 30,
      height: 8,
      color: COLORS.accent,
    });
    this.page.drawText("SIGHTLINE", {
      x: MARGIN + 40,
      y: PAGE_HEIGHT - 59,
      size: 10,
      font: this.bold,
      color: COLORS.white,
    });
    this.page.drawText(title, {
      x: MARGIN,
      y: PAGE_HEIGHT - 110,
      size: 26,
      font: this.bold,
      color: COLORS.white,
    });
    this.drawWrapped(
      description,
      MARGIN,
      PAGE_HEIGHT - 135,
      10,
      this.regular,
      COLORS.white,
      CONTENT_WIDTH,
      14,
    );
    this.y = PAGE_HEIGHT - 212;
    this.paragraph(
      `Generated ${formatReportDate(this.generatedAt)} | Data calculated ${formatReportDate(calculatedAt)}`,
      9,
      COLORS.muted,
    );
  }

  metrics(items: readonly (readonly [string, string])[]) {
    this.ensure(92);
    const gap = 8;
    const width = (CONTENT_WIDTH - gap * (items.length - 1)) / items.length;
    items.forEach(([label, value], index) => {
      const x = MARGIN + index * (width + gap);
      this.page.drawRectangle({
        x,
        y: this.y - 64,
        width,
        height: 64,
        color: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
      });
      this.page.drawText(label.toUpperCase(), {
        x: x + 10,
        y: this.y - 18,
        size: 6.8,
        font: this.bold,
        color: COLORS.muted,
      });
      const fitted = fitText(value, this.bold, 15, width - 20);
      this.page.drawText(value, {
        x: x + 10,
        y: this.y - 43,
        size: fitted,
        font: this.bold,
        color: COLORS.ink,
      });
    });
    this.y -= 82;
  }

  note(text: string) {
    this.ensure(44);
    const lines = wrapText(text, this.regular, 8.5, CONTENT_WIDTH - 24);
    const height = Math.max(34, lines.length * 11 + 16);
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - height,
      width: CONTENT_WIDTH,
      height,
      color: COLORS.surface,
    });
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - height,
      width: 4,
      height,
      color: COLORS.accent,
    });
    lines.forEach((line, index) =>
      this.page.drawText(line, {
        x: MARGIN + 14,
        y: this.y - 15 - index * 11,
        size: 8.5,
        font: this.regular,
        color: COLORS.ink,
      }),
    );
    this.y -= height + 12;
  }

  section(title: string) {
    this.ensure(105);
    this.y -= 12;
    this.page.drawText(title, {
      x: MARGIN,
      y: this.y,
      size: 15,
      font: this.bold,
      color: COLORS.green,
    });
    this.page.drawLine({
      start: { x: MARGIN, y: this.y - 9 },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y - 9 },
      thickness: 1,
      color: COLORS.border,
    });
    this.y -= 28;
  }

  keepTogether(height: number) {
    this.ensure(height);
  }

  paragraph(text: string, size = 9, color = COLORS.ink) {
    const lines = wrapText(text, this.regular, size, CONTENT_WIDTH);
    this.ensure(lines.length * 13 + 8);
    lines.forEach((line, index) =>
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y - index * 13,
        size,
        font: this.regular,
        color,
      }),
    );
    this.y -= lines.length * 13 + 8;
  }

  bullet(text: string) {
    const lines = wrapText(text, this.regular, 8.5, CONTENT_WIDTH - 18);
    this.ensure(lines.length * 12 + 4);
    this.page.drawCircle({
      x: MARGIN + 3,
      y: this.y + 2,
      size: 2,
      color: COLORS.green,
    });
    lines.forEach((line, index) =>
      this.page.drawText(line, {
        x: MARGIN + 14,
        y: this.y - index * 12,
        size: 8.5,
        font: this.regular,
        color: COLORS.ink,
      }),
    );
    this.y -= lines.length * 12 + 4;
  }

  callout(title: string, metadata: string, detail: string) {
    const detailLines = wrapText(detail, this.regular, 8, CONTENT_WIDTH - 20);
    const titleLines = wrapText(title, this.bold, 9.5, CONTENT_WIDTH - 20);
    const height = titleLines.length * 12 + detailLines.length * 10 + 29;
    this.ensure(height + 8);
    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - height,
      width: CONTENT_WIDTH,
      height,
      borderColor: COLORS.border,
      borderWidth: 1,
      color: COLORS.white,
    });
    let lineY = this.y - 15;
    for (const line of titleLines) {
      this.page.drawText(line, {
        x: MARGIN + 10,
        y: lineY,
        size: 9.5,
        font: this.bold,
        color: COLORS.ink,
      });
      lineY -= 12;
    }
    this.page.drawText(metadata, {
      x: MARGIN + 10,
      y: lineY - 1,
      size: 7.5,
      font: this.bold,
      color: COLORS.danger,
    });
    lineY -= 15;
    for (const line of detailLines) {
      this.page.drawText(line, {
        x: MARGIN + 10,
        y: lineY,
        size: 8,
        font: this.regular,
        color: COLORS.muted,
      });
      lineY -= 10;
    }
    this.y -= height + 8;
  }

  table(
    headers: readonly string[],
    rows: readonly (readonly string[])[],
    ratios: readonly number[],
  ) {
    if (rows.length === 0) {
      this.paragraph("No records are available for this section.");
      return;
    }
    const widths = ratios.map((ratio) => ratio * CONTENT_WIDTH);
    const drawHeader = () => {
      this.ensure(60);
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - 22,
        width: CONTENT_WIDTH,
        height: 22,
        color: COLORS.green,
      });
      let x = MARGIN;
      headers.forEach((header, index) => {
        this.page.drawText(header.toUpperCase(), {
          x: x + 6,
          y: this.y - 14,
          size: 6.5,
          font: this.bold,
          color: COLORS.white,
        });
        x += widths[index] ?? 0;
      });
      this.y -= 22;
    };
    drawHeader();
    rows.forEach((row, rowIndex) => {
      const wrapped = row.map((cell, index) =>
        wrapText(cell, this.regular, 7.5, (widths[index] ?? 0) - 12).slice(
          0,
          3,
        ),
      );
      const height = Math.max(
        25,
        Math.max(...wrapped.map((lines) => lines.length)) * 10 + 10,
      );
      if (this.y - height < 54) {
        this.addPage();
        drawHeader();
      }
      if (rowIndex % 2 === 1)
        this.page.drawRectangle({
          x: MARGIN,
          y: this.y - height,
          width: CONTENT_WIDTH,
          height,
          color: COLORS.surface,
        });
      let x = MARGIN;
      wrapped.forEach((lines, index) => {
        lines.forEach((line, lineIndex) =>
          this.page.drawText(line, {
            x: x + 6,
            y: this.y - 14 - lineIndex * 10,
            size: 7.5,
            font: this.regular,
            color: COLORS.ink,
          }),
        );
        x += widths[index] ?? 0;
      });
      this.page.drawLine({
        start: { x: MARGIN, y: this.y - height },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y - height },
        thickness: 0.5,
        color: COLORS.border,
      });
      this.y -= height;
    });
    this.y -= 8;
  }

  finish() {
    const pages = this.document.getPages();
    pages.forEach((page, index) => {
      page.drawText(
        `Sightline | Confidential | ${formatReportDate(this.generatedAt)}`,
        { x: MARGIN, y: 25, size: 7, font: this.regular, color: COLORS.muted },
      );
      const pageText = `${index + 1} / ${pages.length}`;
      page.drawText(pageText, {
        x: PAGE_WIDTH - MARGIN - this.regular.widthOfTextAtSize(pageText, 7),
        y: 25,
        size: 7,
        font: this.regular,
        color: COLORS.muted,
      });
    });
  }

  private ensure(height: number) {
    if (this.y - height < 52) this.addPage();
  }

  private addPage() {
    this.page = this.document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pageNumber += 1;
    this.y = PAGE_HEIGHT - MARGIN;
    if (this.pageNumber > 1) {
      this.page.drawRectangle({
        x: MARGIN,
        y: PAGE_HEIGHT - 42,
        width: 22,
        height: 6,
        color: COLORS.accent,
      });
      this.page.drawText("SIGHTLINE REPORT", {
        x: MARGIN + 30,
        y: PAGE_HEIGHT - 43,
        size: 7.5,
        font: this.bold,
        color: COLORS.green,
      });
      this.y = PAGE_HEIGHT - 66;
    }
  }

  private drawWrapped(
    text: string,
    x: number,
    y: number,
    size: number,
    font: PDFFont,
    color: ReturnType<typeof rgb>,
    width: number,
    leading: number,
  ) {
    wrapText(text, font, size, width).forEach((line, index) =>
      this.page.drawText(line, {
        x,
        y: y - index * leading,
        size,
        font,
        color,
      }),
    );
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = sanitize(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = words[0]!;
  for (const word of words.slice(1)) {
    const candidate = `${current} ${word}`;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth)
      current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function fitText(
  text: string,
  font: PDFFont,
  preferred: number,
  width: number,
) {
  let size = preferred;
  while (size > 8 && font.widthOfTextAtSize(sanitize(text), size) > width)
    size -= 0.5;
  return size;
}

function sanitize(value: string) {
  return value
    .replaceAll("–", "-")
    .replaceAll("—", "-")
    .replaceAll("·", "|")
    .replaceAll("’", "'")
    .replaceAll("“", '"')
    .replaceAll("”", '"');
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
