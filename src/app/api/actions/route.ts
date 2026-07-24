import { NextResponse } from "next/server";

import { mutateAction } from "@/features/actions/mutate";
import { actionMutationSchema } from "@/features/actions/validation";
import { rejectCrossSiteMutation } from "@/lib/security/request";
import { AuthorizationError } from "@/lib/auth/authorization";
import { ZodError } from "zod";

export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  try {
    const input = actionMutationSchema.parse(await request.json());
    return NextResponse.json(await mutateAction(input));
  } catch (error) {
    const status =
      error instanceof AuthorizationError
        ? 404
        : error instanceof ZodError
          ? 400
          : 500;
    return NextResponse.json(
      { error: "The action could not be updated." },
      { status },
    );
  }
}
