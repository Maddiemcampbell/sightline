"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

export function MobileNavigationMenu({
  currentLabel,
  title,
  description,
  tone,
  children,
  footer,
}: {
  currentLabel: string;
  title: string;
  description: string;
  tone: "client" | "admin";
  children: ReactNode;
  footer?: ReactNode;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dialogRef.current?.open) dialogRef.current.close();
  }, [pathname]);

  function openMenu() {
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  function closeAfterNavigation(event: MouseEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest("a")) closeMenu();
  }

  const clientTone = tone === "client";

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 border-y px-4 py-3 lg:hidden ${
          clientTone
            ? "border-white/10 bg-[#0b3328] text-white"
            : "border-deep-green/15 text-deep-green bg-[#D4E87D]"
        }`}
      >
        <div className="min-w-0">
          <p
            className={`text-[0.65rem] font-semibold tracking-[0.1em] uppercase ${
              clientTone ? "text-white/55" : "text-deep-green/65"
            }`}
          >
            Current page
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold">
            {currentLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={openMenu}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 text-sm font-semibold ${
            clientTone
              ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
              : "border-deep-green/25 text-deep-green bg-white/30 hover:bg-white/45"
          }`}
        >
          <Menu className="size-4" aria-hidden="true" />
          Menu
        </button>
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeMenu();
        }}
        className={`fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(22rem,88vw)] max-w-none p-0 shadow-2xl backdrop:bg-black/50 ${
          clientTone
            ? "bg-[#0b3328] text-white"
            : "text-deep-green bg-[#D4E87D]"
        }`}
      >
        <div
          className="flex h-full flex-col"
          onClickCapture={closeAfterNavigation}
        >
          <header
            className={`flex items-start justify-between gap-4 border-b px-5 py-5 ${
              clientTone ? "border-white/10" : "border-deep-green/15"
            }`}
          >
            <div>
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              <p
                id={descriptionId}
                className={`mt-1 text-xs leading-5 ${
                  clientTone ? "text-white/60" : "text-deep-green/70"
                }`}
              >
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              aria-label="Close navigation menu"
              className={`grid size-11 shrink-0 place-items-center rounded-md ${
                clientTone ? "hover:bg-white/10" : "hover:bg-white/35"
              }`}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
            {children}
          </div>
          {footer ? (
            <footer
              className={`border-t p-4 ${
                clientTone ? "border-white/10" : "border-deep-green/15"
              }`}
            >
              {footer}
            </footer>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
