import { describe, expect, it } from "vitest";

import {
  askCommands,
  matchingAskCommands,
  resolveAskCommand,
} from "@/features/ask-sightline/commands";

describe("Ask Sightline commands", () => {
  it("exposes unique documented commands", () => {
    expect(new Set(askCommands.map((command) => command.token)).size).toBe(
      askCommands.length,
    );
    expect(askCommands.map((command) => command.token)).toEqual(
      expect.arrayContaining(["/auto", "/forecast", "/meeting", "/deck"]),
    );
  });

  it("filters commands while the slash token is being typed", () => {
    expect(
      matchingAskCommands("/fore").map((command) => command.token),
    ).toEqual(["/forecast"]);
    expect(matchingAskCommands("regular question")).toEqual([]);
  });

  it("routes advisor commands and expands workflow commands", () => {
    expect(resolveAskCommand("/forecast next 90 days")).toEqual({
      question: "next 90 days",
      advisorMode: "forecast",
    });
    expect(resolveAskCommand("/meeting Cedar Grove")).toEqual({
      question: "Prepare a meeting for Cedar Grove",
      advisorMode: "executive",
    });
    expect(resolveAskCommand("What changed?")).toEqual({
      question: "What changed?",
      advisorMode: null,
    });
  });
});
