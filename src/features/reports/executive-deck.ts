import PptxGenJS from "pptxgenjs";

import type { getForecastingView } from "@/features/forecasting/data";
import type { getReportsData } from "@/features/reports/data";

export type ExecutiveDeckTemplate =
  | "weekly-executive-review"
  | "monthly-portfolio-review"
  | "project-owner-meeting"
  | "lender-board-update"
  | "risk-committee-briefing";

export type ExecutiveDeckInput = Readonly<{
  organizationName: string;
  template: ExecutiveDeckTemplate;
  generatedAt: Date;
  baseUrl: string;
  reports: Awaited<ReturnType<typeof getReportsData>>;
  forecast: Awaited<ReturnType<typeof getForecastingView>>;
}>;

export const executiveDeckTemplates = [
  {
    id: "weekly-executive-review",
    name: "Weekly executive review",
    description:
      "A concise operating review focused on movement, attention, and decisions.",
    audience: "Executive leadership",
  },
  {
    id: "monthly-portfolio-review",
    name: "Monthly portfolio review",
    description:
      "Portfolio performance, forecasts, risk concentration, and project detail.",
    audience: "Portfolio leadership",
  },
  {
    id: "project-owner-meeting",
    name: "Project owner meeting",
    description:
      "Projects needing intervention, overdue commitments, and ownership follow-through.",
    audience: "Project owners",
  },
  {
    id: "lender-board-update",
    name: "Lender or board update",
    description:
      "A measured view of portfolio position, outlook, data confidence, and key exposures.",
    audience: "Board and external stakeholders",
  },
  {
    id: "risk-committee-briefing",
    name: "Risk committee briefing",
    description:
      "Risk drivers, high-priority cases, supporting evidence, and decisions required.",
    audience: "Risk committee",
  },
] as const satisfies readonly Readonly<{
  id: ExecutiveDeckTemplate;
  name: string;
  description: string;
  audience: string;
}>[];

export function isExecutiveDeckTemplate(
  value: string,
): value is ExecutiveDeckTemplate {
  return executiveDeckTemplates.some((template) => template.id === value);
}

export function buildExecutiveDeckReview(
  input: Pick<ExecutiveDeckInput, "reports" | "forecast">,
) {
  const { riskAnalytics, financialAnalytics } = input.reports;
  return {
    slideCount: 8,
    generatedFrom: [
      `${riskAnalytics.metadata.recordsIncluded} risk records`,
      `${riskAnalytics.summary.affectedProjects} affected projects`,
      `${input.forecast.commitments.length} upcoming or overdue commitments`,
      financialAnalytics
        ? `${financialAnalytics.portfolio.activeProjects} financial project records`
        : "Financial details excluded by role permissions",
    ],
    sections: [
      "Portfolio executive summary",
      "Changes and risk movement",
      "Projects needing attention",
      financialAnalytics
        ? "Margin and cash-flow forecast"
        : "Forecast readiness",
      "Top risks and source links",
      "Overdue actions and owners",
      "Leadership decisions",
      "Project-level appendix",
    ],
    limitations: [
      ...riskAnalytics.metadata.missingInputs,
      ...input.forecast.readiness.missingInputs,
    ].filter((value, index, values) => values.indexOf(value) === index),
  };
}

export function formatDataLimitation(value: string) {
  if (value.startsWith("project:")) return "project financial inputs";
  return humanize(value);
}

export async function buildExecutiveDeck(
  input: ExecutiveDeckInput,
): Promise<Uint8Array> {
  const pptx = new PptxGenJS();
  const template = executiveDeckTemplates.find(
    ({ id }) => id === input.template,
  )!;
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Sightline";
  pptx.company = input.organizationName;
  pptx.subject = "Permission-aware portfolio executive review";
  pptx.title = `${input.organizationName} — ${template.name}`;
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
  };

  addTitleSlide(pptx, input, template.name, template.audience);
  addSummarySlide(pptx, input);
  addMovementSlide(pptx, input);
  addProjectsSlide(pptx, input);
  addForecastSlide(pptx, input);
  addRisksSlide(pptx, input);
  addCommitmentsSlide(pptx, input);
  addAppendixSlide(pptx, input);

  const output = await pptx.write({
    outputType: "uint8array",
    compression: true,
  });
  return output instanceof Uint8Array
    ? output
    : new Uint8Array(output as ArrayBuffer);
}

const COLORS = {
  ink: "17242A",
  green: "123F32",
  lime: "D9EF78",
  muted: "667085",
  line: "DDE3DD",
  canvas: "F7F8F4",
  white: "FFFFFF",
  red: "B64133",
  amber: "D68B22",
  blue: "3976A8",
};

function addTitleSlide(
  pptx: PptxGenJS,
  input: ExecutiveDeckInput,
  title: string,
  audience: string,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.green };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.18,
    h: 7.5,
    fill: { color: COLORS.lime },
    line: { color: COLORS.lime },
  });
  slide.addText("SIGHTLINE", {
    x: 0.75,
    y: 0.65,
    w: 3,
    h: 0.3,
    fontSize: 13,
    bold: true,
    color: COLORS.lime,
    charSpacing: 2,
  });
  slide.addText(title, {
    x: 0.75,
    y: 2.05,
    w: 9.8,
    h: 1.2,
    fontSize: 34,
    bold: true,
    color: COLORS.white,
    margin: 0,
    breakLine: false,
  });
  slide.addText(input.organizationName, {
    x: 0.75,
    y: 3.4,
    w: 7,
    h: 0.5,
    fontSize: 21,
    color: "DDE8E1",
    margin: 0,
  });
  slide.addText(`${audience}  •  ${formatDate(input.generatedAt)}`, {
    x: 0.75,
    y: 5.9,
    w: 7.5,
    h: 0.35,
    fontSize: 15,
    color: "B9C9C1",
    margin: 0,
  });
  slide.addText("Review required before distribution", {
    x: 9.3,
    y: 6.55,
    w: 3.1,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: COLORS.lime,
    align: "right",
    margin: 0,
  });
  addNotes(slide, [source(input, "/reports"), source(input, "/forecasts")]);
}

function addSummarySlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const slide = contentSlide(
    pptx,
    "Portfolio needs focused follow-through",
    "Executive summary",
    2,
  );
  const risk = input.reports.riskAnalytics;
  const financial = input.reports.financialAnalytics;
  const metrics: { value: string; label: string }[] = [
    { value: String(risk.summary.activeRisks), label: "Active risks" },
    { value: String(risk.summary.highCriticalRisks), label: "High / critical" },
    {
      value: String(input.forecast.commitments.length),
      label: "Near-term commitments",
    },
    {
      value: financial
        ? formatMoney(
            financial.portfolio.netBudgetVariance.valueCents,
            financial.portfolio.currencyCode,
          )
        : "Restricted",
      label: "Budget variance",
    },
  ];
  metrics.forEach(({ value, label }, index) => {
    const x = 0.75 + index * 3.05;
    slide.addText(value, {
      x,
      y: 1.65,
      w: 2.6,
      h: 0.55,
      fontSize: 27,
      bold: true,
      color: index === 1 ? COLORS.red : COLORS.ink,
      margin: 0,
    });
    slide.addText(label, {
      x,
      y: 2.25,
      w: 2.6,
      h: 0.35,
      fontSize: 14,
      color: COLORS.muted,
      margin: 0,
    });
  });
  slide.addShape(pptx.ShapeType.line, {
    x: 0.75,
    y: 2.9,
    w: 11.8,
    h: 0,
    line: { color: COLORS.line, width: 1.2 },
  });
  const topRisk = risk.executiveRisks[0];
  slide.addText("What leadership should know", {
    x: 0.75,
    y: 3.35,
    w: 4.3,
    h: 0.4,
    fontSize: 19,
    bold: true,
    color: COLORS.green,
    margin: 0,
  });
  slide.addText(
    topRisk
      ? `${topRisk.title} is the highest-ranked active risk. ${topRisk.reasons.slice(0, 2).join(" ")}`
      : "No active risk currently requires executive attention.",
    {
      x: 0.75,
      y: 3.9,
      w: 7.1,
      h: 1.25,
      fontSize: 18,
      color: COLORS.ink,
      breakLine: false,
      valign: "middle",
      margin: 0.04,
    },
  );
  slide.addText("Data confidence", {
    x: 9.1,
    y: 3.35,
    w: 2.8,
    h: 0.4,
    fontSize: 19,
    bold: true,
    color: COLORS.green,
    margin: 0,
  });
  slide.addText(
    `${input.forecast.readiness.confidence.toUpperCase()}\n${formatDataLimitation(input.forecast.readiness.missingInputs[0] ?? "No material gaps identified")}`,
    {
      x: 9.1,
      y: 3.9,
      w: 3.1,
      h: 1.25,
      fontSize: 16,
      color: COLORS.ink,
      margin: 0.04,
      breakLine: false,
    },
  );
  if (topRisk)
    addSourceLink(
      slide,
      input,
      topRisk.href,
      "Open highest-ranked risk",
      0.75,
      5.45,
      3.3,
    );
  addNotes(slide, [
    source(input, "/reports"),
    ...(topRisk ? [source(input, topRisk.href)] : []),
  ]);
}

function addMovementSlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const slide = contentSlide(
    pptx,
    "Risk movement is concentrated",
    "Changes since the prior view",
    3,
  );
  const drivers = input.reports.riskAnalytics.drivers.slice(0, 6);
  if (drivers.length) {
    slide.addChart(
      pptx.ChartType.bar,
      [
        {
          name: "Active risks",
          labels: drivers.map((d) => d.label),
          values: drivers.map((d) => d.activeRiskCount),
        },
      ],
      {
        x: 0.75,
        y: 1.55,
        w: 7.1,
        h: 4.75,
        catAxisLabelFontSize: 13,
        valAxisLabelFontSize: 11,
        showLegend: false,
        showTitle: false,
        chartColors: [COLORS.green],
        showValue: true,
        valGridLine: { color: COLORS.line, size: 1 },
      },
    );
  } else {
    slide.addText("No active risk drivers are available.", {
      x: 0.75,
      y: 2.5,
      w: 7,
      h: 0.5,
      fontSize: 20,
      color: COLORS.muted,
    });
  }
  slide.addText("Movement to review", {
    x: 8.55,
    y: 1.65,
    w: 3.6,
    h: 0.4,
    fontSize: 19,
    bold: true,
    color: COLORS.green,
    margin: 0,
  });
  const movement = drivers
    .filter((driver) => driver.trendState !== "stable")
    .slice(0, 4);
  slide.addText(
    (movement.length ? movement : drivers.slice(0, 4)).map((driver) => ({
      text: `${driver.label}: ${driver.trendState}${driver.trendPercent === null ? "" : ` (${driver.trendPercent > 0 ? "+" : ""}${driver.trendPercent}%)`}\n`,
      options: { bullet: { indent: 16 }, breakLine: true },
    })),
    {
      x: 8.55,
      y: 2.25,
      w: 3.75,
      h: 2.8,
      fontSize: 16,
      color: COLORS.ink,
      breakLine: false,
      margin: 0.02,
    },
  );
  addSourceLink(
    slide,
    input,
    "/reports",
    "Review portfolio analytics",
    8.55,
    5.35,
    3.3,
  );
  addNotes(slide, [source(input, "/reports")]);
}

function addProjectsSlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const slide = contentSlide(
    pptx,
    "Projects needing the closest review",
    "Projects needing attention",
    4,
  );
  const projects = input.forecast.projects.slice(0, 6);
  const rows = [
    ["Project", "Budget variance", "Margin", "Schedule signal"],
    ...projects.map((project) => [
      project.name,
      input.forecast.canViewFinancials
        ? formatMoney(project.budgetVarianceCents, project.currencyCode)
        : "Restricted",
      input.forecast.canViewFinancials
        ? formatPercent(project.forecastMarginPercent)
        : "Restricted",
      project.scheduleRiskCount
        ? `${humanize(project.highestScheduleSeverity ?? "active")} · ${project.scheduleRiskCount}`
        : "No active signal",
    ]),
  ];
  slide.addTable(
    toTableRows(rows),
    tableOptions(0.75, 1.55, 11.8, [4.2, 2.4, 1.8, 3.4]),
  );
  slide.addText(
    "Ranking combines unfavorable budget position and schedule severity. It is deterministic and does not predict outcomes.",
    {
      x: 0.75,
      y: 6.35,
      w: 10.5,
      h: 0.35,
      fontSize: 12,
      color: COLORS.muted,
      margin: 0,
    },
  );
  addNotes(slide, [source(input, "/forecasts"), source(input, "/projects")]);
}

function addForecastSlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const title = input.forecast.canViewFinancials
    ? "Cash and margin need close monitoring"
    : "Forecast readiness is limited by role permissions";
  const slide = contentSlide(pptx, title, "Margin and cash-flow forecast", 5);
  if (input.forecast.cash && input.forecast.portfolio) {
    const horizons = [
      input.forecast.cash.day30,
      input.forecast.cash.day60,
      input.forecast.cash.day90,
    ];
    const labels = ["30 days", "60 days", "90 days"];
    const values = horizons.map(
      (forecast) =>
        forecast.buckets.reduce(
          (sum, bucket) => sum + (bucket.netCashFlow.valueCents ?? 0),
          0,
        ) / 100,
    );
    slide.addChart(
      pptx.ChartType.bar,
      [{ name: "Net cash flow", labels, values }],
      {
        x: 0.75,
        y: 1.55,
        w: 7.5,
        h: 4.7,
        chartColors: [COLORS.blue],
        barDir: "col",
        showLegend: false,
        showValue: true,
        valAxisLabelFormatCode: '$0.0,,"M"',
        valGridLine: { color: COLORS.line, size: 1 },
        catAxisLabelFontSize: 14,
        valAxisLabelFontSize: 11,
      },
    );
    slide.addText("Forecast position", {
      x: 8.75,
      y: 1.75,
      w: 3.1,
      h: 0.4,
      fontSize: 19,
      bold: true,
      color: COLORS.green,
      margin: 0,
    });
    slide.addText(
      `${formatPercent(input.forecast.portfolio.forecastMarginPercent)} forecast margin\n${formatMoney(input.forecast.portfolio.budgetVarianceCents, input.forecast.currencyCode)} budget variance\n${input.forecast.cash.confidence.toUpperCase()} cash-flow confidence`,
      {
        x: 8.75,
        y: 2.35,
        w: 3.4,
        h: 1.8,
        fontSize: 18,
        color: COLORS.ink,
        breakLine: false,
        margin: 0,
      },
    );
    slide.addText(
      `${input.forecast.readiness.projectsMissingFinancialData} projects lack complete financial data.`,
      {
        x: 8.75,
        y: 4.65,
        w: 3.4,
        h: 0.8,
        fontSize: 15,
        color: COLORS.muted,
        margin: 0,
      },
    );
  } else {
    slide.addText(
      "Financial values are excluded from this deck because the current role cannot view financial exposure.",
      {
        x: 0.75,
        y: 2.1,
        w: 8.6,
        h: 1.1,
        fontSize: 24,
        color: COLORS.ink,
        margin: 0,
      },
    );
    slide.addText("Risk, schedule, and commitment sections remain available.", {
      x: 0.75,
      y: 3.55,
      w: 7,
      h: 0.5,
      fontSize: 18,
      color: COLORS.muted,
      margin: 0,
    });
  }
  addSourceLink(
    slide,
    input,
    "/forecasts",
    "Open forecasting workspace",
    8.75,
    5.65,
    3.2,
  );
  addNotes(slide, [source(input, "/forecasts")]);
}

function addRisksSlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const slide = contentSlide(
    pptx,
    "Top risks link to source records",
    "Top risks and evidence",
    6,
  );
  const risks = input.reports.riskAnalytics.executiveRisks.slice(0, 5);
  risks.forEach((risk, index) => {
    const y = 1.5 + index * 0.98;
    slide.addText(String(index + 1), {
      x: 0.75,
      y,
      w: 0.42,
      h: 0.42,
      fontSize: 14,
      bold: true,
      color: COLORS.white,
      fill: {
        color:
          risk.severity === "critical" || risk.severity === "high"
            ? COLORS.red
            : COLORS.amber,
      },
      shape: pptx.ShapeType.ellipse,
      align: "center",
      valign: "middle",
      margin: 0,
    });
    slide.addText(risk.title, {
      x: 1.4,
      y,
      w: 7.1,
      h: 0.35,
      fontSize: 17,
      bold: true,
      color: COLORS.ink,
      margin: 0,
      hyperlink: { url: absoluteUrl(input, risk.href) },
    });
    slide.addText(
      `${humanize(risk.category)} · ${humanize(risk.severity)} · attention ${risk.attentionScore}`,
      {
        x: 1.4,
        y: y + 0.43,
        w: 5.7,
        h: 0.28,
        fontSize: 12,
        color: COLORS.muted,
        margin: 0,
      },
    );
    slide.addText(risk.reasons.slice(0, 2).join(" · "), {
      x: 7.7,
      y,
      w: 4.55,
      h: 0.65,
      fontSize: 13,
      color: COLORS.muted,
      margin: 0,
    });
  });
  addNotes(
    slide,
    risks.map((risk) => source(input, risk.href)),
  );
}

function addCommitmentsSlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const slide = contentSlide(
    pptx,
    "Leadership can unblock urgent commitments",
    "Actions, owners, and decisions",
    7,
  );
  const commitments = input.forecast.commitments.slice(0, 6);
  const rows = [
    ["Commitment", "Project", "Owner", "Due"],
    ...commitments.map((item) => [
      item.title,
      item.projectName ?? "Portfolio",
      item.ownerName ?? "Unassigned",
      formatDate(new Date(item.dueAt)),
    ]),
  ];
  slide.addTable(
    toTableRows(rows),
    tableOptions(0.75, 1.45, 7.7, [3.6, 1.7, 1.45, 1.2]),
  );
  slide.addText("Decisions required", {
    x: 8.9,
    y: 1.55,
    w: 3.5,
    h: 0.7,
    fontSize: 18,
    bold: true,
    color: COLORS.green,
    margin: 0,
  });
  const decisions = input.reports.riskAnalytics.executiveRisks.slice(0, 2);
  slide.addText(
    decisions.map((risk) => ({
      text: `Confirm response and accountable owner for ${risk.title}.\n`,
      options: { bullet: { indent: 16 }, breakLine: true },
    })),
    {
      x: 8.9,
      y: 2.4,
      w: 3.35,
      h: 2.65,
      fontSize: 16,
      color: COLORS.ink,
      margin: 0.02,
      breakLine: false,
    },
  );
  slide.addText("These are review prompts, not automated business decisions.", {
    x: 9.05,
    y: 5.35,
    w: 3.35,
    h: 0.7,
    fontSize: 12,
    italic: true,
    color: COLORS.muted,
    margin: 0,
  });
  addNotes(slide, [
    ...commitments.map((item) => source(input, item.href)),
    ...decisions.map((risk) => source(input, risk.href)),
  ]);
}

function addAppendixSlide(pptx: PptxGenJS, input: ExecutiveDeckInput) {
  const slide = contentSlide(
    pptx,
    "Project detail supports follow-through",
    "Appendix",
    8,
  );
  const rows = [
    [
      "Project",
      "Forecast margin",
      "Budget variance",
      "Schedule risks",
      "Data quality",
    ],
    ...input.forecast.projects
      .slice(0, 8)
      .map((project) => [
        project.name,
        input.forecast.canViewFinancials
          ? formatPercent(project.forecastMarginPercent)
          : "Restricted",
        input.forecast.canViewFinancials
          ? formatMoney(project.budgetVarianceCents, project.currencyCode)
          : "Restricted",
        String(project.scheduleRiskCount),
        humanize(project.quality),
      ]),
  ];
  slide.addTable(
    toTableRows(rows),
    tableOptions(0.75, 1.45, 11.8, [3.5, 2.1, 2.2, 1.7, 2.3]),
  );
  slide.addText(
    `Generated ${formatDate(input.generatedAt)} · Source records remain authoritative · Verify material decisions in Sightline`,
    {
      x: 0.75,
      y: 6.55,
      w: 11.8,
      h: 0.3,
      fontSize: 11,
      color: COLORS.muted,
      align: "center",
      margin: 0,
    },
  );
  addNotes(slide, [
    source(input, "/projects"),
    source(input, "/reports"),
    source(input, "/forecasts"),
  ]);
}

function contentSlide(
  pptx: PptxGenJS,
  title: string,
  eyebrow: string,
  page: number,
) {
  const slide = pptx.addSlide();
  slide.background = { color: COLORS.canvas };
  slide.addText(eyebrow.toUpperCase(), {
    x: 0.75,
    y: 0.45,
    w: 5,
    h: 0.25,
    fontSize: 11,
    bold: true,
    color: COLORS.green,
    charSpacing: 1.4,
    margin: 0,
  });
  slide.addText(title, {
    x: 0.75,
    y: 0.82,
    w: 11.7,
    h: 0.5,
    fontSize: 35,
    bold: true,
    color: COLORS.ink,
    margin: 0,
    breakLine: false,
  });
  slide.addText(String(page), {
    x: 12.05,
    y: 7.02,
    w: 0.5,
    h: 0.2,
    fontSize: 10,
    color: COLORS.muted,
    align: "right",
    margin: 0,
  });
  return slide;
}

function tableOptions(
  x: number,
  y: number,
  w: number,
  colW: number[],
): PptxGenJS.TableProps {
  return {
    x,
    y,
    w,
    colW,
    border: { type: "solid", color: COLORS.line, pt: 0.8 },
    fill: { color: COLORS.white },
    color: COLORS.ink,
    fontSize: 16,
    margin: 0.08,
    rowH: 0.62,
    bold: false,
    breakLine: false,
    valign: "middle",
    autoPage: false,
  };
}

function toTableRows(rows: string[][]): PptxGenJS.TableRow[] {
  return rows.map((row) => row.map((text) => ({ text })));
}

function addSourceLink(
  slide: PptxGenJS.Slide,
  input: ExecutiveDeckInput,
  path: string,
  label: string,
  x: number,
  y: number,
  w: number,
) {
  slide.addText(label, {
    x,
    y,
    w,
    h: 0.35,
    fontSize: 13,
    bold: true,
    color: COLORS.green,
    underline: { color: COLORS.green },
    hyperlink: { url: absoluteUrl(input, path) },
    margin: 0,
  });
}

function addNotes(slide: PptxGenJS.Slide, sources: string[]) {
  slide.addNotes(`[Sources]\n${sources.join("\n")}`);
}

function source(input: ExecutiveDeckInput, path: string) {
  return `- ${absoluteUrl(input, path)}`;
}

function absoluteUrl(input: ExecutiveDeckInput, path: string) {
  return new URL(path, input.baseUrl).toString();
}

function formatMoney(valueCents: number | null, currency: string | null) {
  if (valueCents === null) return "Not available";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency ?? "USD",
    maximumFractionDigits: 0,
    notation: Math.abs(valueCents) >= 1_000_000_00 ? "compact" : "standard",
  }).format(valueCents / 100);
}

function formatPercent(value: number | null) {
  return value === null ? "Not available" : `${value.toFixed(1)}%`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}
