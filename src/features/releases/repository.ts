import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppDatabase } from "@/lib/supabase/app-database.types";
import type { Release, ReleaseStatus } from "./types";
import type { CreateReleaseInput, UpdateReleaseInput } from "./validation";

export class ReleaseRepository {
  constructor(private readonly client: SupabaseClient<AppDatabase>) {}

  async create(
    input: CreateReleaseInput,
    operatorId: string,
  ): Promise<Release> {
    const { data, error } = await this.client
      .from("releases")
      .insert({
        release_identifier: input.identifier,
        application_version: input.applicationVersion,
        environment: input.environment,
        status: input.status,
        deployed_at: input.deployedAt,
        commit_sha: input.commitSha,
        source_reference: input.sourceReference,
        deployed_by: input.deployedBy,
        release_notes: input.releaseNotes,
        rollback_status:
          input.status === "rolled_back" ? "rolled_back" : "not_rolled_back",
        created_by_operator_id: operatorId,
        updated_by_operator_id: operatorId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    if (input.featureFlagIds.length) {
      const linked = await this.client.from("release_feature_flags").insert(
        input.featureFlagIds.map((featureFlagId) => ({
          release_id: data.id,
          feature_flag_id: featureFlagId,
        })),
      );
      if (linked.error) throw new Error(linked.error.message);
    }
    return (await this.get(data.id))!;
  }

  async update(
    id: string,
    input: UpdateReleaseInput,
    operatorId: string,
  ): Promise<Release> {
    const { error } = await this.client
      .from("releases")
      .update({
        status: input.status,
        release_notes: input.releaseNotes,
        rollback_status:
          input.status === "rolled_back" ? "rolled_back" : input.rollbackStatus,
        updated_by_operator_id: operatorId,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    const release = await this.get(id);
    if (!release) throw new Error("Release not found.");
    return release;
  }

  async list(input: {
    environment: string;
    status: "all" | ReleaseStatus;
    order: "asc" | "desc";
  }): Promise<Release[]> {
    let request = this.client.from("releases").select("*");
    if (input.environment !== "all")
      request = request.eq("environment", input.environment);
    if (input.status !== "all") request = request.eq("status", input.status);
    const { data, error } = await request
      .order("deployed_at", {
        ascending: input.order === "asc",
        nullsFirst: false,
      })
      .order("created_at", { ascending: input.order === "asc" })
      .limit(200);
    if (error) throw new Error(error.message);
    return this.withFlags(data ?? []);
  }

  async get(id: string): Promise<Release | null> {
    const { data, error } = await this.client
      .from("releases")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? (await this.withFlags([data]))[0]! : null;
  }

  private async withFlags(
    rows: AppDatabase["public"]["Tables"]["releases"]["Row"][],
  ): Promise<Release[]> {
    if (!rows.length) return [];
    const { data, error } = await this.client
      .from("release_feature_flags")
      .select("release_id,feature_flag_id")
      .in(
        "release_id",
        rows.map((row) => row.id),
      );
    if (error) throw new Error(error.message);
    const featureFlagIds = [
      ...new Set((data ?? []).map((link) => link.feature_flag_id)),
    ];
    const flagResult = featureFlagIds.length
      ? await this.client
          .from("feature_flags")
          .select("id,flag_key,name")
          .in("id", featureFlagIds)
      : { data: [], error: null };
    if (flagResult.error) throw new Error(flagResult.error.message);
    const flagsById = new Map(
      (flagResult.data ?? []).map((flag) => [flag.id, flag]),
    );
    const flags = new Map<string, Release["linkedFlags"]>();
    for (const link of data ?? []) {
      const flag = flagsById.get(link.feature_flag_id);
      if (!flag) continue;
      flags.set(link.release_id, [
        ...(flags.get(link.release_id) ?? []),
        { id: flag.id, key: flag.flag_key, name: flag.name },
      ]);
    }
    return rows.map((row) => ({
      id: row.id,
      identifier: row.release_identifier,
      applicationVersion: row.application_version,
      environment: row.environment,
      status: row.status,
      deployedAt: row.deployed_at,
      commitSha: row.commit_sha,
      sourceReference: row.source_reference,
      deployedBy: row.deployed_by,
      releaseNotes: row.release_notes,
      rollbackStatus: row.rollback_status,
      linkedFlags: flags.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
