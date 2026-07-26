"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  login,
  requestPasswordReset,
  signup,
  updatePassword,
  type AuthActionState,
} from "@/app/auth/actions";
import { PrimaryButton } from "@/components/ui/button";

type AuthFormProps =
  | Readonly<{ mode: "login"; next?: string }>
  | Readonly<{ mode: "signup"; next?: string }>
  | Readonly<{ mode: "forgot-password" | "reset-password" }>;

const initialState: AuthActionState = {};

function FieldError({
  errors,
}: Readonly<{ errors: readonly string[] | undefined }>) {
  if (!errors?.length) return null;
  return (
    <p className="text-danger mt-1.5 text-sm" role="alert">
      {errors[0]}
    </p>
  );
}

export function AuthForm(props: AuthFormProps) {
  const action =
    props.mode === "login"
      ? login
      : props.mode === "signup"
        ? signup
        : props.mode === "forgot-password"
          ? requestPasswordReset
          : updatePassword;
  const [state, formAction, pending] = useActionState(action, initialState);
  const asksForEmail = props.mode !== "reset-password";
  const asksForPassword =
    props.mode === "login" ||
    props.mode === "signup" ||
    props.mode === "reset-password";
  const asksForConfirmation =
    props.mode === "signup" || props.mode === "reset-password";
  const submitLabel =
    props.mode === "login"
      ? "Log in"
      : props.mode === "signup"
        ? "Create account"
        : props.mode === "forgot-password"
          ? "Send reset link"
          : "Update password";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {props.mode === "login" || props.mode === "signup" ? (
        <input type="hidden" name="next" value={props.next ?? "/"} />
      ) : null}
      {asksForEmail ? (
        <div>
          <label htmlFor="email" className="text-ink text-sm font-semibold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
            className="border-border bg-surface text-ink mt-2 min-h-11 w-full rounded-md border px-3 text-sm"
          />
          <FieldError errors={state.fieldErrors?.email} />
        </div>
      ) : null}
      {asksForPassword ? (
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-ink text-sm font-semibold"
            >
              {props.mode === "reset-password" ? "New password" : "Password"}
            </label>
            {props.mode === "login" ? (
              <Link
                href="/forgot-password"
                className="text-deep-green text-sm font-semibold underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            ) : null}
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              props.mode === "login" ? "current-password" : "new-password"
            }
            minLength={props.mode === "login" ? undefined : 12}
            required
            aria-invalid={Boolean(state.fieldErrors?.password)}
            className="border-border bg-surface text-ink mt-2 min-h-11 w-full rounded-md border px-3 text-sm"
          />
          <FieldError errors={state.fieldErrors?.password} />
        </div>
      ) : null}
      {asksForConfirmation ? (
        <div>
          <label
            htmlFor="confirmPassword"
            className="text-ink text-sm font-semibold"
          >
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            aria-invalid={Boolean(state.fieldErrors?.confirmPassword)}
            className="border-border bg-surface text-ink mt-2 min-h-11 w-full rounded-md border px-3 text-sm"
          />
          <FieldError errors={state.fieldErrors?.confirmPassword} />
        </div>
      ) : null}
      {state.message ? (
        <p
          className={
            props.mode === "forgot-password"
              ? "bg-soft-green text-deep-green rounded-md p-3 text-sm"
              : "bg-soft-red text-danger rounded-md p-3 text-sm"
          }
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <PrimaryButton type="submit" disabled={pending} className="w-full">
        {pending ? "Please wait…" : submitLabel}
      </PrimaryButton>
    </form>
  );
}
