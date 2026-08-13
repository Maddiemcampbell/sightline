export type HelpPageContent = Readonly<{
  eyebrow: string;
  title: string;
  introduction: string;
  sections: readonly Readonly<{
    id?: string;
    title: string;
    body: string;
    items?: readonly string[];
  }>[];
}>;

export const helpPages = {
  documentation: {
    eyebrow: "Product guide",
    title: "Sightline documentation",
    introduction:
      "Use Sightline to identify portfolio risk, organize the response, and preserve the evidence behind each decision.",
    sections: [
      {
        title: "Start with the Daily Brief",
        body: "Review the highest-priority changes across the projects you can access, then open the supporting risk or action before making a decision.",
      },
      {
        title: "Work from evidence",
        body: "Risks connect project context, documents, activity, and recommended actions. Confirm the cited evidence and record resolution details when the risk is closed.",
      },
      {
        title: "Keep project access current",
        body: "Organization Owners and Administrators manage members. Project Owners and Managers can maintain project assignments within their authorized scope.",
      },
    ],
  },
  shortcuts: {
    eyebrow: "Reference",
    title: "Keyboard shortcuts",
    introduction:
      "The current shortcuts focus on fast navigation without interfering with form fields or assistive technology.",
    sections: [
      {
        title: "Global search",
        body: "Open search from anywhere in the workspace.",
        items: ["macOS: Command + K", "Windows and Linux: Control + K"],
      },
      {
        title: "Menus and dialogs",
        body: "Use standard keyboard navigation throughout Sightline.",
        items: [
          "Escape: close the active menu or dialog",
          "Up and Down arrows: move through open header menus",
          "Tab and Shift + Tab: move between interactive controls",
        ],
      },
      {
        id: "ask-sightline-commands",
        title: "Ask Sightline command palette",
        body: "Press / from the Ask Sightline page, or type / at the beginning of the composer, to open the command palette. Advisor commands route one question through a specific specialty. Workflow commands prepare a request for review; they do not silently create, send, or change records.",
        items: [
          "/auto: let Sightline choose the most relevant advisor",
          "/project: project execution, documentation, and follow-up",
          "/risk: risk severity, evidence, mitigation, and uncertainty",
          "/financial: authorized cost, exposure, margin, and variance",
          "/forecast: outlook, cash flow, confidence, and missing inputs",
          "/executive: portfolio summaries and leadership preparation",
          "/action: prepare a follow-up action for review",
          "/meeting: prepare a meeting agenda",
          "/deck: prepare an executive slide-deck request",
          "/report: prepare a permission-aware report request",
          "/email: draft an email without sending it",
          "/document: find supporting documents and evidence",
        ],
      },
      {
        title: "Command palette navigation",
        body: "The Ask Sightline palette supports standard keyboard controls and remains available by mouse or touch.",
        items: [
          "/: focus the Ask Sightline composer and open commands when you are not editing another field",
          "Up and Down arrows: move through matching commands",
          "Enter: select the highlighted command",
          "Escape: close the command palette",
        ],
      },
    ],
  },
  releases: {
    eyebrow: "Product updates",
    title: "Release notes",
    introduction:
      "Recent Sightline improvements are summarized here so teams can understand changes to their daily workflow.",
    sections: [
      {
        title: "Forecasting and data readiness",
        body: "Authorized financial users can review deterministic cash, margin, budget, and completion outlooks; explore bounded scenarios; and see which missing, stale, or estimated inputs weaken confidence.",
      },
      {
        title: "Executive reporting and meetings",
        body: "Teams can generate permission-aware PDF reports and editable executive PowerPoint decks, prepare meeting agendas, record decisions, and create accountable follow-up actions.",
      },
      {
        title: "Exceptions and commitment follow-up",
        body: "Configurable business exceptions focus notifications on thresholds that need attention. Sent email drafts can now track requested commitments, expected responses, evidence arrival, reminders, escalation, and verified closure.",
      },
      {
        title: "Clearer workspace navigation",
        body: "Home is now a distinct portfolio-overview destination. Desktop Watchlist and Settings controls live in the header, while mobile users retain them in the labeled navigation menu.",
      },
    ],
  },
  forecasting: {
    eyebrow: "Workflow guide",
    title: "Forecast with confidence",
    introduction:
      "Use deterministic outlooks and explicit data-quality signals to discuss what may happen next without presenting estimates as certainty.",
    sections: [
      {
        title: "Start with the baseline",
        body: "Open Forecasting to review the 30, 60, and 90-day cash outlook, forecast-at-completion trend, margin trajectory, risk exposure, and upcoming commitments across projects you are authorized to see.",
        items: [
          "Use the project selector to narrow the view.",
          "Check whether values are authoritative or estimated.",
          "Read the confidence explanation before sharing the outlook.",
        ],
      },
      {
        title: "Test a bounded scenario",
        body: "Scenario controls adjust one stated assumption at a time, such as a completion delay or rejected change order. They do not predict every downstream effect or silently change project records.",
        items: [
          "Compare the scenario with the unchanged baseline.",
          "Read the stated assumptions and exclusions.",
          "Treat the result as decision support, not an approved forecast revision.",
        ],
      },
      {
        title: "Improve data readiness",
        body: "Open the Data-readiness center when confidence is low. It identifies stale records, missing financial or schedule inputs, unmapped integration objects, and estimated values by project.",
        items: [
          "Resolve high-impact missing inputs first.",
          "Confirm the last successful synchronization.",
          "Revisit the forecast after authoritative data is available.",
        ],
      },
    ],
  },
  "reports-meetings": {
    eyebrow: "Workflow guide",
    title: "Prepare executive reviews and meetings",
    introduction:
      "Turn current portfolio evidence into a reviewable report or meeting agenda, then preserve the decisions and follow-up work created during the conversation.",
    sections: [
      {
        title: "Choose the right output",
        body: "Use Reports for a point-in-time PDF or an editable executive PowerPoint. Use Meetings when the goal is to organize a discussion, record decisions, and assign follow-up work.",
        items: [
          "PDF reports are suited to stable, permission-aware snapshots.",
          "PowerPoint decks support editable executive narratives, charts, and appendix detail.",
          "Meeting preparation connects agenda items to live Sightline records.",
        ],
      },
      {
        title: "Review before sharing",
        body: "Charts and tables are deterministic; generated narrative remains a draft. Confirm dates, scope, financial visibility, cited risks, and stated data limitations before downloading or presenting.",
      },
      {
        title: "Close the meeting loop",
        body: "Record decisions while context is fresh, create follow-up actions with owners and due dates, and preserve the meeting record so later activity explains why the work changed.",
      },
    ],
  },
  "follow-ups-alerts": {
    eyebrow: "Workflow guide",
    title: "Close the loop on commitments",
    introduction:
      "Track the external response requested by an email, focus notifications on genuine exceptions, and require evidence before work is marked complete.",
    sections: [
      {
        title: "Track the request when sending",
        body: "After reviewing an email draft, select Track the requested commitment, confirm what is expected, and set the response date before marking the email as sent manually.",
        items: [
          "The current user becomes the accountable follow-up owner.",
          "The open commitment appears at the top of Actions.",
          "Sightline never sends the email automatically.",
        ],
      },
      {
        title: "Respond to silence",
        body: "When the response date passes, scheduled automation creates an owner reminder. Open the follow-up to review its status and draft a human-controlled escalation when appropriate.",
      },
      {
        title: "Verify what arrived",
        body: "New evidence added after the email was sent is highlighted as a possible response. Select the correct source, record the response, and verify it before resolving the follow-up.",
        items: [
          "Possible matches are suggestions, not conclusions.",
          "Verification is a separate, explicit human step.",
          "A linked action is completed only when it is already accepted or in progress.",
        ],
      },
      {
        title: "Tune exception alerts",
        body: "Owners and administrators can configure thresholds for margin, budget variance, unowned high-severity risks, due actions, expiring documents, stale synchronization, and stale forecast inputs. Use exceptions for conditions requiring action—not general updates.",
      },
    ],
  },
  about: {
    eyebrow: "About Sightline",
    title: "Profit intelligence for construction",
    introduction:
      "Sightline helps commercial construction teams find the project risks most likely to affect portfolio profit and coordinate an evidence-backed response.",
    sections: [
      {
        title: "A portfolio view with project context",
        body: "Leaders can review patterns across authorized projects while project teams retain the detailed context needed to act.",
      },
      {
        title: "Permission-aware by design",
        body: "Organization and project roles determine which projects, financial metrics, documents, and administrative controls each member can access.",
      },
      {
        title: "Need assistance?",
        body: "Use Report a problem in the Help menu for a privacy-safe issue report, or email support@sightline.app for product support.",
      },
    ],
  },
} as const satisfies Record<string, HelpPageContent>;

export type HelpPageSlug = keyof typeof helpPages;

export function isHelpPageSlug(value: string): value is HelpPageSlug {
  return Object.hasOwn(helpPages, value);
}
