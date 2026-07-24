import { NextResponse } from "next/server";

import { mutateAction } from "@/features/actions/mutate";
import { actionMutationSchema } from "@/features/actions/validation";

export async function POST(request: Request) {
  try {
    const input = actionMutationSchema.parse(await request.json());
    return NextResponse.json(await mutateAction(input));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The action could not be updated.",
      },
      { status: 400 },
    );
  }
}
