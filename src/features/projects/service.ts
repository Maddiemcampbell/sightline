import {
  assertAuthorized,
  canCreateProject,
  type ActorContext,
} from "@/lib/auth/authorization";
import type { ProjectWriter } from "@/features/projects/repository";
import {
  firstProjectSchema,
  type FirstProjectInput,
} from "@/features/projects/validation";

export class ProjectService {
  constructor(private readonly repository: ProjectWriter) {}

  async create(context: ActorContext, input: unknown): Promise<string> {
    assertAuthorized(
      canCreateProject(context, { organization_id: context.organizationId }),
    );
    const value: FirstProjectInput = firstProjectSchema.parse(input);
    return this.repository.create({
      ...value,
      organizationId: context.organizationId,
      updatedByUserId: context.userId,
    });
  }
}
