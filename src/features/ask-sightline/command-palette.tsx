"use client";

import { CornerDownLeft } from "lucide-react";

import type { AskCommand } from "@/features/ask-sightline/commands";

export function AskCommandPalette({
  commands,
  activeIndex,
  onSelect,
}: {
  commands: readonly AskCommand[];
  activeIndex: number;
  onSelect: (command: AskCommand) => void;
}) {
  if (!commands.length) return null;
  return (
    <div
      id="ask-command-palette"
      role="listbox"
      aria-label="Ask Sightline commands"
      className="border-border bg-surface absolute right-0 bottom-[calc(100%+0.5rem)] left-0 z-20 max-h-80 overflow-y-auto rounded-xl border p-2 shadow-xl"
    >
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-muted text-[0.68rem] font-semibold tracking-wide uppercase">
          Commands
        </p>
        <p className="text-muted flex items-center gap-1 text-[0.65rem]">
          Select <CornerDownLeft className="size-3" aria-hidden="true" />
        </p>
      </div>
      {commands.map((command, index) => (
        <button
          key={command.token}
          id={`ask-command-${index}`}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(command)}
          className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left ${
            index === activeIndex ? "bg-soft-green" : "hover:bg-background"
          }`}
        >
          <code className="text-deep-green min-w-20 text-xs font-semibold">
            {command.token}
          </code>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">{command.label}</span>
            <span className="text-muted mt-0.5 block text-xs leading-4">
              {command.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
