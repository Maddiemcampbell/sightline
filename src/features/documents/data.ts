import "server-only";

import { assertOrganizationAccess } from "@/features/documents/authorization";
import { requireActorContext } from "@/lib/auth/request-context";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function requireRows<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Expected database data");
  return data;
}

export async function getDocumentWorkspace(search: string) {
  const { organizationId } = await requireActorContext();
  const client = createAdminSupabaseClient();
  const [documentsResult, projectsResult, vendorsResult] = await Promise.all([
    client
      .from("documents")
      .select("*")
      .eq("organization_id", organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    client
      .from("projects")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    client
      .from("vendors")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
  ]);
  const projects = requireRows(projectsResult.data, projectsResult.error);
  const vendors = requireRows(vendorsResult.data, vendorsResult.error);
  const projectById = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));
  const query = search.toLowerCase();
  const documents = requireRows(documentsResult.data, documentsResult.error)
    .map((document) => ({
      ...document,
      projectName: document.project_id
        ? (projectById.get(document.project_id) ?? "Unknown project")
        : null,
      vendorName: document.vendor_id
        ? (vendorById.get(document.vendor_id) ?? "Unknown vendor")
        : null,
    }))
    .filter((document) =>
      query
        ? `${document.name} ${document.original_filename ?? ""} ${document.projectName ?? ""} ${document.vendorName ?? ""}`
            .toLowerCase()
            .includes(query)
        : true,
    );
  return { documents, projects, vendors };
}

export async function getDocumentDetail(documentId: string) {
  const { organizationId } = await requireActorContext();
  const client = createAdminSupabaseClient();
  const { data: document, error } = await client
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!document) return null;
  assertOrganizationAccess(document, organizationId);
  const [projectsResult, vendorsResult, activitiesResult] = await Promise.all([
    client
      .from("projects")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    client
      .from("vendors")
      .select("id,name")
      .eq("organization_id", organizationId)
      .order("name"),
    client
      .from("document_activities")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("document_id", documentId)
      .order("occurred_at", { ascending: false }),
  ]);
  return {
    document,
    projects: requireRows(projectsResult.data, projectsResult.error),
    vendors: requireRows(vendorsResult.data, vendorsResult.error),
    activities: requireRows(activitiesResult.data, activitiesResult.error),
  };
}

export async function validateDocumentAssociations(
  projectId: string | null,
  vendorId: string | null,
) {
  const { organizationId } = await requireActorContext();
  const client = createAdminSupabaseClient();
  const [projectResult, vendorResult] = await Promise.all([
    projectId
      ? client
          .from("projects")
          .select("organization_id")
          .eq("organization_id", organizationId)
          .eq("id", projectId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    vendorId
      ? client
          .from("vendors")
          .select("organization_id")
          .eq("organization_id", organizationId)
          .eq("id", vendorId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (projectResult.error) throw new Error(projectResult.error.message);
  if (vendorResult.error) throw new Error(vendorResult.error.message);
  if (projectId) assertOrganizationAccess(projectResult.data, organizationId);
  if (vendorId) assertOrganizationAccess(vendorResult.data, organizationId);
}
