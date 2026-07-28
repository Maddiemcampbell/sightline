"use client";

import {
  BookOpen,
  CircleHelp,
  Headphones,
  Info,
  Keyboard,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useHeaderDropdown } from "@/components/header-dropdown-context";
import { BugReportDialog } from "@/components/bug-report-dialog";

export const helpMenuItems = [
  {
    label: "Documentation",
    detail: "Learn how Sightline workflows fit together.",
    href: "/help/documentation",
    icon: BookOpen,
    placeholder: true,
  },
  {
    label: "Keyboard Shortcuts",
    detail: "Search Sightline with Cmd/Ctrl + K.",
    href: "/help/shortcuts",
    icon: Keyboard,
    placeholder: true,
  },
  {
    label: "Contact Support",
    detail: "Send a privacy-safe support request.",
    href: "mailto:support@sightline.app?subject=Sightline%20support%20request",
    icon: Headphones,
    placeholder: false,
  },
  {
    label: "Release Notes",
    detail: "See recent product improvements.",
    href: "/help/releases",
    icon: ScrollText,
    placeholder: true,
  },
  {
    label: "About Sightline",
    detail: "Profit intelligence for construction.",
    href: "/help/about",
    icon: Info,
    placeholder: true,
  },
] as const;

export function HelpSupportMenu() {
  const [reportOpen, setReportOpen] = useState(false);
  const { rootRef, open, close, toggle } = useHeaderDropdown("help");
  const firstItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeys);
    requestAnimationFrame(() => firstItemRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", handleKeys);
    };
  }, [close, open, rootRef]);

  function navigateMenu(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const menuItems = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'),
    );
    const currentIndex = menuItems.indexOf(
      document.activeElement as HTMLElement,
    );
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const nextIndex =
      (currentIndex + direction + menuItems.length) % menuItems.length;
    menuItems[nextIndex]?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="text-muted hover:bg-background hover:text-ink grid size-10 place-items-center rounded-md transition-colors"
        aria-label="Help and support"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <CircleHelp aria-hidden="true" className="size-5" />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Help and support"
          onKeyDown={navigateMenu}
          className="border-border bg-surface shadow-surface absolute top-12 right-0 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-lg border p-2 shadow-xl"
        >
          <p className="px-3 py-2 text-sm font-semibold">Help &amp; Support</p>
          <button
            ref={firstItemRef}
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              setReportOpen(true);
            }}
            className="hover:bg-background flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left"
          >
            <Headphones
              className="text-deep-green mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              <span className="block text-sm font-semibold">Report a problem</span>
              <span className="text-muted mt-0.5 block text-xs">
                Send a privacy-safe report to the Sightline team.
              </span>
            </span>
          </button>
          {helpMenuItems.map(
            ({ label, detail, href, icon: Icon, placeholder }) => (
              <Link
                key={label}
                role="menuitem"
                href={href}
                onClick={close}
                className="hover:bg-background flex items-start gap-3 rounded-md px-3 py-2.5"
              >
                <Icon
                  className="text-deep-green mt-0.5 size-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  <span className="block text-sm font-semibold">
                    {label}
                    {placeholder && (
                      <span className="text-muted ml-2 text-[0.6rem] font-medium uppercase">
                        Coming soon
                      </span>
                    )}
                  </span>
                  <span className="text-muted mt-0.5 block text-xs">
                    {detail}
                  </span>
                </span>
              </Link>
            ),
          )}
          <Link
            href="/settings/privacy"
            role="menuitem"
            onClick={close}
            className="text-deep-green border-border mt-1 block border-t px-3 pt-3 pb-2 text-xs font-semibold"
          >
            Privacy &amp; Trust Center
          </Link>
        </div>
      )}
      <BugReportDialog open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
