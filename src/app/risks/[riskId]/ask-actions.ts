"use server";

import {
  askRiskQuestionSchema,
  feedbackSchema,
} from "@/domain/ai/risk-question";
import { AskSightlineService } from "@/features/ask-sightline/service";
import { runServerMutation } from "@/lib/server-mutation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { assertAuthorized, canUseAi } from "@/lib/auth/authorization";

export async function askSightlineAction(input: unknown) {
  const parsed = askRiskQuestionSchema.parse(input);
  const answer = await runServerMutation(
    askRiskQuestionSchema,
    parsed,
    async (context, value) => {
      assertAuthorized(canUseAi(context));
      return new AskSightlineService(await createServerSupabaseClient()).ask(
        context,
        value.riskId,
        value.question,
      );
    },
  );
  return answer;
}

export async function rateSightlineAnswerAction(input: unknown) {
  const parsed = feedbackSchema.parse(input);
  await runServerMutation(feedbackSchema, parsed, async (context, value) => {
    assertAuthorized(canUseAi(context));
    return new AskSightlineService(await createServerSupabaseClient()).feedback(
      context,
      value.messageId,
      value.rating,
    );
  });
  return { rating: parsed.rating };
}
