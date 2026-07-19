import { actionFiltersSchema } from "@/features/actions/validation";
import type { z } from "zod";

export type ActionFilters = z.output<typeof actionFiltersSchema>;
