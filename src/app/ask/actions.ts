"use server";

import { askOrganizationQuestionSchema } from "@/domain/ai/organization-question";
import { AskSightlineService } from "@/features/ask-sightline/service";
import { assertAuthorized, canUseAi } from "@/lib/auth/authorization";
import { requireProjectAccess } from "@/lib/auth/project-access";
import { runServerMutation } from "@/lib/server-mutation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function askOrganizationSightlineAction(input: unknown) {
  const parsed = askOrganizationQuestionSchema.parse(input);
  return runServerMutation(
    askOrganizationQuestionSchema,
    parsed,
    async (context, value) => {
      assertAuthorized(canUseAi(context));
      if (value.projectId !== "all")
        await requireProjectAccess(context, value.projectId);
      return new AskSightlineService(
        await createServerSupabaseClient(),
      ).askOrganization(context, {
        question: value.question,
        advisorMode: value.advisorMode,
        projectId: value.projectId === "all" ? null : value.projectId,
        history: value.history,
      });
    },
  );
}
