import "server-only";

import type { ReleaseRepository } from "./repository";
import type { CreateReleaseInput, UpdateReleaseInput } from "./validation";
import type { ReleaseStatus } from "./types";

// This explicit boundary is suitable for a future authenticated CI adapter.
// It records verified metadata only and never initiates a deployment.
export class ReleaseTrackingService {
  constructor(
    private readonly repository: Pick<
      ReleaseRepository,
      "create" | "update" | "list" | "get"
    >,
  ) {}

  create(input: CreateReleaseInput, operatorId: string) {
    return this.repository.create(input, operatorId);
  }
  update(id: string, input: UpdateReleaseInput, operatorId: string) {
    return this.repository.update(id, input, operatorId);
  }
  list(input: {
    environment: string;
    status: "all" | ReleaseStatus;
    order: "asc" | "desc";
  }) {
    return this.repository.list(input);
  }
  get(id: string) {
    return this.repository.get(id);
  }
}
