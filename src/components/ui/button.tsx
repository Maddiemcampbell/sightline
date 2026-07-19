import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      intent: {
        primary:
          "bg-deep-green text-white hover:bg-ink focus-visible:outline-accent-strong",
        secondary:
          "border border-border bg-surface text-ink hover:bg-background focus-visible:outline-accent-strong",
      },
    },
    defaultVariants: {
      intent: "primary",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  intent,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ intent }), className)}
      {...props}
    />
  );
}

export function PrimaryButton(props: Omit<ButtonProps, "intent">) {
  return <Button intent="primary" {...props} />;
}

export function SecondaryButton(props: Omit<ButtonProps, "intent">) {
  return <Button intent="secondary" {...props} />;
}
