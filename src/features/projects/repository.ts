import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { FirstProjectInput } from "@/features/projects/validation";
import type { AppDatabase } from "@/lib/supabase/app-database.types";

export interface ProjectWriter {
  create(
    input: FirstProjectInput & {
      organizationId: string;
      updatedByUserId: string;
    },
  ): Promise<string>;
}

export class ProjectRepository implements ProjectWriter {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async create(
    input: FirstProjectInput & {
      organizationId: string;
      updatedByUserId: string;
    },
  ): Promise<string> {
    const { data, error } = await this.client
      .from("projects")
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        project_number: input.projectNumber,
        status: "active",
        address_line_1: input.addressLine1,
        city: input.city,
        state_code: input.stateCode,
        postal_code: input.postalCode,
        start_date: input.startDate,
        target_completion_date: input.targetCompletionDate,
        projected_margin_cents: 0,
        updated_by_user_id: input.updatedByUserId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id;
  }
}
