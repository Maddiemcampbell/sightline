import "server-only";

import { requireActorContext } from "@/lib/auth/request-context";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  SearchResource,
  WorkspaceProject,
} from "@/features/workspace/types";
import { canUseAi } from "@/lib/auth/authorization";

export async function getWorkspaceShellData(): Promise<{
  organizationId: string;
  userId: string;
  canUseAi: boolean;
  projects: WorkspaceProject[];
  searchResources: SearchResource[];
}> {
  const context = await requireActorContext();
  const client = await createServerSupabaseClient();
  const [projects, risks, actions, documents, users] = await Promise.all([
    client
      .from("projects")
      .select("id,name,project_number,city,state_code")
      .eq("organization_id", context.organizationId)
      .order("name"),
    client
      .from("risks")
      .select("id,title,project_id,severity")
      .eq("organization_id", context.organizationId)
      .order("detected_at", { ascending: false })
      .limit(100),
    client
      .from("recommended_actions")
      .select("id,risk_id,title,status")
      .eq("organization_id", context.organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("documents")
      .select("id,name,document_type")
      .eq("organization_id", context.organizationId)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("users")
      .select("id,full_name,email")
      .eq("organization_id", context.organizationId)
      .order("full_name")
      .limit(100),
  ]);
  for (const result of [projects, risks, actions, documents, users])
    if (result.error) throw new Error(result.error.message);

  const projectRows = projects.data ?? [];
  const projectNames = new Map(
    projectRows.map((project) => [project.id, project.name]),
  );
  const riskRows = risks.data ?? [];
  const riskById = new Map(riskRows.map((risk) => [risk.id, risk]));
  const searchResources: SearchResource[] = [
    ...projectRows.map((project) => ({
      id: project.id,
      type: "project" as const,
      title: project.name,
      detail: [
        project.project_number,
        [project.city, project.state_code].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · "),
      href: `/projects/${project.id}`,
    })),
    ...riskRows.map((risk) => ({
      id: risk.id,
      type: "risk" as const,
      title: risk.title,
      detail: [
        projectNames.get(risk.project_id ?? "") ?? "No project",
        `${risk.severity} severity`,
      ].join(" · "),
      href: `/risks/${risk.id}`,
    })),
    ...(actions.data ?? []).map((action) => {
      const risk = riskById.get(action.risk_id);
      return {
        id: action.id,
        type: "action" as const,
        title: action.title,
        detail: `${action.status.replaceAll("_", " ")} · ${risk?.title ?? "Risk response"}`,
        href: `/risks/${action.risk_id}`,
      };
    }),
    ...(documents.data ?? []).map((document) => ({
      id: document.id,
      type: "document" as const,
      title: document.name,
      detail: document.document_type.replaceAll("_", " "),
      href: `/documents/${document.id}`,
    })),
    ...(users.data ?? []).map((user) => ({
      id: user.id,
      type: "user" as const,
      title: user.full_name,
      detail: user.email,
      href: "/organization?section=team",
    })),
  ];
  return {
    organizationId: context.organizationId,
    userId: context.authUserId,
    canUseAi: canUseAi(context),
    projects: projectRows.map(({ id, name }) => ({ id, name })),
    searchResources,
  };
}
