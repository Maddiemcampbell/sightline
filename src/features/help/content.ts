export type HelpPageContent = Readonly<{
  eyebrow: string;
  title: string;
  introduction: string;
  sections: readonly Readonly<{
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
    ],
  },
  releases: {
    eyebrow: "Product updates",
    title: "Release notes",
    introduction:
      "Recent Sightline improvements are summarized here so teams can understand changes to their daily workflow.",
    sections: [
      {
        title: "Launch plans and billing",
        body: "Essential and Professional plan limits are enforced consistently, with Stripe Checkout and verified webhook processing available for customer activation.",
      },
      {
        title: "Role-aware workspaces",
        body: "Restricted financial and organization-management sections are omitted when a member does not have permission to use them.",
      },
      {
        title: "Operational reliability",
        body: "Authentication health checks, document-upload validation, platform job monitoring, and customer data-export workflows have expanded automated coverage.",
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
