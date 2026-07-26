import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null);

export const firstProjectSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters.")
      .max(200),
    projectNumber: z.string().trim().min(1, "Enter a project number.").max(80),
    addressLine1: optionalText(240),
    city: optionalText(120),
    stateCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (value) => value === "" || /^[A-Z]{2}$/.test(value),
        "Use a two-letter state code.",
      )
      .transform((value) => value || null),
    postalCode: optionalText(20),
    startDate: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Enter a valid start date.",
      )
      .transform((value) => value || null),
    targetCompletionDate: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
        "Enter a valid completion date.",
      )
      .transform((value) => value || null),
  })
  .refine(
    (value) =>
      !value.startDate ||
      !value.targetCompletionDate ||
      value.targetCompletionDate >= value.startDate,
    {
      path: ["targetCompletionDate"],
      message: "Completion date must be on or after the start date.",
    },
  );

export type FirstProjectInput = z.infer<typeof firstProjectSchema>;
