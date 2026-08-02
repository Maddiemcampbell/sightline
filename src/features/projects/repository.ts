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
  setArchived(input: {
    organizationId: string;
    projectId: string;
    updatedByUserId: string;
    archived: boolean;
  }): Promise<void>;
}

export class ProjectRepository implements ProjectWriter {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async create(
    input: FirstProjectInput & {
      organizationId: string;
      updatedByUserId: string;
    },
  ): Promise<string> {
    const { data, error } = await this.client.rpc("create_entitled_project", {
      target_organization_id: input.organizationId,
      principal_application_user_id: input.updatedByUserId,
      project_name: input.name,
      project_number_value: input.projectNumber,
      project_address_line_1: input.addressLine1 || null,
      project_city: input.city || null,
      project_state_code: input.stateCode || null,
      project_postal_code: input.postalCode || null,
      project_start_date: input.startDate || null,
      project_target_completion_date: input.targetCompletionDate || null,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  async setArchived(input: {
    organizationId: string;
    projectId: string;
    updatedByUserId: string;
    archived: boolean;
  }): Promise<void> {
    const { error } = await this.client.rpc("set_project_archived", {
      target_organization_id: input.organizationId,
      target_project_id: input.projectId,
      principal_application_user_id: input.updatedByUserId,
      should_archive: input.archived,
    });
    if (error) throw new Error(error.message);
  }
}
