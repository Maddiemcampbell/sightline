import type { Metadata } from "next";

import { AskSightlineWorkspace } from "@/features/ask-sightline/ask-workspace";

export const metadata: Metadata = { title: "Ask Sightline" };

export default function AskSightlinePage() {
  return <AskSightlineWorkspace />;
}
