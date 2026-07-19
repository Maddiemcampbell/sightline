import type { DailyBriefView } from "@/features/daily-brief/types";

export type MorningBriefEmail = {
  subject: string;
  html: string;
  text: string;
};

export function renderMorningBriefEmail(input: {
  organizationName: string;
  recipientName: string;
  brief: DailyBriefView;
  appUrl: string;
}): MorningBriefEmail {
  const date = formatDate(input.brief.briefDate);
  const briefUrl = absoluteUrl(input.appUrl, "/brief");
  const subject = `${input.organizationName} Daily Brief — ${date}`;
  const risksHtml = input.brief.risks
    .slice(0, 3)
    .map((risk) => {
      const riskUrl = absoluteUrl(input.appUrl, `/risks/${risk.id}`);
      return `<tr><td style="padding:0 0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e7e9e3;border-radius:12px;background:#ffffff"><tr><td style="padding:22px"><div style="font-size:12px;font-weight:700;color:#667085;text-transform:uppercase;letter-spacing:.06em">Priority ${risk.priority} · ${escapeHtml(risk.severity)}</div><h2 style="margin:8px 0 4px;font-size:20px;line-height:1.3;color:#13212a">${escapeHtml(risk.title)}</h2><p style="margin:0 0 18px;color:#667085;font-size:14px">${escapeHtml(risk.projectName)}</p><p style="margin:0 0 4px;color:#667085;font-size:12px;font-weight:700;text-transform:uppercase">Potential exposure</p><p style="margin:0 0 18px;color:#173f32;font-size:24px;font-weight:700">${formatMoney(risk.exposureCents)}</p><p style="margin:0 0 6px;color:#13212a;font-size:13px;font-weight:700">Why it matters</p><p style="margin:0 0 18px;color:#3f4d56;font-size:15px;line-height:1.6">${escapeHtml(risk.whyItMatters)}</p><div style="background:#f2f7df;border-radius:8px;padding:14px"><p style="margin:0 0 5px;color:#173f32;font-size:13px;font-weight:700">Recommended next action</p><p style="margin:0;color:#13212a;font-size:14px;line-height:1.55">${escapeHtml(risk.recommendedAction)}</p></div><p style="margin:18px 0 0"><a href="${riskUrl}" style="color:#173f32;font-size:14px;font-weight:700;text-decoration:underline">Open risk details →</a></p></td></tr></table></td></tr>`;
    })
    .join("");
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>@media(max-width:600px){.shell{width:100%!important}.pad{padding:20px!important}.title{font-size:27px!important}}</style></head><body style="margin:0;background:#fafaf7;font-family:Arial,sans-serif;color:#13212a"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" class="pad" style="padding:36px 18px"><table role="presentation" class="shell" width="600" cellpadding="0" cellspacing="0"><tr><td style="padding:0 0 24px"><div style="font-size:14px;font-weight:700;color:#173f32">SIGHTLINE · ${escapeHtml(input.organizationName)}</div><p style="margin:18px 0 6px;color:#667085;font-size:14px">${date}</p><h1 class="title" style="margin:0;font-size:34px;line-height:1.2;color:#13212a">Good morning, ${escapeHtml(firstName(input.recipientName))}.</h1><p style="margin:12px 0 0;color:#667085;font-size:17px;line-height:1.6">Here are the three things most likely to cost you money this week.</p></td></tr>${risksHtml}<tr><td align="center" style="padding:8px 0 24px"><a href="${briefUrl}" style="display:inline-block;background:#173f32;color:#ffffff;text-decoration:none;padding:13px 20px;border-radius:7px;font-size:15px;font-weight:700">Open the full Daily Brief</a></td></tr><tr><td style="border-top:1px solid #e7e9e3;padding-top:18px;color:#667085;font-size:12px;line-height:1.5">You receive this email because Daily Brief delivery is enabled in Sightline settings.</td></tr></table></td></tr></table></body></html>`;
  const textRisks = input.brief.risks
    .slice(0, 3)
    .map(
      (risk) =>
        `${risk.priority}. ${risk.title}\nProject: ${risk.projectName}\nPotential exposure: ${formatMoney(risk.exposureCents)}\nWhy it matters: ${risk.whyItMatters}\nRecommended next action: ${risk.recommendedAction}\nOpen risk: ${absoluteUrl(input.appUrl, `/risks/${risk.id}`)}`,
    )
    .join("\n\n");
  const text = `${input.organizationName}\n${date}\n\nGood morning, ${firstName(input.recipientName)}.\n\nHere are the three things most likely to cost you money this week.\n\n${textRisks}\n\nOpen the full Daily Brief: ${briefUrl}`;
  return { subject, html, text };
}

function absoluteUrl(base: string, path: string): string {
  return new URL(path, base).toString();
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
